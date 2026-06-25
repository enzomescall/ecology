"""Bridge between the Node server's game JSON and the Python engine.

The Node server is state-authoritative, so it can hand us a full snapshot. We
rebuild a `Game` positioned at one seat's decision and return the chosen
`EcoMove` in the server's wire format.

Snapshot schema (all seats indexed by their position in playerOrder, 0..n-1):
{
  "seat": int,
  "numPlayers": int,
  "round": 1|2,
  "turn": 1..10,
  "passDirection": "left"|"right",
  "hands":       { "<i>": [ {"id","type"}, ... ] },
  "ecosystems":  { "<i>": [ {"card":{"id","type"},"coord":{"x","y"}}, ... ] },
  "deck":        [ {"id","type"}, ... ]    # optional
}
"""
from __future__ import annotations

import random
from typing import Any, Dict

from ecology_env.board import PlacedCard
from ecology_env.cards import Card
from ecology_env.game import EcoMove, Game


def _card(d: Dict[str, Any]) -> Card:
    return Card(id=d["id"], type=d["type"])


def game_from_snapshot(snap: Dict[str, Any]) -> Game:
    n = snap["numPlayers"]
    g = Game(
        num_players=n,
        rng=random.Random(),
        player_order=list(range(n)),
        round=snap.get("round", 1),
        turn=snap.get("turn", 1),
        pass_direction=snap.get("passDirection", "left"),
        status="active",
    )
    g.hands = {int(i): [_card(c) for c in cards] for i, cards in snap["hands"].items()}
    g.ecosystems = {}
    for i, placed in snap["ecosystems"].items():
        g.ecosystems[int(i)] = [
            PlacedCard(card=_card(p["card"]), coord=(p["coord"]["x"], p["coord"]["y"]))
            for p in placed
        ]
    # ensure every seat has entries
    for s in g.player_order:
        g.hands.setdefault(s, [])
        g.ecosystems.setdefault(s, [])
    g.deck = [_card(c) for c in snap.get("deck", [])]
    g._cards_per_hand = 10  # type: ignore[attr-defined]
    return g


def move_to_wire(move: EcoMove) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "cardId": move.card_id,
        "coord": {"x": move.coord[0], "y": move.coord[1]},
        "swap": None,
    }
    if move.swap is not None:
        a, b = move.swap
        out["swap"] = {"a": {"x": a[0], "y": a[1]}, "b": {"x": b[0], "y": b[1]}}
    return out


def snapshot_seed(snap: Dict[str, Any]) -> int:
    """Deterministic seed from the snapshot so a given position plays consistently."""
    key = (snap["seat"], snap.get("round", 1), snap.get("turn", 1),
           tuple(sorted((i, len(c)) for i, c in snap["ecosystems"].items())))
    return hash(key) & 0x7FFFFFFF
