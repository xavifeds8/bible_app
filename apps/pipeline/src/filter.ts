import type { DenylistEntry, EmotionTag, Passage } from "@bible/db";

/**
 * Denylist: (emotion, passage) pairs a reviewer has explicitly excluded.
 * Seed is empty; populated as reviewers reject drafts.
 */
export const SEED_DENYLIST: DenylistEntry[] = [
  // { emotion: "anger", passageId: "some-passage", reason: "Too much context required" },
];

/**
 * Context-heavy markers that make a passage a poor standalone reel.
 * Targeted at God's judgment/genealogies, NOT human anger-management
 * passages (which legitimately use "wrath" for our anger emotion).
 */
const CONTEXT_HEAVY_PATTERNS = [
  /\bwrath of (god|the lord)\b/i,
  /\bvengeance is mine\b/i,
  /\bbegat\b/i,
  /\bbegot\b/i,
  /\bthe generations of\b/i,
  /\bcircumcis(e|ion)\b/i,
];

export interface FilterResult {
  kept: Passage[];
  dropped: { passageId: string; reason: string }[];
}

export function filterPassages(
  passages: Passage[],
  emotion: EmotionTag,
  denylist: DenylistEntry[]
): FilterResult {
  const denied = new Set(denylist.filter((d) => d.emotion === emotion).map((d) => d.passageId));
  const result: FilterResult = { kept: [], dropped: [] };

  for (const p of passages) {
    if (denied.has(p.id)) {
      result.dropped.push({ passageId: p.id, reason: "denylist" });
      continue;
    }
    const match = CONTEXT_HEAVY_PATTERNS.find((re) => re.test(p.text));
    if (match) {
      result.dropped.push({ passageId: p.id, reason: `context-heavy (${match.source})` });
      continue;
    }
    result.kept.push(p);
  }
  return result;
}
