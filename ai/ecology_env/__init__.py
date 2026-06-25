"""Ecology game engine (Python port) for AI training.

Faithful reimplementation of the TypeScript server engine
(server/src/services/*) so we can run fast headless self-play.
"""
from .cards import (
    CARD_TYPES, TYPE_INDEX, NUM_TYPES, SCORING_CATEGORIES, Card,
    create_deck, shuffle,
)
from .board import PlacedCard, Coord
from .game import Game, EcoMove
from .scoring import compute_scores, ScoreBreakdown

__all__ = [
    "CARD_TYPES", "TYPE_INDEX", "NUM_TYPES", "SCORING_CATEGORIES", "Card",
    "create_deck", "shuffle", "PlacedCard", "Coord", "Game", "EcoMove",
    "compute_scores", "ScoreBreakdown",
]
