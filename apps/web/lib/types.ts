export type EmotionTag =
  | "anxiety"
  | "grief"
  | "fear"
  | "anger"
  | "loneliness"
  | "guilt"
  | "hope"
  | "gratitude";

export interface PublishedReel {
  id: string;
  kind: "emotion" | "story";
  emotionTags: EmotionTag[];
  title: string;
  verseRange: string;
  verseText: string;
  verseIds: string[];
  hook: string;
  reflection: string;
  prayer: string;
}

export interface CrisisResource {
  name: string;
  contact: string;
  hours?: string;
}

export type Language = "en" | "hi" | "kn";

export interface CheckinResponse {
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
  crisis?: {
    title: string;
    message: string;
    resources: CrisisResource[];
    action: string;
  };
}
