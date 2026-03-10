import { type PlacedCard, getAdjacent } from './groups.js';

const PREY = new Set(['trout', 'bee']);

export function scoreBear(eco: PlacedCard[]): number {
  return eco
    .filter(p => p.card.type === 'bear')
    .reduce((sum, p) =>
      sum + 2 * getAdjacent(eco, p.coord).filter(a => PREY.has(a.card.type)).length, 0);
}
