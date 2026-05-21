import { describe, it, expect } from 'vitest';
import { scoreTasks } from './scoring.js';
import type { Task } from '@devlog/shared';

const NOW = new Date('2024-06-01T00:00:00Z');

function makeTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    id: overrides.id,
    title: overrides.title ?? 'Task',
    description: overrides.description ?? '',
    status: overrides.status ?? 'todo',
    priority: overrides.priority ?? 'medium',
    createdAt: overrides.createdAt ?? NOW.toISOString(),
    subtasks: [],
  };
}

describe('scoreTasks', () => {
  it('excludes done tasks', () => {
    const tasks = [
      makeTask({ id: '1', status: 'done' }),
      makeTask({ id: '2', status: 'todo' }),
    ];
    const result = scoreTasks(tasks, NOW);
    expect(result).toHaveLength(1);
    expect(result[0]!.task.id).toBe('2');
  });

  it('ranks high priority above medium above low', () => {
    const tasks = [
      makeTask({ id: 'low', priority: 'low' }),
      makeTask({ id: 'high', priority: 'high' }),
      makeTask({ id: 'med', priority: 'medium' }),
    ];
    const result = scoreTasks(tasks, NOW);
    expect(result.map((s) => s.task.id)).toEqual(['high', 'med', 'low']);
  });

  it('boosts in-progress tasks above same-priority todo', () => {
    const tasks = [
      makeTask({ id: 'todo', priority: 'high', status: 'todo' }),
      makeTask({ id: 'wip', priority: 'high', status: 'in-progress' }),
    ];
    const result = scoreTasks(tasks, NOW);
    expect(result[0]!.task.id).toBe('wip');
  });

  it('older tasks score higher than newer tasks of the same priority', () => {
    const old = makeTask({ id: 'old', priority: 'medium', createdAt: '2024-05-01T00:00:00Z' });
    const fresh = makeTask({ id: 'fresh', priority: 'medium', createdAt: '2024-05-31T00:00:00Z' });
    const result = scoreTasks([fresh, old], NOW);
    expect(result[0]!.task.id).toBe('old');
  });

  it('age score is capped at MAX_AGE_SCORE regardless of extreme age', () => {
    const ancient = makeTask({ id: 'ancient', createdAt: '2020-01-01T00:00:00Z' });
    const week = makeTask({ id: 'week', createdAt: '2024-05-25T00:00:00Z' });
    const ancient_score = scoreTasks([ancient], NOW)[0]!.score;
    const week_score = scoreTasks([week], NOW)[0]!.score;
    expect(ancient_score).toBe(week_score);
  });

  it('returns tasks sorted descending by score', () => {
    const tasks = [
      makeTask({ id: 'a', priority: 'low' }),
      makeTask({ id: 'b', priority: 'high' }),
      makeTask({ id: 'c', priority: 'medium' }),
    ];
    const result = scoreTasks(tasks, NOW);
    const scores = result.map((s) => s.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});
