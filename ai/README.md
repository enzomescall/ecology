# Ecology AI

Self-play reinforcement-learning opponents for Ecology, with selectable
difficulty (easy / medium / hard / impossible) for 3–6 player games.

## Why a Python port

The game engine lives in TypeScript (`server/src/services`). For fast headless
self-play we reimplement the *pure* logic in Python (`ecology_env/`) and verify
it scores identically to the TS engine (`tests/test_parity.py`). Training runs
in PyTorch; the trained net is exported to ONNX and served back in Node via
`onnxruntime-node`, so production inference reuses one model with no Python at
runtime.

## Layout

```
ecology_env/      Faithful Python port of the engine
  cards.py        11 card types, 132-card deck (11x12)
  board.py        placement legality, 5x4 bounding box, rabbit swap
  scoring.py      10 categories + diversity penalty + competitive rank
  game.py         draft / pass / 2-round loop, terminal scoring
  encode.py       state -> tensors, fixed 462-action space + legal masking
tests/            test_smoke / test_encode / test_baselines / test_ismcts /
                  test_parity / test_serve_cli + integration_node.ts
baselines.py      random + greedy agents (training opponents; easy/medium tiers)
selfplay/         net, ISMCTS, self-play, training, arena, rewards
serve/            ai_move.py CLI + difficulty agent factory
export/to_onnx.py ONNX export for the pure-Node serving path
benchmark.py      head-to-head difficulty ladder
demo.py           play one game between tiers, render boards + scores
play.py           play vs the bots in your terminal
run_tests.sh      fast suite (+ --all for slow/parity/integration)
```

Quick things to try:

```bash
cd ai
python3 demo.py --players easy medium hard      # watch the AIs play
python3 play.py --opponents medium hard         # play against them
./run_tests.sh                                  # fast test suite
python3 -m selfplay.train --iterations 120      # train the Impossible net
```

## Key facts that shape the AI

- A finished board is **always a fully filled 5-wide x 4-tall rectangle** (20
  cards, box capped at 5x4 = 20 cells). Fixed-size `4x5x11` tensor state.
- Interaction is limited: the **shared draft** (card denial) plus two
  **competitive** categories — Stream (longest run, 8/5) and Wolf (count,
  12/8/4). Everything else is solitaire on your own board.
- Competitive ties **average** the tied point slice (two-way stream tie = 6.5
  each), matching the TS `rankPlayers` code — *not* the spec's friendly-tie text.
- The online game is **asynchronous**, so the AI may take seconds per move →
  search-heavy methods (ISMCTS) are viable in production, not just training.
- Player count changes both deck contention and competitive thresholds, so it is
  an input to every agent. One shared net covers 3–6 players.

## Running tests

```bash
cd ai
python3 tests/test_smoke.py
python3 tests/test_parity.py    # requires server/ deps installed (tsx)
```

## Difficulty plan

One trained net, exposed at four strengths via search budget + softmax
temperature + blunder rate:

| Tier | Mechanism |
|------|-----------|
| Easy | random / greedy with heavy noise |
| Medium | greedy 1-step marginal score |
| Hard | ISMCTS with greedy-rollout leaf values (beats medium 83%) |
| Impossible | ISMCTS guided by the self-play net (fallback: deeper rollout search) |

See `../docs/ai-design.md` for the full design and the Node integration.
