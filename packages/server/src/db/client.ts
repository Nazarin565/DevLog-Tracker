import Database from 'better-sqlite3';
import path from 'node:path';
import { applySchema } from './schema.js';

const DB_PATH = process.env['DATABASE_PATH']
  ? path.resolve(process.env['DATABASE_PATH'])
  : path.resolve(import.meta.dirname, '../../data/devlog.sqlite');

let instance: ReturnType<typeof Database> | null = null;

export function getDb(): ReturnType<typeof Database> {
  if (!instance) {
    instance = new Database(DB_PATH);
    instance.pragma('journal_mode = WAL');
    instance.pragma('foreign_keys = ON');
    applySchema(instance);
  }
  return instance;
}
