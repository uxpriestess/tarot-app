import { majorArcana } from './majorArcana';
import { cups } from './cups';
import { pentacles } from './pentacles';
import { wands } from './wands';
import { swords } from './swords';
import { TarotCard } from '../types/tarot';

// Add suit and czechName to cards dynamically
const addMissingProps = (cards: any[], suit: string): TarotCard[] => {
    return cards.map(card => ({
        ...card,
        suit,
        czechName: card.nameCzech || card.czechName,
    }));
};

// Combine all cards with suit information
export const allCards: TarotCard[] = [
    ...addMissingProps(majorArcana, 'Major Arcana'),
    ...addMissingProps(cups, 'Cups'),
    ...addMissingProps(pentacles, 'Pentacles'),
    ...addMissingProps(wands, 'Wands'),
    ...addMissingProps(swords, 'Swords'),
];

// Export individual sets if needed
export { majorArcana, cups, pentacles, wands, swords };

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

export const drawCard = (subsetIds?: string[]): { card: TarotCard; position: 'upright' | 'reversed' } => {
    let pool = allCards;

    if (subsetIds && subsetIds.length > 0) {
        pool = allCards.filter(c => subsetIds.includes(c.id));
        if (pool.length === 0) {
            console.warn('Subset result is empty, falling back to full deck');
            pool = allCards;
        }
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    const card = pool[randomIndex];
    const position = Math.random() > 0.5 ? 'upright' : 'reversed';
    return { card, position };
};
