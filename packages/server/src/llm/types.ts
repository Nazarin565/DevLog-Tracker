export interface LLMCompleteOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface LLMClient {
  complete(prompt: string, opts?: LLMCompleteOptions): Promise<string>;
}
