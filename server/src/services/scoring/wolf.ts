import type { PlacedCard } from './groups.js';
import { rankPlayers } from './rank.js';

export function scoreWolf(ecosystems: Record<string, PlacedCard[]>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [pid, eco] of Object.entries(ecosystems)) {
    counts[pid] = eco.filter(p => p.card.type === 'wolf').length;
  }
  return rankPlayers(counts, [12, 8, 4]);
}
