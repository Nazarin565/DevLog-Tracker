import type { LLMClient } from './types.js';
import { MockClient } from './mockClient.js';
import { AnthropicClient } from './anthropicClient.js';

export function createLLMClient(): LLMClient {
  const provider = process.env['LLM_PROVIDER'] ?? 'mock';

  if (provider === 'anthropic') {
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic');
    const model = process.env['LLM_MODEL'];
    return new AnthropicClient(apiKey, model);
  }

  return new MockClient();
}
