"""State encoding and fixed action space for the neural net.

Coordinate framing
------------------
A finished board is always exactly 5 wide x 4 tall, and every legal placement
must be orthogonally adjacent to an existing card, so candidate cells never sit
more than one step outside the current bounding box. If we normalise the board
to its min corner with a +1 margin, every occupied and candidate cell fits in a
fixed 7 (x) x 6 (y) canvas. That gives a fixed action space:

    action = card_type_index * (CANVAS_W * CANVAS_H) + (y' * CANVAS_W + x')

= 11 * 42 = 462 base actions. Rabbit swaps are resolved greedily after placement
(the policy chooses where to drop the rabbit; the swap that most improves the
board value is applied), keeping the action space fixed for a first strong net.
"""
from __future__ import annotations

from typing import Dict, List, Tuple

import numpy as np

from . import board
from .board import PlacedCard
from .cards import NUM_TYPES, TYPE_INDEX
from .game import EcoMove, Game

CANVAS_W = 7   # x (columns): occupied x' in 1..5, candidates 0..6
CANVAS_H = 6   # y (rows):    occupied y' in 1..4, candidates 0..5
OX = 1
OY = 1
CELLS = CANVAS_W * CANVAS_H          # 42
NUM_ACTIONS = NUM_TYPES * CELLS       # 462

# Observation sizes (kept here so the net can read them).
BOARD_CHANNELS = NUM_TYPES + 1        # one per type + an "occupied" plane
SCALAR_DIM = 9
HAND_DIM = NUM_TYPES
OPP_DIM = NUM_TYPES + 3               # summed opp type counts + max stream/wolf + opp count
OBS_VEC_DIM = HAND_DIM + OPP_DIM + SCALAR_DIM


def eco_origin(eco: List[PlacedCard]) -> Tuple[int, int]:
    if not eco:
        return 0, 0
    min_x, _, min_y, *_ = board.bounding_box(eco)
    return min_x, min_y


def _norm_cell(coord, origin) -> Tuple[int, int]:
    (min_x, min_y) = origin
    return coord[0] - min_x + OX, coord[1] - min_y + OY


def cell_to_idx(xp: int, yp: int) -> int:
    return yp * CANVAS_W + xp


def board_planes(eco: List[PlacedCard]) -> np.ndarray:
    """(BOARD_CHANNELS, CANVAS_H, CANVAS_W) one-hot type planes + occupancy."""
    planes = np.zeros((BOARD_CHANNELS, CANVAS_H, CANVAS_W), dtype=np.float32)
    origin = eco_origin(eco)
    for p in eco:
        xp, yp = _norm_cell(p.coord, origin)
        if 0 <= xp < CANVAS_W and 0 <= yp < CANVAS_H:
            planes[TYPE_INDEX[p.card.type], yp, xp] = 1.0
            planes[NUM_TYPES, yp, xp] = 1.0
    return planes


def _longest_stream(eco) -> int:
    from .scoring import find_connected_groups
    g = find_connected_groups(eco, "stream")
    return max((len(x) for x in g), default=0)


def hand_vector(hand) -> np.ndarray:
    v = np.zeros(NUM_TYPES, dtype=np.float32)
    for c in hand:
        v[TYPE_INDEX[c.type]] += 1.0
    return v


def opponent_summary(game: Game, seat: int) -> np.ndarray:
    summ = np.zeros(OPP_DIM, dtype=np.float32)
    max_stream = 0
    max_wolf = 0
    n_opp = 0
    for other in game.player_order:
        if other == seat:
            continue
        n_opp += 1
        eco = game.eco(other)
        for p in eco:
            summ[TYPE_INDEX[p.card.type]] += 1.0
        max_stream = max(max_stream, _longest_stream(eco))
        max_wolf = max(max_wolf, sum(1 for p in eco if p.card.type == "wolf"))
    summ[NUM_TYPES] = max_stream
    summ[NUM_TYPES + 1] = max_wolf
    summ[NUM_TYPES + 2] = n_opp
    return summ


def scalar_features(game: Game, seat: int) -> np.ndarray:
    eco = game.eco(seat)
    own_wolf = sum(1 for p in eco if p.card.type == "wolf")
    return np.array([
        0.0 if game.round == 1 else 1.0,
        game.turn / 10.0,
        0.0 if game.pass_direction == "left" else 1.0,
        game.num_players / 6.0,
        len(game.hand(seat)) / 10.0,
        len(eco) / 20.0,
        _longest_stream(eco) / 5.0,
        own_wolf / 6.0,
        seat / 6.0,
    ], dtype=np.float32)


def encode_state(game: Game, seat: int) -> Dict[str, np.ndarray]:
    """Full observation for one seat: spatial planes + a flat feature vector."""
    planes = board_planes(game.eco(seat))
    vec = np.concatenate([
        hand_vector(game.hand(seat)),
        opponent_summary(game, seat),
        scalar_features(game, seat),
    ]).astype(np.float32)
    return {"planes": planes, "vec": vec}


def legal_action_mask(game: Game, seat: int) -> np.ndarray:
    """Boolean mask over NUM_ACTIONS base (type, cell) actions."""
    mask = np.zeros(NUM_ACTIONS, dtype=bool)
    eco = game.eco(seat)
    origin = eco_origin(eco)
    cells = board.valid_placements(eco)
    hand_types = {c.type for c in game.hand(seat)}
    for cell in cells:
        xp, yp = _norm_cell(cell, origin)
        if not (0 <= xp < CANVAS_W and 0 <= yp < CANVAS_H):
            continue  # should not happen given the framing, but guard anyway
        cidx = cell_to_idx(xp, yp)
        for t in hand_types:
            mask[TYPE_INDEX[t] * CELLS + cidx] = True
    return mask


def action_to_move(game: Game, seat: int, action: int, greedy_swap: bool = True) -> EcoMove:
    """Decode a base action into a concrete EcoMove.

    If the chosen card is a rabbit and greedy_swap is on, the swap that most
    improves the board's heuristic value is attached.
    """
    type_idx, cidx = divmod(action, CELLS)
    yp, xp = divmod(cidx, CANVAS_W)
    eco = game.eco(seat)
    min_x, min_y = eco_origin(eco)
    coord = (xp - OX + min_x, yp - OY + min_y)

    # find a hand card of that type
    target_type = list(TYPE_INDEX.keys())[type_idx]
    card = next((c for c in game.hand(seat) if c.type == target_type), None)
    if card is None:
        raise ValueError(f"No {target_type} in hand for action {action}")

    if card.type == "rabbit" and greedy_swap:
        swap = _greedy_best_swap(eco, card, coord)
        return EcoMove(card.id, coord, swap)
    return EcoMove(card.id, coord)


def _greedy_best_swap(eco, rabbit_card, coord):
    """Return the (a,b) swap that most improves heuristic value, or None."""
    from baselines import GreedyAgent  # lazy to avoid import cycle at module load
    ev = GreedyAgent().evaluate
    after_place = board.place_card(eco, rabbit_card, coord)
    base_val = ev(after_place)
    best = None
    best_val = base_val
    coords = [p.coord for p in after_place]
    for i in range(len(coords)):
        for j in range(i + 1, len(coords)):
            a, b = coords[i], coords[j]
            if not board.swap_keeps_box(after_place, a, b):
                continue
            val = ev(board.apply_swap(after_place, a, b))
            if val > best_val:
                best_val, best = val, (a, b)
    return best
