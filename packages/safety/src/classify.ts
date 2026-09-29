export type SafetyCategory =
  | "none"
  | "self_harm"
  | "suicide"
  | "abuse"
  | "violence"
  | "medical"
  | "acute_distress";

export interface SafetyResult {
  category: SafetyCategory;
  /** Matched rule triggers (for internal debugging; never stored/sent). */
  matched: string[];
}

interface Rule {
  category: SafetyCategory;
  patterns: RegExp[];
}

/**
 * High-recall rules. Safety must not depend on a network call, so this runs
 * first and deterministically. Patterns intentionally over-match: a false
 * positive shows the crisis screen, which is the safe failure mode.
 */
const RULES: Rule[] = [
  {
    category: "suicide",
    patterns: [
      /\b(kill|end)\s+(my|him|her)?self\b/i,
      /\bsuicid(e|al)\b/i,
      /\bwant\s+to\s+die\b/i,
      /\bwanna\s+die\b/i,
      /\bend\s+(my|it)\s+(life|all)\b/i,
      /\b(take|taking)\s+my\s+own\s+life\b/i,
      /\bno\s+reason\s+to\s+live\b/i,
      /\bbetter\s+off\s+dead\b/i,
      /\bdon'?t\s+want\s+to\s+live\b/i,
      /\bnot\s+want\s+to\s+live\b/i,
      /\bwish\s+i\s+(was|were)\s+dead\b/i,
    ],
  },
  {
    category: "self_harm",
    patterns: [
      /\b(cut|cutting|hurt|harm)\s+myself\b/i,
      /\bself[\s-]?harm(ing)?\b/i,
      /\b(hurt|cut)\s+my\s+(arms?|wrist|wrists?|legs?|body|thighs?)\b/i,
      /\bburn(ing)?\s+myself\b/i,
    ],
  },
  {
    category: "abuse",
    patterns: [
      /\b(hits?|hitting|beats?|beating|slaps?|kicks?|punches?)\s+me\b/i,
      /\babus(e|es|ed|ing|ive)\b/i,
      /\b(molest|rape|raped|raping|sexual(ly)?\s+assault)/i,
      /\bdomestic\s+violence\b/i,
      /\btouches?\s+me\s+(wrong|inappropriately)\b/i,
    ],
  },
  {
    category: "violence",
    patterns: [
      /\b(kill|murder|stab|shoot|strangle|poison)\s+(him|her|them|my\s+(husband|wife|father|mother|brother|sister|child))\b/i,
      /\bwant\s+to\s+(kill|murder|hurt)\s+(him|her|them|someone)\b/i,
    ],
  },
  {
    category: "medical",
    patterns: [
      /\b(chest\s+pain|cannot\s+breathe|can'?t\s+breathe)\b/i,
      /\b(overdos(e|ed|ing))\b/i,
      /\b(bleeding\s+heavily|unconscious|not\s+breathing)\b/i,
      /\b(severe|seizure|stroke)\b/i,
    ],
  },
  {
    category: "acute_distress",
    patterns: [
      /\bcan'?t\s+(take\s+it|go\s+on|do\s+this)\s+anymore\b/i,
      /\bcan'?t\s+go\s+on\b/i,
      /\bno\s+way\s+out\b/i,
      /\b(having|had)\s+a\s+(breakdown|panic\s+attack)\b/i,
      /\bcompletely\s+hopeless\b/i,
    ],
  },
];

export function classifySafety(text: string): SafetyResult {
  const matched: string[] = [];
  // Most severe categories first: suicide > self_harm > abuse > violence > medical > acute.
  const order: SafetyCategory[] = [
    "suicide",
    "self_harm",
    "abuse",
    "violence",
    "medical",
    "acute_distress",
  ];
  for (const category of order) {
    const rule = RULES.find((r) => r.category === category)!;
    for (const re of rule.patterns) {
      if (re.test(text)) {
        matched.push(`${category}:${re.source}`);
        return { category, matched };
      }
    }
  }
  return { category: "none", matched };
}

export function isDistress(result: SafetyResult): boolean {
  return result.category !== "none";
}
