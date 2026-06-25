"""Validate the fixed action space and encoding against the engine."""
import os
import random
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
AI_ROOT = os.path.dirname(HERE)
sys.path.insert(0, AI_ROOT)

from ecology_env import Game  # noqa: E402
from ecology_env import encode  # noqa: E402


def test_mask_matches_engine_and_decodes():
    rng = random.Random(123)
    canvas_overflow = 0
    games_played = 0
    for gi in range(40):
        n = rng.randint(2, 6)
        g = Game.new(n, random.Random(gi + 1))
        while not g.is_terminal():
            for seat in g.player_order:
                eco = g.eco(seat)
                # every engine-legal cell must fit the canvas
                origin = encode.eco_origin(eco)
                for cell in __import__("ecology_env.board", fromlist=["x"]).valid_placements(eco):
                    xp, yp = encode._norm_cell(cell, origin)
                    if not (0 <= xp < encode.CANVAS_W and 0 <= yp < encode.CANVAS_H):
                        canvas_overflow += 1

                mask = encode.legal_action_mask(g, seat)
                # number of legal (type,cell) pairs == #distinct-hand-types * #cells
                import ecology_env.board as b
                cells = b.valid_placements(eco)
                hand_types = {c.type for c in g.hand(seat)}
                assert mask.sum() == len(cells) * len(hand_types), (
                    f"mask {mask.sum()} != {len(cells)}*{len(hand_types)}"
                )
                # every masked action decodes to an engine-valid move
                for a in np.nonzero(mask)[0]:
                    mv = encode.action_to_move(g, seat, int(a), greedy_swap=False)
                    g.validate_move(seat, mv)  # raises if illegal

                # encoding shapes
                obs = encode.encode_state(g, seat)
                assert obs["planes"].shape == (encode.BOARD_CHANNELS, encode.CANVAS_H, encode.CANVAS_W)
                assert obs["vec"].shape == (encode.OBS_VEC_DIM,)

            # advance with a random legal action drawn through the action space
            moves = {}
            for seat in g.player_order:
                mask = encode.legal_action_mask(g, seat)
                a = int(rng.choice(np.nonzero(mask)[0]))
                moves[seat] = encode.action_to_move(g, seat, a, greedy_swap=True)
            g.resolve_turn(moves)
        games_played += 1

    assert canvas_overflow == 0, f"{canvas_overflow} cells fell outside the canvas"
    print(f"OK: {games_played} games, masks match engine, all actions decode legally, "
          f"no canvas overflow (action space = {encode.NUM_ACTIONS})")


if __name__ == "__main__":
    test_mask_matches_engine_and_decodes()
