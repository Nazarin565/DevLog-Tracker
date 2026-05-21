import type { LLMClient } from './types.js';
import { MockClient } from './mockClient.js';
import { AnthropicClient } from './anthropicClient.js';

export function createLLMClient(): LLMClient {
  const provider = process.env['LLM_PROVIDER'] ?? 'mock';

  if (provider === 'anthropic') {
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic');
    return new AnthropicClient(apiKey);
  }

  return new MockClient();
}
