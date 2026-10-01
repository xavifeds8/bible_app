#!/usr/bin/env python3
"""Generate scene images locally with SDXL-Turbo, ranked by CLIP.

Pipeline per scene:
  1. DeepSeek turns the scene text into a concise image prompt (cached).
  2. SDXL-Turbo generates N candidate images (seeded, reproducible).
  3. CLIP scores each candidate against the scene text; the best is saved.

Resumable: existing outputs are skipped. Safe to leave running overnight.

Usage:
  generate_images.py [reelId ...]        # limit to specific reels (for testing)
"""
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parents[3]
WORK = ROOT / "data" / "work"
OUT = ROOT / "data" / "generated"
PROMPTS_CACHE = OUT / "prompts.json"
ENV = ROOT / ".env"

STYLE = (
    "classical oil painting, warm soft light, muted earth tones, "
    "reverent and serene, fine brushwork, cinematic, no text, no letters"
)
CANDIDATES = 3
STEPS = 4
WIDTH, HEIGHT = 768, 1024
MODEL = "stabilityai/sdxl-turbo"
CLIP_MODEL = "openai/clip-vit-base-patch32"


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def load_env() -> dict:
    env = {}
    if ENV.exists():
        for line in ENV.read_text().splitlines():
            m = line.strip()
            if not m or m.startswith("#") or "=" not in m:
                continue
            k, v = m.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def deepseek_prompt(api_key: str, scene_text: str) -> str:
    instruction = (
        "You are an art director for a calm, reverent Bible reflection video. "
        "Write ONE concise image-generation prompt (15-30 words) that depicts this scene "
        "as a classical oil painting. Focus on the setting, light, and mood. "
        "Do not mention text, captions, or a specific painter. Return only the prompt.\n\n"
        f"Scene: {scene_text[:900]}"
    )
    body = json.dumps(
        {
            "model": "deepseek-chat",
            "messages": [{"role": "user", "content": instruction}],
            "temperature": 0.6,
        }
    ).encode()
    req = urllib.request.Request(
        "https://api.deepseek.com/chat/completions",
        data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())
    return data["choices"][0]["message"]["content"].strip().strip('"')


def build_clip():
    from transformers import CLIPModel, CLIPProcessor

    model = CLIPModel.from_pretrained(CLIP_MODEL).to("mps").eval()
    proc = CLIPProcessor.from_pretrained(CLIP_MODEL)
    return model, proc


def clip_scores(model, proc, images, text: str):
    inputs = proc(text=[text], images=images, return_tensors="pt", padding=True).to("mps")
    with torch.no_grad():
        out = model(**inputs)
    # logits_per_image has shape (num_images, num_texts); we pass one text.
    return out.logits_per_image[:, 0].tolist()


def main() -> None:
    targets = set(sys.argv[1:])
    manifests = sorted(WORK.glob("reel-*.json"))
    if targets:
        manifests = [m for m in manifests if m.stem.replace("reel-", "") in targets]
    if not manifests:
        log("no manifests found")
        return

    env = load_env()
    api_key = os.environ.get("DEEPSEEK_API_KEY") or env.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        log("WARNING: no DEEPSEEK_API_KEY; using scene text as the prompt")

    OUT.mkdir(parents=True, exist_ok=True)
    cache = json.loads(PROMPTS_CACHE.read_text()) if PROMPTS_CACHE.exists() else {}

    log(f"loading {MODEL} ...")
    from diffusers import AutoPipelineForText2Image

    pipe = AutoPipelineForText2Image.from_pretrained(MODEL, torch_dtype=torch.float16, variant="fp16")
    pipe = pipe.to("mps")
    pipe.set_progress_bar_config(disable=True)
    try:
        pipe.enable_attention_slicing()
    except Exception:
        pass

    log("loading CLIP ...")
    clip_model, clip_proc = build_clip()

    total = sum(len(json.loads(m.read_text()).get("scenes", [])) for m in manifests)
    done = 0
    for manifest_path in manifests:
        reel_id = manifest_path.stem.replace("reel-", "")
        manifest = json.loads(manifest_path.read_text())
        scenes = manifest.get("scenes", [])
        reel_dir = OUT / reel_id
        reel_dir.mkdir(parents=True, exist_ok=True)

        for i, scene in enumerate(scenes):
            out_path = reel_dir / f"scene-{i:02d}.jpg"
            if out_path.exists():
                log(f"skip {reel_id} scene {i} (exists)")
                done += 1
                continue

            scene_text = scene.get("text", "")
            key = f"{reel_id}:{i}"
            if key in cache:
                prompt = cache[key]
            elif api_key:
                try:
                    prompt = deepseek_prompt(api_key, scene_text)
                except Exception as exc:  # noqa: BLE001
                    log(f"prompt failed ({exc}); using scene text")
                    prompt = scene_text[:200]
                cache[key] = prompt
                PROMPTS_CACHE.write_text(json.dumps(cache, indent=2))
            else:
                prompt = scene_text[:200]

            full_prompt = f"{prompt}, {STYLE}"
            t0 = time.time()
            images = []
            for c in range(CANDIDATES):
                gen = torch.Generator(device="cpu").manual_seed(1000 + i * 17 + c)
                img = pipe(
                    prompt=full_prompt,
                    num_inference_steps=STEPS,
                    guidance_scale=0.0,
                    width=WIDTH,
                    height=HEIGHT,
                    generator=gen,
                ).images[0]
                images.append(img)

            try:
                scores = clip_scores(clip_model, clip_proc, images, scene_text or prompt)
                best = max(range(len(images)), key=lambda k: scores[k])
            except Exception as exc:  # noqa: BLE001
                log(f"clip failed ({exc}); taking first")
                scores = [0.0] * len(images)
                best = 0

            images[best].save(out_path, quality=92)
            done += 1
            log(
                f"[{done}/{total}] {reel_id} scene {i} -> {out_path.name} "
                f"({time.time() - t0:.1f}s, clip {scores[best]:.2f})"
            )

    log(f"DONE: {done}/{total} scenes")


if __name__ == "__main__":
    main()
