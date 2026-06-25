"""AlphaZero-style training loop for Ecology.

Each iteration:
  1. generate self-play games (mixed 3-6 players) with the current net
  2. add (obs, MCTS policy, value) samples to a replay buffer
  3. train the net (masked policy cross-entropy + value MSE)
  4. periodically evaluate vs greedy and checkpoint

Designed to run on CPU. Defaults are small so a short run demonstrates learning;
scale up sims/games/buffer/iters for a strong "Impossible" net.
"""
from __future__ import annotations

import argparse
import os
import random
import time
from collections import deque

import numpy as np
import torch
import torch.optim as optim

from .net import EcologyNet, masked_policy_loss
from .selfplay import self_play_game
from .arena import eval_vs_greedy

CKPT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "checkpoints")


def train(
    iterations: int = 20,
    games_per_iter: int = 6,
    n_sims: int = 32,
    player_choices=(3, 4, 5, 6),
    buffer_size: int = 20000,
    batch_size: int = 256,
    train_steps: int = 200,
    lr: float = 1e-3,
    value_weight: float = 1.0,
    eval_every: int = 5,
    eval_games: int = 12,
    best_bar: float = 0.5,   # only promote to best.pt once it clearly beats greedy
    channels: int = 64,
    blocks: int = 4,
    seed: int = 0,
    device: str = "cpu",
    resume: str = "",
    log=print,
):
    os.makedirs(CKPT_DIR, exist_ok=True)
    torch.manual_seed(seed)
    np.random.seed(seed)
    rng = random.Random(seed)

    net = EcologyNet(channels=channels, blocks=blocks).to(device)
    if resume and os.path.exists(resume):
        net.load_state_dict(torch.load(resume, map_location=device))
        log(f"resumed from {resume}")
    opt = optim.Adam(net.parameters(), lr=lr, weight_decay=1e-4)
    log(f"net params: {net.num_params():,}")

    buf = deque(maxlen=buffer_size)
    best_winrate = -1.0

    for it in range(1, iterations + 1):
        t0 = time.time()
        net.eval()
        n_new = 0
        for _ in range(games_per_iter):
            n_players = rng.choice(player_choices)
            samples = self_play_game(net, n_players, n_sims=n_sims,
                                     rng=random.Random(rng.random()), device=device)
            buf.extend(samples)
            n_new += len(samples)
        gen_t = time.time() - t0

        # ---- train ----
        net.train()
        ploss_acc = vloss_acc = 0.0
        steps = min(train_steps, max(1, len(buf) // batch_size))
        for _ in range(steps):
            batch = random.sample(buf, min(batch_size, len(buf)))
            planes = torch.from_numpy(np.stack([s.planes for s in batch])).to(device)
            vec = torch.from_numpy(np.stack([s.vec for s in batch])).to(device)
            mask = torch.from_numpy(np.stack([s.mask for s in batch])).to(device)
            pi = torch.from_numpy(np.stack([s.pi for s in batch]).astype(np.float32)).to(device)
            z = torch.tensor([s.value for s in batch], dtype=torch.float32, device=device)

            logits, value = net(planes, vec)
            pl = masked_policy_loss(logits, pi, mask)
            vl = torch.nn.functional.mse_loss(value, z)
            loss = pl + value_weight * vl
            opt.zero_grad()
            loss.backward()
            opt.step()
            ploss_acc += pl.item()
            vloss_acc += vl.item()

        train_t = time.time() - t0 - gen_t
        log(f"iter {it:3d} | new {n_new:4d} buf {len(buf):5d} | "
            f"ploss {ploss_acc/steps:.3f} vloss {vloss_acc/steps:.3f} | "
            f"gen {gen_t:.0f}s train {train_t:.0f}s")

        torch.save(net.state_dict(), os.path.join(CKPT_DIR, "latest.pt"))

        if it % eval_every == 0:
            net.eval()
            wr, ns, gs = eval_vs_greedy(net, num_players=3, games=eval_games,
                                        n_sims=n_sims, device=device, seed=1000 + it)
            log(f"   eval vs greedy (3p): win-rate {wr:.0%} | net {ns:.1f} vs greedy {gs:.1f}")
            # Only promote to best.pt once the net genuinely beats greedy, so the
            # served "impossible" tier never loads a half-trained model.
            if wr > best_winrate and wr >= best_bar:
                best_winrate = wr
                torch.save(net.state_dict(), os.path.join(CKPT_DIR, "best.pt"))
                log(f"   new best (win-rate {wr:.0%}) -> checkpoints/best.pt")

    return net


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--iterations", type=int, default=20)
    ap.add_argument("--games-per-iter", type=int, default=6)
    ap.add_argument("--n-sims", type=int, default=32)
    ap.add_argument("--train-steps", type=int, default=200)
    ap.add_argument("--channels", type=int, default=64)
    ap.add_argument("--blocks", type=int, default=4)
    ap.add_argument("--eval-every", type=int, default=5)
    ap.add_argument("--resume", type=str, default="")
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args()
    train(iterations=args.iterations, games_per_iter=args.games_per_iter,
          n_sims=args.n_sims, train_steps=args.train_steps, channels=args.channels,
          blocks=args.blocks, eval_every=args.eval_every, resume=args.resume, seed=args.seed)
