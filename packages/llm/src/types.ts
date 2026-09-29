export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLM {
  complete(messages: ChatMessage[], options?: { json?: boolean; temperature?: number }): Promise<string>;
}

export class LLMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMError";
  }
}
