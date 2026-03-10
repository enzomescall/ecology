import { type PlacedCard, buildMap } from './groups.js';

const TARGETS = new Set(['rabbit', 'trout']);
const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]] as const;

export function scoreEagle(eco: PlacedCard[]): number {
  const map = buildMap(eco);
  return eco
    .filter(p => p.card.type === 'eagle')
    .reduce((sum, p) => {
      let pts = 0;
      for (const [dx, dy] of DIRS) {
        for (const dist of [1, 2]) {
          const target = map.get(`${p.coord.x + dx * dist},${p.coord.y + dy * dist}`);
          if (target && TARGETS.has(target.card.type)) pts += 2;
        }
      }
      return sum + pts;
    }, 0);
}
