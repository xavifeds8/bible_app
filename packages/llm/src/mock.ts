import type { ChatMessage, LLM } from "./types.js";

/**
 * Offline mock LLM for pipeline testing without an API key.
 * Produces deterministic, clearly-placeholder drafts.
 */
export class MockLLM implements LLM {
  async complete(
    messages: ChatMessage[],
    options: { json?: boolean; temperature?: number } = {}
  ): Promise<string> {
    const user = messages.find((m) => m.role === "user")?.content ?? "";
    const refMatch = user.match(/Passage reference: ([^\n]+)/);
    const ref = refMatch?.[1] ?? "unknown";

    if (options.json) {
      return JSON.stringify({
        hook: `A word of comfort from ${ref}.`,
        reflection: "This passage meets you where you are today. It is a gentle reminder you are not walking alone.",
        prayer: "Lord, meet me in this moment.\nBring peace to a restless heart.\nHelp me to rest in your presence.",
      });
    }
    return "mock response";
  }
}
