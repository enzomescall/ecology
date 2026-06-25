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
                hard_sims: int = 64, impossible_sims: int = 160):
    rng = rng or random.Random()
    difficulty = difficulty.lower()

    if difficulty == "easy":
        return GreedyAgent(rng=rng, epsilon=0.6, consider_swaps=False), "easy"

    if difficulty == "medium":
        return GreedyAgent(rng=rng, epsilon=0.0), "medium"

    if difficulty == "hard":
        ev = HeuristicEvaluator(temperature=3.0, rng=rng)
        return ISMCTSAgent(ev, n_sims=hard_sims, temperature=0.0,
                           opponent_agent=GreedyAgent(rng=random.Random(rng.random())),
                           rng=rng), "hard"

    if difficulty == "impossible":
        path = model_path or DEFAULT_MODEL
        if os.path.exists(path):
            try:
                net = _load_net(path, device)
                from selfplay.evaluators import NetEvaluator
                ev = NetEvaluator(net, device=device)
                return ISMCTSAgent(ev, n_sims=impossible_sims, temperature=0.0,
                                   opponent_agent=GreedyAgent(rng=random.Random(rng.random())),
                                   rng=rng), "impossible"
            except Exception as e:  # pragma: no cover - serving robustness
                import sys
                print(f"[ai] impossible model load failed ({e}); falling back to hard",
                      file=sys.stderr)
        else:
            import sys
            print(f"[ai] no model at {path}; impossible uses deep heuristic search", file=sys.stderr)
        # Fallback still must be strictly stronger than "hard": use the larger
        # search budget with the heuristic evaluator.
        ev = HeuristicEvaluator(temperature=3.0, rng=rng)
        return ISMCTSAgent(ev, n_sims=impossible_sims, temperature=0.0,
                           opponent_agent=GreedyAgent(rng=random.Random(rng.random())),
                           rng=rng), "impossible(heuristic)"

    raise ValueError(f"unknown difficulty {difficulty!r}; expected one of {DIFFICULTIES}")
