# DevLog

Task tracker for engineering teams with a built-in agentic AI layer.

---

## Setup

**Prerequisites:** Node.js 20+ (see `.nvmrc`).

```bash
# 1. Install dependencies (all packages in one command)
npm install

# 2. Copy env and fill in your key if you want real LLM calls
cp .env.example .env
# Open .env and set ANTHROPIC_API_KEY= (leave LLM_PROVIDER=mock to run without a key)

# 3. Start everything
npm run dev
```

Two processes start:

- **Express API** → `http://localhost:4000`
- **Next.js web** → `http://localhost:3000`

**Switching LLM provider:**

| Mode           | What to set                                           | Effect                                 |
| -------------- | ----------------------------------------------------- | -------------------------------------- |
| Mock (default) | `LLM_PROVIDER=mock` or leave blank                    | Deterministic responses, no key needed |
| Real Anthropic | `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY=sk-...` | Calls Claude API                       |

No code changes required — the factory in `packages/server/src/llm/index.ts` picks the provider from env.

**Seed sample data (optional):**

```bash
npm run seed
```

Inserts 10 realistic engineering tasks with varied priorities, statuses, ages, and subtasks — useful for testing the AI agents without creating tasks manually. The command is idempotent: if the DB already has tasks, it exits without touching anything. To start fresh, delete `packages/server/data/devlog.sqlite` and re-run.

| # | Task | Priority | Status | Subtasks |
|---|------|----------|--------|----------|
| 1 | Set up CI/CD pipeline | high | in-progress | 4 |
| 2 | Migrate auth to OAuth 2.0 | high | todo | 4 |
| 3 | Fix memory leak in websocket handler | high | in-progress | 4 |
| 4 | Add request rate limiting | medium | todo | — |
| 5 | Write integration tests for the task API | medium | todo | — |
| 6 | Update onboarding docs for new hires | low | todo | — |
| 7 | Refactor task list query to use cursor pagination | medium | todo | — |
| 8 | Upgrade to Node.js 22 | high | done | 4 |
| 9 | Add dark mode support | low | todo | — |
| 10 | Investigate slow dashboard load on large accounts | high | in-progress | 4 |

**Run tests:**

```bash
npm test
```

---

## Architecture

Monorepo with npm workspaces:

```
DevLog tracker/
├─ packages/
│  ├─ shared/     # domain types + Zod schemas (single source of truth for contracts)
│  ├─ server/     # Express + SQLite + agent layer
│  └─ web/        # Next.js (App Router) UI
├─ .env.example
├─ AGENT_LOG.md
└─ README.md
```

### Data flow

```
Browser (Next.js :3000)
    │  TanStack Query hooks (useTasks, useRunAgent, …)
    │  fetch → NEXT_PUBLIC_API_URL
    ▼
Express API (:4000)
    │  Zod validation at every boundary
    │  routes/tasks.ts  →  taskRepository / subtaskRepository
    │  routes/agents.ts →  agentRegistry → Agent.run(input, ctx)
    ▼
SQLite (packages/server/data/devlog.sqlite)
         ↑ read/write
    Agent context (taskRepo, subtaskRepo, LLMClient)
```

### packages/shared

Single source of truth for all contracts. Both server and web import from here — types cannot drift between layers. Contains:

- Domain types: `Task`, `Subtask`, `TaskStatus`, `Priority`
- Zod schemas for API request/response bodies
- Zod schemas for structured LLM output (`PrioritisationOutputSchema`, `DecompositionResultSchema`)

Types are derived from schemas (`type Task = z.infer<typeof TaskSchema>`), never written by hand.

### packages/server

Layered so HTTP and agents are fully decoupled:

- **`src/db/`** — `better-sqlite3`, schema, migration on startup, repositories (CRUD + filter/sort at SQL level; never in JS)
- **`src/routes/`** — thin REST handlers: validate → call repo/agent → respond. No business logic.
- **`src/llm/`** — `LLMClient` interface + `AnthropicClient` + `MockClient` + prompt constants. Selected by env.
- **`src/agents/`** — `Agent` contract, `AgentContext`, registry, two agents (A + B)

Agent entry point: `POST /api/agents/:agentId/run` — single route for all agents. Adding a new agent = one registry entry, no route changes.

### packages/web

Next.js App Router. Scaffolded by Claude Code; manual interventions documented in `AGENT_LOG.md`.

State management split by type:

- **Server state** (tasks, subtasks, agent results) → TanStack Query (`useTasks`, `useTask`, mutations with `invalidateQueries`)
- **UI state** (modals, forms, pending input) → local `useState`
- **Filter/sort state** → URL params (shareable, survives refresh)
- **Prioritisation result** → `localStorage` + TanStack Query cache (survives reload, no schema change needed)

---

## AI Features

