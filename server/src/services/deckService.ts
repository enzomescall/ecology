import type { Card, CardType } from '../types/card.js';

const CARD_TYPES: CardType[] = [
  'stream', 'meadow', 'wolf', 'fox', 'bear',
  'trout', 'dragonfly', 'bee', 'eagle', 'deer', 'rabbit',
];
const COPIES_PER_TYPE = 12;

export function createDeck(): Card[] {
  return CARD_TYPES.flatMap((type) =>
    Array.from({ length: COPIES_PER_TYPE }, (_, i) => ({ id: `${type}-${i}`, type }))
  );
}

export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function dealHands(
  deck: Card[], playerIds: string[], cardsPerHand: number
): { hands: Record<string, Card[]>; remaining: Card[] } {
  const hands: Record<string, Card[]> = {};
  let offset = 0;
  for (const id of playerIds) {
    hands[id] = deck.slice(offset, offset + cardsPerHand);
    offset += cardsPerHand;
  }
  return { hands, remaining: deck.slice(offset) };
}

export function passHands(
  hands: Record<string, Card[]>, playerOrder: string[], direction: 'left' | 'right'
): Record<string, Card[]> {
  const n = playerOrder.length;
  const result: Record<string, Card[]> = {};
  for (let i = 0; i < n; i++) {
    const recipient = direction === 'left'
      ? playerOrder[(i + 1) % n]!
      : playerOrder[(i - 1 + n) % n]!;
    result[recipient] = hands[playerOrder[i]!]!;
  }
  return result;
}
