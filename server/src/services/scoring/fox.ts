import { type PlacedCard, getAdjacent } from './groups.js';

const THREATS = new Set(['bear', 'wolf']);

export function scoreFox(eco: PlacedCard[]): number {
  return eco
    .filter(p => p.card.type === 'fox')
    .reduce((sum, p) =>
      sum + (getAdjacent(eco, p.coord).some(a => THREATS.has(a.card.type)) ? 0 : 3), 0);
}
