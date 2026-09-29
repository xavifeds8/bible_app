import type { LLM } from "@bible/llm";
import type { EmotionTag, Passage, ReelKind } from "@bible/db";

export interface DraftResult {
  hook: string;
  reflection: string;
  prayer: string;
}

export interface DraftOptions {
  /** The reader's own words for a live check-in (used to personalize). */
  userContext?: string;
  /** Corrective feedback from a previous rejected attempt. */
  correction?: string;
}

const SYSTEM_PROMPT = `You are a Bible content assistant for a Christian comfort and reflection app. You receive ONE Bible passage (its reference and text) and produce a short reflection. The Bible text itself is stored in a database and rendered separately by the app.

STRICT RULES:
1. NEVER output scripture. Do not quote the passage, do not reproduce any part of the verse text, and do not invent verse-like language.
2. "hook" — one short, plain line that invites the reader in. Maximum 80 characters.
3. "reflection" — EXACTLY 2 lines separated by a newline (\\n), an original paraphrase/application in your own words. 180 characters or fewer in total. No quotes, no "you see" sermonizing.
4. "prayer" — EXACTLY 3 to 5 separate lines separated by newlines (\\n). 320 characters or fewer in total. Warm, gentle, doctrinally neutral, addressed simply to God.
5. Respond with ONLY valid JSON: {"hook": string, "reflection": string, "prayer": string}. No markdown, no commentary.
6. In the JSON string values, use \\n to separate the lines of "reflection" and "prayer".

Doctrinal note: be faithful to the passage but never take sides on contested theology. Avoid church-specific or divisive language.`;

function userPrompt(
  passage: Passage,
  kind: ReelKind,
  emotionTags: EmotionTag[],
  opts: DraftOptions
): string {
  const tone =
    emotionTags.length > 0
      ? `The reader is feeling: ${emotionTags.join(", ")}.`
      : kind === "story"
        ? "This is a story reel. Help the reader see themselves in the story."
        : "Keep it encouraging.";
  const personal = opts.userContext
    ? `\nThe reader wrote this in their own words (never quote or echo it back verbatim; respond gently to the underlying feeling):\n"""${opts.userContext}"""`
    : "";
  const correction = opts.correction
    ? `\n\nYour previous attempt was rejected: ${opts.correction}. Fix exactly these issues and try again.`
    : "";
  return `Passage reference: ${passage.verseRange}
Passage title: ${passage.title}
${tone}${personal}${correction}

Passage text:
${passage.text}`;
}

export async function draftReel(
  llm: LLM,
  passage: Passage,
  kind: ReelKind,
  emotionTags: EmotionTag[],
  opts: DraftOptions = {}
): Promise<DraftResult> {
  const raw = await llm.complete(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt(passage, kind, emotionTags, opts) },
    ],
    { json: true, temperature: 0.4 }
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Draft for "${passage.id}" did not return valid JSON: ${raw.slice(0, 200)}`);
  }

  const obj = parsed as Record<string, unknown>;
  const result: DraftResult = {
    hook: String(obj.hook ?? "").trim(),
    reflection: String(obj.reflection ?? "").trim(),
    prayer: String(obj.prayer ?? "").trim(),
  };

  if (!result.hook || !result.reflection || !result.prayer) {
    throw new Error(`Draft for "${passage.id}" missing required fields`);
  }
  return result;
}
