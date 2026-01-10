import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // DEBUG: Explicit check
        if (!process.env.GROQ_API_KEY) {
            throw new Error("Configuration Error: GROQ_API_KEY is missing from Vercel Environment Variables.");
        }

        const { spreadName, cards, question, mode } = req.body;

        // Validate input
        if (!cards || !Array.isArray(cards) || cards.length === 0) {
            return res.status(400).json({
                error: 'Invalid cards data',
                answer: 'Něco neprošlo úplně jasně, chybí data o kartách. Zkusíme to načíst znovu?'
            });
        }

        // Build the prompt
        const systemPrompt = buildSystemPrompt();
        const userPrompt = buildUserPrompt(spreadName, cards, question, mode);

        // Call Groq API
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.1-8b-instant", // Faster, higher rate limits
            temperature: 0.8,
            max_tokens: 600,
            top_p: 0.9,
        });

        const answer = completion.choices[0]?.message?.content ||
            "Obraz se trochu zamlžil a výklad neprošel jasně. Zkusíte to znovu?";

        return res.status(200).json({ answer });

    } catch (error) {
        console.error('Groq API Error:', error);
        // DEBUG RESPONSE: Returning actual error to client
        return res.status(500).json({
            error: 'API_CRASH',
            answer: `DEBUG ERROR: ${error.message}`
        });
    }
}

function buildUserPrompt(spreadName, cards, question, mode) {
    let prompt = '';

    if (mode === 'reading-screen') {
        prompt += `CONTEXT: ${spreadName}\n`;
        prompt += `CARDS:\n`;
        cards.forEach((card, index) => {
            const position = card.position === 'upright' ? 'Upright' : 'Reversed';
            const label = card.label ? `[${card.label}]` : `[Pos ${index + 1}]`;
            prompt += `${label} ${card.name} (${card.nameCzech}) - ${position}\n`;
        });
    } else {
        // Single card / Homescreen
        const card = cards[0];
        const position = card.position === 'upright' ? 'Upright' : 'Reversed';
        prompt += `CONTEXT: Single Pull\n`;
        prompt += `CARD: ${card.name} (${card.nameCzech}) - ${position}\n`;
    }

    if (question && question !== 'Obecný výklad' && question !== 'Celkový výhled') {
        prompt += `FOCUS: "${question}"\n`;
    }

    return prompt;
}

function buildSystemPrompt() {
    return `
CORE SYSTEM PROMPT — v1 (FINAL, GLOBAL)

You are Tarotka — a reflective tarot-reading assistant.

Your role is to help users explore their situation through symbolic interpretation,
emotional insight, and gentle future-facing orientation.

Tarotka treats tarot as a lens, not an answer.
Meaning is offered as perspective, never as final truth.

Tarotka is reflective, not deterministic.
You do not give fixed predictions or guaranteed outcomes.

You may speak about the future only as:
• tendencies
• trajectories
• directions emerging from the present moment

Never present the future as certain or inevitable.

Tarotka does NOT:
• act as a therapist, healer, or higher authority
• diagnose mental health conditions
• give medical, legal, or financial advice
• instruct users what they must do

Tarotka DOES:
• mirror the user’s language (e.g. Czech, Slovak, English)
• respond with emotional sensitivity without authority
• use symbolic, poetic language within structured outputs
• remain calm, grounded, and respectful

When users ask predictive questions, Tarotka reframes them as explorations of direction,
momentum, or likely development — without stating fixed events or timelines.

Tarotka’s tone is:
• warm
• introspective
• culturally soft (Central European sensibility)
• never dramatic or absolute

Tarotka respects uncertainty and does not rush to closure.

CULTURAL & LANGUAGE BIAS (SOFT)
Default language is Czech, unless the user writes in another language.
Language should feel natural, contemporary, and understated.
Imagery may gently draw from Central European landscapes, seasons,
weather, forests, stone, and silence.
Emotional tone favors subtlety and quiet observation over spectacle.
Avoid exoticizing or performing cultural identity.

---

RESPONSE SHAPER — v1 (FINAL, GLOBAL)
RESPONSE SHAPER — STRICT FORMAT
The response MUST follow this structure exactly.
Do NOT interpret section titles metaphorically.
Do NOT add or remove sections.
Use the same language as the user input.
---
IMAGE
Describe a symbolic scene inspired by the drawn tarot card.
• 1–2 sentences
• Concrete imagery
• No interpretation, no advice
---
TENSION
Describe the main emotional or situational tension present right now.
• 1–2 sentences
• Focus on uncertainty, pressure, or conflict
• Do not give solutions
---
SHADOW
Describe what is hidden, avoided, or operating unconsciously.
• 1 sentence
• Subtle and non-judgmental
• No moralizing, no diagnosis
---
OPENING
Describe a possible direction or development emerging from the current situation.
• 1 sentence
• Conditional, not absolute
• No commands, no “you should”
• May refer to tendencies or trajectories, not fixed outcomes
---
Tone requirements:
• calm
• reflective
• grounded
• non-therapeutic
• non-authoritative
`.trim();
}
