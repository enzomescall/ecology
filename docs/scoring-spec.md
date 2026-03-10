# Ecosystem Scoring Spec

## Purpose

This document defines how to compute final scores for each scoring category in Ecosystem.

This is an implementation spec, not a copy of the printed rules.

---

## 1. General Scoring Structure

Scoring occurs only after both rounds are complete and each player has placed 20 cards.

There are 10 scoring criteria that may contribute points:

1. Stream
2. Meadow
3. Wolf
4. Fox
5. Bear
6. Trout
7. Dragonfly
8. Bee
9. Eagle
10. Deer

Rabbit is **not** a scoring criterion and is excluded from diversity counting.

A player's final score is:

`sum(category scores) - diversity penalty`

---

## 2. Shared Definitions

### 2.1 Orthogonal adjacency
Two cards are adjacent if they share a side:
- up
- down
- left
- right

Diagonal contact does not count.

### 2.2 Connected group
A connected group is a set of cards of the same relevant type connected orthogonally.

### 2.3 Straight-line distance for eagles
A card is within 2 spaces of an eagle if:
- it is 1 or 2 cells away
- in the same row or same column
- with no turning or diagonal relationship required

Examples:
- `(x+1, y)` valid
- `(x+2, y)` valid
- `(x, y-1)` valid
- `(x, y+2)` valid
- `(x+1, y+1)` invalid

### 2.4 Tie handling for competitive categories
For all competitive scoring categories, ties are friendly:
- tied players all receive the points for the tied position(s)

Implementation rule:
- if multiple players tie for first, all tied players receive first-place points
- if multiple players tie for second, all tied players receive second-place points

Do not split points.

Competitive categories:
- Stream
- Wolf

The review text also mentions second-place ranking for stream only and first/second/third for wolves.

---

## 3. Category Scoring Rules

## 3.1 Stream

Category type: competitive

Definition:
- A stream score is based on the player's longest connected group of stream cards

Compute:
- for each player, find the size of their largest connected stream group

Award:
- longest stream overall: 8 points
- second longest stream overall: 5 points

Rules:
- only the player's single longest stream matters
- tied players share rank points
- a player with no stream cards has stream value 0 and scores 0 points

Suggested implementation:
1. compute each player's `longestStreamLength`
2. rank all players by that value
3. award competitive points

---

## 3.2 Meadow

Category type: non-competitive

Definition:
- Each connected meadow group scores based on its size
- A player may score multiple disconnected meadow groups

Scoring table per connected meadow:
- size 1 => 0
- size 2 => 3
- size 3 => 6
- size 4 => 10
- size 5 or more => 15

Total meadow score:
- sum the score of each connected meadow group separately

Examples:
- groups of sizes 3 and 2 => 6 + 3 = 9
- one group of size 6 => 15

---

## 3.3 Wolf

Category type: competitive

Definition:
- Wolves score based on total number of wolf cards in the player's ecosystem

Compute:
- count wolves for each player

Award:
- most wolves: 12 points
- second most wolves: 8 points
- third most wolves: 4 points

Rules:
- player must have at least 1 wolf to receive points
- ties share rank points
- players below third rank get 0

Suggested implementation:
1. compute `wolfCount` for each player
2. exclude players with 0 wolves from ranking
3. assign 12 / 8 / 4 using friendly tie rules

---

## 3.4 Fox

Category type: non-competitive

Each fox scores 3 points if it is **not adjacent** to any bear or wolf.

Per fox:
- if at least one adjacent bear or wolf exists => 0
- otherwise => 3

Total fox score:
- sum over all foxes

---

## 3.5 Bear

Category type: non-competitive

Each bear scores:
- 2 points for each adjacent trout
- 2 points for each adjacent bee

Equivalent:
- 2 points per adjacent trout or bee

Per bear:
`2 * (# adjacent trout + # adjacent bee)`

Total bear score:
- sum over all bears

Notes:
- a single trout may score for multiple bears if adjacent to multiple bears
- a single bee may score for multiple bears if adjacent to multiple bears

---

## 3.6 Trout

Category type: non-competitive

Each trout scores:
- 2 points for each adjacent stream
- 2 points for each adjacent dragonfly

Per trout:
`2 * (# adjacent stream + # adjacent dragonfly)`

Total trout score:
- sum over all trout

Notes:
- adjacency is orthogonal only
- a single stream card or dragonfly may contribute to multiple trout if positioned accordingly

---

## 3.7 Dragonfly

Category type: non-competitive

Dragonflies score based on streams they are adjacent to.

