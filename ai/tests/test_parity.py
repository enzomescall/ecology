"""Cross-check Python scoring against the real TypeScript engine.

Generates random finished boards in Python, scores them both in Python and via
the server's computeScores (through a tsx harness), and asserts every category
and total matches exactly.
"""
import json
import os
import random
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
AI_ROOT = os.path.dirname(HERE)
REPO = os.path.dirname(AI_ROOT)
SERVER = os.path.join(REPO, "server")

sys.path.insert(0, AI_ROOT)

from ecology_env import Game, SCORING_CATEGORIES  # noqa: E402
from ecology_env.scoring import compute_scores  # noqa: E402

CATS = SCORING_CATEGORIES + ["diversityPenalty", "total"]


def eco_to_json(eco):
    return [
        {"card": {"id": p.card.id, "type": p.card.type},
         "coord": {"x": p.coord[0], "y": p.coord[1]}}
        for p in eco
    ]


def random_finished_games(num_games, seed):
    rng = random.Random(seed)
    games = []
    for gi in range(num_games):
        n = rng.randint(2, 6)
        g = Game.new(n, random.Random(seed * 1000 + gi))
        while not g.is_terminal():
            moves = {}
            for seat in g.player_order:
                legal = g.legal_placement_moves(seat)
                moves[seat] = rng.choice(legal)
            g.resolve_turn(moves)
        games.append(g)
    return games


def score_with_ts(ecosystems_list):
    payload = {"games": [
        {str(pid): eco_to_json(eco) for pid, eco in ecos.items()}
        for ecos in ecosystems_list
    ]}
    proc = subprocess.run(
        ["node_modules/.bin/tsx", "../ai/tests/parity_ts.ts"],
        cwd=SERVER, input=json.dumps(payload),
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"tsx harness failed:\n{proc.stderr}")
    return json.loads(proc.stdout)["results"]


def test_parity():
    games = random_finished_games(40, seed=7)
    ecosystems_list = [g.ecosystems for g in games]
    ts_results = score_with_ts(ecosystems_list)

    mismatches = 0
    for gi, g in enumerate(games):
        py = compute_scores(g.ecosystems)
        ts = ts_results[gi]
        for seat in g.player_order:
            pyb = py[seat].as_dict()
            tsb = ts[str(seat)]
            for cat in CATS:
                pv, tv = float(pyb[cat]), float(tsb[cat])
                if abs(pv - tv) > 1e-9:
                    mismatches += 1
                    print(f"  game {gi} seat {seat} {cat}: py={pv} ts={tv}")
    assert mismatches == 0, f"{mismatches} scoring mismatches vs TS engine"
    print(f"OK: {len(games)} games, all categories match the TypeScript engine exactly")


if __name__ == "__main__":
    test_parity()
