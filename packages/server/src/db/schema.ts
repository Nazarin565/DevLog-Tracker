import type { Database } from 'better-sqlite3';

export function applySchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'todo'
                    CHECK (status IN ('todo', 'in-progress', 'done')),
      priority    TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low', 'medium', 'high')),
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id         TEXT PRIMARY KEY,
      task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
}
