import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import { SubtaskSchema, type Subtask } from '@devlog/shared';

type SubtaskRow = {
  id: string;
  task_id: string;
  title: string;
  done: number;
  created_at: string;
};

function rowToSubtask(row: SubtaskRow): Subtask {
  return SubtaskSchema.parse({
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    done: row.done === 1,
    createdAt: row.created_at,
  });
}

export function createSubtaskRepository(db: Database) {
  const createMany = (taskId: string, titles: string[]): Subtask[] => {
    const now = new Date().toISOString();
    const insert = db.prepare(
      'INSERT INTO subtasks (id, task_id, title, done, created_at) VALUES (?, ?, ?, 0, ?)'
    );
    const insertAll = db.transaction((items: string[]) =>
      items.map((title) => {
        const id = randomUUID();
        insert.run(id, taskId, title, now);
        return id;
      })
    );
    const ids = insertAll(titles);
    const rows = db.prepare<unknown[], SubtaskRow>(
      `SELECT * FROM subtasks WHERE id IN (${ids.map(() => '?').join(',')})`
    ).all(...ids);
    return rows.map(rowToSubtask);
  };

  const createOne = (taskId: string, title: string): Subtask => {
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO subtasks (id, task_id, title, done, created_at) VALUES (?, ?, ?, 0, ?)').run(id, taskId, title, now);
    const row = db.prepare<[string], SubtaskRow>('SELECT * FROM subtasks WHERE id = ?').get(id)!;
    return rowToSubtask(row);
  };

  const update = (id: string, data: { title?: string; done?: boolean }): Subtask | null => {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.done !== undefined) { fields.push('done = ?'); values.push(data.done ? 1 : 0); }
    if (fields.length === 0) {
      const row = db.prepare<[string], SubtaskRow>('SELECT * FROM subtasks WHERE id = ?').get(id);
      return row ? rowToSubtask(row) : null;
    }
    db.prepare(`UPDATE subtasks SET ${fields.join(', ')} WHERE id = ?`).run(...values, id);
    const row = db.prepare<[string], SubtaskRow>('SELECT * FROM subtasks WHERE id = ?').get(id);
    return row ? rowToSubtask(row) : null;
  };

  const setDone = (id: string, done: boolean): Subtask | null => update(id, { done });

  const remove = (id: string): boolean => {
    const result = db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
    return result.changes > 0;
  };

  const removeAllForTask = (taskId: string): void => {
    db.prepare('DELETE FROM subtasks WHERE task_id = ?').run(taskId);
  };

  return { createMany, createOne, update, setDone, remove, removeAllForTask };
}

export type SubtaskRepository = ReturnType<typeof createSubtaskRepository>;
