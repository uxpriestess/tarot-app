import Anthropic from '@anthropic-ai/sdk';

const READING_TYPES = {
    daily: {
        name: 'daily',
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
        maxWords: 180,
        paragraphs: '4-5'
    }
};

/**
 * Main API Handler
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ answer: 'Method not allowed' });
    }

    try {
        const { question, cards, mode = 'daily', spreadName } = req.body;
        console.log(`--- API Request: ${mode} ---`);
        console.log("Cards:", JSON.stringify(cards));

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

        const systemPrompt = buildSystemPrompt(mode);
        const userPrompt = buildUserPrompt(question, cards, spreadName, mode);

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
        });

        let answer = response.content[0].text;
        console.log("AI Raw Output (first 100 chars):", answer.substring(0, 100));

        // Parse JSON for love readings
        if (mode === 'love_3_card') {
            try {
                console.log('=== PARSING LOVE READING ===');
                console.log('Raw answer length:', answer.length);
                console.log('First 100 chars:', answer.substring(0, 100));

                // Clean up the response
                let cleanAnswer = answer.trim();

                // Remove markdown code blocks
                cleanAnswer = cleanAnswer.replace(/```json\s?/g, '').replace(/```/g, '');

                // Find JSON boundaries (first { to last })
                const firstBrace = cleanAnswer.indexOf('{');
                const lastBrace = cleanAnswer.lastIndexOf('}');

                if (firstBrace === -1 || lastBrace === -1) {
                    throw new Error('No JSON object found in response');
                }

                // Extract just the JSON part
                cleanAnswer = cleanAnswer.substring(firstBrace, lastBrace + 1);

                console.log('Cleaned JSON:', cleanAnswer.substring(0, 100));

                // Parse the JSON
                const parsed = JSON.parse(cleanAnswer);
                console.log('✅ JSON parsed successfully');
                console.log('Keys found:', Object.keys(parsed));

                // Validate required fields
                if (!parsed.ty || !parsed.partner || !parsed.vztah) {
                    console.warn('⚠️ Missing required fields');
                    console.warn('Has ty:', !!parsed.ty);
                    console.warn('Has partner:', !!parsed.partner);
                    console.warn('Has vztah:', !!parsed.vztah);
                }

                // Convert to array format that React expects
                const paragraphs = [
                    parsed.ty || '',
                    parsed.partner || '',
                    parsed.vztah || ''
                ].filter(p => p.length > 0);

                // Return as delimited string (so universe.ts doesn't need changes)
                answer = paragraphs.join('\n---\n');

                console.log('✅ Converted to', paragraphs.length, 'paragraphs');
                console.log('Paragraph lengths:', paragraphs.map(p => p.split(' ').length + ' words'));

            } catch (parseError) {
                console.error('❌ JSON parsing failed:', parseError.message);
                console.error('Error type:', parseError.name);
                console.error('Raw answer (first 200 chars):', answer.substring(0, 200));

                // Check if it's already delimiter-separated
                if (answer.includes('---')) {
                    console.log('⚠️ Response appears to be delimiter-separated, not JSON');
                    console.log('Using as-is (fallback to delimiter format)');
                    // Don't modify - let it pass through as delimited text
                } else {
                    console.error('⚠️ Response is neither JSON nor delimiter-separated');
                    // Return as-is and hope frontend can handle it
                }
            }
        }

        return res.status(200).json({ answer });

    } catch (error) {
        console.error('=== ERROR DETAILS ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        return res.status(500).json({
            answer: 'Spojení se na moment rozostřilo. Zkusíme to vyložit znovu?'
        });
    }
}

/**
 * Builds a structured user prompt based on the card(s) and question
 */
function buildUserPrompt(question, cards, spreadName, mode) {
    const cardsInfo = cards.map((c, idx) => {
        const labelStr = c.label ? ` (${c.label})` : '';
        return `Karta ${idx + 1}${labelStr}: ${c.nameCzech || c.name} (${c.position === 'reversed' ? 'Obrácená' : 'Vzpřímená'})`;
    }).join('\n');

    let prompt = `OTÁZKA UŽIVATELE: "${question || 'Obecný výklad'}"\n\nVYTAŽENÉ KARTY:\n${cardsInfo}`;

    if (spreadName) {
        prompt += `\n\nTYP VÝKLADU: ${spreadName}`;
    }

    return prompt;
}

/**
 * Builds the system prompt with specific shaper instructions
 */
function buildSystemPrompt(mode) {
    const readingType = READING_TYPES[mode] || READING_TYPES.daily;

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
## 4️⃣ MOON PHASE STRUCTURE:

LENGTH: 140–160 words MAX.
`;

    let responseShaper;
    if (mode === 'daily') {
        responseShaper = dailyShaper;
    } else if (mode === 'reading-screen') {
        responseShaper = readingScreenShaper;
    } else if (mode === 'custom_question') {
        responseShaper = customQuestionShaper;
    } else if (mode === 'love_3_card') {
        responseShaper = love3CardShaper;
    } else if (mode === 'moon_phase') {
        responseShaper = moonPhaseShaper;
    } else {
        responseShaper = dailyShaper;
    }

    return `
🔮 TAROTKA – CORE SYSTEM PROMPT (v5)

## WHO YOU ARE

You are Tarotka – a friendly, modern tarot reader for Czech Gen Z and Millennials.

Tarotka speaks like a real person having coffee with a friend:
- NOT a mystical guru
- NOT a therapist or life coach
- NOT a system or AI

Tarotka explains tarot in a clear, relatable, and everyday way, connecting card meanings to real life.

---

## 🔑 CURRENT READING TYPE: ${readingType.name}

---

## PREDICTIONS & ADVICE (ALLOWED)

Predictions – Tarotka MAY and SHOULD predict likely developments and near-future vibes.
Advice – Tarotka MAY and SHOULD advise practical suggestions and perspective shifts.

---

## WHAT TAROTKA AVOIDS

Tarotka does NOT use fatalistic language or claim absolute destiny. She avoid walls of text and mystical guru language.

---

🔮 RESPONSE SHAPER – FRIENDLY OUTPUT (v5)

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

If ANY check fails → rewrite.

Remember: You're a person who knows tarot and talks normally.
`.trim();
}