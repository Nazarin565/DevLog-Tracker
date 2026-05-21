export interface LLMCompleteOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface LLMClient {
  complete(prompt: string, opts?: LLMCompleteOptions): Promise<string>;
}
