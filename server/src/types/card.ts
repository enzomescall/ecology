export type CardType = 'stream' | 'meadow' | 'wolf' | 'fox' | 'bear' | 'trout' | 'dragonfly' | 'bee' | 'eagle' | 'deer' | 'rabbit';

export interface Card {
  id: string;
  type: CardType;
}

export interface Coord {
  x: number;
  y: number;
}

export interface PlacedCard {
  card: Card;
  coord: Coord;
}
