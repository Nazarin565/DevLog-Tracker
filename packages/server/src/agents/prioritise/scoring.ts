import type { Task } from '@devlog/shared';

const PRIORITY_SCORE: Record<string, number> = { high: 30, medium: 15, low: 0 };
const STATUS_SCORE: Record<string, number> = { 'in-progress': 20, todo: 0, done: 0 };
const STALENESS_DAYS = 7;
const MAX_AGE_SCORE = 25;

export interface ScoredTask {
  task: Task;
  score: number;
  ageInDays: number;
}

export function scoreTasks(tasks: Task[], now: Date): ScoredTask[] {
  return tasks
    .filter((t) => t.status !== 'done')
    .map((task) => {
      const ageInDays = (now.getTime() - new Date(task.createdAt).getTime()) / 86_400_000;
      const ageScore = Math.min(ageInDays / STALENESS_DAYS, 1) * MAX_AGE_SCORE;
      const score =
        (PRIORITY_SCORE[task.priority] ?? 0) +
        (STATUS_SCORE[task.status] ?? 0) +
        ageScore;

      return { task, score, ageInDays };
    })
    .sort((a, b) => b.score - a.score);
}
