import Anthropic from '@anthropic-ai/sdk';

// Provider schema constrains JSON syntax; parseLoveReading still enforces exactly
// three unique, nonempty sections and supplies canonical labels for the client.
// Anthropic does not support exact array lengths or minLength here. Synthesis
// is optional (listed in properties, omitted from required), not nullable.
const LOVE_OUTPUT_FORMAT = {
    type: 'json_schema',
    schema: {
        type: 'object',
        properties: {
            sections: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        key: { type: 'string', enum: ['ty', 'partner', 'vztah'] },
                        text: { type: 'string' },
                    },
                    required: ['key', 'text'],
                    additionalProperties: false,
                },
            },
            synthesis: { type: 'string' },
        },
        required: ['sections'],
        additionalProperties: false,
    },
};

const FINANCE_POSITIONS = [
    { key: 'dnes', label: 'Dnes' },
    { key: 'vyzva', label: 'Výzva' },
    { key: 'vysledek', label: 'Výsledek' },
];
const FINANCE_OUTPUT_FORMAT = {
    type: 'json_schema',
    schema: {
        type: 'object',
        properties: {
            sections: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        key: { type: 'string', enum: FINANCE_POSITIONS.map(position => position.key) },
                        text: { type: 'string' },
                    },
                    required: ['key', 'text'],
                    additionalProperties: false,
                },
            },
        },
        required: ['sections'],
        additionalProperties: false,
    },
};

const FINANCE_PROVIDER_TIMEOUT_MS = 40_000;

async function withFinanceProviderLifecycle(req, res, operation) {
    const controller = new AbortController();
    const cleanups = [];
    let timer;
    try {
        const stopped = new Promise((_, reject) => {
            const stop = (name) => {
                if (controller.signal.aborted) return;
                const error = new Error('Finance provider operation stopped');
                error.name = name;
                reject(error);
                controller.abort();
            };
            const disconnect = () => stop('APIUserAbortError');
            const listen = (emitter, event, listener) => {
                if (typeof emitter?.on !== 'function' || typeof emitter?.removeListener !== 'function') return;
                emitter.on(event, listener);
                cleanups.push(() => emitter.removeListener(event, listener));
            };
            // Request 'close' may mean normal body completion: never use it.
            listen(req, 'aborted', disconnect);
            listen(res, 'close', () => { if (!res.writableEnded) disconnect(); });
            const signal = req.signal;
            if (typeof signal?.addEventListener === 'function' && typeof signal?.removeEventListener === 'function') {
                signal.addEventListener('abort', disconnect, { once: true });
                cleanups.push(() => signal.removeEventListener('abort', disconnect));
            }
            // Vercel may not forward a client disconnect to this legacy handler.
            // No deployment-wide cancellation opt-in is enabled here.
            if (req.aborted || signal?.aborted || (res.destroyed && !res.writableEnded)) { disconnect(); return; }
            timer = setTimeout(() => stop('APIConnectionTimeoutError'), FINANCE_PROVIDER_TIMEOUT_MS);
        });
        const work = Promise.resolve().then(() => {
            if (controller.signal.aborted) return stopped;
            return operation({ timeout: FINANCE_PROVIDER_TIMEOUT_MS, maxRetries: 0, signal: controller.signal });
        });
        // SDK 0.32.1 clears its fetch timeout at headers. This race also bounds
        // response-body parsing and settles even when a transport ignores abort.
        return await Promise.race([stopped, work]);
    } finally {
        if (timer !== undefined) clearTimeout(timer);
        for (const cleanup of cleanups) cleanup();
    }
}

const READING_TYPES = {
    daily: {
        name: 'daily',
        maxWords: 120,
        paragraphs: '4 short'
    },
    tomorrow: {
        name: 'tomorrow',
        maxWords: 120,
        paragraphs: '4 short'
    },
    'reading-screen': {
        name: 'reading-screen',
        maxWords: 180,
        paragraphs: 'continuous'
    },
    love_3_card: {
        name: 'love_3_card',
        maxWords: 230,
        paragraphs: '6'
    },
    finance_3_card: {
        name: 'finance_3_card',
        maxWords: 230,
        paragraphs: '3'
    },
    moon_phase: {
        name: 'moon_phase',
        maxWords: 150,
        paragraphs: '3'
    },
    custom_question: {
        name: 'custom_question',
        maxWords: 170,
        paragraphs: '4'
    },
    body_mind_spirit: {
        name: 'body_mind_spirit',
        maxWords: 200,
        paragraphs: '5'
    }
};

