import { type PlacedCard, findConnectedGroups, getAdjacentFrom, buildMap } from './groups.js';

export function scoreDragonfly(eco: PlacedCard[]): number {
  const streamGroups = findConnectedGroups(eco, 'stream');
  const coordToGroup = new Map<string, number>();
  streamGroups.forEach((group, i) =>
    group.forEach(p => coordToGroup.set(`${p.coord.x},${p.coord.y}`, i)));

  const map = buildMap(eco);
  return eco
    .filter(p => p.card.type === 'dragonfly')
    .reduce((sum, p) => {
      const adjGroupIds = new Set(
        getAdjacentFrom(map, p.coord)
          .map(a => coordToGroup.get(`${a.coord.x},${a.coord.y}`))
          .filter((id): id is number => id !== undefined)
      );
      let pts = 0;
      for (const gid of adjGroupIds) pts += streamGroups[gid]!.length;
      return sum + pts;
    }, 0);
}
