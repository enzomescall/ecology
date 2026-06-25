"""Difficulty -> agent factory for serving.

  easy        noisy greedy (frequently random) -- beatable
  medium      pure greedy one-ply heuristic    -- solid
  hard        heuristic ISMCTS                  -- searches, no model
  impossible  net-guided ISMCTS                 -- needs a trained checkpoint;
              falls back to hard if no model is available

The game is asynchronous, so the larger search budgets are fine in production.
"""
from __future__ import annotations

import os
import random
from typing import Optional

from baselines import GreedyAgent, RandomAgent
from selfplay.evaluators import HeuristicEvaluator
from selfplay.ismcts import ISMCTSAgent

DEFAULT_MODEL = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "checkpoints", "best.pt"
)

DIFFICULTIES = ("easy", "medium", "hard", "impossible")


def _load_net(model_path: str, device: str = "cpu"):
    import torch
    from selfplay.net import EcologyNet
    net = EcologyNet()
    net.load_state_dict(torch.load(model_path, map_location=device))
    net.eval()
    return net


def build_agent(difficulty: str, model_path: Optional[str] = None,
                rng: Optional[random.Random] = None, device: str = "cpu",
                hard_sims: int = 32, impossible_sims: int = 160,
                impossible_fallback_sims: int = 64):
    """Build a difficulty agent.

    Leaf values use greedy *rollouts* (play the determinized game to the end),
    which dramatically strengthens search vs. a static heuristic value: at 32
    sims, rollout-hard beats greedy/medium 83% (58.2 vs 51.5) where static-value
    hard was only ~38%. The async game tolerates the ~2s/move cost.
    """
    rng = rng or random.Random()
    difficulty = difficulty.lower()

    def rollout_ev():
        return HeuristicEvaluator(temperature=3.0, rollout=True, rng=rng)

    def mcts(ev, sims, label):
        return ISMCTSAgent(ev, n_sims=sims, temperature=0.0,
                           opponent_agent=GreedyAgent(rng=random.Random(rng.random())),
                           rng=rng), label

    if difficulty == "easy":
        return GreedyAgent(rng=rng, epsilon=0.6, consider_swaps=False), "easy"

    if difficulty == "medium":
        return GreedyAgent(rng=rng, epsilon=0.0), "medium"

    if difficulty == "hard":
        return mcts(rollout_ev(), hard_sims, "hard")

    if difficulty == "impossible":
        path = model_path or DEFAULT_MODEL
        if os.path.exists(path):
            try:
                net = _load_net(path, device)
                from selfplay.evaluators import NetEvaluator
                # Net value head replaces rollouts, so we can afford many sims.
                return mcts(NetEvaluator(net, device=device), impossible_sims, "impossible")
            except Exception as e:  # pragma: no cover - serving robustness
                import sys
                print(f"[ai] impossible model load failed ({e}); deep rollout search",
                      file=sys.stderr)
        else:
            import sys
            print(f"[ai] no model at {path}; impossible uses deep rollout search", file=sys.stderr)
        # Fallback must still be strictly stronger than hard: more rollout sims.
        return mcts(rollout_ev(), impossible_fallback_sims, "impossible(rollout)")

    raise ValueError(f"unknown difficulty {difficulty!r}; expected one of {DIFFICULTIES}")
