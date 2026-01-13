# 🔧 TAROTKA AI - BACKEND IMPLEMENTATION GUIDE

## Overview

This guide shows you how to implement the Tarotka AI prompt in your **Anthropic Claude API backend** (or any LLM API like OpenAI, Groq, etc.).

---

## Architecture

```
React Native (Expo) 
    ↓ [HTTP POST]
    ↓ Request: { spreadName, cards[], question }
Vercel/Node Backend
    ↓ [Parse & Validate]
    ↓ [Build Prompt]
Anthropic API (Claude)
    ↓ [LLM Response]
    ↓ Response: { answer: "..." }
React Native
```

---

## 1. API Endpoint Structure

### File: `/api/chat.js` (or `.ts`)

```javascript
// Example for Vercel serverless function using Anthropic SDK
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
    const { spreadName, cards, question, mode } = req.body;

    // Validate input
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid cards data',
        answer: 'Bohužel tady chybí nějaké karty. Reload a try again?' 
      });
    }

    // Build the prompt
    const systemPrompt = buildSystemPrompt(mode);
    const userPrompt = buildUserPrompt(spreadName, cards, question, mode);

    // Call Claude API
    const completion = await client.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 600,
      temperature: 0.8,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt }
      ],
    });

    const answer = completion.content[0]?.text || 
      "Real talk: něco se pokazilo with generating reading. Zkus to znovu?";

    return res.status(200).json({ answer });

  } catch (error) {
    console.error('Claude API Error:', error);
    return res.status(500).json({ 
      error: 'API error',
      answer: `Nepodařilo se spojit s osudem. (Error: ${error.message})`
    });
  }
}
```

---

## 2. System Prompt Builder

**CRITICAL:** The system prompt is your entire Tarotka AI instructions document.

```javascript
function buildSystemPrompt(mode) {
  // Get reading type config, default to daily
  const readingType = READING_TYPES[mode] || READING_TYPES.daily;
  
  return `
🔮 TAROTKA — CORE SYSTEM PROMPT (v5)

[INSTRUCTIONS HERE]
...
  `.trim();
}
```

**Pro Tip:** Store the prompt in a separate file and read it:

```javascript
import fs from 'fs';
import path from 'path';

function buildSystemPrompt() {
  const promptPath = path.join(process.cwd(), 'prompts', 'tarotka-v2.md');
  return fs.readFileSync(promptPath, 'utf-8');
}
```

---

## 3. User Prompt Builder

This converts the TypeScript payload into natural language instructions for the LLM:

```javascript
function buildUserPrompt(spreadName, cards, question, mode) {
  // Determine spread type and build context
  let prompt = '';

  // For multi-card spreads (reading-screen mode)
  if (mode === 'reading-screen') {
    prompt += `Uživatel provedl výklad pomocí rozložení: "${spreadName}"\n\n`;
    prompt += `Karty v rozložení:\n`;
    
    cards.forEach((card, index) => {
      const position = card.position === 'upright' ? 'vzpřímená' : 'obrácená';
      const label = card.label || `Pozice ${index + 1}`;
      prompt += `${index + 1}. ${label}: ${card.nameCzech} (${card.name}) - ${position}\n`;
    });

    if (question && question !== 'Obecný výklad' && question !== 'Celkový výhled') {
      prompt += `\nUživatelská otázka: "${question}"\n`;
    }

    prompt += `\nProsím, poskytni integrovaný výklad všech karet v kontextu tohoto rozložení. `;
    prompt += `Pamatuj: Create ONE cohesive narrative that shows how cards interact, not separate card-by-card interpretations.`;
  } 
  // For single card (homescreen mode)
  else {
    const card = cards[0];
    const position = card.position === 'upright' ? 'vzpřímená' : 'obrácená';
    
    prompt += `Uživatel se zeptal: "${question}"\n\n`;
    prompt += `Vytažená karta: ${card.nameCzech} (${card.name}) - ${position}\n\n`;
    prompt += `Odpověz na otázku pomocí této karty jako lens (perspektivní nástroj). `;
    prompt += `Buď konkrétní a actionable. 3-4 věty maximum.`;
  }

  return prompt;
}
```

---

## 4. Advanced: Spread-Specific Context Injection

For even better results, inject spread-specific reminders:

```javascript
function buildUserPrompt(spreadName, cards, question, mode) {
  let prompt = buildBasicPrompt(spreadName, cards, question, mode);

  // Add spread-specific reminder
  const spreadGuides = {
    'Láska a vztahy': `
      REMINDER: Compare card 1 (You) vs. card 2 (Partner). 
      Card 3 (Relationship) shows what emerges from their interaction.
      Look for compatibility, conflicts, or growth potential.
    `,
    'Finance': `
      REMINDER: This is a Problem→Challenge→Outcome structure.
      Show how current state (card 1) + handling challenge (card 2) = outcome (card 3).
    `,
    'Tělo a mysl': `
      REMINDER: Look for disconnects between Body, Mind, Spirit.
      Show how they influence each other and which needs attention.
    `,
    'Měsíční fáze': `
      REMINDER: This is a NARRATIVE ARC across moon phases.
      Tell a story from New Moon through Full Moon to the Lesson.
    `,
    'Rozhodnutí': `
      REMINDER: COMPARE paths A and B honestly.
      Card 3 reveals what to prioritize in the decision.
    `,
    '7 dní': `
      REMINDER: Keep it brief. Identify overall trend + 1-2 critical days.
      Don't deep-dive every single day.
    `,
  };

  if (spreadGuides[spreadName]) {
    prompt += `\n\n${spreadGuides[spreadName]}`;
  }

  return prompt;
}
```

