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
    moonPhase?: string; // 🌙 Moon phase context for moon readings
}

/**
 * Structured reading section per architecture.md
 * Backend parses LLM output into these; frontend only renders
 */
export interface ReadingSection {
    key: string;
    label: string | null;
    text: string;
}

/**
 * Unified structured response from backend
 */
export interface StructuredReading {
    readingType: string;
    sections: ReadingSection[];
    meta?: {
        cardCount: number;
        timestamp: string;
    };
    answer?: string; // Backward compat during transition
}

/**
 * Perform a complex reading using AI
 * Returns structured sections that frontend can render directly
 */
export async function performReading(request: ReadingRequest): Promise<StructuredReading> {
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
                mode: request.mode || 'reading-screen', // Use provided mode or default
                moonPhase: request.moonPhase // 🌙 Pass moon phase to API
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.answer || `API error: ${response.status}`);
        }

        // Return structured response from backend
        // Backend is the authority on structure per architecture.md
        return {
            readingType: data.readingType || request.mode || 'reading-screen',
            sections: data.sections || [{ key: 'reading', label: null, text: data.answer || '' }],
            meta: data.meta,
            answer: data.answer
        };
    } catch (error) {
        console.error('Reading service error:', error);

        // Return error as structured response
        const errorMessage = error instanceof Error && error.message
            ? error.message
            : 'Obraz neprošel úplně jasně. Zkusíme to za chvíli znovu?';

        return {
            readingType: 'error',
            sections: [{ key: 'error', label: null, text: errorMessage }],
            answer: errorMessage
        };
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
