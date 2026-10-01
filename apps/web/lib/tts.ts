const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

/** URL that streams neural TTS audio (edge-tts) for the given text + language. */
export function speechUrl(text: string, lang: string): string {
  return `${API_BASE}/api/tts?lang=${encodeURIComponent(lang)}&text=${encodeURIComponent(text)}`;
}
