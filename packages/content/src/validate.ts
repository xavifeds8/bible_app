import type { Passage } from "@bible/db";
import type { DraftResult } from "./draft.js";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const HOOK_MAX = 90;
const REFLECTION_MAX_LINES = 2;
const REFLECTION_MAX_CHARS = 220;
const PRAYER_MIN_LINES = 3;
const PRAYER_MAX_LINES = 5;
const PRAYER_MAX_CHARS = 400;

function words(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
}

/** Detect verbatim scripture quoting via shared 5-gram overlap. */
export function hasVerbatimOverlap(passageText: string, draftText: string): boolean {
  const pw = words(passageText);
  const dw = words(draftText);
  const ngrams = new Set<string>();
  for (let i = 0; i + 5 <= pw.length; i++) {
    ngrams.add(pw.slice(i, i + 5).join(" "));
  }
  for (let i = 0; i + 5 <= dw.length; i++) {
    if (ngrams.has(dw.slice(i, i + 5).join(" "))) return true;
  }
  return false;
}

/** Crude reading-level heuristic: ratio of long words (> 9 chars). */
function longWordRatio(text: string): number {
  const ws = words(text);
  if (ws.length === 0) return 0;
  return ws.filter((w) => w.length > 9).length / ws.length;
}

export function validateDraft(passage: Passage, draft: DraftResult): ValidationResult {
  const errors: string[] = [];

  if (draft.hook.length > HOOK_MAX) errors.push(`hook too long (${draft.hook.length} > ${HOOK_MAX})`);

  const reflectionLines = draft.reflection.split(/\n+/).filter(Boolean);
  if (reflectionLines.length > REFLECTION_MAX_LINES)
    errors.push(`reflection has ${reflectionLines.length} lines (max ${REFLECTION_MAX_LINES})`);
  if (draft.reflection.length > REFLECTION_MAX_CHARS)
    errors.push(`reflection too long (${draft.reflection.length} > ${REFLECTION_MAX_CHARS})`);

  const prayerLines = draft.prayer.split(/\n+/).filter(Boolean);
  if (prayerLines.length < PRAYER_MIN_LINES || prayerLines.length > PRAYER_MAX_LINES)
    errors.push(`prayer has ${prayerLines.length} lines (need ${PRAYER_MIN_LINES}-${PRAYER_MAX_LINES})`);
  if (draft.prayer.length > PRAYER_MAX_CHARS)
    errors.push(`prayer too long (${draft.prayer.length} > ${PRAYER_MAX_CHARS})`);

  for (const [label, text] of [
    ["hook", draft.hook],
    ["reflection", draft.reflection],
    ["prayer", draft.prayer],
  ] as const) {
    if (hasVerbatimOverlap(passage.text, text))
      errors.push(`${label} quotes scripture verbatim (5-word overlap)`);
    if (longWordRatio(text) > 0.35) errors.push(`${label} may be too advanced (reading level)`);
  }

  return { ok: errors.length === 0, errors };
}
