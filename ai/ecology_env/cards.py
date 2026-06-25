"""Card types and deck construction.

Faithful port of server/src/services/deckService.ts and types/card.ts.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List
import random

# Order matters: this is the canonical index order used for tensor encoding.
CARD_TYPES: List[str] = [
    "stream", "meadow", "wolf", "fox", "bear",
    "trout", "dragonfly", "bee", "eagle", "deer", "rabbit",
]
TYPE_INDEX = {t: i for i, t in enumerate(CARD_TYPES)}
NUM_TYPES = len(CARD_TYPES)

# Scoring categories (rabbit excluded). Used for diversity penalty.
SCORING_CATEGORIES: List[str] = [
    "stream", "meadow", "wolf", "fox", "bear",
    "trout", "dragonfly", "bee", "eagle", "deer",
]

COPIES_PER_TYPE = 12


@dataclass(frozen=True)
class Card:
    id: str
    type: str

    def __repr__(self) -> str:  # compact
        return self.type


def create_deck() -> List[Card]:
    """132 cards: 11 types x 12 copies. Matches deckService.createDeck()."""
    deck: List[Card] = []
    for t in CARD_TYPES:
        for i in range(COPIES_PER_TYPE):
            deck.append(Card(id=f"{t}-{i}", type=t))
    return deck


def shuffle(arr: list, rng: random.Random) -> list:
    """Fisher-Yates, matching the JS direction (not that order matters here)."""
    out = list(arr)
    for i in range(len(out) - 1, 0, -1):
        j = rng.randint(0, i)
        out[i], out[j] = out[j], out[i]
    return out
