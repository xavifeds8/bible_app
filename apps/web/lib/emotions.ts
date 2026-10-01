import type { EmotionTag } from "./types";

export interface EmotionDef {
  tag: EmotionTag;
  label: string;
  /** [light, dark] colors used for the reel's layered aurora background. */
  colors: [string, string];
}

export const EMOTIONS: EmotionDef[] = [
  { tag: "anxiety", label: "Anxious", colors: ["#18b9a8", "#0b4f66"] },
  { tag: "grief", label: "Grieving", colors: ["#7b6ad8", "#2a2350"] },
  { tag: "fear", label: "Afraid", colors: ["#4a6b8a", "#0b1622"] },
  { tag: "anger", label: "Angry", colors: ["#cf7a3c", "#4a2410"] },
  { tag: "loneliness", label: "Lonely", colors: ["#3f7f8f", "#101d26"] },
  { tag: "guilt", label: "Ashamed", colors: ["#8a63c9", "#2b1f4d"] },
  { tag: "hope", label: "Hopeful", colors: ["#1fb97e", "#053b2e"] },
  { tag: "gratitude", label: "Thankful", colors: ["#e8ab45", "#6b3d12"] },
];

export const EMOTION_MAP: Record<EmotionTag, EmotionDef> = Object.fromEntries(
  EMOTIONS.map((e) => [e.tag, e])
) as Record<EmotionTag, EmotionDef>;

const STORY_COLORS: [string, string] = ["#3a6ea5", "#0b1d33"];
const DEFAULT_COLORS: [string, string] = ["#2b6a7a", "#0b1622"];

export function colorsFor(tags: EmotionTag[]): [string, string] {
  return tags.length > 0 ? EMOTION_MAP[tags[0]].colors : DEFAULT_COLORS;
}

export function storyColors(): [string, string] {
  return STORY_COLORS;
}