For each dragonfly:
- find all distinct connected stream groups that the dragonfly is orthogonally adjacent to
- for each such stream group, add that stream group's total length to score

Equivalent interpretation:
- each dragonfly scores once per adjacent stream group, equal to that group's size

Examples:
- one dragonfly adjacent to a stream group of size 4 => 4 points
- three dragonflies each adjacent to the same stream group of size 4 => 12 points total
- one dragonfly adjacent to two different disconnected stream groups of size 2 and 3 => 5 points

Important:
- a single dragonfly may score multiple times if adjacent to multiple distinct stream groups
- if a dragonfly touches two cards from the same connected stream group, that group is counted only once for that dragonfly

Suggested implementation:
1. identify all connected stream groups and assign group ids
2. for each dragonfly:
   - inspect orthogonally adjacent cells
   - collect unique adjacent stream group ids
   - add the size of each unique group

---

## 3.8 Bee

Category type: non-competitive

Each bee scores 3 points for each meadow group it is adjacent to.

For each bee:
- find all distinct connected meadow groups orthogonally adjacent to that bee
- score 3 points per distinct adjacent meadow group

Important:
- if a bee touches multiple cards in the same meadow group, that group only counts once for that bee
- if a bee touches two separate meadow groups, it scores 6

Suggested implementation:
1. identify all connected meadow groups and assign group ids
2. for each bee:
   - inspect adjacent cells
   - collect unique adjacent meadow group ids
   - score `3 * count(unique groups)`

---

## 3.9 Eagle

Category type: non-competitive

Each eagle scores 2 points for each rabbit or trout within 2 spaces in a straight line.

For each eagle, inspect:
- up 1
- up 2
- down 1
- down 2
- left 1
- left 2
- right 1
- right 2

For each inspected cell:
- if card is rabbit or trout => +2 points

Total eagle score:
- sum over all eagles

Notes:
- same rabbit or trout may be scored by multiple eagles
- cards do not block line of sight unless the official rules explicitly say so; based on the provided summary, only straight-line position matters, not blocking

---

## 3.10 Deer

Category type: non-competitive

Deer score by spreading across rows and columns.

Score:
- 2 points for each row that contains at least one deer
- 2 points for each column that contains at least one deer

Important:
- count rows and columns, not deer
- multiple deer in the same row still contribute only 2 for that row
- same for columns

Total deer score:
`2 * (# distinct rows with deer) + 2 * (# distinct columns with deer)`

---

## 3.11 Rabbit

Category type: non-scoring

Rabbits contribute 0 points directly.

They are excluded from:
- category score total
- diversity criterion count

Rabbits only matter during play because they allow an immediate swap of any two cards in the player's ecosystem after placement.

---

## 4. Diversity Penalty

After computing the 10 scoring criteria above, count how many categories scored exactly 0.

Included in this zero-count:
- Stream
- Meadow
- Wolf
- Fox
- Bear
- Trout
- Dragonfly
- Bee
- Eagle
- Deer

Excluded:
- Rabbit

Penalty table:
- 0 to 3 zero-score categories => 0 penalty
- 4 zero-score categories => -2
- 5 zero-score categories => -5
- 6 or more zero-score categories => -10

Note:
- the source summary appears to contain a typo on the 6+ penalty; this spec assumes the intended value is -10

---

## 5. Final Score Formula

For each player:

`finalScore = stream + meadow + wolf + fox + bear + trout + dragonfly + bee + eagle + deer - diversityPenalty`

---

## 6. Tiebreakers for Winning the Game

If final scores are tied:

1. player with fewer zero-score categories wins
2. if still tied, player with more wolves wins
3. if still tied, victory is shared

Rabbit is not part of zero-score category counting.

---

## 7. Recommended Implementation Order

Recommended order for coding and testing:
1. Meadow
2. Fox
3. Bear
4. Trout
5. Deer
6. Eagle
7. Stream
8. Wolf
9. Dragonfly
10. Bee
11. Diversity penalty
12. Final winner tiebreaker

Reason:
- start with local adjacency/counting rules
- then add connected-component rules
- finish with competitive ranking rules

---

## 8. Suggested Testing Strategy

For each category:
- build small fixture ecosystems
- test category scorer independently
- keep scorers pure

Suggested function shape:
- `scoreMeadow(board): number`
- `scoreFox(board): number`
- etc.

For competitive categories:
- use multi-player fixtures:
- `scoreStreamCompetition(boards): Record<PlayerId, number>`
- `scoreWolfCompetition(boards): Record<PlayerId, number>`