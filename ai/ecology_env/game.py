"""Game state machine: draft, pass, rounds, scoring.

Faithful port of the relevant parts of gameService.ts (startGame +
checkAndResolveTurn) and deckService deal/pass. Players are seats 0..n-1.

The physical game is simultaneous; here a "turn" is resolved by collecting one
move per seat and calling resolve_turn(moves).
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from . import board
from .board import Coord, PlacedCard
from .cards import Card, create_deck, shuffle
from .scoring import ScoreBreakdown, compute_scores


@dataclass(frozen=True)
class EcoMove:
    card_id: str
    coord: Coord
    swap: Optional[Tuple[Coord, Coord]] = None  # (a, b) or None


def deal_hands(deck: List[Card], player_ids: List[int], cards_per_hand: int):
    hands: Dict[int, List[Card]] = {}
    offset = 0
    for pid in player_ids:
        hands[pid] = deck[offset:offset + cards_per_hand]
        offset += cards_per_hand
    return hands, deck[offset:]


def pass_hands(hands: Dict[int, List[Card]], order: List[int], direction: str):
    n = len(order)
    result: Dict[int, List[Card]] = {}
    for i in range(n):
        if direction == "left":
            recipient = order[(i + 1) % n]
        else:
            recipient = order[(i - 1 + n) % n]
        result[recipient] = hands[order[i]]
    return result


@dataclass
class Game:
    num_players: int
    rng: random.Random
    player_order: List[int] = field(default_factory=list)
    round: int = 1
    turn: int = 1
    pass_direction: str = "left"
    hands: Dict[int, List[Card]] = field(default_factory=dict)
    ecosystems: Dict[int, List[PlacedCard]] = field(default_factory=dict)
    deck: List[Card] = field(default_factory=list)
    status: str = "active"
    scores: Optional[Dict[int, ScoreBreakdown]] = None

    # ---- construction ----
    @classmethod
    def new(cls, num_players: int, rng: Optional[random.Random] = None,
            cards_per_hand: int = 10) -> "Game":
        rng = rng or random.Random()
        order = list(range(num_players))
        deck = shuffle(create_deck(), rng)
        hands, remaining = deal_hands(deck, order, cards_per_hand)
        g = cls(
            num_players=num_players, rng=rng, player_order=order,
            round=1, turn=1, pass_direction="left",
            hands=hands, deck=remaining, status="active",
        )
        g.ecosystems = {pid: [] for pid in order}
        g._cards_per_hand = cards_per_hand  # type: ignore[attr-defined]
        return g

    # ---- queries ----
    def hand(self, seat: int) -> List[Card]:
        return self.hands[seat]

    def eco(self, seat: int) -> List[PlacedCard]:
        return self.ecosystems[seat]

    def is_terminal(self) -> bool:
        return self.status == "finished"

    def legal_placement_moves(self, seat: int, include_swaps: bool = False) -> List[EcoMove]:
        """Enumerate legal non-swap moves: every distinct card-type in hand x every
        legal placement cell. (We dedupe by card type since copies are identical,
        but return a concrete card id for each.)

        Rabbit swap enumeration is intentionally excluded by default: there can be
        O(cells^2) swaps. Swap search is handled by agents that want it.
        """
        eco = self.ecosystems[seat]
        cells = board.valid_placements(eco)
        moves: List[EcoMove] = []
        seen_types = set()
        for card in self.hands[seat]:
            if card.type in seen_types:
                continue
            seen_types.add(card.type)
            for cell in cells:
                moves.append(EcoMove(card_id=card.id, coord=cell))
        if include_swaps:
            for card in self.hands[seat]:
                if card.type != "rabbit":
                    continue
                for cell in cells:
                    eco_after = board.place_card(eco, card, cell)
                    coords = [p.coord for p in eco_after]
                    for ai in range(len(coords)):
                        for bi in range(ai + 1, len(coords)):
                            a, b = coords[ai], coords[bi]
                            if board.swap_keeps_box(eco_after, a, b):
                                moves.append(EcoMove(card.id, cell, (a, b)))
                break  # one rabbit copy is representative
        return moves

    def validate_move(self, seat: int, move: EcoMove) -> None:
        hand = self.hands[seat]
        card = next((c for c in hand if c.id == move.card_id), None)
        if card is None:
            raise ValueError("Card not in hand")
        eco = self.ecosystems[seat]
        if not board.is_valid_placement(eco, move.coord):
            raise ValueError("Invalid placement")
        if move.swap is not None:
            if card.type != "rabbit":
                raise ValueError("Only rabbits can swap")
            eco_after = board.place_card(eco, card, move.coord)
            a, b = move.swap
            if not board.swap_keeps_box(eco_after, a, b):
                raise ValueError("Illegal swap")

    # ---- transition ----
    def resolve_turn(self, moves: Dict[int, EcoMove]) -> None:
        """Apply one move per seat and advance, mirroring checkAndResolveTurn."""
        if self.status != "active":
            raise RuntimeError("Game is not active")
        for seat in self.player_order:
            if seat not in moves:
                raise ValueError(f"Missing move for seat {seat}")
            self.validate_move(seat, moves[seat])

        # 1&2: remove from hand, place
        for seat in self.player_order:
            move = moves[seat]
            hand = self.hands[seat]
            card = next(c for c in hand if c.id == move.card_id)
            self.hands[seat] = [c for c in hand if c.id != move.card_id]
            self.ecosystems[seat] = board.place_card(self.ecosystems[seat], card, move.coord)

        # 3: rabbit swaps
        for seat in self.player_order:
            move = moves[seat]
            if move.swap is not None:
                a, b = move.swap
                self.ecosystems[seat] = board.apply_swap(self.ecosystems[seat], a, b)

        # 4: pass hands
        self.hands = pass_hands(self.hands, self.player_order, self.pass_direction)

        # 6: increment turn
        self.turn += 1

        # 7: round/game end
        if self.turn > 10:
            if self.round == 1:
                cph = getattr(self, "_cards_per_hand", 10)
                hands, remaining = deal_hands(self.deck, self.player_order, cph)
                self.hands = hands
                self.deck = remaining
                self.round = 2
                self.turn = 1
                self.pass_direction = "right"
            else:
                self.status = "finished"
                self.scores = compute_scores(self.ecosystems)

    # ---- results ----
    def final_scores(self) -> Dict[int, ScoreBreakdown]:
        if self.scores is None:
            raise RuntimeError("Game not finished")
        return self.scores

    def totals(self) -> Dict[int, float]:
        return {pid: sb.total for pid, sb in self.final_scores().items()}

    def ranks(self) -> Dict[int, int]:
        """1 = best (highest total). Ties get the same rank."""
        totals = self.totals()
        ordered = sorted(set(totals.values()), reverse=True)
        rank_of = {v: i + 1 for i, v in enumerate(ordered)}
        return {pid: rank_of[t] for pid, t in totals.items()}
