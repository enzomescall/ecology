"""Play Ecology against the bots in your terminal.

    python3 play.py --opponents medium hard          # you + 2 bots (3p)
    python3 play.py --opponents easy easy easy easy   # you + 4 bots (5p)

You are seat 0. Each turn: pick a card from your hand and a placement cell.
Rabbit swaps are auto-resolved greedily for you (just place the rabbit).
If stdin closes, your moves are auto-played greedily (handy for a quick demo).
"""
from __future__ import annotations

import argparse
import random
import sys

from ecology_env import board
from ecology_env.game import Game, EcoMove
from ecology_env.scoring import compute_scores
from baselines import GreedyAgent
from serve.agents import build_agent
from demo import render, EMOJI, CATS


def prompt(msg):
    try:
        return input(msg)
    except EOFError:
        return None


def human_move(g: Game, seat: int, fallback: GreedyAgent) -> EcoMove:
    hand = g.hand(seat)
    eco = g.eco(seat)
    cells = board.valid_placements(eco)

    print("\nYour board:")
    print(render(eco) if eco else "  (empty)")
    print("\nYour hand:")
    types = []
    for i, c in enumerate(hand):
        print(f"  [{i}] {EMOJI[c.type]} {c.type}")
        types.append(c.type)

    raw = prompt(f"\nPick a card [0-{len(hand)-1}] (Enter = greedy auto): ")
    if raw is None:
        return fallback.select_move(g, seat)
    raw = raw.strip()
    if raw == "":
        return fallback.select_move(g, seat)
    try:
        ci = int(raw)
        card = hand[ci]
    except (ValueError, IndexError):
        print("  ? invalid, auto-playing greedily")
        return fallback.select_move(g, seat)

    print("Placement cells:")
    for i, cell in enumerate(cells):
        print(f"  [{i}] {cell}")
    raw = prompt(f"Pick a cell [0-{len(cells)-1}]: ")
    try:
        cell = cells[int(raw.strip())]
    except (ValueError, IndexError, AttributeError):
        cell = cells[0]
        print(f"  ? invalid, using {cell}")

    # rabbit swap auto-resolved greedily via the encoding helper
    if card.type == "rabbit":
        from ecology_env.encode import _greedy_best_swap
        swap = _greedy_best_swap(eco, card, cell)
        return EcoMove(card.id, cell, swap)
    return EcoMove(card.id, cell)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--opponents", nargs="+", default=["medium", "medium"],
                    help="bot difficulty per opponent seat (1-5 of them)")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--hard-sims", type=int, default=24)
    args = ap.parse_args()

    n = 1 + len(args.opponents)
    assert 2 <= n <= 6, "total players must be 2-6"
    seed = args.seed if args.seed is not None else random.randrange(1 << 30)
    rng = random.Random(seed)

    my_fallback = GreedyAgent(rng=random.Random(seed))
    bots = [None] + [
        build_agent(d, rng=random.Random(seed * 17 + i), hard_sims=args.hard_sims,
                    impossible_fallback_sims=args.hard_sims)[0]
        for i, d in enumerate(args.opponents)
    ]
    labels = ["you"] + list(args.opponents)

    g = Game.new(n, rng)
    print(f"=== Ecology — you vs {', '.join(args.opponents)} (seed {seed}) ===")
    while not g.is_terminal():
        print(f"\n--- Round {g.round}, Turn {g.turn} (pass {g.pass_direction}) ---")
        moves = {}
        moves[0] = human_move(g, 0, my_fallback)
        for s in range(1, n):
            moves[s] = bots[s].select_move(g, s)
        print("Bots are thinking..." if n > 1 else "")
        g.resolve_turn(moves)

    scores = compute_scores(g.ecosystems)
    ranking = sorted(g.player_order, key=lambda s: scores[s].total, reverse=True)
    print("\n========== FINAL ==========")
    for rank, seat in enumerate(ranking, 1):
        sb = scores[seat]
        crown = " 👑" if rank == 1 else ""
        you = " <- you" if seat == 0 else ""
        print(f"\n#{rank}  {labels[seat]}  total = {sb.total:g}{crown}{you}")
        print(render(g.eco(seat)))
        parts = [f"{c}:{getattr(sb, c):g}" for c in CATS if getattr(sb, c)]
        if sb.diversityPenalty:
            parts.append(f"diversity:{sb.diversityPenalty:g}")
        print("   " + "  ".join(parts))


if __name__ == "__main__":
    main()