### Agent A — Prioritisation

**Where it lives:** home page, `✦ AI Prioritise` button in the top-right header.

**What it does:** analyses all active tasks and proposes an ordered "what to start with today" list with per-task reasoning and an overall summary. The result persists in `localStorage` and can be applied as a sort order (`✦ AI` pill in the filter row).

**Why it's agentic — two distinct steps:**

**Step 1 — Deterministic pre-scoring (code, not LLM).**
Every active task gets a numeric score from three factors:

| Factor   | Logic                                                                   |
| -------- | ----------------------------------------------------------------------- |
| Priority | `high` → 30 pts, `medium` → 15 pts, `low` → 0 pts                       |
| Status   | `in-progress` → +20 pts, `todo` → 0 pts; `done` tasks excluded entirely |
| Age      | Linear 0–25 pts over the first 7 days, then capped at 25 pts            |

The age cap is a deliberate design decision: without it, a stale low-priority task could indefinitely outrank a fresh high-priority one just by being old. The cap ensures age is a tiebreaker, not a trump card.

Tasks are sorted descending by score and passed to the LLM as structured context.

**Step 2 — LLM reasoning.**
The model receives the pre-scored list and produces:

```json
{
  "rankedTasks": [{ "taskId": "...", "reasoning": "..." }, …],
  "summary": "..."
}
```

Rank is implicit by array position. The LLM explains _why_ each task should be prioritised in human language — which is the part code cannot do.

**Output validation:** two-stage parse — `JSON.parse` in try/catch (catches markdown fences, plain text), then `PrioritisationOutputSchema.safeParse` (catches structurally invalid JSON). Agent throws a typed error at each stage; client never sees raw LLM output.

The scoring logic is covered by Vitest unit tests with fixed `now` values so results are deterministic regardless of when tests run.

---

### Agent B — Decomposition

**Where it lives:** task detail page, inside the subtask list — `✦ Decompose task` button below `+ Add subtask`.

**What it does:** given a task's title and description, either generates a structured subtask list or asks clarifying questions if the description is too vague to decompose reliably. Proposed subtasks are shown inline for review before anything is written to the DB.

**Why it's agentic — the LLM makes a branching decision:**

The system prompt instructs the model to self-assess whether the task description is sufficient. Based on that assessment, it returns one of two discriminated branches:

```
Description clear enough?
        │
   ┌────┴────┐
  YES        NO
   │          │
{ type: "subtasks",    { type: "clarify",
  subtasks: [...]  }     questions: [...] }
```

**Branch 1 — `subtasks`:** the model returns a list of concrete, actionable subtask titles. These are shown in a "Proposed subtasks" block. If the task already has subtasks, a warning appears: _"Saving will replace your N existing subtask(s)."_ The user clicks **Save subtasks** to confirm — only then does the agent delete old subtasks and create new ones. If the user clicks **Discard**, the DB is untouched.

**Branch 2 — `clarify`:** the model returns a list of clarifying questions shown in an amber block. The user answers them in a text field and submits. The answers are appended to the task description in the DB, then the agent re-runs with a stricter prompt that forbids the `clarify` branch — so the second pass always produces subtasks.

**Output validation:** same two-stage parse as Agent A. `DecompositionResultSchema` is a Zod discriminated union — if the LLM returns a structurally wrong shape, the agent throws rather than writing garbage to the DB.

The parsing logic (both branches, non-JSON error, schema mismatch, task-not-found) is covered by Vitest unit tests with a mock LLM client.

---

## Trade-offs and Conscious Decisions

### SQLite

Chosen for real persistence with zero infrastructure setup. A single file, survives restarts, closest to a production-like setup without running Postgres locally.

**Limitations:** single writer (concurrent writes would queue or fail), local file (not suitable for multi-instance deployment), no built-in replication. For a team tool with a real backend this would be replaced with Postgres.

### Separate Express instead of Next.js API routes

An explicit full-stack layer separation: the agent layer, repositories, and LLM client live in a Node process that has no dependency on Next.js internals.

**Cost:** CORS configuration required (`WEB_ORIGIN` env), two processes to start (mitigated by `concurrently`).

**Benefit:** the server can be tested, scaled, and replaced independently. Agents don't import anything from Next.

### TanStack Query instead of Redux/Zustand

Almost all DevLog state is _server state_ — data that lives in the DB and needs to stay in sync with it. TanStack Query manages exactly that: cache, background refetch, loading/error states, and `invalidateQueries` after mutations.

Client-only state (open modals, form values, filter selection) stays in `useState` or URL params — no global store needed.

### Mock LLM by default

`LLM_PROVIDER=mock` out of the box. The mock returns deterministic, schema-valid responses so the full UI and agent flow work without an API key. Switching to real Anthropic requires only setting two env variables.
