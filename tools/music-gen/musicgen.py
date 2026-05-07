#!/usr/bin/env python3
"""Generate one audio clip from a text prompt using Meta MusicGen.

Used by `tools/music-gen/cli.mjs` (Node) — keep the CLI surface stable.

Usage:
    python3 tools/music-gen/musicgen.py \
        --prompt "calm chillout, soft synth pad, instrumental, 84 bpm" \
        --duration 24 \
        --output out.wav

Outputs a mono 32 kHz WAV (MusicGen's native rate). The Node side runs an
ffmpeg post-process (trim → acrossfade → loudnorm) to make it gaplessly
loopable.

Defaults to `facebook/musicgen-small` (~1.5 GB, fast on Apple Silicon MPS).
The model is downloaded on first run and cached under
~/.cache/huggingface/hub.
"""

from __future__ import annotations

import argparse
import os
import sys
import time

import numpy as np
import scipy.io.wavfile
import torch

# MusicGen frames are 50 Hz: 50 audio tokens per second of output.
TOKENS_PER_SEC = 50
# MusicGen-small can stably generate ~30 s before quality degrades.
MAX_DURATION_SEC = 30


def select_device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def load_pipeline(model_name: str, device: str):
    """Lazy import — keeps `--help` snappy and avoids loading transformers
    unless we're actually generating.

    Loads from local HF cache first; only hits the network if the cache is
    missing. That keeps generation working on offline / sandboxed shells
    once the model has been downloaded.
    """
    from transformers import AutoProcessor, MusicgenForConditionalGeneration

    print(f"[musicgen] loading {model_name} on {device}…", flush=True)
    t0 = time.time()

    def _load(local_only: bool):
        proc = AutoProcessor.from_pretrained(model_name, local_files_only=local_only)
        mdl = MusicgenForConditionalGeneration.from_pretrained(
            model_name, local_files_only=local_only
        )
        return proc, mdl

    try:
        processor, model = _load(local_only=True)
        print("[musicgen] loaded from local cache (offline)", flush=True)
    except Exception as e:
        print(f"[musicgen] cache miss ({type(e).__name__}); downloading…", flush=True)
        processor, model = _load(local_only=False)

    model = model.to(device)
    model.eval()
    print(f"[musicgen] loaded in {time.time() - t0:.1f}s", flush=True)
    return processor, model


def generate(
    prompt: str,
    duration_sec: int,
    output_path: str,
    model_name: str,
    seed: int | None,
    guidance_scale: float,
) -> None:
    duration_sec = min(duration_sec, MAX_DURATION_SEC)
    device = select_device()
    processor, model = load_pipeline(model_name, device)

    if seed is not None:
        torch.manual_seed(seed)

    inputs = processor(text=[prompt], return_tensors="pt", padding=True)
    inputs = {k: v.to(device) for k, v in inputs.items()}

    max_new_tokens = duration_sec * TOKENS_PER_SEC + 4

    print(
        f"[musicgen] generating ~{duration_sec}s (max_new_tokens={max_new_tokens}) "
        f"prompt={prompt!r}",
        flush=True,
    )
    t0 = time.time()
    with torch.no_grad():
        audio_values = model.generate(
            **inputs,
            do_sample=True,
            guidance_scale=guidance_scale,
            max_new_tokens=max_new_tokens,
        )
    print(f"[musicgen] generated in {time.time() - t0:.1f}s", flush=True)

    sampling_rate = model.config.audio_encoder.sampling_rate
    audio = audio_values[0, 0].detach().cpu().numpy().astype(np.float32)

    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    if peak > 0:
        audio = audio / peak * 0.95

    int16 = np.clip(audio * 32767.0, -32768, 32767).astype(np.int16)
    os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".", exist_ok=True)
    scipy.io.wavfile.write(output_path, sampling_rate, int16)
    print(f"[musicgen] wrote {output_path} ({sampling_rate} Hz, {len(int16)} samples)", flush=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--duration", type=int, default=24)
    ap.add_argument("--output", required=True)
    ap.add_argument("--model", default="facebook/musicgen-small")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--guidance-scale", type=float, default=3.0)
    args = ap.parse_args()

    try:
        generate(
            prompt=args.prompt,
            duration_sec=args.duration,
            output_path=args.output,
            model_name=args.model,
            seed=args.seed,
            guidance_scale=args.guidance_scale,
        )
    except KeyboardInterrupt:
        print("[musicgen] interrupted", file=sys.stderr)
        return 130
    return 0


if __name__ == "__main__":
    sys.exit(main())
