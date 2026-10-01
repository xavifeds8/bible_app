#!/usr/bin/env python3
"""Unified reel renderer: image scenes (Ken Burns), crossfades in the silent
gaps, burned-in captions synced to edge-tts word/sentence timings, narration +
ambient bed. Multilingual via manifest language/voice.

Usage: render.py <manifest.json>
manifest = {
  "scenes": [{"image": "...", "text": "..."}],
  "out": "...", "voice": "en-US-GuyNeural", "language": "en",
  "gap": 1.0, "captions": true, "ambient": true, "rate": "-8%"
}
"""
import json
import os
import subprocess
import sys
import tempfile
import time

from PIL import Image, ImageDraw, ImageFont

FPS = 24
W, H = 720, 1280
BIN = "/Users/xavierfernandis/Documents/bible_app/apps/pipeline/.venv/bin"
EDGE = f"{BIN}/edge-tts"
GEORGIA_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
CAP_FONT = ImageFont.truetype(GEORGIA_BOLD, 30)
CAP_ASCENT, CAP_DESCENT = CAP_FONT.getmetrics()
CAP_LINE_H = CAP_ASCENT + CAP_DESCENT + 6


def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(f"CMD FAILED: {' '.join(args[:8])}\n{r.stderr[-400:]}\n")
    return r


def duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", path], capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


def to_sec(s):
    h, m, rest = s.split(":")
    sec, ms = rest.replace(".", ",").split(",")
    return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000


def parse_srt(path):
    cues = []
    if not os.path.exists(path):
        return cues
    for block in open(path).read().strip().split("\n\n"):
        lines = block.split("\n")
        if len(lines) < 3:
            continue
        times = lines[1]
        text = " ".join(lines[2:]).strip()
        if " --> " not in times:
            continue
        a, b = times.split(" --> ")
        cues.append((text, to_sec(a), to_sec(b)))
    return cues


def build_events(cues, words_per_chunk=10):
    events = []
    for text, s, e in cues:
        words = text.split()
        if len(words) <= words_per_chunk + 2:
            events.append((s, e, text))
        else:
            n = (len(words) + words_per_chunk - 1) // words_per_chunk
            per = (e - s) / n
            for k in range(n):
                chunk = " ".join(words[k * words_per_chunk:(k + 1) * words_per_chunk])
                events.append((s + k * per, s + (k + 1) * per, chunk))
    return events


def aspect(path):
    with Image.open(path) as im:
        return im.size[0] / im.size[1]


def prep_base(path):
    im = Image.open(path).convert("RGB")
    ar = im.size[0] / im.size[1]
    if ar > 1.2:  # landscape -> pan
        return im.resize((round(H * ar), H), Image.LANCZOS), "pan"
    f = max(W / im.size[0], H / im.size[1])
    im = im.resize((round(im.size[0] * f), round(im.size[1] * f)), Image.LANCZOS)
    left, top = (im.size[0] - W) // 2, (im.size[1] - H) // 2
    return im.crop((left, top, left + W, top + H)), "zoom"


def scene_frame(base, kind, p):
    p = max(0.0, min(1.0, p))
    if kind == "pan":
        x = int((base.size[0] - W) * p)
        return base.crop((x, 0, x + W, H))
    z = 1 + 0.18 * p
    cw, ch = int(W / z), int(H / z)
    x, y = (W - cw) // 2, (H - ch) // 2
    return base.crop((x, y, x + cw, y + ch)).resize((W, H), Image.LANCZOS)


def wrap(draw, text, font, maxw):
    lines, line = [], ""
    for w in text.split():
        t = (line + " " + w).strip()
        if draw.textlength(t, font=font) <= maxw:
            line = t
        else:
            if line:
                lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines


def draw_caption(frame, text):
    if not text:
        return frame
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    lines = wrap(d, text, CAP_FONT, W - 170)
    block_w = max(d.textlength(ln, font=CAP_FONT) for ln in lines)
    block_h = CAP_LINE_H * len(lines)
    padx, pady = 26, 18
    cx = W / 2
    bottom = H - 170
    x0 = cx - block_w / 2 - padx
    y0 = bottom - block_h - pady
    x1 = cx + block_w / 2 + padx
    d.rounded_rectangle([x0, y0, x1, bottom], radius=18, fill=(0, 0, 0, 120))
    for i, ln in enumerate(lines):
        lw = d.textlength(ln, font=CAP_FONT)
        d.text((cx - lw / 2, y0 + pady + i * CAP_LINE_H), ln, font=CAP_FONT, fill=(255, 255, 255, 240))
    return Image.alpha_composite(frame.convert("RGBA"), overlay).convert("RGB")


