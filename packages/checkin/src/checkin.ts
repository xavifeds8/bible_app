import type { EmotionTag, Passage, Reel, Store, Translation } from "@bible/db";
import type { LLM } from "@bible/llm";
import { draftValidated } from "@bible/content";
import {
  CRISIS_CONTENT,
  CATEGORY_OPENERS,
  classifySafety,
  isDistress,
  hasIndicScript,
  type CrisisContent,
} from "@bible/safety";
import { classifyEmotion } from "./classifyEmotion.js";

export type Language = "en" | "hi" | "kn";

export const TRANSLATION_BY_LANG: Record<Language, Translation> = {
  en: "WEB",
  hi: "HIN",
  kn: "KAN",
};

export const LANG_NAME: Record<Language, string> = {
  en: "English",
  hi: "Hindi",
  kn: "Kannada",
};

export interface CheckinResult {
  status: "ok" | "crisis";
  language?: Language;
  emotion?: EmotionTag;
  passageId?: string;
  title?: string;
  verseRange?: string;
  verseText?: string;
  hook?: string;
  reflection?: string;
  prayer?: string;
  personalized?: boolean;
  crisis?: CrisisContent;
}

/** Stable hash so identical check-ins return the same reel. */
function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickReel(reels: Reel[], text: string): Reel | undefined {
  if (reels.length === 0) return undefined;
  return reels[hash(text) % reels.length];
}

/** Resolve a passage's verses in the target translation (falls back to source). */
function resolveVerseText(store: Store, passage: Passage, translation: Translation): string {
  const source = passage.verseIds[0]?.split(":")[0];
  if (source === translation) return passage.text;
  const texts = passage.verseIds.map((id) => {
    const parts = id.split(":");
    const book = parts[1];
    const chapter = parts[2];
    const verse = parts[3];
    return store.getVerse(`${translation}:${book}:${chapter}:${verse}`)?.text ?? "";
  });
  return texts.filter(Boolean).join(" ");
}

/**
 * Multilingual distress detection for non-English (Indic-script) input, where
 * the keyword rules do not apply. Runs before any retrieval/generation; the
 * response is always the static crisis screen.
 */
async function detectDistressLLM(
  llm: LLM,
  text: string
): Promise<{ distress: boolean; category: string }> {
  const raw = await llm.complete(
    [
      {
        role: "system",
        content:
          'You detect whether a message indicates the person is at immediate risk of self-harm, suicide, abuse, violence, or a medical emergency. Respond with ONLY JSON: {"distress": boolean, "category": string}. category is one of "suicide", "self_harm", "abuse", "violence", "medical", or "" when there is none. Respond in English regardless of the input language.',
      },
      { role: "user", content: text },
    ],
    { json: true, temperature: 0 }
  );
  try {
    const p = JSON.parse(raw) as { distress?: boolean; category?: string };
    return { distress: !!p.distress, category: p.category || "acute_distress" };
  } catch {
    return { distress: false, category: "" };
  }
}

export async function handleCheckin(
  text: string,
  store: Store,
  llm: LLM,
  language: Language = "en"
): Promise<CheckinResult> {
  // 1. Safety first — deterministic rules, then an LLM pass for Indic-script input.
  const safety = classifySafety(text);
  if (isDistress(safety)) {
    store.recordSafetyEvent(safety.category);
    return { status: "crisis", language, crisis: withOpener(safety.category) };
  }

  if (hasIndicScript(text)) {
    const llmSafety = await detectDistressLLM(llm, text);
    if (llmSafety.distress) {
      store.recordSafetyEvent(llmSafety.category || "acute_distress");
      return { status: "crisis", language, crisis: withOpener(llmSafety.category || "acute_distress") };
    }
  }

  // 2. Understand the feeling (works in any language).
  const emotion = await classifyEmotion(llm, text);

  // 3. Retrieve a pre-approved reel for that emotion.
  const candidates = store.listReels("approved").filter((r) => r.emotionTags.includes(emotion));
  const reel = pickReel(candidates, text);
  if (!reel) {
    return { status: "ok", language, emotion, hook: "", reflection: "", prayer: "", personalized: false };
  }
  const passage = store.getPassage(reel.passageId);
  if (!passage) {
    return { status: "ok", language, emotion, hook: reel.hook, reflection: reel.reflection, prayer: reel.prayer, personalized: false };
  }

  // 4. Resolve the verse in the target language (from the verified DB).
  const translation = TRANSLATION_BY_LANG[language];
  const verseText = resolveVerseText(store, passage, translation);

  // 5. Personalize reflection/prayer in the target language.
  let hook = reel.hook;
  let reflection = reel.reflection;
  let prayer = reel.prayer;
  let personalized = false;
  try {
    const { draft, validation } = await draftValidated(llm, passage, "emotion", [emotion], {
      userContext: text,
      language: language === "en" ? undefined : LANG_NAME[language],
    });
    if (validation.ok) {
      hook = draft.hook;
      reflection = draft.reflection;
      prayer = draft.prayer;
      personalized = true;
    }
  } catch {
    /* fall back to approved reel content */
  }

  return {
    status: "ok",
    language,
    emotion,
    passageId: passage.id,
    title: passage.title,
    verseRange: passage.verseRange,
    verseText,
    hook,
    reflection,
    prayer,
    personalized,
  };
}

function withOpener(category: string): CrisisContent {
  const opener = CATEGORY_OPENERS[category];
  return opener ? { ...CRISIS_CONTENT, message: `${opener}\n\n${CRISIS_CONTENT.message}` } : CRISIS_CONTENT;
}