const SPREAD_SCHEMAS = {
    finance_3_card: { sections: FINANCE_POSITIONS },
    daily: {
        sections: [{ key: 'reading', label: null }]
    },
    tomorrow: {
        sections: [{ key: 'reading', label: null }]
    },
    'reading-screen': {
        sections: [{ key: 'reading', label: null }]
    },
    love_3_card: {
        sections: [
            { key: 'ty',      label: 'Ty' },
            { key: 'partner', label: 'Partner' },
            { key: 'vztah',   label: 'Tvůj vztah' }
        ]
    },
    moon_phase: {
        sections: [{ key: 'reading', label: 'Vzkaz luny' }]
    },
    custom_question: {
        sections: [{ key: 'reading', label: null }]
    },
    body_mind_spirit: {
        sections: [
            { key: 'mysl', label: 'Mysl' },
            { key: 'telo', label: 'Tělo' },
            { key: 'duse', label: 'Duše' }
        ]
    }
};

function parseLoveReading(rawText) {
    const invalid = (category) => {
        const error = new Error('Invalid love reading structure');
        error.code = 'INVALID_LOVE_READING';
        error.validationCategory = category;
        return error;
    };
    let parsed;
    try {
        parsed = JSON.parse(rawText);
    } catch {
        throw invalid('json_parse');
    }
    const keys = ['ty', 'partner', 'vztah'];
    const labels = { ty: 'Ty', partner: 'Partner', vztah: 'Vaše pouto' };
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
        Object.keys(parsed).some(key => !['sections', 'synthesis'].includes(key)) || !Array.isArray(parsed.sections)) throw invalid('root_shape');
    if (parsed.sections.length !== 3) throw invalid('section_count');
    const sections = new Map();
    for (const section of parsed.sections) {
        if (!section || typeof section !== 'object' || Array.isArray(section) ||
            Object.keys(section).length !== 2) throw invalid('section_shape');
        if (!keys.includes(section.key)) throw invalid('section_key');
        if (sections.has(section.key)) throw invalid('duplicate_key');
        if (typeof section.text !== 'string' || !section.text.trim()) throw invalid('section_text');
        sections.set(section.key, section.text.trim());
    }
    if (!keys.every(key => sections.has(key))) throw invalid('missing_section');
    const synthesis = typeof parsed.synthesis === 'string' ? parsed.synthesis.trim() : '';
    return {
        sections: keys.map(key => ({ key, label: labels[key], text: sections.get(key) })),
        ...(synthesis ? { synthesis } : {}),
    };
}

function parseFinanceReading(rawText) {
    const invalid = (category) => {
        const error = new Error('Invalid finance reading structure');
        error.code = 'INVALID_FINANCE_READING';
        error.validationCategory = category;
        return error;
    };
    let parsed;
    try { parsed = JSON.parse(rawText); } catch { throw invalid('json_parse'); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
        Object.keys(parsed).length !== 1 || !Array.isArray(parsed.sections)) throw invalid('root_shape');
    if (parsed.sections.length !== FINANCE_POSITIONS.length) throw invalid('section_count');
    const texts = new Map();
    for (const section of parsed.sections) {
        if (!section || typeof section !== 'object' || Array.isArray(section) ||
            Object.keys(section).length !== 2 || !Object.hasOwn(section, 'key') ||
            !Object.hasOwn(section, 'text')) throw invalid('section_shape');
        if (!FINANCE_POSITIONS.some(position => position.key === section.key)) throw invalid('section_key');
        if (texts.has(section.key)) throw invalid('duplicate_key');
        if (typeof section.text !== 'string' || !section.text.trim()) throw invalid('section_text');
        texts.set(section.key, section.text.trim());
    }
    return { sections: FINANCE_POSITIONS.map(({ key, label }) => ({ key, label, text: texts.get(key) })) };
}

function parseBodyMindSpiritSections(rawText) {
    try {
        let cleanText = rawText.trim()
            .replace(/```json\s?/g, '')
            .replace(/```/g, '');

        const firstBrace = cleanText.indexOf('{');
        const lastBrace  = cleanText.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(cleanText);

            if (parsed.mysl && parsed.telo && parsed.duse) {
                console.log('✅ Parsed body_mind_spirit sections from JSON');
                return [
                    { key: 'mysl', label: 'Mysl', text: parsed.mysl.trim() },
                    { key: 'telo', label: 'Tělo', text: parsed.telo.trim() },
                    { key: 'duse', label: 'Duše', text: parsed.duse.trim() }
                ];
            }
        }
    } catch (e) {
        console.log('⚠️ body_mind_spirit JSON parse failed, trying delimiter fallback');
    }

    const paragraphs = rawText.split('---').map(p => p.trim()).filter(p => p.length > 0);

    if (paragraphs.length >= 3) {
        console.log('✅ Parsed body_mind_spirit sections from delimiters');
        return [
            { key: 'mysl', label: 'Mysl', text: paragraphs[0] },
            { key: 'telo', label: 'Tělo', text: paragraphs[1] },
            { key: 'duse', label: 'Duše', text: paragraphs[2] }
        ];
    }

    console.warn('⚠️ Could not parse body_mind_spirit sections, returning as single block');
    return [{ key: 'reading', label: null, text: rawText.trim() }];
}

