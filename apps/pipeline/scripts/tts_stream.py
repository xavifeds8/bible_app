#!/usr/bin/env python3
"""Stream edge-tts MP3 audio to stdout.

Usage: tts_stream.py <voice> <rate> <pitch>
Text is read from stdin so long/unicode content needs no shell escaping.
"""
import asyncio
import sys

import edge_tts


def main() -> None:
    voice = sys.argv[1] if len(sys.argv) > 1 else "en-US-AndrewNeural"
    rate = sys.argv[2] if len(sys.argv) > 2 else "-8%"
    pitch = sys.argv[3] if len(sys.argv) > 3 else "-2Hz"
    text = sys.stdin.read().strip()
    if not text:
        return

    async def run() -> None:
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                sys.stdout.buffer.write(chunk["data"])
                sys.stdout.buffer.flush()

    asyncio.run(run())


if __name__ == "__main__":
    main()
