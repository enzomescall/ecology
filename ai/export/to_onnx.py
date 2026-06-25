#!/usr/bin/env python3
"""Export a trained EcologyNet checkpoint to ONNX for serving.

The ONNX model lets the Node backend run inference with onnxruntime-node (no
Python/torch at runtime) for the pure-TypeScript serving path. The Python
subprocess path (serve/ai_move.py) uses the torch checkpoint directly.

Usage:
    python3 export/to_onnx.py --ckpt checkpoints/best.pt --out export/ecology_net.onnx
"""
from __future__ import annotations

import argparse
import os
import sys

AI_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, AI_ROOT)

import torch  # noqa: E402

from ecology_env.encode import BOARD_CHANNELS, CANVAS_H, CANVAS_W, OBS_VEC_DIM  # noqa: E402
from selfplay.net import EcologyNet  # noqa: E402


def export(ckpt: str, out: str, channels: int = 64, blocks: int = 4):
    net = EcologyNet(channels=channels, blocks=blocks)
    net.load_state_dict(torch.load(ckpt, map_location="cpu"))
    net.eval()

    planes = torch.zeros(1, BOARD_CHANNELS, CANVAS_H, CANVAS_W)
    vec = torch.zeros(1, OBS_VEC_DIM)

    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    torch.onnx.export(
        net, (planes, vec), out,
        input_names=["planes", "vec"],
        output_names=["policy_logits", "value"],
        dynamic_axes={
            "planes": {0: "batch"}, "vec": {0: "batch"},
            "policy_logits": {0: "batch"}, "value": {0: "batch"},
        },
        opset_version=17,
    )
    print(f"exported {ckpt} -> {out}")

    # sanity: verify the graph loads
    import onnx
    onnx.checker.check_model(onnx.load(out))
    print("onnx.checker: OK")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--ckpt", default=os.path.join(AI_ROOT, "checkpoints", "best.pt"))
    ap.add_argument("--out", default=os.path.join(AI_ROOT, "export", "ecology_net.onnx"))
    ap.add_argument("--channels", type=int, default=64)
    ap.add_argument("--blocks", type=int, default=4)
    args = ap.parse_args()
    export(args.ckpt, args.out, args.channels, args.blocks)
