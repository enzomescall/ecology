import type { PlacedCard, CardType } from './gameApi';

interface Coord { x: number; y: number }

const DIRS: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];
const key = (c: Coord) => `${c.x},${c.y}`;

function buildMap(eco: PlacedCard[]): Map<string, PlacedCard> {
  return new Map(eco.map(p => [key(p.coord), p]));
}

function getAdjacent(map: Map<string, PlacedCard>, coord: Coord): PlacedCard[] {
  return DIRS.map(([dx, dy]) => map.get(key({ x: coord.x + dx, y: coord.y + dy })))
    .filter((p): p is PlacedCard => !!p);
}

function findConnectedGroups(eco: PlacedCard[], type: CardType): PlacedCard[][] {
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

export interface CardScore {
  selfPoints: number;
  breakdown: string[];
  givesTo: string[];
}

export function computeCardScores(eco: PlacedCard[]): Map<string, CardScore> {
  const result = new Map<string, CardScore>();
  const map = buildMap(eco);

  // Initialize all cards
  for (const p of eco) {
    result.set(key(p.coord), { selfPoints: 0, breakdown: [], givesTo: [] });
  }

  // Meadow groups - points shared among group members
  const MEADOW_SCORE = [0, 0, 3, 6, 10, 15];
  const meadowGroups = findConnectedGroups(eco, 'meadow');
  for (const group of meadowGroups) {
    const total = MEADOW_SCORE[Math.min(group.length, 5)] ?? 15;
    const perCard = group.length > 0 ? Math.round(total / group.length * 10) / 10 : 0;
    for (const p of group) {
      const s = result.get(key(p.coord))!;
      s.selfPoints += perCard;
      s.breakdown.push(`Meadow group (${group.length}): ${total} pts shared = ${perCard}`);
    }
  }

  // Fox - 3 pts if not adjacent to bear or wolf
  const THREATS = new Set(['bear', 'wolf']);
  for (const p of eco.filter(c => c.card.type === 'fox')) {
    const adj = getAdjacent(map, p.coord);
    const hasThreat = adj.some(a => THREATS.has(a.card.type));
    const s = result.get(key(p.coord))!;
    if (!hasThreat) {
      s.selfPoints += 3;
      s.breakdown.push('Fox safe from bear/wolf: 3 pts');
    } else {
      s.breakdown.push('Fox next to bear/wolf: 0 pts');
    }
  }

  // Bear - 2 pts per adjacent trout/bee
  const PREY = new Set(['trout', 'bee']);
  for (const p of eco.filter(c => c.card.type === 'bear')) {
    const adj = getAdjacent(map, p.coord);
    const preyCount = adj.filter(a => PREY.has(a.card.type)).length;
    const pts = preyCount * 2;
    const s = result.get(key(p.coord))!;
    s.selfPoints += pts;
    if (pts > 0) s.breakdown.push(`Bear next to ${preyCount} trout/bee: ${pts} pts`);
    // Mark what this bear gets from
    for (const a of adj.filter(a => PREY.has(a.card.type))) {
      const aScore = result.get(key(a.coord))!;
      aScore.givesTo.push(`${a.card.type} gives bear 2 pts`);
    }
  }

  // Trout - 2 pts per adjacent stream/dragonfly
  const FRIENDS = new Set(['stream', 'dragonfly']);
  for (const p of eco.filter(c => c.card.type === 'trout')) {
    const adj = getAdjacent(map, p.coord);
    const friendCount = adj.filter(a => FRIENDS.has(a.card.type)).length;
    const pts = friendCount * 2;
    const s = result.get(key(p.coord))!;
    s.selfPoints += pts;
    if (pts > 0) s.breakdown.push(`Trout next to ${friendCount} stream/dragonfly: ${pts} pts`);
    for (const a of adj.filter(a => FRIENDS.has(a.card.type))) {
      const aScore = result.get(key(a.coord))!;
      aScore.givesTo.push(`${a.card.type} gives trout 2 pts`);
    }
  }

  // Dragonfly - score = size of each adjacent stream group
  const streamGroups = findConnectedGroups(eco, 'stream');
  const coordToStreamGroup = new Map<string, number>();
  streamGroups.forEach((group, i) =>
    group.forEach(p => coordToStreamGroup.set(key(p.coord), i)));
  for (const p of eco.filter(c => c.card.type === 'dragonfly')) {
    const adj = getAdjacent(map, p.coord);
    const adjGroupIds = new Set(
      adj.map(a => coordToStreamGroup.get(key(a.coord))).filter((id): id is number => id !== undefined)
    );
    let pts = 0;
    for (const gid of adjGroupIds) pts += streamGroups[gid]!.length;
    const s = result.get(key(p.coord))!;
    s.selfPoints += pts;
    if (pts > 0) s.breakdown.push(`Dragonfly next to stream groups: ${pts} pts`);
    for (const a of adj.filter(a => a.card.type === 'stream')) {
      const aScore = result.get(key(a.coord))!;
      aScore.givesTo.push(`stream gives dragonfly ${streamGroups[coordToStreamGroup.get(key(a.coord))!]?.length ?? 0} pts`);
    }
  }

  // Bee - 3 pts per adjacent meadow group
  const coordToMeadowGroup = new Map<string, number>();
  meadowGroups.forEach((group, i) =>
    group.forEach(p => coordToMeadowGroup.set(key(p.coord), i)));
  for (const p of eco.filter(c => c.card.type === 'bee')) {
    const adj = getAdjacent(map, p.coord);
    const adjGroupIds = new Set(
      adj.map(a => coordToMeadowGroup.get(key(a.coord))).filter((id): id is number => id !== undefined)
    );
    const pts = adjGroupIds.size * 3;
    const s = result.get(key(p.coord))!;
    s.selfPoints += pts;
    if (pts > 0) s.breakdown.push(`Bee next to ${adjGroupIds.size} meadow groups: ${pts} pts`);
    for (const a of adj.filter(a => a.card.type === 'meadow')) {
      const aScore = result.get(key(a.coord))!;
      aScore.givesTo.push('meadow gives bee 3 pts');
    }
  }

  // Eagle - 2 pts per rabbit/trout within 2 straight-line spaces
  const TARGETS = new Set(['rabbit', 'trout']);
  for (const p of eco.filter(c => c.card.type === 'eagle')) {
    let pts = 0;
    for (const [dx, dy] of DIRS) {
      for (const dist of [1, 2]) {
        const target = map.get(key({ x: p.coord.x + dx * dist, y: p.coord.y + dy * dist }));
        if (target && TARGETS.has(target.card.type)) {
          pts += 2;
          const tScore = result.get(key(target.coord))!;
          tScore.givesTo.push(`${target.card.type} gives eagle 2 pts`);
        }
      }
    }
    const s = result.get(key(p.coord))!;
    s.selfPoints += pts;
    if (pts > 0) s.breakdown.push(`Eagle sees rabbit/trout nearby: ${pts} pts`);
  }

  // Deer - 2 pts per row + 2 pts per column with deer (shared)
  const deers = eco.filter(c => c.card.type === 'deer');
  const deerRows = new Set(deers.map(d => d.coord.y));
  const deerCols = new Set(deers.map(d => d.coord.x));
  const deerTotal = 2 * (deerRows.size + deerCols.size);
  const deerPerCard = deers.length > 0 ? Math.round(deerTotal / deers.length * 10) / 10 : 0;
  for (const p of deers) {
    const s = result.get(key(p.coord))!;
    s.selfPoints += deerPerCard;
    s.breakdown.push(`Deer in ${deerRows.size} rows + ${deerCols.size} cols: ${deerTotal} pts shared = ${deerPerCard}`);
  }

  // Stream & Wolf - competitive, show as shared with player's own group
  // These need player context, so we show them as "competitive scoring"
  for (const p of eco.filter(c => c.card.type === 'stream')) {
    const groups = findConnectedGroups(eco, 'stream');
    const longest = groups.length ? Math.max(...groups.map(g => g.length)) : 0;
    const s = result.get(key(p.coord))!;
    s.breakdown.push(`Stream (competitive, longest: ${longest})`);
  }
  for (const p of eco.filter(c => c.card.type === 'wolf')) {
    const wolfCount = eco.filter(c => c.card.type === 'wolf').length;
    const s = result.get(key(p.coord))!;
    s.breakdown.push(`Wolf (competitive, count: ${wolfCount})`);
  }

  // Rabbit - no points, just swap ability
  for (const p of eco.filter(c => c.card.type === 'rabbit')) {
    const s = result.get(key(p.coord))!;
    s.breakdown.push('Rabbit: no points (swap ability)');
  }

  return result;
}
