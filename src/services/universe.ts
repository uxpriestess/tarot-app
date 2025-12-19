import { drawCard } from '../data';
import { TarotCard } from '../types/tarot';

// API endpoint - use the deployed Vercel URL
// Using production domain (stable across deployments)
const API_URL = 'https://my-ai-backend.vercel.app/api/chat';

export interface UniverseQuestion {
    question: string;
    cards: TarotCard[];
}

export interface UniverseResponse {
    answer: string;
    cards: TarotCard[];
}

/**
 * Ask the Universe (AI) a question with tarot cards
 */
export async function askUniverse(question: string): Promise<UniverseResponse> {
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