---

## 5. Model Selection & Parameters

### Recommended Models:

| Provider | Model | Pros | Cons |
|----------|-------|------|------|
| **Anthropic** | `claude-3-5-sonnet-20240620` | Balanced, excellent Czech | Slightly slower than Haiku |
| **Anthropic** | `claude-3-5-haiku-20241022` | Faster, cheaper | Less nuanced |
| **OpenAI** | `gpt-4o` | Excellent quality | More expensive |
| **Groq** | `llama-3.1-70b-versatile` | Extremely fast | Variable quality |

### Optimal Parameters:

```javascript
{
  temperature: 0.8,     // Balance creativity & consistency
  max_tokens: 500,      // Enforce brevity (3-6 sentences = ~100-200 tokens)
  top_p: 0.9,          // Keep quality high
  frequency_penalty: 0.3, // Reduce repetitive phrasing (OpenAI only)
  presence_penalty: 0.2,  // Encourage varied vocabulary (OpenAI only)
}
```

---

## 6. Error Handling

### Comprehensive Error Coverage:

```javascript
export default async function handler(req, res) {
  try {
    // 1. Validate request method
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        error: 'Method not allowed',
        answer: 'Real talk: něco se pokazilo. Zkus to znovu?'
      });
    }

    // 2. Parse body
    const { spreadName, cards, question, mode } = req.body;

    // 3. Validate cards array
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ 
        error: 'Missing cards',
        answer: 'Bohužel tady chybí nějaké karty. Reload a try again?'
      });
    }

    // 4. Validate card structure
    for (const card of cards) {
      if (!card.name || !card.nameCzech || !card.position) {
        return res.status(400).json({
          error: 'Invalid card structure',
          answer: 'Hmm, tahle karta není správně loaded. Možná bug? Zkus reload.'
        });
      }
    }

    // 5. Validate expected card count per spread
    const expectedCounts = {
      'Láska a vztahy': 3,
      'Finance': 3,
      'Tělo a mysl': 3,
      'Měsíční fáze': 5,
      'Rozhodnutí': 3,
      '7 dní': 7,
    };

    if (spreadName && expectedCounts[spreadName]) {
      if (cards.length !== expectedCounts[spreadName]) {
        return res.status(400).json({
          error: 'Wrong card count',
          answer: `Bohužel ${spreadName} potřebuje ${expectedCounts[spreadName]} karet, ale máš jen ${cards.length}. Zkus reload?`
        });
      }
    }

    // 6. Build prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(spreadName, cards, question, mode);

    // 7. Call API
    const completion = await client.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 600,
      temperature: 0.8,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt }
      ],
    });

    // 8. Extract answer
    const answer = completion.content[0]?.text;

    if (!answer || answer.trim().length === 0) {
      return res.status(500).json({
        error: 'Empty response',
        answer: 'Real talk: něco se pokazilo with generating reading. Zkus to znovu?'
      });
    }

    // 9. Success
    return res.status(200).json({ answer: answer.trim() });

  } catch (error) {
    console.error('API Error:', error);

    // Handle specific error types
    if (error.message === 'Timeout') {
      return res.status(504).json({
        error: 'Timeout',
        answer: 'Bohužel reading trvá moc dlouho. Zkus to znovu?'
      });
    }

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'Connection refused',
        answer: 'Nepodařilo se spojit s AI. Zkontroluj internet?'
      });
    }

    // Generic error
    return res.status(500).json({
      error: 'Internal server error',
      answer: 'Real talk: něco se pokazilo. Zkus to za chvíli znovu?'
    });
  }
}
```

---

## 7. Testing Your Implementation

### Test Cases:

#### 1. Single Card (Homescreen)
```json
POST /api/chat
{
  "question": "Jak bude můj den?",
  "cards": [
    {
      "name": "The Tower",
      "nameCzech": "Věž",
      "position": "upright"
    }
  ]
}
```

**Expected:** Short, direct 3-4 sentence response about upheaval/change.

---

#### 2. Love Spread
```json
POST /api/chat
{
  "spreadName": "Láska a vztahy",
  "mode": "reading-screen",
  "question": "Celkový výhled",
  "cards": [
    {
      "name": "Page of Cups",
      "nameCzech": "Páže pohárů",
      "position": "upright",
      "label": "Ty"
    },
    {
      "name": "King of Swords",
      "nameCzech": "Král mečů",
      "position": "upright",
      "label": "Partner"
    },
    {
      "name": "Eight of Swords",
      "nameCzech": "Osm mečů",
      "position": "upright",
      "label": "Vztah"
    }
  ]
}
```

