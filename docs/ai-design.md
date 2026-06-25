# Ecology AI — Design & Training

How the computer opponents work, why they're built this way, and how to train /
serve / extend them. Code lives in `ai/`; the Node integration is in
`server/src/services/aiService.ts`.

---

## 1. What kind of game this is (and why it matters)

Ecology is a **draft-and-build tableau game**. Each player privately builds their
own 4×5 board; interaction between players is deliberately limited to two
channels:

1. **The shared draft** — you pick one card, place it, and pass the rest. Denying
   a card to opponents is the main lever of interaction.
2. **Two competitive categories** — Stream (longest connected run → 8/5 points)
   and Wolf (count → 12/8/4). Every *other* category (Meadow, Fox, Bear, Trout,
   Dragonfly, Bee, Eagle, Deer) is **solitaire**: it depends only on your board.

Three structural facts drive every design choice:

- **The finished board is always a fully-filled 5-wide × 4-tall rectangle.**
  20 cards in a box capped at 5×4 = 20 cells, so the endgame is always a complete
  grid. State is a fixed-size tensor; a big chunk of skill is "given the 20 cards
  I'll end with, arrange them well" — a tractable optimization.
- **Imperfect information** (hidden hands, passed face-down) → the right search
  tool is **determinized / Information-Set MCTS**, not minimax.
- **The online game is asynchronous** — no human is blocked in real time, so the
  AI may take seconds per move. Search-heavy methods are viable *in production*.

Player count (3–6) changes deck contention and the competitive thresholds, so it
is an input to every agent; one shared net covers all sizes.

---

## 2. Architecture

```
Python (training + move selection)            Node (game server)
┌─────────────────────────────────┐           ┌──────────────────────────┐
│ ecology_env/   faithful engine  │           │ aiService.ts             │
│ baselines.py   random + greedy  │           │  - add/remove bots        │
│ selfplay/      net, ISMCTS,     │  stdin/   │  - snapshot game          │
│                self-play, train │  stdout   │  - drive pending bot turns│
│ serve/ai_move.py  move CLI  ◄───┼──────────►│  (spawns ai_move.py)      │
│ export/to_onnx.py ONNX export   │   JSON    │ routes: POST /:id/bots    │
└─────────────────────────────────┘           └──────────────────────────┘
```

The engine is a **verified port** of the TypeScript server logic — `ai/tests/
test_parity.py` scores random boards in both Python and the real server
`computeScores` and asserts they match exactly. This lets us run fast headless
self-play without a Node dependency, while guaranteeing the AI optimizes the
*real* scoring rules.

Serving uses a **Python subprocess per move** rather than re-porting ISMCTS to
TypeScript. Because the game is async, a sub-second-to-few-seconds subprocess is
fine, and it reuses the exact engine/search/net used in training — no risk of a
TS/Python behaviour drift in the agent.

---

## 3. The four difficulty tiers

One pipeline, exposed at four strengths (a single dial: search budget +
exploration + model use):

| Tier | Mechanism | Needs a model? |
|------|-----------|----------------|
| **Easy** | Greedy with ε=0.6 random moves | no |
| **Medium** | Greedy one-ply heuristic | no |
| **Hard** | Heuristic-guided ISMCTS (64 sims) | no |
| **Impossible** | Net-guided ISMCTS (160 sims); falls back to deep heuristic ISMCTS until a strong checkpoint exists | yes (graceful fallback) |

The greedy heuristic = solitaire score + weighted competitive potential (stream
length, wolf count) + a diversity-coverage bonus + a shape regularizer that
keeps the board on track to finish as a clean 5×4. It also runs a bounded
rabbit-swap search.

Measured ordering (`ai/benchmark.py`): medium beats easy 100% (54 vs 39); hard
edges medium (52.7 vs 51.9). The hard/medium gap is intentionally honest —
greedy is already near-optimal on a solitaire-heavy board, so the lift from
search alone is modest. The trained net is what widens the top of the ladder.

---

## 4. The self-play RL core (Impossible)

