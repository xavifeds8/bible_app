export type Translation = "WEB" | "KJV" | "HIN" | "KAN";

export interface Verse {
  id: string;
  translation: Translation;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export type PassageType = "story" | "teaching" | "psalm" | "prayer";

export interface Passage {
  id: string;
  title: string;
  type: PassageType;
  verseRange: string; // e.g. "1 Samuel 17:40-51"
  verseIds: string[];
  text: string;
}

export type EmotionTag =
  | "anxiety"
  | "grief"
  | "fear"
  | "anger"
  | "loneliness"
  | "guilt"
  | "hope"
  | "gratitude";

export type ReelKind = "emotion" | "story";

export type ReelStatus = "draft" | "approved" | "live";

export interface Reel {
  id: string;
  kind: ReelKind;
  emotionTags: EmotionTag[];
  passageId: string;
  hook: string;
  reflection: string;
  prayer: string;
  /** Story reels: a short retelling in the model's own words (never scripture). */
  narrative?: string;
  status: ReelStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  version: number;
}

export interface Quiz {
  id: string;
  passageId: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  status: ReelStatus;
}

export interface DailyVerse {
  date: string;
  verseIds: string[];
}

export interface DenylistEntry {
  emotion: EmotionTag;
  passageId: string;
  reason: string;
}

export interface SafetyEvent {
  category: string;
  timestamp: string;
}

export interface Feedback {
  itemId: string;
  thumbs: "up" | "down";
  reason?: string;
}
