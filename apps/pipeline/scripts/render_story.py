#!/usr/bin/env python3
"""Render a full story reel: each scene's image is shown for exactly its own
narration segment, with Ken Burns motion, crossfades, and synced audio.

Usage: render_story.py <manifest.json>
manifest: { "scenes": [{"image": "...", "text": "..."}], "out": "...", "crossfade": 1.0, "voice": "en-US-GuyNeural" }
"""
import json
import os
import subprocess
import sys
import tempfile

from PIL import Image

FPS = 24
W, H = 720, 1280
EDGE_TTS = "/Users/xavierfernandis/Documents/bible_app/apps/pipeline/.venv/bin/edge-tts"


def tts(text, out, voice):
    subprocess.run(
        [EDGE_TTS, "--voice", voice, "--rate", "-6%", "--text", text, "--write-media", out],
        check=True, capture_output=True,
    )
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out],
        capture_output=True, text=True,
    )
    return float(r.stdout.strip())


def aspect(path):
    with Image.open(path) as im:
        w, h = im.size
    return w / h


def main():
    m = json.load(open(sys.argv[1]))
    scenes = m["scenes"]
    out = m["out"]
    xf = m.get("crossfade", 1.0)
    voice = m.get("voice", "en-US-GuyNeural")
    N = len(scenes)

    tmp = tempfile.mkdtemp()
    durations = []
    for i, s in enumerate(scenes):
        seg = os.path.join(tmp, f"seg{i}.mp3")
        durations.append(tts(s["text"], seg, voice))

    inputs = []
    for i, s in enumerate(scenes):
        inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{durations[i] + xf:.3f}", "-i", s["image"]]
    for i in range(N):
        inputs += ["-i", os.path.join(tmp, f"seg{i}.mp3")]

    fc = []
    for i, s in enumerate(scenes):
        d = durations[i]
        if aspect(s["image"]) > 1.2:
            chain = (
                f"[{i}:v]scale=-2:{H},crop={W}:{H}:x='(iw-{W})*min(t/{d:.3f},1)':y=0,"
                f"fps={FPS},format=yuv420p[v{i}]"
            )
        else:
            chain = (
                f"[{i}:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
                f"zoompan=z='min(1.0+0.0015*on,1.25)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},"
                f"format=yuv420p[v{i}]"
            )
        fc.append(chain)

    prev = "v0"
    offset = 0.0
    for i in range(1, N):
        offset += durations[i - 1] - xf
        outl = f"x{i}" if i < N - 1 else "vout"
        fc.append(f"[{prev}][v{i}]xfade=transition=fade:duration={xf:.3f}:offset={offset:.3f}[{outl}]")
        prev = outl

    # audio: acrossfade at the same offsets so narration stays in sync
    aprev = f"[{N}:a]"
    for i in range(1, N):
        outl = f"ax{i}" if i < N - 1 else "aout"
        fc.append(f"{aprev}[{N + i}:a]acrossfade=d={xf:.3f}[{outl}]")
        aprev = f"[{outl}]"

    total = sum(durations) - (N - 1) * xf
    cmd = (
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"]
        + inputs
        + ["-filter_complex", ";".join(fc),
           "-map", "[vout]", "-map", "[aout]",
           "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-t", f"{total:.3f}", "-movflags", "+faststart", out]
    )
    r = subprocess.run(cmd)
    print(out, "exit", r.returncode, "duration", f"{total:.1f}s")


if __name__ == "__main__":
    main()
