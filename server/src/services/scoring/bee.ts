import { type PlacedCard, findConnectedGroups, getAdjacentFrom, buildMap } from './groups.js';

export function scoreBee(eco: PlacedCard[]): number {
  const meadowGroups = findConnectedGroups(eco, 'meadow');
  const coordToGroup = new Map<string, number>();
  meadowGroups.forEach((group, i) =>
    group.forEach(p => coordToGroup.set(`${p.coord.x},${p.coord.y}`, i)));

  const map = buildMap(eco);
  return eco
    .filter(p => p.card.type === 'bee')
    .reduce((sum, p) => {
      const adjGroupIds = new Set(
        getAdjacentFrom(map, p.coord)
          .map(a => coordToGroup.get(`${a.coord.x},${a.coord.y}`))
          .filter((id): id is number => id !== undefined)
      );
      return sum + adjGroupIds.size * 3;
    }, 0);
}
