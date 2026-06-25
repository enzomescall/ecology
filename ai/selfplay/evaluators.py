"""Evaluators give ISMCTS a policy prior + value at a state.

`HeuristicEvaluator` needs no neural net (greedy board value -> softmax priors,
heuristic or rollout value), so search can be validated before any training.
`NetEvaluator` wraps the trained policy/value net.
"""
from __future__ import annotations

import random
from typing import Optional, Tuple

import numpy as np

from ecology_env import board
from ecology_env.encode import NUM_ACTIONS, action_to_move, encode_state, legal_action_mask
from ecology_env.game import Game
from baselines import GreedyAgent
from .rewards import seat_reward


class HeuristicEvaluator:
    def __init__(self, temperature: float = 4.0, rollout: bool = False,
                 rng: Optional[random.Random] = None):
        self.temp = temperature
        self.rollout = rollout
        self.rng = rng or random.Random()
        self._greedy = GreedyAgent(rng=self.rng)

    def evaluate(self, game: Game, seat: int) -> Tuple[np.ndarray, float]:
        mask = legal_action_mask(game, seat)
        legal = np.nonzero(mask)[0]
        priors = np.zeros(NUM_ACTIONS, dtype=np.float32)
        eco = game.eco(seat)
        hand = game.hand(seat)
        vals = np.empty(len(legal), dtype=np.float32)
        for i, a in enumerate(legal):
            mv = action_to_move(game, seat, int(a), greedy_swap=False)
            card = next(c for c in hand if c.id == mv.card_id)
            vals[i] = self._greedy.evaluate(board.place_card(eco, card, mv.coord))
        vals = vals / max(self.temp, 1e-6)
        vals -= vals.max()
        e = np.exp(vals)
        priors[legal] = e / e.sum()

        value = self._value(game, seat)
        return priors, value

    def _value(self, game: Game, seat: int) -> float:
        if self.rollout:
            g = game.clone()
            while not g.is_terminal():
                moves = {s: self._greedy.select_move(g, s) for s in g.player_order}
                g.resolve_turn(moves)
            return seat_reward(g, seat)
        # cheap heuristic value: standardized board-quality margin
        own = self._greedy.evaluate(game.eco(seat))
        opp = [self._greedy.evaluate(game.eco(s)) for s in game.player_order if s != seat]
        mean_opp = sum(opp) / len(opp) if opp else 0.0
        return float(np.tanh((own - mean_opp) / 20.0))


class NetEvaluator:
    """Wraps an EcologyNet (torch). Batched-friendly but here evaluated per state."""

    def __init__(self, net, device="cpu"):
        import torch  # noqa
        self.net = net
        self.device = device
        self.net.eval()

    def evaluate(self, game: Game, seat: int) -> Tuple[np.ndarray, float]:
        import torch
        mask = legal_action_mask(game, seat)
        obs = encode_state(game, seat)
        with torch.no_grad():
            planes = torch.from_numpy(obs["planes"]).unsqueeze(0).to(self.device)
            vec = torch.from_numpy(obs["vec"]).unsqueeze(0).to(self.device)
            logits, value = self.net(planes, vec)
            logits = logits.squeeze(0).cpu().numpy()
            value = float(value.squeeze(0).cpu().numpy())
        priors = np.zeros(NUM_ACTIONS, dtype=np.float32)
        legal = np.nonzero(mask)[0]
        if len(legal):
            z = logits[legal]
            z -= z.max()
            e = np.exp(z)
            priors[legal] = e / e.sum()
        return priors, value
