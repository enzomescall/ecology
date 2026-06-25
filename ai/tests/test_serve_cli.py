"""End-to-end: build a snapshot, run the ai_move CLI for each difficulty,
verify it returns an engine-legal move."""
import json
import os
import random
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
AI_ROOT = os.path.dirname(HERE)
sys.path.insert(0, AI_ROOT)

from ecology_env.game import Game  # noqa: E402
from baselines import GreedyAgent  # noqa: E402


def make_snapshot(seed=3, advance_turns=7, num_players=4):
    """Play a few greedy turns, then snapshot seat 0's decision point."""
    rng = random.Random(seed)
    g = Game.new(num_players, rng)
    agents = [GreedyAgent(rng=random.Random(seed + s)) for s in range(num_players)]
    for _ in range(advance_turns):
        moves = {s: agents[s].select_move(g, s) for s in g.player_order}
        g.resolve_turn(moves)

    def card(c):
        return {"id": c.id, "type": c.type}

    return {
        "seat": 0,
        "numPlayers": num_players,
        "round": g.round,
        "turn": g.turn,
        "passDirection": g.pass_direction,
        "hands": {str(s): [card(c) for c in g.hand(s)] for s in g.player_order},
        "ecosystems": {
            str(s): [{"card": card(p.card), "coord": {"x": p.coord[0], "y": p.coord[1]}}
                     for p in g.eco(s)]
            for s in g.player_order
        },
        "deck": [card(c) for c in g.deck],
    }, g


def run_cli(snapshot, difficulty):
    proc = subprocess.run(
        [sys.executable, os.path.join(AI_ROOT, "serve", "ai_move.py"),
         "--difficulty", difficulty, "--seed", "42"],
        input=json.dumps(snapshot), capture_output=True, text=True,
    )
    assert proc.returncode == 0, f"{difficulty} CLI failed:\n{proc.stderr}"
    return json.loads(proc.stdout), proc.stderr.strip()


def test_cli_all_difficulties():
    snapshot, g = make_snapshot()
    for diff in ("easy", "medium", "hard", "impossible"):
        wire, log = run_cli(snapshot, diff)
        # rebuild move and validate against the engine
        from ecology_env.game import EcoMove
        coord = (wire["coord"]["x"], wire["coord"]["y"])
        swap = None
        if wire["swap"]:
            a, b = wire["swap"]["a"], wire["swap"]["b"]
            swap = ((a["x"], a["y"]), (b["x"], b["y"]))
        mv = EcoMove(wire["cardId"], coord, swap)
        g.validate_move(0, mv)  # raises if illegal
        print(f"  {diff:11s} -> {wire['cardId']} @ {coord}  [{log.splitlines()[-1] if log else ''}]")
    print("OK: every difficulty returns an engine-legal move via the CLI")


if __name__ == "__main__":
    test_cli_all_difficulties()
