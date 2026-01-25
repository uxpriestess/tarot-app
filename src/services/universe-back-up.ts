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
    mode?: string;
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
                question: request.question || 'Celkový výhled',
                mode: request.mode || 'reading-screen' // Use provided mode or default
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.answer || `API error: ${response.status}`);
        }

        return data.answer;
    } catch (error) {
        console.error('Reading service error:', error);

        // Return Tarotka-voice error to user
        if (error instanceof Error && error.message) {
            return error.message;
        }

        return 'Obraz neprošel úplně jasně. Zkusíme to za chvíli znovu?';
    }
}

/**
 * Ask the Universe (AI) a question with tarot cards (Single card legacy)
 */
export async function askUniverse(question: string, mode: string = 'daily', cards?: UniverseCard[]): Promise<UniverseResponse> {
    // Use provided cards or draw a new one if none provided
    let finalCards: UniverseCard[];
    let sourceCards: any[];

    if (cards && cards.length > 0) {
        finalCards = cards;
        sourceCards = cards;
    } else {
        const { card, position } = drawCard();
        sourceCards = [card];
        finalCards = [{
            name: card.name,
            nameCzech: card.nameCzech || card.name,
            position: position
        }];
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question,
                cards: finalCards,
                mode,
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        return {
            answer: data.answer,
            cards: sourceCards,
        };
    } catch (error) {
        console.error('Universe service error:', error);
        throw new Error('Spojení se na moment rozostřilo. Zkusíme to vyložit znovu?');
    }
}