function parseReading(rawText, cards, mode) {
    const schema = SPREAD_SCHEMAS[mode] || SPREAD_SCHEMAS.daily;

    let sections;
    let synthesis;
    if (mode === 'love_3_card') {
        const loveReading = parseLoveReading(rawText);
        sections = loveReading.sections;
        synthesis = loveReading.synthesis;
    } else if (mode === 'finance_3_card') {
        sections = parseFinanceReading(rawText).sections;
    } else if (mode === 'body_mind_spirit') {
        sections = parseBodyMindSpiritSections(rawText);
    } else {
        const label = schema.sections[0]?.label || null;
        sections = [{ key: 'reading', label, text: rawText.trim() }];
    }

    return {
        readingType: mode,
        sections,
        ...(synthesis ? { synthesis } : {}),
        meta: {
            cardCount: cards.length,
            timestamp: new Date().toISOString()
        },
        answer: rawText.trim()
    };
}
function buildStructuredResponse(mode, rawText, cards) {
    return parseReading(rawText, cards, mode);
}
/**
 * Builds the gender instruction block injected into the system prompt.
 *
 * Czech past tense and adjectives are grammatically gendered — there is no
 * neutral verb form. We handle this three ways:
 *
 *   masculine / feminine → instruct Claude to use those forms consistently,
 *     with concrete before/after examples so it knows exactly what "correct" looks like.
 *
 *   neutral (Páže) → instruct Claude to restructure sentences to sidestep
 *     gendered constructions entirely. Czech allows impersonal forms that read
 *     naturally and even slightly more poetic — fitting for a tarot context.
 *
 * Returns an empty string if userContext is missing — callers without gender
 * data are completely unaffected and the model will avoid /a slashing by default.
 */
function buildGenderBlock(userContext) {
    const gender = userContext?.genderPreference;
    if (!gender) {
        // No gender set — instruct model to avoid the /a slash hack entirely.
        return `
---

## GRAMATICKÝ ROD: NEZNÁMÝ

Uživatel nezvolil gramatický rod. NIKDY nepoužívej formát "byl/a", "unavený/á", "připravený/á" — tento formát vypadá jako formulář, ne jako lidská řeč.

Místo toho přepisuj věty do neosobních nebo bezrodých konstrukcí:
"byl/a jsi unavený/á"   →   "únava je přirozená" / "může být těžké"
"cítil/a jsi"            →   "přichází pocit" / "je možné cítit"
"byl/a jsi připravený/á" →   "příprava proběhla" / "čas je správný"

Věty musí znít přirozeně česky — neosobní formy v tarotovém kontextu jsou dokonce o něco poetičtější.
`.trim();
    }

    if (gender === 'feminine') {
        return `
---

## GRAMATICKÝ ROD: ŽENSKÝ

Uživatelka si zvolila Královnu. Používej důsledně ženský rod v celé odpovědi.

Správně:
- "byla jsi", "cítila jsi", "viděla jsi", "rozhodla ses"
- "unavená", "připravená", "otevřená", "silná", "klidná"

Nikdy ne:
- "byl jsi", "připravený", "unavený"
- NIKDY "byl/a", "unavený/á" — tento formát je zakázán

Každá věta s minulým časem nebo přídavným jménem musí být v ženském rodě.
Toto platí i pro love_3_card sekci "ty".
`.trim();
    }

    if (gender === 'masculine') {
        return `
---

## GRAMATICKÝ ROD: MUŽSKÝ

Uživatel si zvolil Krále. Používej důsledně mužský rod v celé odpovědi.

Správně:
- "byl jsi", "cítil jsi", "viděl jsi", "rozhodl ses"
- "unavený", "připravený", "otevřený", "silný", "klidný"

Nikdy ne:
- "byla jsi", "připravená", "unavená"
- NIKDY "byl/a", "unavený/á" — tento formát je zakázán

Každá věta s minulým časem nebo přídavným jménem musí být v mužském rodě.
Toto platí i pro love_3_card sekci "ty".
`.trim();
    }

    // neutral — Páže. Restructure rather than pick a gender.
    return `
---

## GRAMATICKÝ ROD: NEUTRÁLNÍ

Uživatel si zvolil Páže. Vyhýbej se gendrově specifickým tvarům — přepisuj věty
do neosobních nebo bezrodých konstrukcí.

Místo:                          Piš raději:
"byl/a jsi unavený/á"     →    "únava je přirozená"
"cítil/a jsi"              →    "přichází pocit" / "je možné cítit"
"byl/a jsi připravený/á"   →    "příprava proběhla" / "čas je správný"

NIKDY nepoužívej formát "byl/a", "unavený/á" — vypadá jako formulář.
Věty přepisuj tak, aby zněly přirozeně česky.
`.trim();
}

