import type { EmotionTag } from "./types";

export interface EmotionDef {
  tag: EmotionTag;
  label: string;
  /** CSS gradient for the reel background. */
  gradient: string;
}

export const EMOTIONS: EmotionDef[] = [
  { tag: "anxiety", label: "Anxious", gradient: "linear-gradient(160deg, #0ea5e9 0%, #0f766e 100%)" },
  { tag: "grief", label: "Grieving", gradient: "linear-gradient(160deg, #6366f1 0%, #312e81 100%)" },
  { tag: "fear", label: "Afraid", gradient: "linear-gradient(160deg, #0f172a 0%, #334155 100%)" },
  { tag: "anger", label: "Angry", gradient: "linear-gradient(160deg, #b45309 0%, #78350f 100%)" },
  { tag: "loneliness", label: "Lonely", gradient: "linear-gradient(160deg, #334155 0%, #0f766e 100%)" },
  { tag: "guilt", label: "Ashamed", gradient: "linear-gradient(160deg, #7c3aed 0%, #4c1d95 100%)" },
  { tag: "hope", label: "Hopeful", gradient: "linear-gradient(160deg, #059669 0%, #065f46 100%)" },
  { tag: "gratitude", label: "Thankful", gradient: "linear-gradient(160deg, #d97706 0%, #92400e 100%)" },
];

export const EMOTION_MAP: Record<EmotionTag, EmotionDef> = Object.fromEntries(
  EMOTIONS.map((e) => [e.tag, e])
) as Record<EmotionTag, EmotionDef>;

export function gradientFor(tags: EmotionTag[]): string {
  return tags.length > 0 ? EMOTION_MAP[tags[0]].gradient : "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)";
}
