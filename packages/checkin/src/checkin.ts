import type { EmotionTag, Reel, Store } from "@bible/db";
import type { LLM } from "@bible/llm";
import { draftValidated } from "@bible/content";
import {
  CRISIS_CONTENT,
  CATEGORY_OPENERS,
  classifySafety,
  isDistress,
  type CrisisContent,
} from "@bible/safety";
import { classifyEmotion } from "./classifyEmotion.js";

export interface CheckinResult {
  status: "ok" | "crisis";
  emotion?: EmotionTag;
  passageId?: string;
  title?: string;
  verseRange?: string;
  verseText?: string;
  hook?: string;
  reflection?: string;
  prayer?: string;
  /** True when reflection/prayer were personalized (and passed validation). */
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

export async function handleCheckin(text: string, store: Store, llm: LLM): Promise<CheckinResult> {
  // 1. Safety first — never reaches the LLM on distress.
  const safety = classifySafety(text);
  if (isDistress(safety)) {
    store.recordSafetyEvent(safety.category);
    const opener = CATEGORY_OPENERS[safety.category];
    return {
      status: "crisis",
      crisis: opener ? { ...CRISIS_CONTENT, message: `${opener}\n\n${CRISIS_CONTENT.message}` } : CRISIS_CONTENT,
    };
  }

  // 2. Understand the feeling.
  const emotion = await classifyEmotion(llm, text);

  // 3. Retrieve a pre-approved reel for that emotion.
  const candidates = store.listReels("approved").filter((r) => r.emotionTags.includes(emotion));
  const reel = pickReel(candidates, text);
  if (!reel) {
    return { status: "ok", emotion, hook: "", reflection: "", prayer: "", personalized: false };
  }
  const passage = store.getPassage(reel.passageId);
  if (!passage) {
    return { status: "ok", emotion, hook: reel.hook, reflection: reel.reflection, prayer: reel.prayer, personalized: false };
  }

  // 4. Personalize the reflection/prayer, grounded only in the passage text.
  //    On any failure, fall back to the human-approved reel content.
  let hook = reel.hook;
  let reflection = reel.reflection;
  let prayer = reel.prayer;
  let personalized = false;
  try {
    const { draft, validation } = await draftValidated(llm, passage, "emotion", [emotion], {
      userContext: text,
    });
    if (validation.ok) {
      hook = draft.hook;
      reflection = draft.reflection;
      prayer = draft.prayer;
      personalized = true;
    } else {
      console.warn(`checkin: draft rejected for ${passage.id}: ${validation.errors.join("; ")}`);
    }
  } catch (e) {
    console.warn(`checkin: generation failed for ${passage.id}: ${(e as Error).message}`);
  }

  return {
    status: "ok",
    emotion,
    passageId: passage.id,
    title: passage.title,
    verseRange: passage.verseRange,
    verseText: passage.text,
    hook,
    reflection,
    prayer,
    personalized,
  };
}
