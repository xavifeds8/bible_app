import type { CrisisResource } from "./types";

// Standalone crisis screen content (mirrors the server-side source of truth).
export const CRISIS_TITLE = "You are not alone";
export const CRISIS_MESSAGE =
  "What you are feeling is real, and it matters. Please reach out to someone right now — a trusted person, a pastor, or one of the helplines below.";
export const CRISIS_RESOURCES: CrisisResource[] = [
  { name: "Tele-MANAS (Govt. of India)", contact: "14416 / 1-800-891-4416", hours: "24x7" },
  { name: "Kiran Mental Health Helpline", contact: "1800-599-0019", hours: "24x7" },
  { name: "AASRA", contact: "+91-98204-66726", hours: "24x7" },
  { name: "Vandrevala Foundation", contact: "1860-2662-2345", hours: "24x7" },
  { name: "iCall (TISS)", contact: "+91-9152987821", hours: "Mon–Sat, 10am–8pm" },
];
export const CRISIS_ACTION =
  "If you are in immediate danger, call 112 (India emergency) or go to the nearest hospital.";
