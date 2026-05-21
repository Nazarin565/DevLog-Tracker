import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import {
  TaskSchema,
  SubtaskSchema,
  type Task,
  type Subtask,
  type CreateTaskInput,
  type UpdateTaskInput,
  type TaskQuery,
} from '@devlog/shared';

type TaskRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
};

type SubtaskRow = {
  id: string;
  task_id: string;
  title: string;
  done: number;
  created_at: string;
};

function rowToTask(row: TaskRow, subtasks: Subtask[] = []): Task {
  return TaskSchema.parse({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    subtasks,
  });
}

function rowToSubtask(row: SubtaskRow): Subtask {
  return SubtaskSchema.parse({
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    done: row.done === 1,
    createdAt: row.created_at,
  });
}

const PRIORITY_ORDER = `CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END`;

export function createTaskRepository(db: Database) {
  const findAll = (query: TaskQuery = {}): Task[] => {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      conditions.push('status = ?');
      params.push(query.status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy: string;
    const dir = query.order === 'asc' ? 'ASC' : 'DESC';
    if (query.sortBy === 'createdAt') {
      orderBy = `ORDER BY created_at ${dir}`;
    } else {
      // Default: sort by priority (high → medium → low), then newest first
      orderBy = `ORDER BY ${PRIORITY_ORDER}, created_at DESC`;
    }

    const rows = db.prepare<unknown[], TaskRow>(
      `SELECT * FROM tasks ${where} ${orderBy}`
    ).all(...params);

    const subtaskRows = db.prepare<unknown[], SubtaskRow>(
      `SELECT * FROM subtasks WHERE task_id IN (${rows.map(() => '?').join(',') || 'NULL'})`
    ).all(...rows.map((r) => r.id));

    const subtasksByTask = new Map<string, Subtask[]>();
    for (const row of subtaskRows) {
      const list = subtasksByTask.get(row.task_id) ?? [];
      list.push(rowToSubtask(row));
      subtasksByTask.set(row.task_id, list);
    }

    return rows.map((r) => rowToTask(r, subtasksByTask.get(r.id) ?? []));
  };

  const findById = (id: string): Task | null => {
    const row = db.prepare<[string], TaskRow>('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!row) return null;

    const subtaskRows = db.prepare<[string], SubtaskRow>(
      'SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at ASC'
    ).all(id);

    return rowToTask(row, subtaskRows.map(rowToSubtask));
  };

  const create = (input: CreateTaskInput): Task => {
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO tasks (id, title, description, status, priority, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, input.title, input.description ?? '', 'todo', input.priority ?? 'medium', now);
    return findById(id)!;
  };

  const update = (id: string, input: UpdateTaskInput): Task | null => {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (input.title !== undefined) { fields.push('title = ?'); params.push(input.title); }
    if (input.description !== undefined) { fields.push('description = ?'); params.push(input.description); }
    if (input.status !== undefined) { fields.push('status = ?'); params.push(input.status); }
    if (input.priority !== undefined) { fields.push('priority = ?'); params.push(input.priority); }

    if (fields.length === 0) return findById(id);

    params.push(id);
    db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return findById(id);
  };

  const remove = (id: string): boolean => {
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return result.changes > 0;
  };

  return { findAll, findById, create, update, remove };
}

export type TaskRepository = ReturnType<typeof createTaskRepository>;
