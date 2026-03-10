# Ecosystem Turn and Round Spec

## Purpose

This document defines the turn flow, placement rules, round flow, and state transitions for an asynchronous online implementation of Ecosystem.

This is an implementation spec, not a copy of the printed rules.

---

## 1. Core Game Structure

- Players: 2 to 6
- Total rounds: 2
- Cards placed per player: 20 total
- Cards placed per round per player: 10
- Final grid size per player: exactly 4 rows x 5 columns, represented as a 20-cell orthogonally connected layout bounded by a 4-high x 5-wide box

Each player builds their own ecosystem independently, but card drafting is shared.

---

## 2. High-Level Flow

### Round 1
- Each player receives a hand of 10 cards
- On each draft step, each player selects 1 card from their current hand
- After all players lock in their choice:
  - all selected cards are revealed
  - each selected card is placed in that player's ecosystem
  - any rabbit swap effects are resolved immediately after placement
  - the remaining cards in each hand are passed to the player on the left
- This repeats until all 10 cards from the round have been placed

### Round 2
- Each player receives a fresh hand of 10 cards
- Same process as round 1, except remaining cards are passed to the player on the right

After round 2 ends, scoring begins.

---

## 3. Turn Model

A "turn" is one draft-and-place cycle.

Each turn has these phases:

1. **Draft phase**
   - Each player selects 1 card from their current hand
   - Each player also selects the placement location for that card
   - If the selected card is a rabbit, the player may optionally specify a swap action to perform immediately after placement

2. **Lock phase**
   - Submitted moves are hidden from other players until all players have submitted, or until the server resolves the turn using timeout/auto-pick rules

3. **Reveal and resolve phase**
   - All selected cards are revealed
   - All selected cards are placed into each player's grid
   - Rabbit swaps are applied
   - Hands are reduced by 1 card
   - Remaining hands are passed in the round's pass direction

4. **Advance phase**
   - Turn counter increments
   - If turn 10 of the round is complete:
     - either start next round
     - or finish game if round 2 is complete

---

## 4. Hidden Information Rules

- A player's hand is private
- A selected card remains hidden until turn resolution
- Passed hands are received face-down / hidden until the recipient has submitted their pick for that turn
- Opponent grids are public once cards are placed

For the online implementation:
- players should never see the next passed hand before they submit their current pick

---

## 5. Placement Rules

### 5.1 First placement
A player's first card in the game may be placed anywhere.

### 5.2 All later placements
Every later card must be placed:
- in an empty grid cell
- orthogonally adjacent to at least one already placed card
- within the player's final legal 4-by-5 bounding box

Orthogonal adjacency means:
- up
- down
- left
- right

Diagonal adjacency does not count.

---

## 6. Shape Constraint / Bounding Box Rule

A player's final ecosystem must fit inside a shape that is no more than:
- 5 cards wide
- 4 cards high

Equivalent implementation rule:
- after every placement, the bounding box containing all placed cards must have:
  - width <= 5
  - height <= 4

This means the player may build any connected polyomino shape as long as:
- every new card is orthogonally connected
- the total shape always remains within a 5x4 bounding box

The grid does **not** need to begin as a fixed visible 4x5 matrix in logical coordinates, but the placed cards must never force the ecosystem outside 5 wide x 4 high.

Recommended implementation:
- store cards on an unbounded coordinate plane during play
- after each placement, compute minX, maxX, minY, maxY
- reject placements where:
  - `(maxX - minX + 1) > 5`
  - `(maxY - minY + 1) > 4`

Optional UI layer:
- normalize the final shape into a 4x5 rendered board for display

---

## 7. Rabbit Immediate Swap Rule

Rabbit cards score no points directly.

After a player places a rabbit, that player may immediately switch the positions of any two cards in their ecosystem, including:
- the rabbit just placed
- any previously placed cards

Rules:
- the swap is optional
- exactly two positions are swapped if used
- the swap happens immediately after rabbit placement, before the turn fully resolves
- swap does not need to preserve any adjacency legality after the swap; the rabbit ability is an exception-based rearrangement tool
- after the swap, the full ecosystem still must fit within the 5x4 bounding box

Recommended implementation:
- rabbit move payload may include:
  - `swap: null`
  - or `swap: { a: Coord, b: Coord }`

---

## 8. Pass Direction

- Round 1: pass left
- Round 2: pass right

Implementation note:
- assume player order is fixed at game creation

Given ordered players `[P0, P1, P2, ... Pn]`:

### Pass left
- each player's remaining hand goes to the next index
- recipient index = `(i + 1) mod n`

### Pass right
- each player's remaining hand goes to the previous index
- recipient index = `(i - 1 + n) mod n`

---

## 9. Final Forced Card

On the last draft step of a round, each player receives a hand containing exactly 1 card.
That card must be taken and placed; there is no choice.

This is not a special case in the engine if hands are modeled normally.

---

## 10. Suggested Server Validation Rules Per Submitted Move

Each submitted move must include:
- chosen card id
- placement coordinate
- optional rabbit swap

Server must validate:
- game is active
- correct round
- correct turn
- player is part of the game
- player has not already submitted this turn
- chosen card exists in player's current hand
- placement coordinate is empty
- placement is legal under adjacency rule, except for the player's very first card
- placement does not make ecosystem exceed 5x4 bounding box
- if rabbit swap exists:
  - placed card is rabbit
  - both swap coordinates currently contain cards after rabbit placement
  - resulting post-swap ecosystem still fits 5x4 bounding box

---

## 11. Turn Resolution Order

When resolving a completed turn:

1. Confirm all players have a submitted move
2. For each player:
   - remove selected card from hand
3. For each player:
   - place selected card in ecosystem
4. For each player who played rabbit:
   - apply swap if specified
5. Rotate remaining hands in correct pass direction
6. Increment turn number
7. If round complete:
   - if round 1, deal fresh hands for round 2 and reset turn to 1
   - if round 2, mark game as finished
8. If game finished:
   - compute final scores

Note:
- all placements in the same turn are independent because players only place into their own ecosystem

---

## 12. Async / Sequential Online Model

Although the physical game is simultaneous, the online implementation is asynchronous.

Recommended model:
- each turn remains open until all players submit
- once all players submit, resolve immediately
- optional future enhancement:
  - add timeout and auto-pick / auto-place behavior

Because each player only modifies their own board, concurrency complexity is low.
The only shared state dependency is draft hand rotation.

---

## 13. Suggested Game State Fields

Suggested state:
- gameId
- playerOrder[]
- round: 1 | 2
- turn: 1..10
- status: lobby | active | finished
- passDirection: left | right
- handsByPlayerId
- submittedMovesByPlayerId
- ecosystemsByPlayerId
- scoresByPlayerId (after game end)

Each ecosystem should store:
- placed cards
- coordinates
- enough information to score later