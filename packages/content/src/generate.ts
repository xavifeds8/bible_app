import type { LLM } from "@bible/llm";
import type { EmotionTag, Passage, ReelKind } from "@bible/db";
import { draftReel, type DraftOptions, type DraftResult } from "./draft.js";
import { validateDraft, type ValidationResult } from "./validate.js";

export interface ValidatedDraft {
  draft: DraftResult;
  validation: ValidationResult;
  attempts: number;
}

/**
 * Draft, validate, and retry once with corrective feedback if validation
 * fails. Returns the best attempt with its validation result; callers decide
 * whether to accept it (check `validation.ok`).
 */
export async function draftValidated(
  llm: LLM,
  passage: Passage,
  kind: ReelKind,
  emotionTags: EmotionTag[],
  opts: DraftOptions = {},
  maxAttempts = 2
): Promise<ValidatedDraft> {
  let last: { draft: DraftResult; validation: ValidationResult } | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const draft = await draftReel(llm, passage, kind, emotionTags, {
      ...opts,
      correction: last?.validation.errors.join("; "),
    });
    const validation = validateDraft(passage, draft);
    if (validation.ok) return { draft, validation, attempts: attempt };
    last = { draft, validation };
  }
  return { ...last!, attempts: maxAttempts };
}
