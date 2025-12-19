import { drawCard } from '../data';
import { TarotCard } from '../types/tarot';

// API endpoint - use the deployed Vercel URL
const API_URL = 'https://my-ai-backend-d04s0azl3-claires-projects-7718f1e3.vercel.app/api/chat';

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
    // Draw 1-3 random cards for the reading
    const numCards = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3 cards
    const drawnCards: TarotCard[] = [];

    for (let i = 0; i < numCards; i++) {
        const { card } = drawCard();
        drawnCards.push(card);
    }

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
