import type { LLM } from "@bible/llm";
import type { EmotionTag, Passage, ReelKind } from "@bible/db";

export interface DraftResult {
  hook: string;
  reflection: string;
  prayer: string;
  /** Story reels only: a short retelling in the model's own words. */
  narrative?: string;
}

export interface DraftOptions {
  /** The reader's own words for a live check-in (used to personalize). */
  userContext?: string;
  /** Corrective feedback from a previous rejected attempt. */
  correction?: string;
  /** Language to write the reflection/prayer in (e.g. "Hindi", "Kannada"). */
  language?: string;
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
  const language = opts.language
    ? `\nWrite the hook, reflection, and prayer in ${opts.language}. The verse itself is shown separately and must NOT be translated or quoted.`
    : "";
  return `Passage reference: ${passage.verseRange}
Passage title: ${passage.title}
${tone}${personal}${correction}${language}

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

const STORY_SYSTEM_PROMPT = `You help pre-curate a Bible story reel for a comfort and reflection app. You receive ONE story passage (reference + text).

STRICT RULES:
1. NEVER output scripture. Do not quote the passage or reproduce any part of the verse text.
2. "hook" — one short line (under 90 characters) that intrigues or asks a question.
3. "narrative" — 2 to 3 lines retelling the story in your own words (paraphrase only). Tell it plainly and warmly; do not quote the text.
4. "reflection" — exactly 2 lines on what this story means for today.
5. "prayer" — 3 to 5 short lines, warm, doctrinally neutral.
6. Respond with ONLY valid JSON: {"hook": string, "narrative": string, "reflection": string, "prayer": string}. Use \\n for line breaks in "narrative".

Doctrinal note: be faithful to the passage but never take sides on contested theology.`;

export async function draftStory(
  llm: LLM,
  passage: Passage,
  opts: DraftOptions = {}
): Promise<DraftResult> {
  const language = opts.language ? `\nWrite everything in ${opts.language}.` : "";
  const correction = opts.correction
    ? `\n\nYour previous attempt was rejected: ${opts.correction}. Fix exactly these issues and try again.`
    : "";
  const raw = await llm.complete(
    [
      { role: "system", content: STORY_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Passage reference: ${passage.verseRange}\nPassage title: ${passage.title}${language}${correction}\n\nPassage text:\n${passage.text}`,
      },
    ],
    { json: true, temperature: 0.5 }
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Story draft for "${passage.id}" did not return valid JSON: ${raw.slice(0, 200)}`);
  }

  const obj = parsed as Record<string, unknown>;
  const result: DraftResult = {
    hook: String(obj.hook ?? "").trim(),
    narrative: String(obj.narrative ?? "").trim(),
    reflection: String(obj.reflection ?? "").trim(),
    prayer: String(obj.prayer ?? "").trim(),
  };

  if (!result.hook || !result.narrative || !result.reflection || !result.prayer) {
    throw new Error(`Story draft for "${passage.id}" missing required fields`);
  }
  return result;
}
