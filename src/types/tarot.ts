export interface TarotCard {
  id: string;
  number: number;
  name: string;
  nameCzech: string;
  czechName?: string; // Optional - will be set from nameCzech if not provided
  suit?: string; // Optional - will be set when combining decks
  keywords: string[];
  meaningUpright: string;
  meaningReversed?: string;
  animal: string;
  imageName: string;
}

export type CardPosition = 'upright' | 'reversed';

export interface CardReading {
  id: string;
  card: TarotCard;
  position: CardPosition;
  date: Date;
  note?: string;
}