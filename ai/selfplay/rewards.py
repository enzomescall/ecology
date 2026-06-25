"""Terminal reward shaping for the acting seat, normalised to [-1, 1].

Free-for-all needs a competitive signal, not just raw solitaire score, so the
default blends score margin (vs the mean opponent) with final rank.
"""
from __future__ import annotations

import math
from ecology_env.game import Game

MARGIN_SCALE = 20.0  # ~1 SD of score margins; tanh saturates beyond this


def margin_reward(game: Game, seat: int) -> float:
    totals = game.totals()
    own = totals[seat]
    others = [v for s, v in totals.items() if s != seat]
    mean_opp = sum(others) / len(others) if others else 0.0
    return math.tanh((own - mean_opp) / MARGIN_SCALE)


def rank_reward(game: Game, seat: int) -> float:
    ranks = game.ranks()
    n = game.num_players
    r = ranks[seat]                 # 1 = best
    if n == 1:
        return 0.0
    return (n - r) / (n - 1) * 2.0 - 1.0   # rank1 -> +1, last -> -1


def seat_reward(game: Game, seat: int, margin_weight: float = 0.5) -> float:
    return (margin_weight * margin_reward(game, seat)
            + (1.0 - margin_weight) * rank_reward(game, seat))
