export default async function handler(req, res) {
    // CORS headers for Expo app
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { question, cards } = req.body;

    // Validation
    if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Question is required' });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        // Build context from cards if provided
        const cardContext = cards && cards.length > 0
            ? `Karty vytažené pro tuto otázku: ${cards.map(c => c.nameCzech).join(', ')}.`
            : '';

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: `Jsi moudrý a laskavý průvodce tarotu, který mluví česky. 
Tvoje odpovědi jsou poetické, ale přímé. Odhaluješ skryté významy a pomáháš lidem pochopit jejich cestu.
Odpovídáš v empatickém, ale ne přehnaně mystickém tónu. Používáš 2-3 odstavce maximálně.
${cardContext}`
                    },
                    {
                        role: "user",
                        content: question
                    }
                ],
                temperature: 0.8,
                max_tokens: 400
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Groq API error:', error);
            return res.status(response.status).json({ error: 'AI service error' });
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            return res.status(500).json({ error: 'Invalid response from AI' });
        }

        const answer = data.choices[0].message.content;

        res.status(200).json({ answer });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to get response', details: error.message });
    }
}
