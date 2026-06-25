"""End-to-end smoke test: play full random games for 2-6 players."""
import random
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ecology_env import Game, CARD_TYPES, SCORING_CATEGORIES  # noqa: E402
from ecology_env.board import bounding_box  # noqa: E402


def play_random_game(num_players, seed):
    rng = random.Random(seed)
    g = Game.new(num_players, rng)
    turns = 0
    while not g.is_terminal():
        moves = {}
        for seat in g.player_order:
            legal = g.legal_placement_moves(seat)
            assert legal, f"no legal move seat {seat} r{g.round} t{g.turn}"
            moves[seat] = rng.choice(legal)
        g.resolve_turn(moves)
        turns += 1
    assert turns == 20, f"expected 20 turns, got {turns}"
    return g


def test_full_games_all_sizes():
    for n in range(2, 7):
        for seed in range(5):
            g = play_random_game(n, seed)
            scores = g.final_scores()
            assert len(scores) == n
            for seat in g.player_order:
                eco = g.eco(seat)
                assert len(eco) == 20, f"seat {seat} has {len(eco)} cards"
                # final board must be exactly 5 wide x 4 tall
                *_, w, h = bounding_box(eco)
                assert w == 5 and h == 4, f"box {w}x{h} not 5x4"
                # total = sum of categories - penalty (sanity)
                sb = scores[seat]
                cat_sum = sum(getattr(sb, c) for c in SCORING_CATEGORIES)
                assert abs((cat_sum + sb.diversityPenalty) - sb.total) < 1e-9
    print("OK: full games for 2-6 players, boards fill 5x4, scores consistent")


if __name__ == "__main__":
    test_full_games_all_sizes()
