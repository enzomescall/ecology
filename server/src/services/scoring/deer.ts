import type { PlacedCard } from './groups.js';

export function scoreDeer(eco: PlacedCard[]): number {
  const deers = eco.filter(p => p.card.type === 'deer');
  const rows = new Set(deers.map(p => p.coord.y));
  const cols = new Set(deers.map(p => p.coord.x));
  return 2 * (rows.size + cols.size);
}
