import { type PlacedCard, findConnectedGroups } from './groups.js';
import { rankPlayers } from './rank.js';

export function scoreStream(ecosystems: Record<string, PlacedCard[]>): Record<string, number> {
  const lengths: Record<string, number> = {};
  for (const [pid, eco] of Object.entries(ecosystems)) {
    const groups = findConnectedGroups(eco, 'stream');
    lengths[pid] = groups.length ? Math.max(...groups.map(g => g.length)) : 0;
  }
  return rankPlayers(lengths, [8, 5]);
}
