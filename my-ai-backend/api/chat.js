import Anthropic from '@anthropic-ai/sdk';

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

function parseLoveSections(rawText) {
    try {
        let cleanText = rawText.trim()
            .replace(/```json\s?/g, '')
            .replace(/```/g, '');

        const firstBrace = cleanText.indexOf('{');
        const lastBrace  = cleanText.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(cleanText);

            if (parsed.ty && parsed.partner && parsed.vztah) {
                console.log('✅ Parsed love sections from JSON');
                return [
                    { key: 'ty',      label: 'Ty',          text: parsed.ty.trim()      },
                    { key: 'partner', label: 'Partner',      text: parsed.partner.trim() },
                    { key: 'vztah',   label: 'Tvůj vztah',  text: parsed.vztah.trim()   }
                ];
            }
        }
    } catch (e) {
        console.log('⚠️ JSON parse failed, trying delimiter fallback');
    }

    const paragraphs = rawText.split('---').map(p => p.trim()).filter(p => p.length > 0);

    if (paragraphs.length >= 3) {
        console.log('✅ Parsed love sections from delimiters');
        return [
            { key: 'ty',      label: 'Ty',         text: paragraphs[0] },
            { key: 'partner', label: 'Partner',     text: paragraphs[1] },
            { key: 'vztah',   label: 'Tvůj vztah', text: paragraphs[2] }
        ];
    }

    console.warn('⚠️ Could not parse love sections, returning as single block');
    return [{ key: 'reading', label: null, text: rawText.trim() }];
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
    if (mode === 'love_3_card') {
        sections = parseLoveSections(rawText);
    } else if (mode === 'body_mind_spirit') {
        sections = parseBodyMindSpiritSections(rawText);
    } else {
        const label = schema.sections[0]?.label || null;
        sections = [{ key: 'reading', label, text: rawText.trim() }];
    }

    return {
        readingType: mode,
        sections,
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

    try {
        // userContext arrives from universe.ts — contains only genderPreference
        // and zodiacSign. Name and birthDate are never sent (stay on device).
        const { question, cards, mode = 'daily', spreadName, moonPhase, userContext } = req.body;

        console.log(`--- API Request: ${mode} ---`);
        console.log('Cards:', JSON.stringify(cards));
        if (moonPhase)    console.log('Moon Phase Context:', moonPhase);
        if (userContext)  console.log('User Context:', JSON.stringify(userContext));

        // Safety: log a warning if name somehow appears — should never happen.
        if (userContext?.name || userContext?.displayName) {
            console.warn('⚠️  PRIVACY: user name reached backend — remove from userContext in universe.ts');
        }

        if (!cards || !Array.isArray(cards)) {
            return res.status(400).json({ answer: 'Omlouvám se, ale ty karty nevidím jasně. Zkusíš to znovu?' });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
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

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',  // ✅ updated from claude-sonnet-4-20250514
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
        });

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
        console.log('AI Raw Output (first 100 chars):', rawAnswer.substring(0, 100));

        const structuredResponse = buildStructuredResponse(mode, rawAnswer, cards);

        console.log(`✅ Structured response: ${structuredResponse.sections.length} sections for ${mode}`);
        structuredResponse.sections.forEach((s, i) => {
            console.log(`  Section ${i}: ${s.key} (${s.text.substring(0, 40)}...)`);
        });

        return res.status(200).json(structuredResponse);

    } catch (error) {
        console.error('=== ERROR DETAILS ===');
        console.error('Error name:',    error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:',   error.stack);

        return res.status(500).json({
            answer: 'Spojení se na moment rozostřilo. Zkusíme to vyložit znovu?'
        });
    }
}

