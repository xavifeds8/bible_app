#!/usr/bin/env python3
"""Render a single reel video: gradient background + serif text + narration audio.

Usage:
  render_video.py <c1> <c2> <hook> <verse> <ref> <audio> <out> [narrative]

c1/c2 are hex colors (RRGGBB) for the gradient (c2 top -> c1 bottom).
"""
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

W, H = 720, 1280
FPS = 24

GEORGIA = "/System/Library/Fonts/Supplemental/Georgia.ttf"
GEORGIA_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
GEORGIA_ITALIC = "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"


def hexrgb(s: str):
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def audio_duration(path: str) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True, text=True,
    )
    try:
        return float(out.stdout.strip())
    except ValueError:
        return 6.0


def wrap(draw, text, font, max_width):
    lines = []
    for para in text.split("\n"):
        words = para.split()
        line = ""
        for w in words:
            test = (line + " " + w).strip()
            if draw.textlength(test, font=font) <= max_width:
                line = test
            else:
                if line:
                    lines.append(line)
                line = w
        if line:
            lines.append(line)
    return lines


def draw_centered(draw, lines, font, y, color, line_spacing):
    for ln in lines:
        w = draw.textlength(ln, font=font)
        draw.text(((W - w) / 2, y), ln, font=font, fill=color)
        y += font.size + line_spacing
    return y


def main():
    c1, c2, hook, verse, ref, audio, out = sys.argv[1:8]
    narrative = sys.argv[8] if len(sys.argv) > 8 else ""

    duration = audio_duration(audio) + 0.8

    top = hexrgb(c2)
    bottom = hexrgb(c1)
    base = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(base)
    for y in range(H):
        t = y / (H - 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        d.line([(0, y), (W, y)], fill=(r, g, b))

    # vignette (soft dark edges)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    for i in range(90):
        a = int(3 * (1 - i / 90))
        od.rectangle([i, i, W - 1 - i, H - 1 - i], outline=(0, 0, 0, a))
    base = Image.alpha_composite(base.convert("RGBA"), ov).convert("RGB")

    # text layer
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    td = ImageDraw.Draw(layer)
    hook_font = ImageFont.truetype(GEORGIA_BOLD, 58)
    narrative_font = ImageFont.truetype(GEORGIA_ITALIC, 34)
    verse_font = ImageFont.truetype(GEORGIA, 36)
    ref_font = ImageFont.truetype(GEORGIA, 26)

    white = (255, 255, 255, 255)

    y = 330
    y = draw_centered(td, wrap(td, hook, hook_font, W - 120), hook_font, y, white, 12)
    y += 44
    if narrative:
        y = draw_centered(td, wrap(td, narrative, narrative_font, W - 140), narrative_font, y, (235, 240, 245, 255), 10)
        y += 40
    draw_centered(td, wrap(td, verse, verse_font, W - 130), verse_font, y, white, 14)

    ref_lines = wrap(td, ref, ref_font, W - 120)
    draw_centered(td, ref_lines, ref_font, 1130, (255, 255, 255, 205), 6)

    frames = int(duration * FPS)
    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-i", audio,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-t", str(duration), "-movflags", "+faststart", out,
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    # Fully-faded frame is reused for every frame after the intro (fast).
    final_frame = base.copy()
    final_frame.paste(layer, (0, 0), layer)
    final_bytes = final_frame.tobytes()
    fade_frames = int(0.9 * FPS)

    for i in range(frames):
        if i >= fade_frames:
            proc.stdin.write(final_bytes)
        else:
            fade = (i / FPS) / 0.9
            fl = layer.copy()
            fl.putalpha(layer.getchannel("A").point(lambda v: int(v * fade)))
            frame = base.copy()
            frame.paste(fl, (0, 0), fl)
            proc.stdin.write(frame.tobytes())

    proc.stdin.close()
    proc.wait()
    print(out)


if __name__ == "__main__":
    main()