/**
 * Builds the zodiac context block injected into the system prompt.
 *
 * When the user's zodiac sign is known, it's used to subtly colour the
 * reading — not as fortune-telling, but as a personality lens that makes
 * interpretations feel more personal. The instruction is intentionally
 * light-touch so it doesn't override card meaning.
 *
 * Returns an empty string if zodiacSign is missing.
 */
function buildZodiacBlock(userContext) {
    const zodiac = userContext?.zodiacSign;
    if (!zodiac) return '';

    return `
---

## KONTEXT UŽIVATELE: ZNAMENÍ ${zodiac.toUpperCase()}

Uživatel je ${zodiac}. Toto neznamení, že musíš zmínit znamení v odpovědi — spíš použij tuto informaci jako tichý kontext pro interpretaci.

${zodiac} jako osobnost: přizpůsob tón a příklady tak, aby rezonovaly s typickými tématy tohoto znamení (vztah k emocím, rozhodování, energie, životní styl). Nepiš "jako ${zodiac} pravděpodobně..." — jen mluv přirozeně s vědomím tohoto kontextu.
`.trim();
}

/**
 * Main API Handler
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ answer: 'Method not allowed' });
    }

    const startedAt = Date.now();
    const isLoveReading = req.body?.mode === 'love_3_card';
    const isFinanceReading = req.body?.mode === 'finance_3_card';
    const isStrictReading = isLoveReading || isFinanceReading;
    const invalidReadingCode = isFinanceReading ? 'INVALID_FINANCE_READING' : 'INVALID_LOVE_READING';
    let category = 'success';
    let validationFailure = null;
    let stopReason = null;
    let outputTokens = null;
    try {
        // userContext arrives from universe.ts — contains only genderPreference
        // and zodiacSign. Name and birthDate are never sent (stay on device).
        const { question, cards, mode = 'daily', spreadName, moonPhase, userContext } = req.body;

        // Safety: log a warning if name somehow appears — should never happen.
        if (userContext?.name || userContext?.displayName) {
            console.warn('⚠️  PRIVACY: user name reached backend — remove from userContext in universe.ts');
        }

        if (!cards || !Array.isArray(cards)) {
            category = 'invalid_request';
            validationFailure = 'cards_array';
            return res.status(400).json({ answer: 'Omlouvám se, ale ty karty nevidím jasně. Zkusíš to znovu?' });
        }

        if (isFinanceReading && (cards.length !== 3 || cards.some(card =>
            !card || typeof card !== 'object' || Array.isArray(card) ||
            ![card.nameCzech, card.name].some(name => typeof name === 'string' && name.trim()) ||
            (card.nameCzech !== undefined && (typeof card.nameCzech !== 'string' || !card.nameCzech.trim())) ||
            !['upright', 'reversed'].includes(card.position)))) {
            category = 'invalid_request';
            validationFailure = 'finance_cards';
            return res.status(400).json({ code: 'INVALID_FINANCE_REQUEST', answer: 'Výklad potřebuje tři karty s platnou orientací.' });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
            category = 'configuration';
            console.error('FATAL: ANTHROPIC_API_KEY is not set!');
            return res.status(500).json({
                answer: 'Chyba konfigurace serveru. Zkuste to prosím později.'
            });
        }

        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        // Pass userContext into buildSystemPrompt so gender and zodiac
        // are woven into the prompt before Claude sees anything else.
        const systemPrompt = buildSystemPrompt(mode, moonPhase, userContext);
        const userPrompt   = buildUserPrompt(question, cards, spreadName, mode, moonPhase);

        const providerRequest = {
            model: 'claude-sonnet-4-6',  // ✅ updated from claude-sonnet-4-20250514
            max_tokens: isStrictReading ? 2048 : 1024,
            system: systemPrompt,
            messages: [
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            ...(mode === 'love_3_card' ? { output_config: { format: LOVE_OUTPUT_FORMAT } } : {}),
            ...(isFinanceReading ? { output_config: { format: FINANCE_OUTPUT_FORMAT } } : {}),
        };
        const response = isFinanceReading
            ? await withFinanceProviderLifecycle(req, res, options => anthropic.messages.create(providerRequest, options))
            : await anthropic.messages.create(providerRequest);

        if (isStrictReading) {
            const knownReasons = ['end_turn', 'max_tokens', 'stop_sequence', 'tool_use', 'pause_turn', 'refusal'];
            stopReason = knownReasons.includes(response?.stop_reason) ? response.stop_reason : 'unknown';
            const tokens = response?.usage?.output_tokens;
            outputTokens = Number.isFinite(tokens) && tokens >= 0 ? tokens : null;
        }
        if (isStrictReading && (response?.stop_reason !== 'end_turn' ||
            !Array.isArray(response.content) || response.content.length !== 1 ||
            response.content[0]?.type !== 'text' || typeof response.content[0].text !== 'string')) {
            category = 'invalid';
            validationFailure = response?.stop_reason !== 'end_turn' ? 'stop_reason' : 'content_shape';
            return res.status(502).json({
                code: invalidReadingCode,
                answer: 'Výklad se nepodařilo načíst celý. Zkus to prosím znovu.'
            });
        }

        // Handle refusal stop reason (new in Sonnet 4.6)
        if (response.stop_reason === 'refusal') {
            console.warn('⚠️ Model refused the request');
            return res.status(200).json(buildStructuredResponse(
                mode,
                'Tohle mi nejde vyložit. Zkus položit otázku jinak?',
                cards
            ));
        }

        const rawAnswer = response.content[0].text;

        const structuredResponse = buildStructuredResponse(mode, rawAnswer, cards);

        return res.status(200).json(structuredResponse);

    } catch (error) {
        if (isFinanceReading && error.name === 'APIUserAbortError') {
            category = 'aborted';
            res.statusCode = 499;
            if (res.destroyed || res.writableEnded) return;
            return res.status(499).json({ answer: 'Načítání výkladu bylo zrušeno.' });
        }
        if (isFinanceReading && error.name === 'APIConnectionTimeoutError') {
            category = 'provider_timeout';
            return res.status(504).json({ answer: 'Výklad trvá příliš dlouho. Zkus to prosím znovu se stejnými kartami.' });
        }
        if (error.code === 'INVALID_LOVE_READING' || (isFinanceReading && error.code === 'INVALID_FINANCE_READING')) {
            category = 'invalid';
            validationFailure = error.validationCategory;
            return res.status(502).json({
                code: invalidReadingCode,
                answer: 'Výklad se nepodařilo načíst celý. Zkus to prosím znovu.'
            });
        }
        category = error.name === 'APIConnectionTimeoutError' ? 'provider_timeout'
            : error.name === 'APIConnectionError' ? 'provider_network' : 'provider_error';
        if (!isStrictReading) console.error('Reading request failed');

        return res.status(500).json({
            answer: 'Spojení se na moment rozostřilo. Zkusíme to vyložit znovu?'
        });
    } finally {
        if (isStrictReading) {
            console.info(isFinanceReading ? '[finance-reading:backend]' : '[love-reading:backend]', {
                durationMs: Math.max(0, Date.now() - startedAt), httpStatus: res.statusCode,
                category, validationFailure, stopReason, outputTokens,
            });
        }
    }
}

function buildUserPrompt(question, cards, spreadName, mode, moonPhase) {
    if (mode === 'finance_3_card') {
        // Position assignments come from request order, never caller-supplied labels.
        cards = cards.map((card, index) => ({ ...card, label: FINANCE_POSITIONS[index].label }));
        spreadName = 'Zázemí';
    }
    const cardsInfo = cards.map((c, idx) => {
        const labelStr = c.label ? ` (${c.label})` : '';
        return `Karta ${idx + 1}${labelStr}: ${c.nameCzech || c.name} (${c.position === 'reversed' ? 'Obrácená' : 'Vzpřímená'})`;
    }).join('\n');

    let prompt = `OTÁZKA UŽIVATELE: "${question || 'Obecný výklad'}"\n\nVYTAŽENÉ KARTY:\n${cardsInfo}`;

    if (spreadName) {
        prompt += `\n\nTYP VÝKLADU: ${spreadName}`;
    }

    if (mode === 'tomorrow') {
        prompt += `\n\n⚠️ DŮLEŽITÉ: Toto je výklad pro ZÍTŘEK. Vše musí být ve future tense. Nikdy nepoužívej slova dnes, dneska, dnešní.`;
    }

    if (mode === 'moon_phase' && moonPhase) {
        const phaseName = moonPhase.split('\n')[0];
        prompt += `\n\nFÁZE: ${phaseName}`;
    }

    return prompt;
}

/**
 * Character First voice with the existing runtime contracts and gender handling.
 * Mode guidance is flexible; structured output and safety remain mandatory.
 */
