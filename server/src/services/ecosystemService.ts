import type { Card, CardType, Coord, PlacedCard } from '../types/card.js';

const coordKey = (c: Coord): string => `${c.x},${c.y}`;

export function getBoundingBox(eco: PlacedCard[]) {
  const xs = eco.map(p => p.coord.x);
  const ys = eco.map(p => p.coord.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function getCardAt(eco: PlacedCard[], coord: Coord): PlacedCard | null {
  return eco.find(p => p.coord.x === coord.x && p.coord.y === coord.y) ?? null;
}

export function getAdjacentCoords(coord: Coord): Coord[] {
  return [
    { x: coord.x, y: coord.y - 1 },
    { x: coord.x, y: coord.y + 1 },
    { x: coord.x - 1, y: coord.y },
    { x: coord.x + 1, y: coord.y },
  ];
}

export function getAdjacentCards(eco: PlacedCard[], coord: Coord): PlacedCard[] {
  const map = new Map(eco.map(p => [coordKey(p.coord), p]));
  return getAdjacentCoords(coord)
    .map(c => map.get(coordKey(c)))
    .filter((p): p is PlacedCard => !!p);
}

export function isValidPlacement(eco: PlacedCard[], coord: Coord): boolean {
  if (eco.length === 0) return true;
  if (getCardAt(eco, coord)) return false;
  if (getAdjacentCards(eco, coord).length === 0) return false;

  const allX = eco.map(p => p.coord.x).concat(coord.x);
  const allY = eco.map(p => p.coord.y).concat(coord.y);
  const width = Math.max(...allX) - Math.min(...allX) + 1;
  const height = Math.max(...allY) - Math.min(...allY) + 1;
  return width <= 5 && height <= 4;
}

export function getValidPlacements(eco: PlacedCard[]): Coord[] {
  if (eco.length === 0) return [{ x: 0, y: 0 }];

  const occupied = new Set(eco.map(p => coordKey(p.coord)));
  const candidates = new Map<string, Coord>();

  for (const p of eco) {
    for (const adj of getAdjacentCoords(p.coord)) {
      const key = coordKey(adj);
      if (!occupied.has(key) && !candidates.has(key)) candidates.set(key, adj);
    }
  }

  return [...candidates.values()].filter(c => isValidPlacement(eco, c));
}

export function placeCard(eco: PlacedCard[], card: Card, coord: Coord): PlacedCard[] {
  return [...eco, { card, coord }];
}

export function applySwap(eco: PlacedCard[], a: Coord, b: Coord): PlacedCard[] {
  return eco.map(p => {
    if (p.coord.x === a.x && p.coord.y === a.y) return { ...p, coord: b };
    if (p.coord.x === b.x && p.coord.y === b.y) return { ...p, coord: a };
    return p;
  });
}

export function getConnectedGroups(eco: PlacedCard[], type: CardType): PlacedCard[][] {
  const ofType = eco.filter(p => p.card.type === type);
  const map = new Map(ofType.map(p => [coordKey(p.coord), p]));
  const visited = new Set<string>();
  const groups: PlacedCard[][] = [];

  for (const p of ofType) {
    const key = coordKey(p.coord);
    if (visited.has(key)) continue;

    const group: PlacedCard[] = [];
    const queue = [p];
    visited.add(key);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      group.push(curr);
      for (const adj of getAdjacentCoords(curr.coord)) {
        const adjKey = coordKey(adj);
        if (!visited.has(adjKey) && map.has(adjKey)) {
          visited.add(adjKey);
          queue.push(map.get(adjKey)!);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}
