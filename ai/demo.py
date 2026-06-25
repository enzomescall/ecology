"""Play one game between chosen difficulties and pretty-print the final boards
and score breakdowns. A quick way to *see* what the AIs build.

    python3 demo.py --players easy medium hard
    python3 demo.py --players medium medium medium medium   # 4p
"""
from __future__ import annotations

import argparse
import random

from ecology_env.board import bounding_box
from ecology_env.game import Game
from ecology_env.scoring import compute_scores
from serve.agents import build_agent

EMOJI = {
    "stream": "🌊", "meadow": "🌾", "wolf": "🐺", "fox": "🦊", "bear": "🐻",
    "trout": "🐟", "dragonfly": "🪰", "bee": "🐝", "eagle": "🦅", "deer": "🦌",
    "rabbit": "🐇",
}
CATS = ["stream", "meadow", "wolf", "fox", "bear", "trout",
        "dragonfly", "bee", "eagle", "deer"]


def render(eco) -> str:
    min_x, max_x, min_y, max_y, w, h = bounding_box(eco)
    grid = [["  ·" for _ in range(w)] for _ in range(h)]
    for p in eco:
        grid[p.coord[1] - min_y][p.coord[0] - min_x] = " " + EMOJI[p.card.type]
    return "\n".join("".join(row) for row in grid)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--players", nargs="+", default=["easy", "medium"],
                    help="difficulty per seat (2-6)")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--hard-sims", type=int, default=24)
    args = ap.parse_args()

    diffs = args.players
    n = len(diffs)
    assert 2 <= n <= 6, "need 2-6 players"
    rng = random.Random(args.seed)
    agents = [build_agent(d, rng=random.Random(args.seed * 31 + i),
                          hard_sims=args.hard_sims, impossible_fallback_sims=args.hard_sims)[0]
              for i, d in enumerate(diffs)]

    g = Game.new(n, rng)
    while not g.is_terminal():
        g.resolve_turn({seat: agents[seat].select_move(g, seat) for seat in g.player_order})

    scores = compute_scores(g.ecosystems)
    ranking = sorted(g.player_order, key=lambda s: scores[s].total, reverse=True)

    print(f"\nEcology demo — {n} players: {', '.join(diffs)}  (seed {args.seed})\n")
    for rank, seat in enumerate(ranking, 1):
        sb = scores[seat]
        crown = " 👑" if rank == 1 else ""
        print(f"#{rank}  seat {seat} [{diffs[seat]}]  total = {sb.total}{crown}")
        print(render(g.eco(seat)))
        parts = [f"{c}:{getattr(sb, c):g}" for c in CATS if getattr(sb, c)]
        if sb.diversityPenalty:
            parts.append(f"diversity:{sb.diversityPenalty:g}")
        print("   " + "  ".join(parts) + "\n")


if __name__ == "__main__":
    main()
