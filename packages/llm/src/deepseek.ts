import type { ChatMessage, LLM } from "./types.js";
import { LLMError } from "./types.js";

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export class DeepSeekLLM implements LLM {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(config: DeepSeekConfig) {
    if (!config.apiKey) throw new LLMError("DEEPSEEK_API_KEY is required");
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.deepseek.com";
    this.model = config.model ?? "deepseek-chat";
  }

  async complete(
    messages: ChatMessage[],
    options: { json?: boolean; temperature?: number } = {}
  ): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.3,
        ...(options.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new LLMError(`DeepSeek request failed (${res.status}): ${body}`);
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new LLMError("DeepSeek returned no content");
    return content;
  }
}
