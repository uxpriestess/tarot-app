import { majorArcana } from './majorArcana';
import { cups } from './cups';
import { TarotCard } from '../types/tarot';

// Combine all cards
export const allCards: TarotCard[] = [...majorArcana, ...cups];

// Export individual sets if needed
export { majorArcana, cups };

// Helper functions using the combined deck
export const getRandomCard = (): TarotCard => {
    const randomIndex = Math.floor(Math.random() * allCards.length);
    return allCards[randomIndex];
};

export const getCardById = (id: string): TarotCard | undefined => {
    return allCards.find(card => card.id === id);
};

export const getCardByNumber = (number: number): TarotCard | undefined => {
    // Note: This might return the first match if numbers overlap between suits
    return allCards.find(card => card.number === number);
};

export const drawCard = (): { card: TarotCard; position: 'upright' | 'reversed' } => {
    const card = getRandomCard();
    const position = Math.random() > 0.5 ? 'upright' : 'reversed';
    return { card, position };
};
