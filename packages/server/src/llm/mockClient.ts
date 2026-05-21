import type { LLMClient, LLMCompleteOptions } from './types.js';

const MOCK_RESPONSES: Record<string, string> = {
  prioritise: JSON.stringify({
    rankedTasks: [
      {
        taskId: '__placeholder__',
        reasoning: 'High priority item that has been active for several days and is currently in progress.',
      },
    ],
    summary:
      'Focus on in-progress high-priority work first, then move to older todo items to avoid stale tasks building up.',
  }),

  decompose: JSON.stringify({
    type: 'subtasks',
    subtasks: [
      { title: 'Research and outline requirements' },
      { title: 'Implement core functionality' },
      { title: 'Write tests' },
      { title: 'Update documentation' },
    ],
  }),

  decompose_ambiguous: JSON.stringify({
    type: 'clarify',
    questions: [
      'What is the expected input format for this feature?',
      'Are there any existing systems this needs to integrate with?',
      'What does "done" look like — is there a specific acceptance criterion?',
    ],
  }),
};

export class MockClient implements LLMClient {
  async complete(prompt: string, _opts?: LLMCompleteOptions): Promise<string> {
    const lower = prompt.toLowerCase();

    if (lower.includes('prioriti')) {
      return MOCK_RESPONSES['prioritise']!;
    }

    if (lower.includes('decompos') || lower.includes('subtask')) {
      const isAmbiguous =
        lower.includes('unclear') ||
        lower.includes('vague') ||
        lower.includes('ambiguous') ||
        !lower.includes('description:') ||
        lower.match(/description:\s*$/m);

      return isAmbiguous
        ? MOCK_RESPONSES['decompose_ambiguous']!
        : MOCK_RESPONSES['decompose']!;
    }

    return JSON.stringify({ message: 'Mock response for unrecognised prompt type.' });
  }
}
