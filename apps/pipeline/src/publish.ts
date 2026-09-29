import { mkdirSync, writeFileSync } from "node:fs";
import type { Reel, Quiz, Store } from "@bible/db";
import { PUBLISH_DIR } from "./config.js";

export interface PublishedReel {
  id: string;
  kind: Reel["kind"];
  emotionTags: string[];
  title: string;
  verseRange: string;
  verseText: string;
  verseIds: string[];
  hook: string;
  reflection: string;
  prayer: string;
}

export interface PublishManifest {
  version: string;
  generatedAt: string;
  counts: { reels: number; quizzes: number; dailyVerses: number };
}

export function publish(store: Store, version: string): PublishManifest {
  const reels = store.listReels("approved");
  const quizzes = store.listQuizzes();

  const publishedReels: PublishedReel[] = reels.map((r) => {
    const passage = store.getPassage(r.passageId);
    if (!passage) throw new Error(`Reel ${r.id} references missing passage ${r.passageId}`);
    const verseText = passage.verseIds.map((id) => store.getVerse(id)?.text ?? "").join(" ");
    return {
      id: r.id,
      kind: r.kind,
      emotionTags: r.emotionTags,
      title: passage.title,
      verseRange: passage.verseRange,
      verseText,
      verseIds: passage.verseIds,
      hook: r.hook,
      reflection: r.reflection,
      prayer: r.prayer,
    };
  });

  const daily = store.getDailyVerse(new Date().toISOString().slice(0, 10));

  const dir = `${PUBLISH_DIR}/v-${version}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/reels.json`, JSON.stringify(publishedReels, null, 2));
  writeFileSync(`${dir}/quizzes.json`, JSON.stringify(quizzes, null, 2));
  writeFileSync(`${dir}/daily.json`, JSON.stringify(daily ?? { date: "", verseIds: [] }, null, 2));

  const manifest: PublishManifest = {
    version,
    generatedAt: new Date().toISOString(),
    counts: {
      reels: publishedReels.length,
      quizzes: quizzes.length,
      dailyVerses: daily?.verseIds.length ?? 0,
    },
  };
  writeFileSync(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2));
  writeFileSync(`${PUBLISH_DIR}/latest.json`, JSON.stringify({ version }, null, 2));
  return manifest;
}
