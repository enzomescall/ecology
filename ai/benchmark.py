"""Difficulty-ladder benchmark.

Pits one agent of tier A (seat 0) against tier B opponents (other seats) over
several games and reports tier A's win-rate and average score. Used to confirm
the strength ordering easy < medium < hard < impossible.

Usage:
    python3 benchmark.py --a medium --b easy --games 30 --players 3
    python3 benchmark.py --a hard --b medium --games 8 --hard-sims 48
"""
from __future__ import annotations

import argparse
import random

from ecology_env.game import Game
from serve.agents import build_agent


def run(a: str, b: str, games: int, players: int, hard_sims: int, impossible_sims: int,
        seed: int = 0):
    a_wins = 0.0
    a_score = 0.0
    b_score = 0.0
    for gi in range(games):
        s = seed + gi
        rng = random.Random(s)
        agents = []
        agent_a, _ = build_agent(a, rng=random.Random(s), hard_sims=hard_sims,
                                 impossible_sims=impossible_sims)
        agents.append(agent_a)
        for k in range(1, players):
            agent_b, _ = build_agent(b, rng=random.Random(s * 97 + k), hard_sims=hard_sims,
                                     impossible_sims=impossible_sims)
            agents.append(agent_b)
        g = Game.new(players, rng)
        while not g.is_terminal():
            moves = {seat: agents[seat].select_move(g, seat) for seat in g.player_order}
            g.resolve_turn(moves)
        totals, ranks = g.totals(), g.ranks()
        if ranks[0] == 1:
            a_wins += 1.0 / sum(1 for r in ranks.values() if r == 1)
        a_score += totals[0]
        b_score += sum(totals[k] for k in range(1, players)) / (players - 1)
    print(f"{a:>10} vs {b:<10} ({players}p x{games}): "
          f"{a} win-rate {a_wins/games:5.0%} | avg {a}={a_score/games:5.1f}  {b}={b_score/games:5.1f}")
    return a_wins / games


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--a", required=True)
    ap.add_argument("--b", required=True)
    ap.add_argument("--games", type=int, default=20)
    ap.add_argument("--players", type=int, default=3)
    ap.add_argument("--hard-sims", type=int, default=48)
    ap.add_argument("--impossible-sims", type=int, default=96)
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args()
    run(args.a, args.b, args.games, args.players, args.hard_sims, args.impossible_sims, args.seed)