AlphaZero-style, adapted for imperfect-information multiplayer.

**State encoding** (`ecology_env/encode.py`). Normalizing the board to its min
corner with a +1 margin fits every occupied and candidate cell into a fixed
**7×6 canvas** (candidates are always adjacent to an existing card; the box is
always ≤5×4). That yields a fixed **462-action** space = 11 card types × 42
cells. Observation = board planes (12×6×7) + a flat vector (hand multiset +
opponent summary + scalars: round/turn/pass-dir/player-count/seat). Rabbit swaps
are resolved greedily after placement to keep the head fixed-size.

**Network** (`selfplay/net.py`). Conv residual tower over the board + MLP over
the vector, fused into a policy head (462 logits, legal-masked) and a tanh value
head (expected normalized return for the acting seat). ~1.4M params — trains on
CPU.

**Search** (`selfplay/ismcts.py`). Single-observer ISMCTS. Because a turn
resolves only when all seats submit, the root seat makes exactly one decision per
turn, so the game is a single-agent MDP whose transition folds in (a) opponents'
policy moves and (b) a per-simulation determinized sample of the hidden card
pool. PUCT selection, net value at the leaf (no random rollouts), optional root
Dirichlet noise during training.

**Reward** (`selfplay/rewards.py`). Blend of score-margin-vs-mean-opponent and
final rank, normalized to [-1, 1] — so the agent learns competitive denial, not
just solitaire maxing.

**Training loop** (`selfplay/train.py`). Each iteration: generate self-play
games (mixed 3–6 players) → store (obs, MCTS visit-count policy, final value) →
train (masked policy cross-entropy + value MSE) → periodically arena-eval vs
greedy and checkpoint. A checkpoint is promoted to `best.pt` only once it beats
greedy (win-rate ≥ 0.5), so the served Impossible tier never loads a half-baked
net.

---

## 5. How to use it

**Play vs bots (UI).** In a game lobby, the host picks a difficulty and clicks
*Add bot*. Bots fill empty seats (max 6 total), auto-move on their turns, and are
badged with a 🤖 avatar. The server drives bot turns after `start` and after each
human move.

**Train a model.**
```bash
cd ai
python3 -u -m selfplay.train --iterations 120 --games-per-iter 6 --n-sims 24
# writes ai/checkpoints/{latest,best}.pt
```

**Export for the pure-Node serving path (optional).**
```bash
python3 export/to_onnx.py --ckpt checkpoints/best.pt --out export/ecology_net.onnx
```

**Tests.**
```bash
python3 tests/test_smoke.py        # full random games, 2-6 players
python3 tests/test_parity.py       # Python scoring == TS engine (needs server deps)
python3 tests/test_encode.py       # action space / masking soundness
python3 tests/test_baselines.py    # greedy >> random
python3 tests/test_ismcts.py       # search >= greedy
python3 tests/test_serve_cli.py    # every difficulty returns a legal move
# from server/:  AI_DIR=../ai tsx ../ai/tests/integration_node.ts
```

**Server env knobs** (`aiService.ts`): `AI_DIR`, `AI_PYTHON`, `AI_MOVE_TIMEOUT_MS`.

**Deployment note.** The host running the Node server must have `python3` +
`numpy` (`pip install -r ai/requirements.txt`) for easy/medium/hard bots; add
`torch` only where the Impossible net runs. If Python isn't available the bot
endpoints will error — keep bots dev/self-host only until the deployment image
includes Python, or implement the pure-Node ONNX serving path (§6).

---

## 6. Where to take it next

- **Stronger training**: more self-play games (GPU), larger net, opponent pool /
  league play, and using the net (not greedy) as the in-search opponent model.
- **Belief-aware determinization**: exploit cards a player has personally seen
  passed, instead of uniform sampling from the hidden pool.
- **Rabbit swaps in the policy** rather than greedy post-resolution, for the very
  top of play.
- **Pure-Node serving**: port encoding + ISMCTS to TS and run `ecology_net.onnx`
  via `onnxruntime-node`, removing the Python runtime dependency.
