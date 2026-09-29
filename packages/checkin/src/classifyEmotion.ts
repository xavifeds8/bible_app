import type { LLM } from "@bible/llm";
import type { EmotionTag } from "@bible/db";

export const EMOTION_TAGS: EmotionTag[] = [
  "anxiety",
  "grief",
  "fear",
  "anger",
  "loneliness",
  "guilt",
  "hope",
  "gratitude",
];

/**
 * Classify a free-text check-in into one of the supported emotions.
 * Falls back to "anxiety" (most common need) if the model misbehaves.
 */
export async function classifyEmotion(llm: LLM, text: string): Promise<EmotionTag> {
  const raw = await llm.complete(
    [
      {
        role: "system",
        content:
          `You classify how a person feels into exactly one of these emotions: ${EMOTION_TAGS.join(", ")}.\n` +
          `Respond with ONLY JSON: {"emotion": "<one of the listed emotions>"}. ` +
          `If the feeling is mixed or unclear, choose the closest. Never output anything else.`,
      },
      { role: "user", content: text },
    ],
    { json: true, temperature: 0 }
  );

  try {
    const parsed = JSON.parse(raw) as { emotion?: string };
    const emotion = parsed.emotion as EmotionTag | undefined;
    if (emotion && EMOTION_TAGS.includes(emotion)) return emotion;
  } catch {
    // fall through to default
  }
  return "anxiety";
}
