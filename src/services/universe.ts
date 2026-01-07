import { drawCard } from '../data';
import { TarotCard } from '../types/tarot';

// API endpoint - use the deployed Vercel URL
// Using production domain (stable across deployments)
const API_URL = 'https://my-ai-backend-dun.vercel.app/api/chat';

export interface UniverseResponse {
    answer: string;
    cards: any[];
}

export interface UniverseCard {
    name: string;
    nameCzech: string;
    position: 'upright' | 'reversed';
    label?: string; // e.g. "Ty", "Partner", "Minulost"
}

export interface ReadingRequest {
    spreadName: string;
    cards: UniverseCard[];
    question?: string;
}

/**
 * Perform a complex reading using AI
 */
export async function performReading(request: ReadingRequest): Promise<string> {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                spreadName: request.spreadName,
                cards: request.cards,
                question: request.question || 'Obecný výklad',
                mode: 'reading-screen' // Hint for backend to use a more poetic/detailed template
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.answer;
    } catch (error) {
        console.error('Reading service error:', error);
        throw new Error('Nepodařilo se spojit s osudem. Zkus to znovu za chvíli.');
    }
}

/**
 * Ask the Universe (AI) a question with tarot cards (Single card legacy)
 */
export async function askUniverse(question: string): Promise<UniverseResponse> {
    // ... (rest of the file remains for legacy/homescreen use)
    // Draw exactly 1 card for the reading
    const { card } = drawCard();
    const drawnCards = [card];

    // Prepare card context for AI
    const cardData = drawnCards.map(card => ({
        nameCzech: card.nameCzech || card.name,
        name: card.name,
    }));

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question,
                cards: cardData,
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        return {
            answer: data.answer,
            cards: drawnCards,
        };
    } catch (error) {
        console.error('Universe service error:', error);
        throw new Error('Nepodařilo se spojit s vesmírem. Zkus to znovu.');
    }
}
