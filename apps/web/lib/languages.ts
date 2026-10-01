import type { Language } from "./types";

export const LANGUAGES: { code: Language; label: string; speech: string }[] = [
  { code: "en", label: "English", speech: "en-IN" },
  { code: "hi", label: "हिंदी", speech: "hi-IN" },
  { code: "kn", label: "ಕನ್ನಡ", speech: "kn-IN" },
];

/** Guess the spoken language from the transcript's script (Kannada → Devanagari → Latin). */
export function detectLanguage(text: string): Language {
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  return "en";
}

export function speechLangFor(code: Language): string {
  return LANGUAGES.find((l) => l.code === code)?.speech ?? "en-IN";
}

/** Recognition language for the mic, derived from the device locale (no manual picker). */
export function defaultSpeechLang(): string {
  if (typeof navigator === "undefined") return "en-IN";
  const l = (navigator.language || "en").toLowerCase();
  if (l.startsWith("hi")) return "hi-IN";
  if (l.startsWith("kn")) return "kn-IN";
  return "en-IN";
}
