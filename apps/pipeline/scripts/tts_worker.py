#!/usr/bin/env python3
"""Persistent edge-tts worker.

Reads one JSON request per line from stdin and streams base64-encoded audio
back as JSON lines, so the heavy import/startup cost is paid only once.

Request:  {"voice": "...", "rate": "...", "pitch": "...", "text": "..."}
Response: {"a": "<base64 mp3 chunk>"} ... {"end": true}
          {"error": "..."} on failure
"""
import asyncio
import base64
import json
import sys

import edge_tts


async def synth(req: dict) -> None:
    voice = req.get("voice", "en-US-AndrewNeural")
    rate = req.get("rate", "-8%")
    pitch = req.get("pitch", "-2Hz")
    text = (req.get("text") or "").strip()
    if not text:
        return
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            payload = base64.b64encode(chunk["data"]).decode("ascii")
            sys.stdout.write(json.dumps({"a": payload}) + "\n")
            sys.stdout.flush()


def main() -> None:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            asyncio.run(synth(req))
            sys.stdout.write(json.dumps({"end": True}) + "\n")
        except Exception as exc:  # noqa: BLE001
            sys.stdout.write(json.dumps({"error": str(exc)}) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
