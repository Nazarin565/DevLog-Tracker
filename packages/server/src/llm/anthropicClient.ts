import Anthropic from '@anthropic-ai/sdk';
import type { LLMClient, LLMCompleteOptions } from './types.js';

export class AnthropicClient implements LLMClient {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model ?? 'claude-sonnet-4-6';
  }

  async complete(prompt: string, opts?: LLMCompleteOptions): Promise<string> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: opts?.maxTokens ?? 1024,
      ...(opts?.systemPrompt ? { system: opts.systemPrompt } : {}),
      messages: [{ role: 'user', content: prompt }],
    });

    const block = message.content[0];
    if (!block || block.type !== 'text') {
      throw new Error('Unexpected response format from Anthropic API');
    }
    return block.text;
  }
}
