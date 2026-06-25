"""ISMCTS (heuristic evaluator) should outplay plain greedy. No net required."""
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
AI_ROOT = os.path.dirname(HERE)
sys.path.insert(0, AI_ROOT)

from ecology_env.game import Game  # noqa: E402
from baselines import GreedyAgent  # noqa: E402
from selfplay.evaluators import HeuristicEvaluator  # noqa: E402
from selfplay.ismcts import ISMCTSAgent  # noqa: E402


def test_ismcts_beats_greedy():
    n = 3
    games = 12
    sims = 48
    wins = 0
    mcts_score = 0.0
    greedy_score = 0.0
    for gi in range(games):
        seed = 100 + gi
        rng = random.Random(seed)
        ev = HeuristicEvaluator(temperature=3.0, rng=random.Random(seed))
        agents = [ISMCTSAgent(ev, n_sims=sims, rng=random.Random(seed),
                              opponent_agent=GreedyAgent(rng=random.Random(seed + 7)))]
        for s in range(1, n):
            agents.append(GreedyAgent(rng=random.Random(seed * 13 + s)))

        g = Game.new(n, rng)
        while not g.is_terminal():
            moves = {seat: agents[seat].select_move(g, seat) for seat in g.player_order}
            g.resolve_turn(moves)
        totals, ranks = g.totals(), g.ranks()
        if ranks[0] == 1:
            wins += 1
        mcts_score += totals[0]
        greedy_score += sum(totals[s] for s in range(1, n)) / (n - 1)

    wr = wins / games
    print(f"  ISMCTS({sims} sims) vs greedy, {n}p x{games}: "
          f"win-rate {wr:.0%} | avg {mcts_score/games:.1f} vs {greedy_score/games:.1f}")
    # Search should at least not be worse than greedy; expect a clear edge.
    assert mcts_score >= greedy_score, "ISMCTS underperformed greedy"
    print("OK: ISMCTS with heuristic evaluator is >= greedy (search works end-to-end)")


if __name__ == "__main__":
    test_ismcts_beats_greedy()
