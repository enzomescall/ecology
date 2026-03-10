import { type PlacedCard, getAdjacent } from './groups.js';

const FRIENDS = new Set(['stream', 'dragonfly']);

export function scoreTrout(eco: PlacedCard[]): number {
  return eco
    .filter(p => p.card.type === 'trout')
    .reduce((sum, p) =>
      sum + 2 * getAdjacent(eco, p.coord).filter(a => FRIENDS.has(a.card.type)).length, 0);
}
