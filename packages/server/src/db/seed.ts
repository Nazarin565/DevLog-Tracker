import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../../../.env') });

import { getDb, createTaskRepository, createSubtaskRepository } from './index.js';

const db = getDb();
const taskRepo = createTaskRepository(db);
const subtaskRepo = createSubtaskRepository(db);

const existing = taskRepo.findAll();
if (existing.length > 0) {
  console.log(`[seed] DB already has ${existing.length} task(s) — skipping. Delete devlog.sqlite to re-seed.`);
  process.exit(0);
}

type SeedTask = {
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  createdDaysAgo: number;
  subtasks?: string[];
};

const tasks: SeedTask[] = [
  {
    title: 'Set up CI/CD pipeline',
    description:
      'Configure GitHub Actions to run tests on every PR and deploy to staging on merge to main. Include lint, typecheck, and vitest steps. Cache node_modules between runs.',
    status: 'in-progress',
    priority: 'high',
    createdDaysAgo: 9,
    subtasks: [
      'Create .github/workflows/ci.yml with lint + typecheck + test jobs',
      'Add deploy-staging job triggered on main branch merge',
      'Set up node_modules caching with actions/cache',
      'Add branch protection rule requiring CI to pass',
    ],
  },
  {
    title: 'Migrate auth to OAuth 2.0',
    description:
      'Replace the current session-cookie auth with OAuth 2.0 (Google provider). Users should be able to sign in with their work Google account. Existing sessions must be invalidated on cutover.',
    status: 'todo',
    priority: 'high',
    createdDaysAgo: 3,
    subtasks: [
      'Register OAuth app in Google Cloud Console',
      'Implement /auth/google and /auth/google/callback routes',
      'Store user profile in users table on first login',
      'Invalidate all existing sessions on deploy',
    ],
  },
  {
    title: 'Fix memory leak in websocket handler',
    description:
      'Heap dumps show the EventEmitter listener count growing unboundedly on the /live endpoint. Suspect listeners are attached on each reconnect but never removed on disconnect.',
    status: 'in-progress',
    priority: 'high',
    createdDaysAgo: 1,
    subtasks: [
      'Reproduce leak with a 30-minute load test script',
      'Identify listener registration site in ws-handler.ts',
      'Add removeListener call in the disconnect handler',
      'Verify heap is stable after fix under the same load',
    ],
  },
  {
    title: 'Add request rate limiting',
    description:
      'Public API endpoints are currently unprotected. Add per-IP rate limiting (100 req/min) using express-rate-limit. Return 429 with Retry-After header when exceeded.',
    status: 'todo',
    priority: 'medium',
    createdDaysAgo: 5,
  },
  {
    title: 'Write integration tests for the task API',
    description:
      'Currently only unit tests exist for scoring and agent parsing. Add integration tests that spin up a real SQLite DB (in-memory), run the Express app, and cover all REST endpoints: CRUD, filters, agent run.',
    status: 'todo',
    priority: 'medium',
    createdDaysAgo: 6,
  },
  {
    title: 'Update onboarding docs for new hires',
    description:
      'The engineering onboarding wiki is 18 months out of date. Update the local-dev setup section, replace references to the old monolith, and add the new monorepo structure and npm workspaces workflow.',
    status: 'todo',
    priority: 'low',
    createdDaysAgo: 12,
  },
  {
    title: 'Refactor task list query to use cursor pagination',
    description: '',
    status: 'todo',
    priority: 'medium',
    createdDaysAgo: 2,
  },
  {
    title: 'Upgrade to Node.js 22',
    description:
      'Node 18 reaches EOL in April. Audit all packages for Node 22 compatibility, update .nvmrc and the CI matrix, verify better-sqlite3 native bindings rebuild correctly.',
    status: 'done',
    priority: 'high',
    createdDaysAgo: 14,
    subtasks: [
      'Update .nvmrc to 22',
      'Bump engines field in all package.json files',
      'Rebuild better-sqlite3 native bindings and run tests',
      'Update CI node-version matrix',
    ],
  },
  {
    title: 'Add dark mode support',
    description:
      'Several team members requested dark mode. Use the Tailwind `dark:` variant with the `class` strategy so it respects the OS preference but can also be toggled manually. Persist the preference in localStorage.',
    status: 'todo',
    priority: 'low',
    createdDaysAgo: 4,
  },
  {
    title: 'Investigate slow dashboard load on large accounts',
    description:
      'Accounts with 500+ tasks report the dashboard taking 8–12 seconds to load. Profiling is needed to determine whether the bottleneck is the DB query, the API response serialisation, or the frontend render.',
    status: 'in-progress',
    priority: 'high',
    createdDaysAgo: 7,
    subtasks: [
      'Profile GET /api/tasks with 500 tasks in SQLite using EXPLAIN QUERY PLAN',
      'Measure API response time with autocannon (p95, p99)',
      'Profile React render with React DevTools Profiler',
      'Implement the fix for the identified bottleneck',
    ],
  },
];

const baseDate = new Date();

for (const seed of tasks) {
  const createdAt = new Date(baseDate);
  createdAt.setDate(createdAt.getDate() - seed.createdDaysAgo);

  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO tasks (id, title, description, status, priority, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, seed.title, seed.description, seed.status, seed.priority, createdAt.toISOString());

  if (seed.subtasks?.length) {
    subtaskRepo.createMany(id, seed.subtasks);
  }

  console.log(`[seed] created: [${seed.priority}] "${seed.title}" (${seed.status})`);
}

console.log(`\n[seed] done — ${tasks.length} tasks inserted.`);
