"""Scoring engine.

Faithful port of server/src/services/scoring/*. Ground truth is the TypeScript
*code*, not the spec doc. Notably rankPlayers AVERAGES tied points (e.g. a
two-way tie for the stream lead yields 6.5 each, not 8/8).
"""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Dict, List

from .board import DIRS, PlacedCard, build_map
from .cards import SCORING_CATEGORIES

Coord = tuple


def find_connected_groups(eco: List[PlacedCard], type_: str) -> List[List[PlacedCard]]:
    typed = [p for p in eco if p.card.type == type_]
    m = {p.coord: p for p in typed}
    visited = set()
    groups: List[List[PlacedCard]] = []
    for p in typed:
        if p.coord in visited:
            continue
        group: List[PlacedCard] = []
        queue = deque([p])
        visited.add(p.coord)
        while queue:
            cur = queue.popleft()
            group.append(cur)
            cx, cy = cur.coord
            for dx, dy in DIRS:
                nk = (cx + dx, cy + dy)
                if nk not in visited and nk in m:
                    visited.add(nk)
                    queue.append(m[nk])
        groups.append(group)
    return groups


def _adjacent_from(m: Dict[Coord, PlacedCard], coord) -> List[PlacedCard]:
    x, y = coord
    out = []
    for dx, dy in DIRS:
        p = m.get((x + dx, y + dy))
        if p is not None:
            out.append(p)
    return out


# ---- non-competitive (solitaire) categories ----

_MEADOW_SCORE = [0, 0, 3, 6, 10, 15]


def score_meadow(eco: List[PlacedCard]) -> int:
    total = 0
    for g in find_connected_groups(eco, "meadow"):
        total += _MEADOW_SCORE[min(len(g), 5)]
    return total


def score_fox(eco: List[PlacedCard]) -> int:
    threats = {"bear", "wolf"}
    m = build_map(eco)
    total = 0
    for p in eco:
        if p.card.type != "fox":
            continue
        if any(a.card.type in threats for a in _adjacent_from(m, p.coord)):
            total += 0
        else:
            total += 3
    return total


def score_bear(eco: List[PlacedCard]) -> int:
    prey = {"trout", "bee"}
    m = build_map(eco)
    total = 0
    for p in eco:
        if p.card.type != "bear":
            continue
        total += 2 * sum(1 for a in _adjacent_from(m, p.coord) if a.card.type in prey)
    return total


def score_trout(eco: List[PlacedCard]) -> int:
    friends = {"stream", "dragonfly"}
    m = build_map(eco)
    total = 0
    for p in eco:
        if p.card.type != "trout":
            continue
        total += 2 * sum(1 for a in _adjacent_from(m, p.coord) if a.card.type in friends)
    return total


def score_deer(eco: List[PlacedCard]) -> int:
    deers = [p for p in eco if p.card.type == "deer"]
    rows = {p.coord[1] for p in deers}
    cols = {p.coord[0] for p in deers}
    return 2 * (len(rows) + len(cols))


def score_eagle(eco: List[PlacedCard]) -> int:
    targets = {"rabbit", "trout"}
    m = build_map(eco)
    total = 0
    for p in eco:
        if p.card.type != "eagle":
            continue
        x, y = p.coord
        for dx, dy in DIRS:
            for dist in (1, 2):
                t = m.get((x + dx * dist, y + dy * dist))
                if t is not None and t.card.type in targets:
                    total += 2
    return total


def score_dragonfly(eco: List[PlacedCard]) -> int:
    stream_groups = find_connected_groups(eco, "stream")
    coord_to_group: Dict[Coord, int] = {}
    for i, group in enumerate(stream_groups):
        for p in group:
            coord_to_group[p.coord] = i
    m = build_map(eco)
    total = 0
    for p in eco:
        if p.card.type != "dragonfly":
            continue
        adj_ids = set()
        for a in _adjacent_from(m, p.coord):
            gid = coord_to_group.get(a.coord)
            if gid is not None:
                adj_ids.add(gid)
        for gid in adj_ids:
            total += len(stream_groups[gid])
    return total