function buildUserPrompt(question, cards, spreadName, mode, moonPhase) {
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
 * Builds the complete system prompt with identity, gender, zodiac,
 * reading type context, and the appropriate response shaper.
 *
 * Gender and zodiac are injected early (Claude's attention is strongest
 * at the start) and gender is also repeated in the final checklist
 * to reduce drift in longer responses.
 */
function buildSystemPrompt(mode, moonPhase, userContext) {
    const readingType  = READING_TYPES[mode] || READING_TYPES.daily;
    const genderBlock  = buildGenderBlock(userContext);
    const zodiacBlock  = buildZodiacBlock(userContext);

    // FIX: was `genderGender` (undefined variable) — now correctly reads from userContext
    const genderPreference = userContext?.genderPreference ?? 'unknown';

    const dailyShaper = `
<shape_daily words="100-120">
    A: otevření (1 věta, jméno karty + nálada dne)
    B: celková energie dne (1-2 věty)
    C: na co si dát pozor (1 věta)
    D: co pomůže (1 věta, konkrétní, vázané na kartu)
</shape_daily>
`;

    const tomorrowShaper = `
<shape_tomorrow words="100-120">
    A: otevření — jasně zítřek (1 věta)
    B: zítřejší energie, budoucí čas (1-2 věty)
    C: příležitost nebo výzva zítra (1 věta)
    D: jak se naladit (1 věta)
</shape_tomorrow>
`;

    const readingScreenShaper = `
<shape_reading_screen words="150-200">
    jedna souvislá interpretace napříč všemi kartami, ne mini-výklad ke každé zvlášť
</shape_reading_screen>
`;

    const customQuestionShaper = `
<shape_custom_question words="150-170">
  A: potvrzení otázky (1 věta)
  B: karta v kontextu otázky (2-3 věty)
  C: přímá aplikace + KBT pohled, pokud sedí (2-3 věty)
  D: reálný výhled / krok, rámovaný jako tendence (1-2 věty)
</shape_custom_question>
`;

    const love3CardShaper = `
<shape_love_3_card words="200-230">
    A: otevření (1 věta)
    B: TY (1-2 věty)
    C: PARTNER (1-2 věty)
    D: jak se energie potkávají (2-3 věty)
    E: VZTAH — směr (1-2 věty)
    F: společná rada (1-2 věty)
</shape_love_3_card>
`;

    const moonPhaseShaper = `
<shape_moon_phase words="130-150">
    A: karta v tomhle emočním klimatu (2-3 věty)
    B: co je čas pustit / čemu čelíš, když to nevidíš (1-2 věty)
    C: jak s tím pracovat (1-2 věty)
    note: nikdy nejmenuj fázi měsíce, uživatel ji vidí v appce
</shape_moon_phase>
`;

    const bodyMindSpiritShaper = `
<shape_body_mind_spirit words="180-200">
    A: otevření (1 věta)
    B: TĚLO (1-2 věty)
    C: MYSL — KBT pohled na místě (1-2 věty)
    D: DUCH (1-2 věty)
    E: propojení + co s tím teď (1-2 věty)
</shape_body_mind_spirit>
`;

    // Shaper selector
    let responseShaper;
    if (mode === 'daily')                responseShaper = dailyShaper;
    else if (mode === 'tomorrow')        responseShaper = tomorrowShaper;
    else if (mode === 'reading-screen')  responseShaper = readingScreenShaper;
    else if (mode === 'custom_question') responseShaper = customQuestionShaper;
    else if (mode === 'love_3_card')     responseShaper = love3CardShaper;
    else if (mode === 'moon_phase')      responseShaper = moonPhaseShaper;
    else if (mode === 'body_mind_spirit') responseShaper = bodyMindSpiritShaper;
    else                                 responseShaper = dailyShaper;

    let moonPhaseContext = '';
    if (mode === 'moon_phase' && moonPhase) {
        moonPhaseContext = `\n\n🌙 MOON PHASE CONTEXT (important!):\n${moonPhase}\n\nThis reading must interpret the card through the lens of this moon phase energy.`;
    }

    // FIX: was `genderGender` (undefined variable) — now uses genderPreference correctly
    const genderCheckItem = genderPreference !== 'neutral' && genderPreference !== 'unknown'
        ? `7. ✅ Gramatický rod ${genderPreference === 'feminine' ? 'ženský' : 'mužský'} — každý minulý čas a přídavné jméno? Žádné "byl/a" nebo "unavený/á"?`
        : `7. ✅ Žádné "byl/a", "unavený/á" formáty — přepsáno do neosobních konstrukcí?`;

    return `
🔮 TAROTKA – CORE SYSTEM PROMPT (v8)

<identity>
    Jsi Tarotka. Chytrá, vtipná, psychologicky sečtělá kamarádka od kuchyňského stolu
    ve dvě ráno — ne guru, ne terapeut, ne systém. Znáš tarot i to, jak funguje lidská
    hlava, a umíš to propojit bez frází a bez klišé.
</identity>

<framework>
    Tvůj úhel pohledu je KBT (kognitivně-behaviorální terapie). Karta je vstupní brána
    k tomu, co se v uživateli právě děje — ne věštba. Když je to na místě, pojmenuj
    automatickou myšlenku nebo kognitivní zkreslení (katastrofizace, černobílé myšlení,
    čtení myšlenek, „musím“ věty) a nabídni reálnější úhel pohledu.
    Karty ukazují vzorce a energie, ne pevný osud. Nikdy netvrdíš nevyhnutelnost.
</framework>

<voice>
    - Tykání vždy, nikdy vykání.
    - Přirozená, moderní čeština — ne přeložená z angličtiny, ne esoterická.
    - Suchý, sebeironický humor tam, kde odlehčí tvrdou pravdu — nikdy ji nezlehčuje.
    - Přímá, když je potřeba. Žádné cukrování, žádné omáčky kolem.
    - Krátké věty, přirozený tok, žádný AI balast ("Zde je tvůj výklad...").
    - Bez emoji. Bez nadpisů typu "Tip:", "Energie dneška:" v textu — pouze prostá próza
        strukturovaná odstavci podle šablony daného typu výkladu.
</voice>

${genderBlock}

<gender_forms>
    Čeština rozlišuje rod v příčestí a přídavných jménech. Formát "byl/a", "unavený/á"
    je navždy zakázaný — vypadá jako formulář, ne jako řeč člověka.
    - Pokud znáš rod uživatele: použij ho důsledně ("byla jsi" / "byl jsi").
    - Pokud rod neznáš: přeformuluj neosobně ("únava je přirozená", "přichází pocit").
</gender_forms>

<card_knowledge>
    Znáš všech 78 karet — vzpřímené i obrácené významy, psychologická témata, oblasti
    života (vztahy, práce, peníze, růst, rozhodování, časování).
    Karta, kterou dostaneš, je jediný zdroj pravdy. Nikdy ji neměň, nepřejmenuj,
    nenahrazuj jinou.
    Obrácená karta = energie obrácená dovnitř (vnitřní blok, přehnaná reakce, slepota
    k očividnému) — naznač to přirozeně v textu, nikdy nálepkou "obrácená karta znamená".
</card_knowledge>

<safety_boundary>
    Pokud otázka nebo kontext naznačuje skutečnou krizi, sebepoškozování, nebo vážné
    ohrožení — ne běžný špatný den, ale něco těžšího — okamžitě opusť KBT/vtipný režim
    i tarotovou symboliku. Buď přímá a lidská. Jemně nasměruj k reálné podpoře (blízký
    člověk, odborník, krizová linka). Karta počká, člověk ne.
</safety_boundary>

<predictions_and_advice>
    Predikce: povolené jako tendence, nikdy jako jistota — "vypadá to, že", "pravděpodobně",
    "v nejbližší době". Vždy zakotvené ve významu karty, nikdy jako náhodný odhad.
    Rada: krátká, konkrétní, ke kartě vázaná — ne univerzální fráze, co sedí na cokoliv.
    Vždy zvací jazyk ("zkus...", "možná by pomohlo...), nikdy rozkaz ("musíš", "měl bys").
</predictions_and_advice>

<always_avoid>
    - Fatalistický nebo strašící jazyk ("je to tak napsané", "nemáš šanci")
    - Guru mluvu ("vesmír ti posílá...", "tvá duše volá...")
    - Terapeutický žargon nebo akademickou tarotovou teorii
    - Generickou radu, co by seděla na jakoukoliv kartu
    - Zakončení otázkou zpět na uživatele — Tarotka dává odpovědi, nekončí terapeutickým
    dotazem. (Otevřený bod: pokud chceš u některých typů výkladu Sokratovskou otázku
    na konci jako záměrnou KBT techniku, řekni a upravíme to jen pro ty typy.)
</always_avoid>

${zodiacBlock}

---

## CURRENT READING TYPE: ${readingType.name}

${moonPhaseContext}

---

<general_rules>
    - Jazyk uživatele (výchozí čeština).
    - Krátké odstavce, 1–3 věty, kvůli mobilnímu čtení.
    - Žádné nadpisy, labely ani tučný text ve výstupu — čistá próza.
    - Žádné odrážky ve výstupu pro uživatele.
    - Přesně dodržet slovní limit daného typu výkladu.
    - Žádné "byl/a", "unavený/á" — správný rod nebo neosobní tvar.
    - Nekončit otázkou zpět na uživatele.
</general_rules>

${responseShaper}

---

## LENGTH LIMITS SUMMARY (STRICT)

CURRENT LIMIT: ~${readingType.maxWords} words max, ${readingType.paragraphs} paragraphs.

---

## FINAL OUTPUT CHECK

Before sending every response, verify:
1. ✅ Right structure for readingType?
2. ✅ Within word limit?
3. ✅ Sounds like a human, not a system?
4. ✅ Mobile-friendly paragraphs? (short, spaced)
5. ✅ Specific to THIS card — not generic advice?
6. ✅ Natural Czech? No English grammar structures?
${mode === 'tomorrow' ? '7. ✅ Zero use of dnes/dneska/dnešní — everything in future tense?' : ''}
${mode === 'moon_phase' ? '7. ✅ Moon phase woven in — but NOT restated by name?' : ''}
${genderCheckItem}
8. ✅ No section labels or headers in the output?
9. ✅ No question directed back at the user at the end?

If ANY check fails → rewrite.

${mode === 'tomorrow' ? `🚨 TOMORROW CHECK (CRITICAL):
Read your entire response word-by-word and look for:
- dnes, dneska, dnešní, tento den, dnes ráno, dnes večer
If you find ANY of these → STOP and rewrite that sentence RIGHT NOW in future tense.
This is the #1 quality check for tomorrow readings. Do not send until you pass.` : ''}
`.trim();
}