def main():
    m = json.load(open(sys.argv[1]))
    scenes = m["scenes"]
    out = m["out"]
    voice = m.get("voice", "en-US-GuyNeural")
    rate = m.get("rate", "-8%")
    gap = m.get("gap", 1.0)
    captions = m.get("captions", True)
    ambient = m.get("ambient", True)
    N = len(scenes)
    tmp = tempfile.mkdtemp()

    # 1. TTS each scene (audio + timed subtitles)
    durs, cues = [], []
    for i, s in enumerate(scenes):
        seg = os.path.join(tmp, f"s{i}.mp3")
        srt = os.path.join(tmp, f"s{i}.srt")
        d = 0.0
        for _ in range(3):  # retry transient edge-tts failures
            run([EDGE, "--voice", voice, "--rate", rate, "--text", s["text"],
                 "--write-media", seg, "--write-subtitles", srt])
            d = duration(seg)
            if d > 0.15:
                break
            time.sleep(1.5)
        durs.append(d)
        cues.append(build_events(parse_srt(srt)))

    # 2. timeline: scene i audio starts at A_i (with `gap` silence between)
    A, starts = [], []
    cur = 0.0
    for i in range(N):
        A.append(cur)
        cur += durs[i] + gap
    total = cur - gap
    fout = min(4.0, max(0.5, total * 0.25))
    fst = max(0.0, total - fout)
    nst = max(0.0, total - 1.2)

    # 3. narration = segments joined by silence
    sil = os.path.join(tmp, "sil.mp3")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi",
         "-i", "anullsrc=r=24000:cl=mono", "-t", f"{gap}", sil])
    seq = []
    for i in range(N):
        seq += [os.path.join(tmp, f"s{i}.mp3"), sil]
    seq = seq[:-1]
    narration = os.path.join(tmp, "narration.wav")
    idx = "".join(f"[{i}:a]" for i in range(len(seq)))
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"]
        + sum([["-i", a] for a in seq], [])
        + ["-filter_complex", f"{idx}concat=n={len(seq)}:v=0:a=1,"
           f"afade=t=in:d=0.4,afade=t=out:st={nst:.2f}:d=1.2[a]", "-map", "[a]", narration])

    # 4. final audio: warmed narration + ambient pad + themed music
    nar_warm = os.path.join(tmp, "nar_warm.wav")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", narration,
         "-af", "aecho=0.8:0.88:45:0.18,volume=0.9", nar_warm])

    audio_inputs = [nar_warm]
    if ambient:
        amb = os.path.join(tmp, "amb.wav")
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
             "-f", "lavfi", "-i", f"sine=f=110:d={total:.2f}",
             "-f", "lavfi", "-i", f"sine=f=164.81:d={total:.2f}",
             "-f", "lavfi", "-i", f"sine=f=220:d={total:.2f}",
             "-filter_complex",
             f"[0]volume=0.22[a];[1]volume=0.14[b];[2]volume=0.08[c];"
             f"[a][b][c]amix=inputs=3:normalize=0,tremolo=f=0.12:d=0.4,"
             f"aecho=0.8:0.9:500:0.3,lowpass=f=900,"
             f"afade=t=in:d=3,afade=t=out:st={fst:.2f}:d={fout:.2f}[amb]",
             "-map", "[amb]", amb])
        audio_inputs.append(amb)

    music = m.get("music")
    if music and os.path.exists(music):
        vol = m.get("music_volume", 0.26)
        mus = os.path.join(tmp, "mus.wav")
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
             "-stream_loop", "-1", "-i", music, "-t", f"{total:.2f}",
             "-af", f"volume={vol},afade=t=in:d=3,afade=t=out:st={fst:.2f}:d={fout:.2f}", mus])
        audio_inputs.append(mus)

    final_audio = os.path.join(tmp, "mix.wav")
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"]
    for a in audio_inputs:
        cmd += ["-i", a]
    labels = "".join(f"[{i}:a]" for i in range(len(audio_inputs)))
    filt = f"{labels}amix=inputs={len(audio_inputs)}:normalize=0:duration=first,alimiter=limit=0.95[a]"
    run(cmd + ["-filter_complex", filt, "-map", "[a]", final_audio])

    # 5. render frames
    bases = [prep_base(s["image"]) for s in scenes]
    frames = int(total * FPS)
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-i", final_audio, "-c:v", "libx264", "-preset", "fast", "-crf", "23",
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-t", f"{total:.3f}",
           "-movflags", "+faststart", out]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    for fi in range(frames):
        t = fi / FPS
        # locate scene or gap
        si = N - 1
        for i in range(N):
            if t < A[i] + durs[i]:
                si = i
                break
        blend = None
        if si > 0 and t < A[si]:  # in the gap before scene si -> crossfade
            alpha = (t - (A[si] - gap)) / gap
            frame = scene_frame(bases[si - 1][0], bases[si - 1][1], 1.0)
            fb = scene_frame(bases[si][0], bases[si][1], 0.0)
            frame = Image.blend(frame, fb, max(0.0, min(1.0, alpha)))
            blend = True
        else:
            lt = t - A[si]
            frame = scene_frame(bases[si][0], bases[si][1], lt / max(durs[si], 0.001))

        if captions and not blend:
            lt = t - A[si]
            text = ""
            for (s0, e0, tx) in cues[si]:
                if s0 <= lt < e0:
                    text = tx
                    break
            frame = draw_caption(frame, text)

        proc.stdin.write(frame.tobytes())

    proc.stdin.close()
    proc.wait()
    print(out, "exit", proc.returncode, f"{total:.1f}s")


if __name__ == "__main__":
    main()
