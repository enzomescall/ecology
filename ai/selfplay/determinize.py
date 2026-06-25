"""Determinization of hidden information for ISMCTS.

From the root seat's view the unknowns are the other seats' current hands and
the undealt deck. Everything else (own hand, all placed cards, round/turn/pass)
is public. We sample a consistent assignment of the hidden card pool.

Note: this is a uniform determinization over the hidden pool. It does not yet
exploit the partial knowledge a player has from cards they have personally seen
passed through their hand in earlier turns. That belief refinement is a worthy
later upgrade; uniform sampling is already a sound ISMCTS basis.
"""
from __future__ import annotations

import random
from typing import List

from ecology_env.cards import Card, create_deck
from ecology_env.game import Game


def hidden_pool(game: Game, seat: int) -> List[Card]:
    """All cards not visible to `seat`: opponents' hands + the undealt deck."""
    full = create_deck()
    seen_ids = set(c.id for c in game.hand(seat))
    for s in game.player_order:
        for p in game.eco(s):
            seen_ids.add(p.card.id)
    return [c for c in full if c.id not in seen_ids]


def determinize(game: Game, seat: int, rng: random.Random) -> Game:
    """Return a clone with opponents' hands and the deck resampled from the
    hidden pool (own hand and all boards untouched)."""
    g = game.clone()
    pool = hidden_pool(game, seat)
    rng.shuffle(pool)

    offset = 0
    for s in g.player_order:
        if s == seat:
            continue
        size = len(g.hands[s])
        g.hands[s] = pool[offset:offset + size]
        offset += size
    g.deck = pool[offset:]
    return g
