#!/usr/bin/env python3
"""AI move CLI. Reads a game snapshot (JSON) on stdin, prints the chosen move.

Usage:
    python3 ai_move.py --difficulty hard   < snapshot.json
    echo '<snapshot>' | python3 ai_move.py --difficulty impossible --model path.pt

Output (stdout, JSON): {"cardId","coord":{"x","y"},"swap":null|{"a","b"}}
Diagnostics go to stderr so stdout stays clean for the caller.
"""
from __future__ import annotations

import argparse
import json
import os
import random
import sys

# make `ai/` importable whether invoked from repo root or anywhere
AI_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, AI_ROOT)

from serve.bridge import game_from_snapshot, move_to_wire, snapshot_seed  # noqa: E402
from serve.agents import build_agent, DIFFICULTIES  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--difficulty", choices=DIFFICULTIES, default="medium")
    ap.add_argument("--model", default=None)
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    snap = json.load(sys.stdin)
    seat = snap["seat"]
    game = game_from_snapshot(snap)

    seed = args.seed if args.seed is not None else snapshot_seed(snap)
    rng = random.Random(seed)

    agent, resolved = build_agent(args.difficulty, model_path=args.model, rng=rng)
    move = agent.select_move(game, seat)

    print(f"[ai] difficulty={resolved} seat={seat} r{game.round}t{game.turn} "
          f"card={move.card_id} -> {move.coord} swap={move.swap is not None}",
          file=sys.stderr)
    sys.stdout.write(json.dumps(move_to_wire(move)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
