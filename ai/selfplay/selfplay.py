"""Self-play game generation: every seat acts by net-guided ISMCTS, and we
record (observation, MCTS policy target, value target) for each decision."""
from __future__ import annotations

import random
from dataclasses import dataclass
from typing import List, Optional

import numpy as np

from ecology_env.encode import encode_state, legal_action_mask
from ecology_env.game import Game
from ecology_env.encode import action_to_move
from baselines import GreedyAgent
from .evaluators import NetEvaluator
from .ismcts import ISMCTS
from .rewards import seat_reward


@dataclass
class Sample:
    planes: np.ndarray
    vec: np.ndarray
    mask: np.ndarray
    pi: np.ndarray         # normalised visit-count target over NUM_ACTIONS
    seat: int
    value: float = 0.0     # filled at game end


def self_play_game(
    net,
    num_players: int,
    n_sims: int = 32,
    temp_moves: int = 8,
    temperature: float = 1.0,
    c_puct: float = 1.5,
    root_noise: float = 0.25,
    margin_weight: float = 0.5,
    rng: Optional[random.Random] = None,
    device: str = "cpu",
) -> List[Sample]:
    rng = rng or random.Random()
    evaluator = NetEvaluator(net, device=device)
    # One search engine per seat (shared net); greedy opponents inside the sim
    # keep determinized rollouts cheap.
    searchers = [
        ISMCTS(evaluator, opponent_agent=GreedyAgent(rng=random.Random(rng.random())),
               c_puct=c_puct, rng=random.Random(rng.random()),
               margin_weight=margin_weight, root_noise=root_noise)
        for _ in range(num_players)
    ]

    g = Game.new(num_players, rng)
    samples: List[Sample] = []
    move_no = 0
    while not g.is_terminal():
        moves = {}
        for seat in g.player_order:
            counts = searchers[seat].run(g, seat, n_sims)
            total = counts.sum()
            if total <= 0:
                # degenerate; fall back to greedy
                mv = searchers[seat].opponent.select_move(g, seat)
                moves[seat] = mv
                continue
            pi = counts / total
            obs = encode_state(g, seat)
            mask = legal_action_mask(g, seat)
            samples.append(Sample(obs["planes"], obs["vec"], mask, pi, seat))

            if move_no < temp_moves and temperature > 1e-6:
                p = counts ** (1.0 / temperature)
                p = p / p.sum()
                action = int(np.random.choice(len(p), p=p))
            else:
                action = int(np.argmax(counts))
            moves[seat] = action_to_move(g, seat, action, greedy_swap=True)
        g.resolve_turn(moves)
        move_no += 1

    # backfill value targets from the acting seat's final reward
    for s in samples:
        s.value = seat_reward(g, s.seat, margin_weight)
    return samples