def score_bee(eco: List[PlacedCard]) -> int:
    meadow_groups = find_connected_groups(eco, "meadow")
    coord_to_group: Dict[Coord, int] = {}
    for i, group in enumerate(meadow_groups):
        for p in group:
            coord_to_group[p.coord] = i
    m = build_map(eco)
    total = 0
    for p in eco:
        if p.card.type != "bee":
            continue
        adj_ids = set()
        for a in _adjacent_from(m, p.coord):
            gid = coord_to_group.get(a.coord)
            if gid is not None:
                adj_ids.add(gid)
        total += len(adj_ids) * 3
    return total


# ---- competitive categories ----

def rank_players(values: Dict[str, float], points: List[int]) -> Dict[str, float]:
    """Port of rank.ts: players with value 0 excluded; ties share AVERAGED points."""
    result: Dict[str, float] = {pid: 0 for pid in values}
    eligible = sorted(
        ((pid, v) for pid, v in values.items() if v > 0),
        key=lambda kv: kv[1], reverse=True,
    )
    i = 0
    n = len(eligible)
    while i < n:
        j = i
        while j < n and eligible[j][1] == eligible[i][1]:
            j += 1
        tied_pts = points[i:j]
        avg = sum(tied_pts) / (j - i) if tied_pts else 0
        for k in range(i, j):
            result[eligible[k][0]] = avg
        i = j
    return result


def score_stream(ecosystems: Dict[str, List[PlacedCard]]) -> Dict[str, float]:
    lengths: Dict[str, float] = {}
    for pid, eco in ecosystems.items():
        groups = find_connected_groups(eco, "stream")
        lengths[pid] = max((len(g) for g in groups), default=0)
    return rank_players(lengths, [8, 5])


def score_wolf(ecosystems: Dict[str, List[PlacedCard]]) -> Dict[str, float]:
    counts: Dict[str, float] = {}
    for pid, eco in ecosystems.items():
        counts[pid] = sum(1 for p in eco if p.card.type == "wolf")
    return rank_players(counts, [12, 8, 4])


# ---- orchestrator ----

_PENALTY = [0, 0, 0, 0, -2, -5, -10]

_SOLO = {
    "meadow": score_meadow,
    "fox": score_fox,
    "bear": score_bear,
    "trout": score_trout,
    "deer": score_deer,
    "eagle": score_eagle,
    "dragonfly": score_dragonfly,
    "bee": score_bee,
}


@dataclass
class ScoreBreakdown:
    stream: float
    meadow: float
    wolf: float
    fox: float
    bear: float
    trout: float
    dragonfly: float
    bee: float
    eagle: float
    deer: float
    diversityPenalty: float
    total: float

    def as_dict(self) -> Dict[str, float]:
        return self.__dict__.copy()


def _diversity_penalty(breakdown: Dict[str, float]) -> int:
    zeros = sum(1 for c in SCORING_CATEGORIES if breakdown[c] == 0)
    return _PENALTY[min(zeros, 6)]


def compute_scores(ecosystems: Dict[str, List[PlacedCard]]) -> Dict[str, ScoreBreakdown]:
    """Port of scoring/index.ts computeScores."""
    stream_scores = score_stream(ecosystems)
    wolf_scores = score_wolf(ecosystems)
    results: Dict[str, ScoreBreakdown] = {}
    for pid, eco in ecosystems.items():
        breakdown: Dict[str, float] = {
            "stream": stream_scores.get(pid, 0),
            "wolf": wolf_scores.get(pid, 0),
        }
        for cat, fn in _SOLO.items():
            breakdown[cat] = fn(eco)
        penalty = _diversity_penalty(breakdown)
        total = sum(breakdown[c] for c in SCORING_CATEGORIES) + penalty
        results[pid] = ScoreBreakdown(
            stream=breakdown["stream"], meadow=breakdown["meadow"], wolf=breakdown["wolf"],
            fox=breakdown["fox"], bear=breakdown["bear"], trout=breakdown["trout"],
            dragonfly=breakdown["dragonfly"], bee=breakdown["bee"], eagle=breakdown["eagle"],
            deer=breakdown["deer"], diversityPenalty=penalty, total=total,
        )
    return results
