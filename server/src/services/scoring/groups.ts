export type CardType = 'stream' | 'meadow' | 'wolf' | 'fox' | 'bear' | 'trout' | 'dragonfly' | 'bee' | 'eagle' | 'deer' | 'rabbit';
export interface Card { id: string; type: CardType; }
export interface Coord { x: number; y: number; }
export interface PlacedCard { card: Card; coord: Coord; }

const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]] as const;
const key = (c: Coord) => `${c.x},${c.y}`;

export function buildMap(eco: PlacedCard[]): Map<string, PlacedCard> {
  return new Map(eco.map(p => [key(p.coord), p]));
}

export function getAdjacent(eco: PlacedCard[], coord: Coord): PlacedCard[] {
  const map = buildMap(eco);
  return DIRS.map(([dx, dy]) => map.get(key({ x: coord.x + dx, y: coord.y + dy })))
    .filter((p): p is PlacedCard => !!p);
}

export function getAdjacentFrom(map: Map<string, PlacedCard>, coord: Coord): PlacedCard[] {
  return DIRS.map(([dx, dy]) => map.get(key({ x: coord.x + dx, y: coord.y + dy })))
    .filter((p): p is PlacedCard => !!p);
}

export function findConnectedGroups(eco: PlacedCard[], type: CardType): PlacedCard[][] {
  const typed = eco.filter(p => p.card.type === type);
  const map = new Map(typed.map(p => [key(p.coord), p]));
  const visited = new Set<string>();
  const groups: PlacedCard[][] = [];

  for (const p of typed) {
    const k = key(p.coord);
    if (visited.has(k)) continue;
    const group: PlacedCard[] = [];
    const queue = [p];
    visited.add(k);
    while (queue.length) {
      const cur = queue.shift()!;
      group.push(cur);
      for (const [dx, dy] of DIRS) {
        const nk = key({ x: cur.coord.x + dx, y: cur.coord.y + dy });
        if (!visited.has(nk) && map.has(nk)) {
          visited.add(nk);
          queue.push(map.get(nk)!);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}
