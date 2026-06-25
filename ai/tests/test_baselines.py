"""Sanity: greedy should comfortably beat random across player counts."""
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
AI_ROOT = os.path.dirname(HERE)
sys.path.insert(0, AI_ROOT)

from baselines import GreedyAgent, RandomAgent, play_match  # noqa: E402


def winrate_greedy_vs_random(num_players, games=60, seed0=0):
    """Seat 0 is greedy, the rest random. Fraction of games greedy ranks #1."""
    wins = 0
    greedy_score = 0.0
    rand_score = 0.0
    for gi in range(games):
        seed = seed0 + gi
        agents = [GreedyAgent(rng=random.Random(seed * 31 + 1))]
        for s in range(1, num_players):
            agents.append(RandomAgent(rng=random.Random(seed * 31 + s + 1)))
        totals, ranks = play_match(agents, num_players, seed)
        if ranks[0] == 1:
            wins += 1
        greedy_score += totals[0]
        rand_score += sum(totals[s] for s in range(1, num_players)) / (num_players - 1)
    return wins / games, greedy_score / games, rand_score / games


def test_greedy_beats_random():
    for n in (3, 4, 5, 6):
        wr, gs, rs = winrate_greedy_vs_random(n, games=40)
        print(f"  {n}p: greedy win-rate {wr:.0%} | avg score greedy {gs:.1f} vs random {rs:.1f}")
        assert wr >= 0.85, f"greedy only won {wr:.0%} at {n}p"
        assert gs > rs + 10, f"greedy margin too small at {n}p"
    print("OK: greedy dominates random at 3-6 players")


if __name__ == "__main__":
    test_greedy_beats_random()