**Expected:** Integrated reading comparing You vs Partner, showing mismatch leading to feeling trapped.

---

#### 3. Error Case - Missing Cards
```json
POST /api/chat
{
  "spreadName": "Finance",
  "cards": []
}
```

**Expected:** 
```json
{
  "error": "Missing cards",
  "answer": "Bohužel tady chybí nějaké karty. Reload a try again?"
}
```

---

## 8. Optimization Tips

### A. Caching System Prompt
The system prompt is identical for all requests. Cache it:

```javascript
let cachedSystemPrompt = null;

function buildSystemPrompt() {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  
  cachedSystemPrompt = fs.readFileSync(
    path.join(process.cwd(), 'prompts', 'tarotka-v2.md'),
    'utf-8'
  );
  
  return cachedSystemPrompt;
}
```

### B. Response Streaming (Advanced)
For better UX, stream responses:

```javascript
const completion = await groq.chat.completions.create({
  // ... same config
  stream: true,
});

res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive'
});

for await (const chunk of completion) {
  const content = chunk.choices[0]?.delta?.content || '';
  res.write(`data: ${JSON.stringify({ content })}\n\n`);
}

res.end();
```

Then update your React Native client to handle streaming.

### C. Rate Limiting
Protect your API from abuse:

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window per IP
  message: {
    error: 'Too many requests',
    answer: 'Bohužel moc requests. Zkus to za chvíli?'
  }
});

app.use('/api/chat', limiter);
```

---

## 9. Environment Variables

### Required `.env` file:

```bash
# Anthropic API
ANTHROPIC_API_KEY=your_anthropic_key_here

# Optional: Other providers
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key

# App Config
NODE_ENV=production
PORT=3000
```

### Vercel Config:
Add these in Vercel Dashboard → Project Settings → Environment Variables

---

## 10. Monitoring & Logging

### Add request logging:

```javascript
export default async function handler(req, res) {
  const startTime = Date.now();
  
  try {
    console.log('📥 Request:', {
      timestamp: new Date().toISOString(),
      spreadName: req.body.spreadName,
      cardCount: req.body.cards?.length,
      mode: req.body.mode,
    });

    // ... rest of handler

    const duration = Date.now() - startTime;
    console.log('✅ Success:', { duration: `${duration}ms` });
    
    return res.status(200).json({ answer });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Error:', {
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
    });
    
    return res.status(500).json({ /* ... */ });
  }
}
```

---

## 11. Frontend Integration Updates

Update your `universe.ts` to handle errors properly:

```typescript
export async function performReading(request: ReadingRequest): Promise<string> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadName: request.spreadName,
        cards: request.cards,
        question: request.question || 'Celkový výhled',
        mode: 'reading-screen'
      }),
    });

    const data = await response.json();

    // Check if response contains error
    if (!response.ok) {
      throw new Error(data.answer || 'API error');
    }

    // Return the answer (could include error message in Tarotka voice)
    return data.answer;

  } catch (error) {
    console.error('Reading service error:', error);
    
    // Return Tarotka-voice error to user
    if (error instanceof Error && error.message) {
      return error.message;
    }
    
    return 'Nepodařilo se spojit s osudem. Zkus to znovu za chvíli.';
  }
}
```

---

## 12. Deployment Checklist

Before going live:

- [ ] System prompt loaded correctly
- [ ] API key in environment variables
- [ ] Error handling returns Tarotka-voice messages
- [ ] All 6 spread types tested
- [ ] Single card (homescreen) tested
- [ ] Rate limiting enabled
- [ ] CORS configured correctly
- [ ] Logging set up
- [ ] Response times under 5s
- [ ] Error responses return valid JSON
- [ ] Czech characters rendering correctly

---

## 13. Future Enhancements

### A. Conversation History
Store previous readings for follow-up questions:

```javascript
// Add to request body:
{
  "conversationHistory": [
    { role: "user", content: "..." },
    { role: "assistant", content: "..." }
  ]
}
```

### B. User Preferences
Allow users to adjust tone:

```javascript
// Add to system prompt based on user preference:
if (userPreference === 'gentle') {
  systemPrompt += `\nMODE: Be slightly softer, use more reassurance, less brutal honesty.`;
}
```

### C. Card Image Generation
Generate custom card imagery using DALL-E/Midjourney based on the reading.

### D. Voice Output
Use text-to-speech to read interpretations aloud.

---

## END OF BACKEND GUIDE

✨ **You now have everything to implement Tarotka AI with proper multi-card reading support!**

---

### Quick Start Command:

```bash
# 1. Install dependencies
npm install @anthropic-ai/sdk

# 2. Create .env file
echo "ANTHROPIC_API_KEY=your_key" > .env

# 4. Deploy to Vercel
vercel --prod
```

### Test Locally:

```bash
# Install Vercel CLI
npm i -g vercel

# Run local dev server
vercel dev

# Test endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"test","cards":[{"name":"The Fool","nameCzech":"Blázen","position":"upright"}]}'
```

