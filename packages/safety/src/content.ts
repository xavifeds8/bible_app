export interface CrisisResource {
  name: string;
  contact: string;
  hours?: string;
}

export interface CrisisContent {
  title: string;
  message: string;
  resources: CrisisResource[];
  action: string;
}

/**
 * Static crisis screen. Returned verbatim whenever distress is detected —
 * the LLM is never consulted for a distress signal.
 *
 * IMPORTANT: Verify every number against official sources before launch, and
 * localise resources as you expand beyond India.
 */
export const CRISIS_CONTENT: CrisisContent = {
  title: "You are not alone",
  message:
    "What you are feeling is real, and it matters. Please reach out to someone right now — a trusted " +
    "person, a pastor, or one of the helplines below. You deserve support from a real human.",
  resources: [
    { name: "Tele-MANAS (Govt. of India)", contact: "14416 / 1-800-891-4416", hours: "24x7" },
    { name: "Kiran Mental Health Helpline", contact: "1800-599-0019", hours: "24x7" },
    { name: "AASRA", contact: "+91-98204-66726", hours: "24x7" },
    { name: "Vandrevala Foundation", contact: "1860-2662-2345", hours: "24x7" },
    { name: "iCall (TISS)", contact: "+91-9152987821", hours: "Mon–Sat, 10am–8pm" },
  ],
  action: "If you are in immediate danger, call 112 (India emergency) or go to the nearest hospital.",
};

/** Category-specific one-line openers shown above the shared resources. */
export const CATEGORY_OPENERS: Record<string, string> = {
  suicide: "You matter, and this feeling can change with help. Please talk to someone now.",
  self_harm: "You do not have to carry this pain alone, and you do not have to hurt yourself.",
  abuse: "You are not to blame for what is being done to you. Please reach out for safety.",
  violence: "Please step away from the situation and reach out for help right now.",
  medical: "This may be a medical emergency. Please get help immediately.",
  acute_distress: "What you are carrying sounds overwhelming. Please let someone help you carry it.",
};
