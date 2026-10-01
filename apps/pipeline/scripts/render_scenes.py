#!/usr/bin/env python3
"""Render a scene-based reel video: images with Ken Burns motion, crossfade
transitions, and narration audio.

Usage: render_scenes.py <manifest.json>
manifest: { "images": [...], "audio": "...", "out": "...", "crossfade": 1.0 }
"""
import json
import subprocess
import sys

from PIL import Image

FPS = 24
W, H = 720, 1280


def audio_duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True, text=True,
    )
    try:
        return float(out.stdout.strip())
    except ValueError:
        return 10.0


def aspect(path):
    with Image.open(path) as im:
        w, h = im.size
    return w / h


def main():
    m = json.load(open(sys.argv[1]))
    images = m["images"]
    audio = m["audio"]
    out = m["out"]
    xf = m.get("crossfade", 1.0)
    N = len(images)

    total = audio_duration(audio) + 0.6
    D = (total + (N - 1) * xf) / N  # per-scene duration

    inputs = []
    for img in images:
        inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{D + xf:.3f}", "-i", img]

    fc = []
    for i, img in enumerate(images):
        if aspect(img) > 1.2:  # landscape -> horizontal pan
            chain = (
                f"[{i}:v]scale=-2:{H},crop={W}:{H}:x='(iw-{W})*min(t/{D:.3f},1)':y=0,"
                f"fps={FPS},format=yuv420p[v{i}]"
            )
        else:  # portrait/square -> slow zoom
            chain = (
                f"[{i}:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
                f"zoompan=z='min(1.0+0.0015*on,1.25)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},"
                f"format=yuv420p[v{i}]"
            )
        fc.append(chain)

    prev = "v0"
    for i in range(1, N):
        offset = i * (D - xf)
        outl = f"x{i}" if i < N - 1 else "vout"
        fc.append(f"[{prev}][v{i}]xfade=transition=fade:duration={xf:.3f}:offset={offset:.3f}[{outl}]")
        prev = outl

    cmd = (
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"]
        + inputs
        + ["-i", audio, "-filter_complex", ";".join(fc),
           "-map", "[vout]", "-map", f"{N}:a",
           "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-t", f"{total:.3f}", "-movflags", "+faststart", out]
    )
    r = subprocess.run(cmd)
    print(out, "exit", r.returncode)


if __name__ == "__main__":
    main()
