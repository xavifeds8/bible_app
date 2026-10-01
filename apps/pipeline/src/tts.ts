import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { SqliteStore } from "@bible/db";
import { ROOT } from "@bible/config";
import { DB_PATH } from "./config.js";

const EDGE_TTS = resolve(ROOT, "apps/pipeline/.venv/bin/edge-tts");
const AUDIO_DIR = resolve(ROOT, "apps/web/public/audio");

// Neural voices per language (calm, warm narration).
const VOICE: Record<string, string> = {
  en: "en-US-GuyNeural",
  hi: "hi-IN-SwaraNeural",
  kn: "kn-IN-SapnaNeural",
};

/** Language of a reel, derived from its passage translation prefix. */
function reelLanguage(store: SqliteStore, reelId: string): string {
  const reel = store.listReels("approved").find((r) => r.id === reelId);
  const passage = reel && store.getPassage(reel.passageId);
  const prefix = passage?.verseIds[0]?.split(":")[0];
  if (prefix === "HIN") return "hi";
  if (prefix === "KAN") return "kn";
  return "en";
}

export function generateAudio(): void {
  mkdirSync(AUDIO_DIR, { recursive: true });
  const store = new SqliteStore(DB_PATH);
  const reels = store.listReels("approved");
  let done = 0;
  let skipped = 0;

  for (const reel of reels) {
    const out = resolve(AUDIO_DIR, `${reel.id}.mp3`);
    if (existsSync(out)) {
      skipped++;
      continue;
    }
    const passage = store.getPassage(reel.passageId);
    if (!passage) continue;
    const verseText = passage.verseIds
      .map((id) => store.getVerse(id)?.text ?? "")
      .filter(Boolean)
      .join(" ");
    if (!verseText) continue;

    const voice = VOICE[reelLanguage(store, reel.id)] ?? VOICE.en;
    try {
      execFileSync(
        EDGE_TTS,
        ["--voice", voice, "--rate", "-8%", "--text", verseText, "--write-media", out],
        { stdio: "ignore", timeout: 30000 }
      );
      done++;
    } catch (e) {
      console.error(`tts failed for ${reel.id}:`, (e as Error).message);
    }
  }
  console.log(`Audio: generated ${done}, skipped (existing) ${skipped}, total ${reels.length}.`);
}
