"""Baseline agents: random and greedy.

These serve double duty:
  * training opponents / curriculum for self-play
  * the shippable Easy (random / noisy-greedy) and Medium (greedy) tiers

An agent implements `select_move(game, seat) -> EcoMove`.
"""
from __future__ import annotations

import random
from typing import List, Optional

from ecology_env import board
from ecology_env.game import EcoMove, Game
from ecology_env.scoring import (
    find_connected_groups, score_bear, score_bee, score_deer, score_dragonfly,
    score_eagle, score_fox, score_meadow, score_trout,
)
from ecology_env.cards import SCORING_CATEGORIES

# Solitaire scorers we can evaluate on a single board mid-game.
_SOLO = [score_meadow, score_fox, score_bear, score_trout, score_deer,
         score_eagle, score_dragonfly, score_bee]


def longest_stream(eco) -> int:
    groups = find_connected_groups(eco, "stream")
    return max((len(g) for g in groups), default=0)


def wolf_count(eco) -> int:
    return sum(1 for p in eco if p.card.type == "wolf")


def categories_present(eco) -> int:
    """How many of the 10 scoring categories currently score > 0 (rough)."""
    present = 0
    if longest_stream(eco) > 0:
        present += 1
    if wolf_count(eco) > 0:
        present += 1
    for fn in _SOLO:
        if fn(eco) > 0:
            present += 1
    return present


class RandomAgent:
    """Uniform over legal non-swap placements. The Easy floor."""

    def __init__(self, rng: Optional[random.Random] = None):
        self.rng = rng or random.Random()

    def select_move(self, game: Game, seat: int) -> EcoMove:
        legal = game.legal_placement_moves(seat)
        return self.rng.choice(legal)


class GreedyAgent:
    """One-ply: place the card/cell that maximizes a heuristic board value.

    Heuristic = solitaire score so far + weighted competitive potential
    (stream length, wolf count) + a diversity-coverage bonus + a light shape
    regularizer that discourages boards which cannot finish as a 5x4.

    `epsilon` injects random moves (for an easier, noisier variant).
    `consider_swaps` lets it use a rabbit's swap to improve the board.
    """

    def __init__(
        self,
        rng: Optional[random.Random] = None,
        epsilon: float = 0.0,
        w_stream: float = 1.0,
        w_wolf: float = 2.0,
        w_coverage: float = 2.5,
        w_shape: float = 1.5,
        consider_swaps: bool = True,
        max_swaps: int = 60,
    ):
        self.rng = rng or random.Random()
        self.epsilon = epsilon
        self.w_stream = w_stream
        self.w_wolf = w_wolf
        self.w_coverage = w_coverage
        self.w_shape = w_shape
        self.consider_swaps = consider_swaps
        self.max_swaps = max_swaps

    # --- heuristic board value ---
    def evaluate(self, eco) -> float:
        solo = sum(fn(eco) for fn in _SOLO)
        comp = self.w_stream * longest_stream(eco) + self.w_wolf * wolf_count(eco)
        coverage = self.w_coverage * categories_present(eco)
        shape = self.w_shape * self._shape_score(eco)
        return solo + comp + coverage + shape

    def _shape_score(self, eco) -> float:
        """Reward staying inside a finishable 5x4 footprint and packing tightly.

        A finished board is exactly 5x4. Boards that grow a long thin or holey
        outline are harder to complete, so we reward area-efficiency: filled
        cells relative to the current bounding-box area.
        """
        if not eco:
            return 0.0
        *_, w, h = board.bounding_box(eco)
        if w > 5 or h > 4:
            return -10.0  # should never happen (illegal), strong guard
        area = w * h
        return len(eco) / area  # 1.0 when perfectly packed

    # --- move selection ---
    def select_move(self, game: Game, seat: int) -> EcoMove:
        legal = game.legal_placement_moves(seat)
        if self.epsilon and self.rng.random() < self.epsilon:
            return self.rng.choice(legal)

        eco = game.eco(seat)
        hand = game.hand(seat)
        type_of = {c.id: c.type for c in hand}

        best: Optional[EcoMove] = None
        best_val = float("-inf")
        for mv in legal:
            card = next(c for c in hand if c.id == mv.card_id)
            after = board.place_card(eco, card, mv.coord)
            val = self.evaluate(after)
            if val > best_val:
                best_val, best = val, mv

        # Rabbit swap improvement: if the chosen (or any) rabbit placement can be
        # paired with a swap that raises board value, take it.
        if self.consider_swaps:
            swap_mv, swap_val = self._best_rabbit_swap(game, seat, eco, hand, type_of)
            if swap_mv is not None and swap_val > best_val:
                best_val, best = swap_val, swap_mv

        assert best is not None
        return best

    def _best_rabbit_swap(self, game, seat, eco, hand, type_of):
        rabbit = next((c for c in hand if c.type == "rabbit"), None)
        if rabbit is None:
            return None, float("-inf")
        cells = board.valid_placements(eco)
        best_mv = None
        best_val = float("-inf")
        budget = self.max_swaps
        for cell in cells:
            after_place = board.place_card(eco, rabbit, cell)
            coords = [p.coord for p in after_place]
            for ai in range(len(coords)):
                for bi in range(ai + 1, len(coords)):
                    if budget <= 0:
                        return best_mv, best_val
                    budget -= 1
                    a, b = coords[ai], coords[bi]
                    if not board.swap_keeps_box(after_place, a, b):
                        continue
                    swapped = board.apply_swap(after_place, a, b)
                    val = self.evaluate(swapped)
                    if val > best_val:
                        best_val = val
                        best_mv = EcoMove(rabbit.id, cell, (a, b))
        return best_mv, best_val


def play_match(agents, num_players, seed):
    """Play one game with a list of agents (len == num_players). Returns totals."""
    rng = random.Random(seed)
    g = Game.new(num_players, rng)
    while not g.is_terminal():
        moves = {seat: agents[seat].select_move(g, seat) for seat in g.player_order}
        g.resolve_turn(moves)
    return g.totals(), g.ranks()
