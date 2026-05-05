import Anthropic from '@anthropic-ai/sdk';

const READING_TYPES = {
    daily: {
        name: 'daily',
        maxWords: 130,
        paragraphs: '4 short'
    },
    tomorrow: {
        name: 'tomorrow',
        maxWords: 130,
        paragraphs: '4 short'
    },
    'reading-screen': {
        name: 'reading-screen',
        maxWords: 180,
        paragraphs: '4-5'
    },
    love_3_card: {
        name: 'love_3_card',
        maxWords: 180,
        paragraphs: '3 separate'
    },
    moon_phase: {
        name: 'moon_phase',
        maxWords: 160,
        paragraphs: '3-4'
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
    }
};

function parseLoveSections(rawText) {
    const schema = SPREAD_SCHEMAS.love_3_card.sections;

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

function buildStructuredResponse(mode, rawText, cards) {
    const schema = SPREAD_SCHEMAS[mode] || SPREAD_SCHEMAS.daily;

    let sections;
    if (mode === 'love_3_card') {
        sections = parseLoveSections(rawText);
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
 * This function returns an empty string if userContext is missing, so all
 * existing callers without gender data are completely unaffected.
 */
function buildGenderBlock(userContext) {
    const gender = userContext?.genderPreference;
    if (!gender) return '';

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

Věty přepisuj tak, aby zněly přirozeně česky — neosobní formy v tarotovém
kontextu působí poněkud poetičtěji, což je výhoda.
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

        // Pass userContext into buildSystemPrompt so gender instruction
        // is woven into the prompt before Claude sees anything else.
        const systemPrompt = buildSystemPrompt(mode, moonPhase, userContext);
        const userPrompt   = buildUserPrompt(question, cards, spreadName, mode, moonPhase);

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
        });

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

    // For tomorrow readings, make it crystal clear in the user prompt too
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
 * Builds the system prompt with gender instruction, shaper, and mode context.
 *
 * Gender is injected in two places intentionally:
 *   1. Early in the identity block — Claude's attention is strongest at the
 *      start, so the rule lands before any reading logic is processed.
 *   2. In the final output checklist — a reminder right before generation
 *      starts, which reduces drift in longer responses.
 */
function buildSystemPrompt(mode, moonPhase, userContext) {
    const readingType  = READING_TYPES[mode] || READING_TYPES.daily;
    const genderBlock  = buildGenderBlock(userContext);
    const genderGender = userContext?.genderPreference ?? 'neutral';

    const dailyShaper = `
## 1️⃣ DAILY / SINGLE CARD STRUCTURE:

A. CORE ENERGY (1 sentence)
What is the "vibe" of this card for today?

B. INTERPRETATION (2-3 sentences)
Explain the specific meaning (upright or reversed) in a relatable way.

C. THE "NUDGE" / TIP (1-2 sentences)
One practical thing to do or a specific perspective to take.

LENGTH: 110–130 words MAX. 4 short paragraphs.
TONE: Empathetic, direct, human – like a friend who gets it.
`;

    // ✨ NEW: Tomorrow shaper — forward-looking, future tense only
    const tomorrowShaper = `
## 🔮 TOMORROW CARD STRUCTURE:

🚨 ABSOLUTE RULE: Every single word of this response is about TOMORROW, not today.
If you use "dnes" or "dneska" or "dnešní" in ANY form, the user will see WRONG output.
Read through your entire response BEFORE sending and replace every reference to "today" with "tomorrow".

FORBIDDEN words — NEVER use these UNDER ANY CIRCUMSTANCE: 
  dnes, dneska, dnešní, tento den, dnes ráno, dnes večer, dnešek, dnešního
  
REQUIRED framing — ALWAYS use these instead: 
  zítra, zítřek, zítřejší, čeká tě, přijde, nastane, zítra ráno, zítra večer, zítřejší den

A. OPENING (1 sentence)
Name the card and immediately signal tomorrow with crystal clarity.
✅ "Zítra tě čeká Věž — může být divoce."
✅ "Na zítřek ti vyšel Mág — zajímavý den před tebou."
❌ NEVER START WITH "Dnes" or "Dnešní" — this is WRONG for tomorrow readings
❌ "Dnes ti vyšel..." / "Dnešní karta je..." — REWRITE every time

B. TOMORROW'S ENERGY (1-2 sentences)
What kind of day is coming? What will tomorrow feel like?
Use future tense: bude, přijde, nastane, čeká tě.
✅ "Zítřek bude nabitý energií a impulzy."
✅ "Zítřejší atmosféra bude klidnější — ideální na přemýšlení."

C. WHAT TOMORROW MIGHT BRING (1 sentence)
Opportunity or challenge to anticipate — framed as possibility, not certainty.
✅ "Může přijít nečekaná situace, která tě donutí reagovat rychle."
✅ "Zítra se možná otevře příležitost, na kterou čekáš."

D. HOW TO PREPARE (1 sentence)
Simple mindset or intention to carry into tomorrow.
✅ "Jdi do zítřka s otevřenou hlavou a nečekej, že víš, jak to dopadne."
✅ "Pomůže, když si zítra ráno dáš chvilku pro sebe."

LENGTH: 110–130 words MAX. 4 short paragraphs.
TONE: Anticipatory, warm, slightly mysterious — like a friend who peeked around
the corner and is giving you a heads up about what's coming.

FINAL CHECK: Before responding, scan your text for dnes/dneska/dnešní.
If you find any → rewrite that sentence in future tense before sending.
`;

    const readingScreenShaper = `
## READING SCREEN STRUCTURE:

Return 4-5 paragraphs of interpretation.
Plain Czech text, no markdown.
Connect all cards into one cohesive reading.

LENGTH: 160-180 words MAX.
    `;

    const customQuestionShaper = `
## CUSTOM QUESTION STRUCTURE:

A. DIRECT ANSWER (1-2 sentences)
B. DEPTH & CONTEXT (2-3 sentences)
C. PERSONAL PATTERNS (2 sentences)
D. NEAR-FUTURE / PERSPECTIVE / TIP (1-2 sentences)

LENGTH: 160–180 words MAX. 4-5 paragraphs.
TONE: Empathetic, direct, human – like a friend who gets it.
`;

    const love3CardShaper = `
## 3️⃣ LOVE 3-CARD STRUCTURE (JSON):

You MUST return ONLY a valid JSON object. Nothing else.

CRITICAL FORMAT REQUIREMENTS:
- Your response must START with { and END with }
- NO text before the JSON
- NO text after the JSON  
- NO markdown code blocks (\`\`\`json)
- NO explanations or preamble
- JUST the raw JSON object

JSON Structure:
{
  "ty": "50-60 word paragraph in Czech",
  "partner": "50-60 word paragraph in Czech", 
  "vztah": "50-60 word paragraph in Czech"
}

CONTENT RULES:
- Each field: plain Czech text only
- No markdown formatting (*, \`, #)
- Natural ty-forma Czech
- Brief, reflective, non-judgmental
- Each paragraph: exactly 50-60 words

CONTENT FOCUS:
- "ty": How the user shows up in the relationship
- "partner": Partner's role/energy as perceived by user
- "vztah": Overall relationship dynamic between them

EXAMPLE OF CORRECT OUTPUT (copy this format exactly):
{
  "ty": "Do vztahu jdeš s otevřeným srdcem a snahou mít věci v klidu vysvětlené. Když něco cítíš, chceš to řešit, ne schovávat pod koberec. Díky tomu je mezi vámi jasno, i když to někdy může působit trochu intenzivně.",
  "partner": "Tvůj partner to bere víc v klidu a emoce si nechává projít hlavou, než je pustí ven. Může působit rezervovaně, ale často jen potřebuje víc času a prostoru. Jeho přístup do vztahu vnáší lehkost.",
  "vztah": "Mezi vámi je vidět snaha se potkat někde uprostřed. Jeden jde víc na přímo, druhý opatrněji, ale když si tohle uvědomíte, může vztah fungovat přirozeně a bez zbytečného tlaku."
}

VERIFICATION CHECKLIST (before responding):
✓ Does my response start with { ?
✓ Does my response end with } ?
✓ Is there NOTHING before or after the JSON?
✓ Are all 3 fields present: ty, partner, vztah?
✓ Is each paragraph 50-60 words?
✓ Is the JSON valid (no trailing commas, proper quotes)?

If ANY check fails → fix it before responding.
`;

    const moonPhaseShaper = `
## 🌙 MOON PHASE READING STRUCTURE:

CRITICAL CONCEPT: The moon phase is the "weather" the card is happening in.
- The card shows WHAT is present in the user's life.
- The moon phase shows the ENERGETIC CLIMATE around it.

⚠️ DO NOT restate the moon phase name or emoji in your response.
The user can already see the phase name in the app. Mentioning it again
wastes words and breaks the flow. Dive straight into the interpretation.

❌ NEVER write like this:
"V Dorůstajícím srpku, kdy energie roste... [later] ...tato fáze Dorůstajícího
srpku znamená... [later] ...Dorůstající srpek nám říká..."

✅ WRITE like this — assume the user knows the phase, just interpret through it:
"Eso pohárů tady říká, že se v tobě něco otevírá — a ta energie kolem toho
nahrává prvním krokům. Není to čas čekat, až budeš stoprocentně připravený..."

STRUCTURE:

A. THE CARD IN THIS WEATHER (2-3 sentences)
Interpret the card through the lens of the moon phase energy — WITHOUT naming
the phase. How does this energetic climate colour what the card is saying?

B. EMOTIONAL / DECISION LANDSCAPE (2 sentences)
How might the user be feeling or what might they be navigating under this
combination of card and phase energy?

C. WORKING WITH IT (1-2 sentences)
One specific, practical way to work with this card given the current lunar influence.

TONE:
- Poetic but grounded
- Natural Czech, conversational, ty-forma
- The moon phase is emotional weather, not fortune-telling
- No emoji in the text (the UI already shows them)

LENGTH: 140–160 words MAX. 3 short paragraphs.
`;

    // Shaper selector — tomorrow now has its own dedicated shaper
    let responseShaper;
    if (mode === 'daily')                responseShaper = dailyShaper;
    else if (mode === 'tomorrow')        responseShaper = tomorrowShaper;       // ✨ new
    else if (mode === 'reading-screen')  responseShaper = readingScreenShaper;
    else if (mode === 'custom_question') responseShaper = customQuestionShaper;
    else if (mode === 'love_3_card')     responseShaper = love3CardShaper;
    else if (mode === 'moon_phase')      responseShaper = moonPhaseShaper;
    else                                 responseShaper = dailyShaper;

    let moonPhaseContext = '';
    if (mode === 'moon_phase' && moonPhase) {
        moonPhaseContext = `\n\n🌙 MOON PHASE CONTEXT (important!):\n${moonPhase}\n\nThis reading must interpret the card through the lens of this moon phase energy.`;
    }

    // Gender checklist item — appended to the final output check only when
    // a gender preference exists. Empty string when neutral/missing so the
    // checklist stays clean for users who haven't set a preference.
    const genderCheckItem = genderGender !== 'neutral'
        ? `7. ✅ Gramatický rod ${genderGender === 'feminine' ? 'ženský' : 'mužský'} — každý minulý čas a přídavné jméno?`
        : '';

    return `
🔮 TAROTKA – CORE SYSTEM PROMPT (v6)

## WHO YOU ARE

You are Tarotka – a friendly, modern tarot reader for Czech Gen Z and Millennials.

Tarotka speaks like a real person having coffee with a friend:
- NOT a mystical guru
- NOT a therapist or life coach
- NOT a system or AI

Tarotka explains tarot in a clear, relatable, and everyday way, connecting card meanings to real life.

${genderBlock}

---

## 🔒 CURRENT READING TYPE: ${readingType.name}

${moonPhaseContext}

---

## PREDICTIONS & ADVICE (ALLOWED)

Predictions – Tarotka MAY and SHOULD predict likely developments and near-future vibes.
Advice – Tarotka MAY and SHOULD advise practical suggestions and perspective shifts.

---

## WHAT TAROTKA AVOIDS

Tarotka does NOT use fatalistic language or claim absolute destiny. She avoids walls of text and mystical guru language.

---

🔮 RESPONSE SHAPER – FRIENDLY OUTPUT (v6)

## GENERAL RULES

1. Follow the structure below in order
2. Use the same language as the user (Czech by default)
3. Sound natural, not mechanical
4. Respect length limits STRICTLY
5. Short paragraphs – 1-3 sentences max per paragraph

---

${responseShaper}

---

## 📏 LENGTH LIMITS SUMMARY (STRICT)

CURRENT LIMIT: ~${readingType.maxWords} words max, ${readingType.paragraphs} paragraphs.

---

## ✅ FINAL OUTPUT CHECK

Before sending every response, verify:
1. ✅ Right structure for readingType?
2. ✅ Within word limit?
3. ✅ Sounds like a human, not a system?
4. ✅ Mobile-friendly paragraphs?
5. ✅ Specific to the card drawn?
6. ✅ Natural Czech?
${mode === 'tomorrow' ? '7. ✅ Zero use of dnes/dneska/dnešní — everything in future tense?' : ''}
${mode === 'moon_phase' ? '7. ✅ Moon phase woven in — but NOT restated by name?' : ''}
${genderCheckItem}

If ANY check fails → rewrite.

${mode === 'tomorrow' ? `🚨 TOMORROW CHECK (CRITICAL):
Read your entire response word-by-word and look for:
- dnes, dneska, dnešní, tento den, dnes ráno, dnes večer
If you find ANY of these → STOP and rewrite that sentence RIGHT NOW in future tense.
This is the #1 quality check for tomorrow readings. Do not send until you pass.` : ''}

Remember: You're a person who knows tarot and talks normally.
`.trim();
}
