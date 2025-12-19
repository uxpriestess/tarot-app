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
            ? `Vytažené karty: ${cards.map(c => c.nameCzech).join(', ')}.`
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
                        content: `Jsi moudrý kamarád, který rozumí tarotu. Píšeš česky, tykáš a mluvíš přímo.

TVŮJ ÚKOL:
1. Odpověz PŘÍMO na otázku uživatele
2. Použij vytaženou kartu k odpovědi - vysvětli, JAK karta ovlivňuje jejich situaci
3. Buď konkrétní a akční - ne vágní "proroctví"

STYL:
- Hovorová čeština: "pohov", "fér", "jasně", "prostě"
- 2-4 věty MAX
- Mluv přímo k jejich otázce, ne obecně o kartě
- Dej konkrétní rady nebo perspektivu

CO NEDĚLAT:
- ❌ Nepíšeš "vesmír ti posílá", "karty říkají"
- ❌ Nepíšeš obecné popisy karty
- ❌ Nepíšeš vágní "všechno bude dobře"
- ❌ Nezačínáš "karta ukazuje..." - rovnou řekni CO to znamená pro jejich otázku

PŘÍKLAD:
Otázka: "Mám změnit práci?"
Karta: Hvězda
✅ DOBŘE: "Hvězda říká jasně - jdi za tím. Máš na to, jen potřebuješ víc věřit sám sobě než těm 'co kdyby' v hlavě."
❌ ŠPATNĚ: "Hvězda je karta naděje a nových začátků. Vesmír ti ukazuje, že je čas na změnu."

${cardContext}

Odpověz TEĎ na jejich otázku pomocí karty. Buď konkrétní, upřímný a užitečný.`
                    },
                    {
                        role: "user",
                        content: question
                    }
                ],
                temperature: 0.8,
                max_tokens: 300
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
