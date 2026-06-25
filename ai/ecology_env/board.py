"""Ecosystem placement rules.

Faithful port of server/src/services/ecosystemService.ts.

An ecosystem is a list of PlacedCard on an unbounded integer plane. Every
placement must keep the bounding box within width<=5, height<=4. Since each
player places exactly 20 cards, a finished board always fills a 5x4 rectangle.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from .cards import Card

Coord = Tuple[int, int]  # (x, y)

# Orthogonal directions (matches groups.ts DIRS order).
DIRS: Tuple[Coord, ...] = ((0, 1), (0, -1), (1, 0), (-1, 0))


@dataclass(frozen=True)
class PlacedCard:
    card: Card
    coord: Coord  # (x, y)


def build_map(eco: List[PlacedCard]) -> Dict[Coord, PlacedCard]:
    return {p.coord: p for p in eco}


def bounding_box(eco: List[PlacedCard]) -> Tuple[int, int, int, int, int, int]:
    xs = [p.coord[0] for p in eco]
    ys = [p.coord[1] for p in eco]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    return min_x, max_x, min_y, max_y, max_x - min_x + 1, max_y - min_y + 1


def card_at(eco: List[PlacedCard], coord: Coord) -> Optional[PlacedCard]:
    for p in eco:
        if p.coord == coord:
            return p
    return None


def adjacent_coords(coord: Coord) -> List[Coord]:
    x, y = coord
    return [(x + dx, y + dy) for dx, dy in DIRS]


def adjacent_cards(eco: List[PlacedCard], coord: Coord) -> List[PlacedCard]:
    m = build_map(eco)
    out = []
    for c in adjacent_coords(coord):
        p = m.get(c)
        if p is not None:
            out.append(p)
    return out


def is_valid_placement(eco: List[PlacedCard], coord: Coord) -> bool:
    """Matches ecosystemService.isValidPlacement."""
    if len(eco) == 0:
        return True
    if card_at(eco, coord) is not None:
        return False
    if len(adjacent_cards(eco, coord)) == 0:
        return False
    all_x = [p.coord[0] for p in eco] + [coord[0]]
    all_y = [p.coord[1] for p in eco] + [coord[1]]
    width = max(all_x) - min(all_x) + 1
    height = max(all_y) - min(all_y) + 1
    return width <= 5 and height <= 4


def valid_placements(eco: List[PlacedCard]) -> List[Coord]:
    """Matches ecosystemService.getValidPlacements. First card goes at (0,0)."""
    if len(eco) == 0:
        return [(0, 0)]
    occupied = {p.coord for p in eco}
    candidates: Dict[Coord, None] = {}
    for p in eco:
        for adj in adjacent_coords(p.coord):
            if adj not in occupied and adj not in candidates:
                candidates[adj] = None
    return [c for c in candidates if is_valid_placement(eco, c)]


def place_card(eco: List[PlacedCard], card: Card, coord: Coord) -> List[PlacedCard]:
    return eco + [PlacedCard(card=card, coord=coord)]


def apply_swap(eco: List[PlacedCard], a: Coord, b: Coord) -> List[PlacedCard]:
    out = []
    for p in eco:
        if p.coord == a:
            out.append(PlacedCard(card=p.card, coord=b))
        elif p.coord == b:
            out.append(PlacedCard(card=p.card, coord=a))
        else:
            out.append(p)
    return out


def swap_keeps_box(eco_after_place: List[PlacedCard], a: Coord, b: Coord) -> bool:
    """Both coords must hold cards, and post-swap box must stay <=5x4."""
    if card_at(eco_after_place, a) is None or card_at(eco_after_place, b) is None:
        return False
    swapped = apply_swap(eco_after_place, a, b)
    *_, w, h = bounding_box(swapped)
    return w <= 5 and h <= 4


def normalize(eco: List[PlacedCard]) -> List[PlacedCard]:
    """Shift so min_x, min_y == 0. Useful for canonical board tensors."""
    if not eco:
        return eco
    min_x, _, min_y, *_ = bounding_box(eco)
    return [PlacedCard(card=p.card, coord=(p.coord[0] - min_x, p.coord[1] - min_y))
            for p in eco]
