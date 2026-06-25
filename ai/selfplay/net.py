"""Policy + value network for Ecology.

Input:
  planes: (B, BOARD_CHANNELS, 6, 7) spatial board
  vec:    (B, OBS_VEC_DIM) hand + opponent summary + scalars
Output:
  policy logits: (B, NUM_ACTIONS=462)
  value:         (B,) in [-1, 1] (tanh) -- expected normalised return for the
                 acting seat
"""
from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F

from ecology_env.encode import (
    BOARD_CHANNELS, CANVAS_H, CANVAS_W, NUM_ACTIONS, OBS_VEC_DIM,
)


class ConvBlock(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.conv = nn.Conv2d(c, c, 3, padding=1)
        self.bn = nn.BatchNorm2d(c)

    def forward(self, x):
        return F.relu(self.bn(self.conv(x)) + x)


class EcologyNet(nn.Module):
    def __init__(self, channels: int = 64, blocks: int = 4, vec_hidden: int = 128):
        super().__init__()
        self.stem = nn.Sequential(
            nn.Conv2d(BOARD_CHANNELS, channels, 3, padding=1),
            nn.BatchNorm2d(channels), nn.ReLU(),
        )
        self.res = nn.Sequential(*[ConvBlock(channels) for _ in range(blocks)])

        self.vec_mlp = nn.Sequential(
            nn.Linear(OBS_VEC_DIM, vec_hidden), nn.ReLU(),
            nn.Linear(vec_hidden, vec_hidden), nn.ReLU(),
        )

        spatial = channels * CANVAS_H * CANVAS_W
        fused = spatial + vec_hidden

        self.policy_head = nn.Sequential(
            nn.Linear(fused, 256), nn.ReLU(),
            nn.Linear(256, NUM_ACTIONS),
        )
        self.value_head = nn.Sequential(
            nn.Linear(fused, 128), nn.ReLU(),
            nn.Linear(128, 1), nn.Tanh(),
        )

    def forward(self, planes, vec):
        x = self.stem(planes)
        x = self.res(x)
        x = x.flatten(1)
        v = self.vec_mlp(vec)
        fused = torch.cat([x, v], dim=1)
        logits = self.policy_head(fused)
        value = self.value_head(fused).squeeze(-1)
        return logits, value

    @torch.no_grad()
    def num_params(self) -> int:
        return sum(p.numel() for p in self.parameters())


def masked_policy_loss(logits, target_pi, mask):
    """Cross-entropy between MCTS visit distribution and masked policy."""
    neg_inf = torch.finfo(logits.dtype).min
    logits = logits.masked_fill(~mask, neg_inf)
    logp = F.log_softmax(logits, dim=1)
    return -(target_pi * logp).sum(dim=1).mean()
