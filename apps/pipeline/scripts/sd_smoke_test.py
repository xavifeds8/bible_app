#!/usr/bin/env python3
"""Smoke test: load a text-to-image model on MPS and render one image."""
import sys
import time

import torch


def try_pipe(model_id: str, variant: str | None):
    from diffusers import AutoPipelineForText2Image

    kwargs = {"torch_dtype": torch.float16}
    if variant:
        kwargs["variant"] = variant
    pipe = AutoPipelineForText2Image.from_pretrained(model_id, **kwargs)
    pipe = pipe.to("mps")
    pipe.set_progress_bar_config(disable=True)
    try:
        pipe.enable_attention_slicing()
    except Exception:
        pass
    return pipe


def main() -> None:
    prompt = (
        "classical oil painting, a shepherd leading sheep beside still waters "
        "at golden hour, warm light, muted earth tones, reverent, no text"
    )
    candidates = [
        ("stabilityai/sdxl-turbo", "fp16", 2, 0.0),
        ("stabilityai/sd-turbo", "fp16", 2, 0.0),
    ]
    for model_id, variant, steps, guidance in candidates:
        try:
            print(f"trying {model_id} ...", flush=True)
            t0 = time.time()
            pipe = try_pipe(model_id, variant)
            print(f"loaded in {time.time() - t0:.1f}s", flush=True)
            t1 = time.time()
            image = pipe(prompt=prompt, num_inference_steps=steps, guidance_scale=guidance).images[0]
            out = f"/tmp/sd-{model_id.split('/')[-1]}.png"
            image.save(out)
            print(f"rendered {out} in {time.time() - t1:.1f}s", flush=True)
            return
        except Exception as exc:  # noqa: BLE001
            print(f"FAILED {model_id}: {exc}", flush=True)
    print("all models failed", flush=True)
    sys.exit(1)


if __name__ == "__main__":
    main()
