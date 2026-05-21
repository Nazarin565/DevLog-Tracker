import { describe, it, expect, vi } from 'vitest';
import { decomposeAgent } from './index.js';
import type { AgentContext } from '../types.js';
import type { Task } from '@devlog/shared';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Build login page',
    description: '',
    status: 'todo',
    priority: 'medium',
    createdAt: new Date().toISOString(),
    subtasks: [],
    ...overrides,
  };
}

function makeCtx(task: Task | null, llmResponse?: string): AgentContext {
  return {
    taskRepo: {
      findById: vi.fn().mockReturnValue(task),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    subtaskRepo: {
      createMany: vi.fn(),
      setDone: vi.fn(),
      remove: vi.fn(),
    },
    llm: {
      complete: vi.fn().mockResolvedValue(llmResponse ?? ''),
    },
  } as unknown as AgentContext;
}

describe('decomposeAgent', () => {
  it('returns clarify when description is empty', async () => {
    const ctx = makeCtx(makeTask({ description: '' }));
    const result = await decomposeAgent.run({ taskId: 'task-1' }, ctx);
    expect(result.output.type).toBe('clarify');
    expect(ctx.llm.complete).not.toHaveBeenCalled();
  });

  it('returns clarify when description is too short', async () => {
    const ctx = makeCtx(makeTask({ description: 'short' }));
    const result = await decomposeAgent.run({ taskId: 'task-1' }, ctx);
    expect(result.output.type).toBe('clarify');
    expect(ctx.llm.complete).not.toHaveBeenCalled();
  });

  it('calls LLM and returns subtasks when description is sufficient', async () => {
    const llmOutput = JSON.stringify({
      type: 'subtasks',
      subtasks: [
        { title: 'Design the login form layout' },
        { title: 'Implement form validation' },
        { title: 'Connect to auth API' },
      ],
    });
    const ctx = makeCtx(
      makeTask({ description: 'Build a login page with email/password fields and validation.' }),
      llmOutput,
    );
    const result = await decomposeAgent.run({ taskId: 'task-1' }, ctx);
    expect(result.output.type).toBe('subtasks');
    if (result.output.type === 'subtasks') {
      expect(result.output.subtasks).toHaveLength(3);
    }
    expect(ctx.llm.complete).toHaveBeenCalledOnce();
  });

  it('calls LLM and returns clarify from LLM when description is sufficient but task is ambiguous', async () => {
    const llmOutput = JSON.stringify({
      type: 'clarify',
      questions: ['What auth provider should be used?', 'Should it support SSO?'],
    });
    const ctx = makeCtx(
      makeTask({ description: 'Implement authentication for the application somehow.' }),
      llmOutput,
    );
    const result = await decomposeAgent.run({ taskId: 'task-1' }, ctx);
    expect(result.output.type).toBe('clarify');
    if (result.output.type === 'clarify') {
      expect(result.output.questions.length).toBeGreaterThan(0);
    }
  });

  it('throws a clear error when LLM returns non-JSON', async () => {
    const ctx = makeCtx(
      makeTask({ description: 'Build a login page with email/password fields and validation.' }),
      'Sorry, I cannot help with that.',
    );
    await expect(decomposeAgent.run({ taskId: 'task-1' }, ctx)).rejects.toThrow(
      'LLM returned non-JSON output',
    );
  });

  it('throws a clear error when LLM returns JSON that does not match schema', async () => {
    const ctx = makeCtx(
      makeTask({ description: 'Build a login page with email/password fields and validation.' }),
      JSON.stringify({ type: 'unknown', data: [] }),
    );
    await expect(decomposeAgent.run({ taskId: 'task-1' }, ctx)).rejects.toThrow(
      'LLM output failed validation',
    );
  });

  it('throws when task is not found', async () => {
    const ctx = makeCtx(null);
    await expect(decomposeAgent.run({ taskId: 'missing' }, ctx)).rejects.toThrow(
      "Task 'missing' not found",
    );
  });

  it('includes step trace in result', async () => {
    const llmOutput = JSON.stringify({
      type: 'subtasks',
      subtasks: [{ title: 'Write tests for the feature' }],
    });
    const ctx = makeCtx(
      makeTask({ description: 'Build a login page with email/password fields and validation.' }),
      llmOutput,
    );
    const result = await decomposeAgent.run({ taskId: 'task-1' }, ctx);
    expect(result.steps.length).toBeGreaterThanOrEqual(3);
    expect(result.steps.map((s) => s.label)).toContain('Validated LLM output');
  });
});