function buildSystemPrompt(mode, moonPhase, userContext) {
    const readingType = READING_TYPES[mode] || READING_TYPES.daily;
    const genderBlock = buildGenderBlock(userContext);
    const zodiacBlock = buildZodiacBlock(userContext);
    const guidance = {
        "finance_3_card": `
<mode>
    Zázemí: Peníze, materiální zdroje, bezpečí, stabilita, majetek, zdroje spojené s prací, osobní hodnota, dostatek i nedostatek. Nejde jen o bohatství, příjem nebo finanční úspěch. Vnímej, co podpírá materiální život, co může chybět a co lze rozvíjet. Hodnota nemusí být peněžní. Nepředpokládej ani hojnost, ani nouzi.
    Piš přirozenou současnou češtinou a tykej. Vylož každou skutečně dodanou kartu a její orientaci. Tři sekce mají tvořit soudržný výklad, ne opakovat stejnou myšlenku. Obvykle 35–65 slov na sekci, podle obsahu; nejde o povinné minimum.
    dnes — Dnes / Aktuální situace: První karta jako pohled na současné zdroje, materiální okolnosti, priority nebo vztah k bezpečí.
    vyzva — Výzva / Co vyžaduje pozornost: Druhá karta jako napětí, překážka, opomíjený zdroj, soupeřící priorita nebo slepé místo.
    vysledek — Výsledek / Možný směr vývoje: Třetí karta jako možný směr, příležitost nebo důsledek voleb ve vztahu ke všem třem kartám. Výsledek nikdy není zaručený.
    Nevymýšlej fakta o příjmu, dluzích, zaměstnání, bydlení ani úsporách uživatele. Žádné zaručené finanční předpovědi, personalizovaná investiční doporučení ani vydávání výkladu za odborné finanční poradenství. Vynech manifestační jazyk, klišé prosperity a finanční moralizování. Nepřidávej zbytečný terapeutický rámec.
    Rozlišuj symboliku karet od osobních skutečností: karta není důkaz o životě uživatele. Bez dodaného kontextu netvrď například „Rovnováha zatím funguje.“ ani „Práce proběhla.“; nevíš, zda má uživatel dluhy, úspory, finanční potíže, stabilní příjem, problémy s bydlením či konkrétní zaměstnání.
    O symbolice a tématu výkladu mluv přímo a konkrétně. Když přecházíš k možným osobním okolnostem, použij podmíněné nebo průzkumné vyjádření: třeba „Šestka pentaklů otevírá téma rovnováhy mezi dáváním a přijímáním.“ nebo „Pokud už do něčeho vkládáš úsilí, sedmička pentaklů nabízí pohled na to, co se může rozvíjet.“ Zachovej vztah ke skutečné kartě a orientaci, soudržnost i emoční přesnost. Nezačínej každou větu slovem „možná“, nepřeváděj celý výklad na otázky a nezaměňuj konkrétní interpretaci za obecné opatrné fráze.
</mode>
<finance_output_contract>
    Pravidlo formátu přenosu má přednost před prostou prózou. Vrať pouze platný JSON bez markdown obalu a bez dalšího textu:
    {"sections":[{"key":"dnes","text":"..."},{"key":"vyzva","text":"..."},{"key":"vysledek","text":"..."}]}
    Přesně tři sekce, každý klíč právě jednou, pouze key a text. Žádná synthesis ani čtvrtá sekce. Každý text je neprázdná česká próza bez nadpisů.
    dnes = první dodaná karta; vyzva = druhá dodaná karta; vysledek = třetí dodaná karta. Zachovej skutečné orientace i při opakování stejné karty.
    Bezpečnost a gramatický rod mají stejnou prioritu jako ve společných pravidlech. I bezpečnou reakci na krizovou otázku vrať ve třech předepsaných sekcích, bez humoru a věštění.
</finance_output_contract>
        `,
        "daily": `
<mode>
    Denní karta: Interpretuj kartu pro dnešní den. Najdi jednu nosnou myšlenku. Obvykle 35–75 slov, podle obsahu může být méně nebo více.
</mode>
        `,
        "tomorrow": `
<mode>
    Zítřejší karta: Interpretuj kartu výhradně pro zítřek. Používej budoucí čas a jasné zítřejší časové ukotvení. Obvykle 35–75 slov.
</mode>
        `,
        "reading-screen": `
<mode>
    Více karet: Propoj karty do jedné interpretace, která zachytí jejich vzájemný vztah. Obvykle 70–130 slov.
</mode>
        `,
        "custom_question": `
<mode>
    Vlastní otázka: Odpověz přímo na konkrétní otázku skrze význam vytažených karet. Neodhaduj neznámé okolnosti jako fakta. Obvykle 45–110 slov.
</mode>
        `,
        "moon_phase": `
<mode>
    Měsíční výklad: Vnímej měsíční fázi jako symbolický kontext a kartu jako hlavní téma. Spiritualita a obraznost jsou vítané, bez předstírání jistoty. Obvykle 45–100 slov.
</mode>
        `,
        "love_3_card": `
<mode>
    Lásky a vztahy: Zachovej tři JSON sekce ty, partner, vztah. Každou interpretuj podle příslušné karty a jejich společného kontextu. O partnerových myšlenkách netvrď nic jako fakt. Každá sekce obvykle 35–65 slov.
</mode>
        `,
        "body_mind_spirit": `
<mode>
    Mysl, tělo, duše: Zachovej tři JSON sekce mysl, telo, duse. Vylož je jako tři symbolické perspektivy, které spolu mohou souviset. Tělesná karta není zdravotní diagnóza. Každá sekce obvykle 30–60 slov.
</mode>
        `
    };
    const moonPhaseContext = mode === 'moon_phase' && moonPhase
        ? `MOON PHASE CONTEXT:
${moonPhase}
This reading must interpret the card through the lens of this moon phase energy.`
        : '';

    return `
TAROTKA — CORE SYSTEM PROMPT v10 (Character First)

<identity>
Jsi Tarotka. Znáš tarot, lidské příběhy a zvláštní způsoby, jakými se život skládá dohromady. Jsi intuitivní, inteligentní, nezávislá, citlivá a upřímná. Máš vlastní perspektivu a přirozený cit pro absurdity i souvislosti, které nejsou na první pohled vidět. Nemusíš dokazovat, jak jsi vtipná nebo výjimečná. Osobnost se projevuje tím, čeho si všímáš a jak o tom mluvíš.
</identity>

<worldview>
Lidé mohou zároveň chtít protichůdné věci. Ambivalence není chyba, kterou musíš napravit. Když nějaké vysvětlení zní až příliš dokonale, zůstáváš zvědavá, zda neexistuje i jiný pohled. Nepodezíráš uživatele ze lži nebo sebeklamu. Respektuješ jeho vlastní zkušenost, individualitu a hranice.
Svět má pro tebe také symbolickou a intuitivní rovinu. Zajímají tě synchronicity, rituály, znamení i významy, které jim lidé dávají. Nepředstíráš důkazy ani jistotu, kterou nemáš.
</worldview>

<tarot>
Znáš symboliku všech 78 tarotových karet, vzpřímené i obrácené významy. Interpretace vyrůstá z konkrétní karty, její orientace, pozice a otázky. Klíčová slova jsou vodítko, ne celý význam. Obrácení může znamenat blokaci, přehnaný projev, vnitřní proces, zpoždění nebo uvolnění tématu. Karty mohou ukazovat tendence a možnosti, ne garantované události ani skryté myšlenky druhých lidí.
Každý výklad má vlastní těžiště. Někdy je nejcennější postřeh, jindy nový úhel pohledu, povzbuzení nebo konkrétní rada. Když je myšlenka úplná, skonči.
</tarot>

<voice>
Mluvíš přirozenou současnou češtinou a tykáš. Tvůj hlas je osobní, živý, občas suchý, hravý nebo poetický, jindy klidný a vážný. Humor je tvůj sdílený kulturní jazyk, ne povinná součást každé odpovědi. Nesnižuješ uživatele. Umíš pojmenovat nepříjemnou věc bez krutosti a být přítomná bez zbytečného vysvětlování.
Píšeš úsporně pro mobilní obrazovku. Jeden přesný postřeh může stačit. Délka odpovídá tomu, co máš skutečně co říct. Nevyplňuješ prostor radami nebo závěry jen kvůli struktuře. Výstup je prostá próza bez nadpisů, odrážek a emoji.
</voice>

<relationship>
Uživatel zná svůj život lépe než ty. Nabízíš interpretaci, nikoli diagnózu nebo rozhodnutí za něj. Psychologické poznatky můžeš využít, když přirozeně pomohou, ale KBT není výchozí rámec. Nesoudíš emoce, víru ani životní rozhodnutí. Upřímnost a laskavost nejsou protiklady.
</relationship>

<safety>
Při známkách akutní krize, sebepoškozování nebo vážného ohrožení dej přednost přímé, citlivé podpoře a nasměrování ke skutečné pomoci před tarotovým výkladem. Karta počká, člověk ne. Z karet nevyvozuj zdravotní diagnózy ani jisté závěry o smrti, katastrofách, právních či finančních výsledcích.
</safety>

<integrity>
Použij dodané karty a jejich skutečnou orientaci, neměň je. Respektuj časový rámec režimu a odpověz na skutečnou otázku. Dodrž gramatický rod a požadovaný technický formát. Vztahové a další strukturované režimy musí vrátit přesně předepsané JSON klíče. Bezpečnostní pravidla mají přednost před stylem.
</integrity>

${genderBlock}
${zodiacBlock}

<safety_boundary>
    Pokud otázka nebo kontext naznačuje skutečnou krizi, sebepoškozování, nebo vážné
    ohrožení — ne běžný špatný den, ale něco těžšího — okamžitě opusť vtipný režim
    i tarotovou symboliku. Buď přímá a lidská. Jemně nasměruj k reálné podpoře (blízký
    člověk, odborník, krizová linka). Karta počká, člověk ne.
</safety_boundary>

<reading_mode name="${readingType.name}">
${guidance[readingType.name]}
</reading_mode>

${moonPhaseContext}

<general_rules>
    - Délky uvedené u režimů jsou vodítko, nikoli povinné minimum nebo pevná osnova.
    - Praktickou radu přidej jen tehdy, když přirozeně vyplývá z karet a otázky; nemusí být v každém výkladu.
    - Pokud radíš, použij zvací jazyk, ne rozkazy nebo rozhodování za uživatele.
    - Žádné fatalistické nebo strašící závěry. Symbolický jazyk není důkaz ani předpověď jistého osudu.
    - Dodrž zvolený gramatický rod; bez něj piš neosobně, nikdy tvary s lomítkem.
    - U měsíčního výkladu neopakuj název fáze, který už ukazuje aplikace.
</general_rules>

${mode === 'tomorrow' ? `🚨 TOMORROW CHECK (CRITICAL):
Read your entire response word-by-word and look for:
- dnes, dneska, dnešní, tento den, dnes ráno, dnes večer
If you find ANY of these → STOP and rewrite that sentence RIGHT NOW in future tense.
This is the #1 quality check for tomorrow readings. Do not send until you pass.` : ''}

${mode === 'love_3_card' ? `
<love_output_contract>
Toto pravidlo formátu přenosu má přednost před požadavkem na prostou prózu.
Vrať pouze platný JSON bez markdown obalu, bez textu před nebo za JSON:
{"sections":[{"key":"ty","text":"..."},{"key":"partner","text":"..."},{"key":"vztah","text":"..."}],"synthesis":"..."}
Přesně tři sekce, každý klíč právě jednou. Vedle sections přidej pouze volitelné textové pole synthesis.
ty = první karta TY; partner = druhá karta PARTNER; vztah = třetí karta VAŠE POUTO.
Každý text je neprázdná česká próza ve stávajícím hlasu Tarotky, bez nadpisů.
Zachovej skutečnou orientaci každé karty. Délka je orientační a platí pro texty sekcí; rada není povinná.
I bezpečnou reakci na krizovou otázku vrať v tomto formátu, bez humoru a věštění.
<synthesis_guidance>
Ve stejném výstupu vytvoř synthesis: Co ti karty říkají společně. Není to rekapitulace tří významů.
Všimni si vztahu, který je vidět až mezi všemi třemi kartami: společného tématu, napětí, kontrastu, vývoje nebo nečekané souvislosti.
Vycházej ze všech tří skutečných karet, jejich vzpřímených či obrácených orientací, přiřazených pozic a dostupné otázky nebo kontextu.
Piš současnou přirozenou češtinou v hlasu Tarotky v10: vnímavě, intuitivně a přímo bez krutosti, otevřeně symbolice bez předstírání jistoty.
Obvykle jeden nebo dva přirozené odstavce; nevyžaduj přesný počet slov. Zalomení odstavců v JSON řetězci správně escapuj.
Neopakuj jednotlivé významy. Žádné vymyšlené skutečnosti o uživateli či partnerovi, jisté předpovědi, povinná KBT, automatická rada, terapeutický úkol ani obecné závěrečné ponaučení.
Platí stejný gramatický rod, kontext znamení a bezpečnostní hranice. V krizi má skutečná podpora přednost před symbolickým propojováním karet.
</synthesis_guidance>
</love_output_contract>` : ''}

${mode === 'body_mind_spirit' ? `
<body_output_contract>
Vrať pouze jeden JSON objekt s přesnými klíči mysl, telo, duse a neprázdnými textovými hodnotami, bez markdown obalu:
{"mysl":"...","telo":"...","duse":"..."}
mysl = první karta, telo = druhá karta, duse = třetí karta. Technický formát má přednost před prostou prózou.
I bezpečnou reakci na krizi vrať v tomto formátu, bez humoru a věštění.
</body_output_contract>` : ''}

Tvoje práce není vytvořit co nejdokonaleji znějící text. Tvoje práce je vyložit karty tak, jak by je vyložila Tarotka.
`.trim();
}
