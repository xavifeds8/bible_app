import type { PublishedReel } from "./types";

export async function fetchReels(): Promise<PublishedReel[]> {
  const res = await fetch("/reels.json");
  if (!res.ok) throw new Error(`Failed to load reels (${res.status})`);
  return res.json();
}

export function groupByEmotion(reels: PublishedReel[]): Record<string, PublishedReel[]> {
  const map: Record<string, PublishedReel[]> = {};
  for (const reel of reels) {
    if (reel.kind !== "emotion") continue;
    for (const tag of reel.emotionTags) {
      (map[tag] ??= []).push(reel);
    }
  }
  return map;
}

export function stories(reels: PublishedReel[]): PublishedReel[] {
  return reels.filter((r) => r.kind === "story");
}
