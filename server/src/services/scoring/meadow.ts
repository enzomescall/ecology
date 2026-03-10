import { type PlacedCard, findConnectedGroups } from './groups.js';

const SCORE = [0, 0, 3, 6, 10, 15] as const;

export function scoreMeadow(eco: PlacedCard[]): number {
  return findConnectedGroups(eco, 'meadow')
    .reduce((sum, g) => sum + (SCORE[Math.min(g.length, 5)] ?? 15), 0);
}
