"""Single-observer Information-Set MCTS for Ecology.

Because a turn resolves only when every seat has submitted, the root seat makes
exactly one decision per turn. So from the root seat's perspective the game is a
single-agent MDP whose stochastic transition = (opponents' policy moves) +
(determinized hidden cards). Each tree edge is the root seat's action for a
turn; opponents and hidden info are folded into the transition.

Per simulation we redraw a determinization (ISMCTS), so over many sims the
statistics average over plausible worlds. Leaf values come from the evaluator
(AlphaZero-style), not random rollouts (unless a rollout evaluator is used).
"""
from __future__ import annotations

import math
import random
from typing import Dict, List, Optional

import numpy as np

from ecology_env.encode import action_to_move, legal_action_mask
from ecology_env.game import Game
from baselines import GreedyAgent
from .determinize import determinize
from .rewards import seat_reward


class Node:
    __slots__ = ("N", "W", "priors", "children", "expanded")

    def __init__(self):
        self.N = 0
        self.W = 0.0
        self.priors: Optional[np.ndarray] = None  # over NUM_ACTIONS, legal-normalized
        self.children: Dict[int, "Node"] = {}
        self.expanded = False

    @property
    def Q(self) -> float:
        return self.W / self.N if self.N else 0.0


class ISMCTS:
    def __init__(self, evaluator, opponent_agent=None, c_puct: float = 1.5,
                 rng: Optional[random.Random] = None, margin_weight: float = 0.5,
                 dirichlet_alpha: float = 0.3, root_noise: float = 0.0):
        self.evaluator = evaluator
        self.opponent = opponent_agent or GreedyAgent(rng=rng)
        self.c_puct = c_puct
        self.rng = rng or random.Random()
        self.margin_weight = margin_weight
        self.dirichlet_alpha = dirichlet_alpha
        self.root_noise = root_noise  # >0 adds exploration noise at the root (training)

    def run(self, game: Game, seat: int, n_sims: int) -> np.ndarray:
        """Return root visit counts over NUM_ACTIONS (unnormalised)."""
        root = Node()
        for _ in range(n_sims):
            g = determinize(game, seat, self.rng)
            self._simulate(root, g, seat, is_root=True)
        counts = np.zeros_like(self._zeros(game, seat))
        for a, child in root.children.items():
            counts[a] = child.N
        return counts

    def _zeros(self, game, seat):
        from ecology_env.encode import NUM_ACTIONS
        return np.zeros(NUM_ACTIONS, dtype=np.float32)

    def _simulate(self, root: Node, g: Game, seat: int, is_root: bool):
        node = root
        path: List[Node] = [root]
        value = 0.0
        first = True
        while True:
            if g.is_terminal():
                value = seat_reward(g, seat, self.margin_weight)
                break
            mask = legal_action_mask(g, seat)
            legal = np.nonzero(mask)[0]
            if not node.expanded:
                priors, value = self.evaluator.evaluate(g, seat)
                node.priors = priors
                node.expanded = True
                if is_root and first and self.root_noise > 0:
                    self._add_root_noise(node, legal)
                break
            action = self._select(node, legal, g)
            child = node.children.get(action)
            if child is None:
                child = Node()
                node.children[action] = child
            self._advance(g, seat, action)
            node = child
            path.append(node)
            first = False

        for n in path:
            n.N += 1
            n.W += value

    def _add_root_noise(self, node: Node, legal):
        if len(legal) == 0:
            return
        noise = self.rng.gammavariate  # not used; use numpy below
        d = np.random.dirichlet([self.dirichlet_alpha] * len(legal))
        for i, a in enumerate(legal):
            node.priors[a] = (1 - self.root_noise) * node.priors[a] + self.root_noise * d[i]

    def _select(self, node: Node, legal, g) -> int:
        # fallback prior for actions newly legal under this determinization
        legal_priors = node.priors[legal]
        psum = legal_priors.sum()
        fallback = (1.0 / len(legal)) if psum <= 1e-9 else 0.0
        sqrtN = math.sqrt(node.N + 1)
        best_a, best_score = int(legal[0]), -1e18
        for a in legal:
            a = int(a)
            child = node.children.get(a)
            n_c = child.N if child else 0
            q = child.Q if (child and child.N) else 0.0
            p = node.priors[a] if node.priors[a] > 0 else fallback
            u = self.c_puct * p * sqrtN / (1 + n_c)
            score = q + u
            if score > best_score:
                best_score, best_a = score, a
        return best_a

    def _advance(self, g: Game, seat: int, action: int):
        moves = {}
        moves[seat] = action_to_move(g, seat, action, greedy_swap=True)
        for s in g.player_order:
            if s == seat:
                continue
            moves[s] = self.opponent.select_move(g, s)
        g.resolve_turn(moves)


class ISMCTSAgent:
    """Agent wrapper: run search, then act by visit counts (argmax or sampled)."""

    def __init__(self, evaluator, n_sims: int = 64, temperature: float = 0.0,
                 opponent_agent=None, rng: Optional[random.Random] = None,
                 c_puct: float = 1.5, root_noise: float = 0.0, margin_weight: float = 0.5):
        self.search = ISMCTS(evaluator, opponent_agent=opponent_agent, c_puct=c_puct,
                             rng=rng, root_noise=root_noise, margin_weight=margin_weight)
        self.n_sims = n_sims
        self.temperature = temperature
        self.rng = rng or random.Random()

    def policy(self, game: Game, seat: int):
        counts = self.search.run(game, seat, self.n_sims)
        return counts

    def select_move(self, game: Game, seat: int):
        counts = self.policy(game, seat)
        if counts.sum() == 0:
            # search found nothing (shouldn't happen); fall back to greedy
            return self.search.opponent.select_move(game, seat)
        if self.temperature <= 1e-6:
            action = int(np.argmax(counts))
        else:
            p = counts ** (1.0 / self.temperature)
            p = p / p.sum()
            action = int(np.random.choice(len(p), p=p))
        return action_to_move(game, seat, action, greedy_swap=True)
