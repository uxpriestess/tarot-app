export interface TarotCard {
  id: string;
  number: number;
  name: string;
  nameCzech: string;
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