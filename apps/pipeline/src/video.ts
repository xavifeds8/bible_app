import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SqliteStore, type Passage, type Reel } from "@bible/db";
import { ROOT } from "@bible/config";
import { DB_PATH } from "./config.js";

const PY = resolve(ROOT, "apps/pipeline/.venv/bin/python");
const RENDER = resolve(ROOT, "apps/pipeline/scripts/render.py");
const VIDEO_DIR = resolve(ROOT, "apps/web/public/videos");
const LIB = resolve(ROOT, "data/library");
const WORK = resolve(ROOT, "data/work");

// Calm for comfort, brisk for stories.
const PROFILES = {
  comfort: { rate: "-8%", gap: 1.0, music: "data/music/calm_piano.mp3", music_volume: 0.26 },
  story: { rate: "+8%", gap: 0.4, music: "data/music/ambient_dreams.mp3", music_volume: 0.24 },
};

const EMOTION_THEMES: Record<string, string[]> = {
  anxiety: ["storm", "water", "light"],
  grief: ["mother", "garden", "water"],
  fear: ["shepherd", "storm", "mountain"],
  anger: ["cross", "sea", "light"],
  loneliness: ["shepherd", "well", "desert"],
  guilt: ["cross", "prayer", "light"],
  hope: ["light", "journey", "mountain"],
  gratitude: ["feast", "garden", "water"],
};

// 4 scenes per story (generic themes; prodigal handled separately below).
const STORY_THEMES: Record<string, string[]> = {
  "david-goliath": ["shepherd", "crowd", "mountain", "light"],
  "good-samaritan": ["journey", "desert", "embrace", "city"],
  "ruth-loyalty": ["garden", "journey", "water", "light"],
  "joseph-forgiveness": ["journey", "desert", "embrace", "city"],
  "daniel-lions": ["prayer", "city", "angel", "light"],
  "feeding-5000": ["crowd", "water", "children", "feast"],
  "calms-storm": ["storm", "sea", "crowd", "light"],
  "lost-sheep": ["shepherd", "desert", "mountain", "light"],
  "woman-at-well": ["well", "city", "water", "light"],
  "peter-walks": ["sea", "storm", "light", "prayer"],
};

// Finely-curated 6-scene Prodigal Son.
const PRODIGAL = [
  { image: "data/raw/images/prodigal_departure.jpg", verses: [11, 12] },
  { image: "data/raw/images/prodigal_waste.jpg", verses: [13, 14] },
  { image: "data/raw/images/prodigal_swine.jpg", verses: [15, 16] },
  { image: "data/raw/images/prodigal_return2.jpg", verses: [17, 18, 19] },
  { image: "data/raw/images/prodigal_return.jpg", verses: [20, 21, 22, 23, 24] },
  { image: "data/raw/images/prodigal_feast.jpg", verses: [25, 26, 27, 28, 29, 30, 31, 32] },
];
const PRODIGAL_BOOK = "Luke";
const PRODIGAL_CHAPTER = 15;

const COMFORT_SELECT = [
  "psalm-23--anxiety", "matt-6-25--anxiety", "phil-4-6--anxiety",
  "psalm-34-18--grief", "matt-5-4--grief",
  "2tim-1-7--fear", "josh-1-9--fear",
  "psalm-139-7--loneliness", "1john-1-9--guilt", "jer-29-11--hope",
];

const STORY_SELECT = [
  "david-goliath--story", "prodigal-son--story", "good-samaritan--story",
  "ruth-loyalty--story", "joseph-forgiveness--story", "daniel-lions--story",
  "feeding-5000--story", "calms-storm--story", "lost-sheep--story",
  "woman-at-well--story",
];

const POOLS: Record<string, string[]> = {};
const CURSOR: Record<string, number> = {};
const GEN = resolve(ROOT, "data/generated");

/** CLIP-selected generated image for a scene, if the overnight batch produced one. */
function generatedImage(reelId: string, i: number): string | undefined {
  const p = resolve(GEN, reelId, `scene-${String(i).padStart(2, "0")}.jpg`);
  return existsSync(p) ? p : undefined;
}

/** Round-robin through a theme's image pool so images aren't repeated. */
function nextImage(theme: string): string | undefined {
  if (!POOLS[theme]) {
    const dir = resolve(LIB, theme);
    POOLS[theme] = existsSync(dir)
      ? readdirSync(dir).filter((f) => f.endsWith(".jpg")).sort().map((f) => resolve(dir, f))
      : [];
  }
  const p = POOLS[theme];
  if (!p.length) return undefined;
  const c = CURSOR[theme] ?? 0;
  CURSOR[theme] = c + 1;
  return p[c % p.length];
}

function verseText(store: SqliteStore, id: string): string {
  return store.getVerse(id)?.text ?? "";
}

/** Split a passage's verses into n contiguous chunks of joined text. */
function verseChunks(store: SqliteStore, passage: Passage, n: number): string[] {
  const per = Math.ceil(passage.verseIds.length / n);
  const chunks: string[] = [];
  for (let i = 0; i < passage.verseIds.length; i += per) {
    chunks.push(passage.verseIds.slice(i, i + per).map((id) => verseText(store, id)).join(" "));
  }
  return chunks.filter(Boolean);
}

function render(store: SqliteStore, reel: Reel, profile: "comfort" | "story"): boolean {
  const passage = store.getPassage(reel.passageId);
  if (!passage) return false;

  let scenes: { image: string; text: string }[];
  if (reel.passageId === "prodigal-son") {
    scenes = PRODIGAL.map((g, i) => ({
      image: generatedImage(reel.id, i) ?? g.image,
      text: g.verses.map((v) => verseText(store, `WEB:${PRODIGAL_BOOK}:${PRODIGAL_CHAPTER}:${v}`)).join(" "),
    }));
  } else {
    const themes = (profile === "story" ? STORY_THEMES[reel.passageId] : EMOTION_THEMES[reel.emotionTags[0]]) ?? ["light"];
    const chunks = verseChunks(store, passage, themes.length);
    scenes = chunks.map((text, i) => ({
      image: generatedImage(reel.id, i) ?? nextImage(themes[i]) ?? nextImage("light")!,
      text,
    }));
  }

  const out = resolve(VIDEO_DIR, `${reel.id}.mp4`);
  const manifestPath = resolve(WORK, `reel-${reel.id}.json`);
  const p = PROFILES[profile];
  writeFileSync(manifestPath, JSON.stringify({
    scenes, out, voice: "en-US-GuyNeural", language: "en",
    gap: p.gap, captions: true, ambient: true, music: p.music, music_volume: p.music_volume, rate: p.rate,
  }, null, 2));

  try {
    execFileSync(PY, [RENDER, manifestPath], { stdio: "ignore", timeout: 600000 });
    return true;
  } catch (e) {
    console.error(`render failed ${reel.id}:`, (e as Error).message);
    return false;
  }
}

export function generateVideos(): void {
  mkdirSync(VIDEO_DIR, { recursive: true });
  mkdirSync(WORK, { recursive: true });
  const store = new SqliteStore(DB_PATH);
  const byId = new Map(store.listReels("approved").map((r) => [r.id, r]));

  let done = 0;
  for (const id of COMFORT_SELECT) {
    const reel = byId.get(id);
    if (reel && render(store, reel, "comfort")) {
      done++;
      console.log("comfort", id);
    }
  }
  for (const id of STORY_SELECT) {
    const reel = byId.get(id);
    if (reel && render(store, reel, "story")) {
      done++;
      console.log("story", id);
    }
  }
  console.log(`Videos done: ${done}/20`);
}
