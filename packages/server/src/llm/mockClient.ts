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
  async complete(prompt: string, opts?: LLMCompleteOptions): Promise<string> {
    const haystack = (opts?.systemPrompt ?? prompt).toLowerCase();

    if (haystack.includes('prioriti') || haystack.includes('rankedtasks')) {
      // Extract real task IDs from the prompt so the response references actual tasks
      const idMatches = prompt.match(/\bid:\s*([a-f0-9-]{36})/g) ?? [];
      const taskIds = idMatches.map((m) => m.replace(/\bid:\s*/, ''));
      if (taskIds.length > 0) {
        return JSON.stringify({
          rankedTasks: taskIds.map((taskId, i) => ({
            taskId,
            reasoning: i === 0
              ? 'Highest combined score — high priority, currently in progress, or oldest.'
              : 'Lower combined score based on priority, status, and age.',
          })),
          summary: 'Focus on in-progress high-priority work first, then move to older todo items to avoid stale tasks building up.',
        });
      }
      return MOCK_RESPONSES['prioritise']!;
    }

    if (haystack.includes('decompos') || haystack.includes('subtask')) {
      const promptLower = prompt.toLowerCase();
      const isAmbiguous =
        promptLower.includes('unclear') ||
        promptLower.includes('vague') ||
        promptLower.includes('ambiguous') ||
        promptLower.match(/description:\s*$/m) != null;

      return isAmbiguous
        ? MOCK_RESPONSES['decompose_ambiguous']!
        : MOCK_RESPONSES['decompose']!;
    }

    return JSON.stringify({ message: 'Mock response for unrecognised prompt type.' });
  }
}
