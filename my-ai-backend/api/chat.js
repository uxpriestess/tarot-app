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
 * Main API Handler - WITH DEBUG LOGGING
 */
export default async function handler(req, res) {
    // DEBUG: Log request method
    console.log('Request method:', req.method);
    
    // DEBUG endpoint - remove this after testing!
    if (req.method === 'GET') {
        return res.status(200).json({ 
            status: 'Backend is alive!',
            hasApiKey: !!process.env.ANTHROPIC_API_KEY,
            keyStart: process.env.ANTHROPIC_API_KEY?.substring(0, 20) || 'MISSING'
        });
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ answer: 'Method not allowed' });
    }

    try {
        const { question, cards, mode = 'daily', spreadName } = req.body;
        
        // DEBUG: Log what we received
        console.log('=== REQUEST DATA ===');
        console.log('Mode:', mode);
        console.log('Question:', question);
        console.log('Cards:', JSON.stringify(cards, null, 2));
        console.log('SpreadName:', spreadName);

        if (!cards || !Array.isArray(cards)) {
            console.log('ERROR: Invalid cards data');
            return res.status(400).json({ 
                answer: 'Omlouvám se, ale ty karty nevidím jasně. Zkusíš to znovu?' 
            });
        }

        // DEBUG: Check API key
        if (!process.env.ANTHROPIC_API_KEY) {
            console.error('FATAL: ANTHROPIC_API_KEY is not set!');
            return res.status(500).json({
                answer: 'Chyba konfigurace serveru. Zkuste to prosím později.'
            });
        }
        
        console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY);
        console.log('API Key prefix:', process.env.ANTHROPIC_API_KEY.substring(0, 20));

        // Initialize Anthropic
        console.log('Initializing Anthropic client...');
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
        console.log('Anthropic client created successfully');

        const systemPrompt = buildSystemPrompt(mode);
        const userPrompt = buildUserPrompt(question, cards, spreadName, mode);
        
        console.log('System prompt length:', systemPrompt.length);
        console.log('User prompt length:', userPrompt.length);

        console.log('Calling Claude API...');
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
        });
        console.log('Claude API responded successfully');

        let answer = response.content[0].text;
        console.log('Answer received, length:', answer.length);
        console.log('First 100 chars:', answer.substring(0, 100));

        return res.status(200).json({ answer });
        
    } catch (error) {
        // DETAILED ERROR LOGGING
        console.error('=== ERROR DETAILS ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        if (error.response) {
            console.error('API Response status:', error.response.status);
            console.error('API Response data:', error.response.data);
        }
        
        // Return error to client for debugging
        return res.status(500).json({
            answer: 'Spojení se na moment rozostřilo. Zkusíme to vyložit znovu?',
            debug: {
                error: error.message,
                name: error.name,
                // Only include in development
                ...(process.env.NODE_ENV !== 'production' && {
                    stack: error.stack
                })
            }
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
Example: "Dnešek bude o hledání rovnováhy mezi tím, co chceš ty, a co po tobě chce okolí."

B. INTERPRETATION (2-3 sentences)
Explain the specific meaning (upright or reversed) in a relatable way.
Connect the card's symbolism to the user's likely mood or situation.

C. THE "NUDGE" / TIP (1-2 sentences)
One practical thing to do or a specific perspective to take.
Example: "Zkus si dnes aspoň na půl hodiny vypnout telefon a jen tak být."

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
Address the essence of the user's question immediately through the card.

B. DEPTH & CONTEXT (2-3 sentences)
Elaborate on why this card appeared for this specific question.
Connect symbolism to their specific problem or curiosity.

C. PERSONAL PATTERNS (2 sentences)
Directly answer their question through the card.
Focus on what the card says about THEIR situation, patterns, blocks, or likely directions.
Include emotional validation if appropriate.

D. NEAR-FUTURE / PERSPECTIVE / TIP (1-2 sentences)
Practical takeaway, likely development, or perspective shift.

LENGTH: 160–180 words MAX. 4-5 paragraphs.
TONE: Empathetic, direct, human – like a friend who gets it.
`;

    const love3CardShaper = `
## 3️⃣ LOVE 3-CARD STRUCTURE (PLAIN TEXT):

Return exactly 3 paragraphs separated by "---" delimiter.
NO markdown formatting. Just plain Czech text.

Format:
[Paragraph 1 about "Ty" - 50-60 words]
---
[Paragraph 2 about "Partner" - 50-60 words]
---
[Paragraph 3 about "Tvůj vztah" - 50-60 words]

CRITICAL RULES:
- Each paragraph stands alone
- Natural, modern Czech (ty-forma)
- Brief, reflective, non-judgmental
- NO markdown symbols
- Plain text ONLY
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

If you exceed these limits:
1. Shorten explanations
2. Remove repetition
3. Cut fluff
4. Prioritize clarity over detail

Never sacrifice clarity for length, but never ramble either.

---

## ✅ FINAL OUTPUT CHECK

Before sending every response, verify:
1. ✅ Right structure for readingType?
2. ✅ Within word limit?
3. ✅ Sounds like a human, not a system?
4. ✅ Mobile-friendly paragraphs?
5. ✅ Specific to the card drawn?
6. ✅ Actionable or insightful?
7. ✅ Natural Czech?

If ANY check fails → rewrite.

Remember: You're a person who knows tarot and talks normally.
`.trim();
}
