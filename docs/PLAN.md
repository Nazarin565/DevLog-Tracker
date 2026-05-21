# DevLog — Project Plan

## Context

DevLog is a web-based task tracker for an engineering team with a built-in **agentic AI layer**. The tracker itself is simple (CRUD for tasks), but the value lies in agents that eliminate routine work: breaking tasks into subtasks, prioritising work, and generating status updates.

The key measure of quality is how **agentic** the in-product AI features are (multi-step reasoning and decisions, not a single prompt), alongside well-structured code and a correct full-stack implementation.

We are building the **foundation + 2 agents**, but the architecture is designed so additional agents can be added without rework.

### Fixed Decisions

- **Storage:** SQLite — real persistence, proper filtering/sorting, closest to a production-like setup.
- **Backend:** Separate **Express** server — explicit full-stack layer separation, clean REST API, independent of Next. Started conveniently with one command (`concurrently`).
- **LLM:** **Mock during development** (no token burn); real **Anthropic** key wired via env for production. Switching mock ↔ real requires no code changes in agents.
- **Agents:** A (prioritisation) + B (decomposition). Infrastructure must allow adding C (status update) and D (custom) later.
- **Language:** TypeScript on both frontend and backend. Targeted tests for critical logic (prioritisation scoring, agent output parsing).

---

## Architecture

Monorepo with two packages and shared types.

```
DevLog tracker/
├─ package.json            # root: workspaces + "dev" via concurrently
├─ .env.example            # all variables without values
├─ AGENT_LOG.md            # honest log of work done with the coding agent
├─ README.md               # setup + architecture + trade-offs
├─ packages/
│  ├─ shared/              # shared TS types and Zod schemas (Task, Subtask, agent I/O)
│  ├─ server/              # Express + SQLite + agent layer
│  └─ web/                 # Next.js (App Router) UI
```

### packages/shared

Single source of truth for contracts:

- Domain types: `Task`, `Subtask`, `TaskStatus = 'todo' | 'in-progress' | 'done'`, `Priority = 'low' | 'medium' | 'high'`.
- **Zod schemas** for validating API request/response bodies and for parsing structured LLM output.
- Imported by both server and web → no type drift between layers.

### packages/server (Express + SQLite)

Layered structure so agents and HTTP are decoupled:

- `src/db/` — `better-sqlite3`, schema, migration on startup, task/subtask repository (CRUD + filters/sorting at SQL level).
- `src/routes/` — REST:
  - `GET /api/tasks` (query: `status`, `sortBy=priority|createdAt`, `order`)
  - `POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/:id`
  - `POST /api/tasks/:id/subtasks` (bulk create from decomposition)
  - `POST /api/agents/:agentId/run` — **single entry point for all agents**
- `src/agents/` — the core of the project (see below).
- `src/llm/` — provider abstraction: `LLMClient` interface + `AnthropicClient` + `MockClient` + `prompts.ts`. Selected via `LLM_PROVIDER` env (`mock` | `anthropic`); model overridable via `LLM_MODEL`. Mock returns deterministic, schema-valid responses → UI and agent steps work without a key.
- CORS allows the web origin only (env `WEB_ORIGIN`).

### packages/web (Next.js App Router)

- Scaffolded by a coding agent (as required; manual edits expected and documented in AGENT_LOG).
- Pages/components: task list (filter by status, sort by priority/date), create/edit form, task card with subtasks, agent panel.
- State: TanStack Query (server state) — no unnecessary global store.
- Styles: Tailwind CSS — fast scaffolding, no design system.
- Communicates with Express via `NEXT_PUBLIC_API_URL`.

---

## Agent Layer (the core)

To make agents **truly agentic** (multi-step reasoning and decisions, not a single prompt) and **easily extensible**, we introduce a shared framework:

### Agent Contract

```ts
interface Agent<Input, Output> {
  id: string;                 // 'prioritize' | 'decompose' | ...
  describe(): AgentMeta;      // name, description, input schema — for UI
  run(input: Input, ctx: AgentContext): Promise<AgentResult<Output>>;
}
```

- `AgentContext` gives the agent access to the task repository, `LLMClient`, and a logger → the agent pulls its own context and decides the next step.
- `AgentResult` returns not just the result but also a **step trace / reasoning** → shown in the UI as "why the agent decided this" (makes agenticity visible to the user).
- Agent registry (`registry.ts`): adding an agent = one registration, no route changes. This is the infrastructure for future C/D agents.

### Agent A — Prioritisation (multi-step, not a single prompt)

1. Fetches all active tasks from the DB.
2. **Deterministic pre-scoring in code:** factors are priority, age (`createdAt`), status (in-progress > todo), staleness. Makes the logic transparent and testable.
3. LLM step: based on scores and context, produces an ordered list `{ rankedTasks: [{ taskId, reasoning }], summary }` — rank is implicit by array position.
4. Returns `AgentResult<PrioritisationOutput>` with reasoning trace. Tests cover step 2 deterministically.

### Agent B — Decomposition (with clarification on ambiguity)

1. Receives a task (title + description).
2. **LLM self-assessment:** the LLM decides whether the description is sufficient — returns `{ type: 'clarify', questions: [...] }` if not, or `{ type: 'subtasks', subtasks: [...] }` if clear. No heuristic pre-filter in code.
3. Output validated by `DecompositionResultSchema` (discriminated union) before use.
4. Optionally creates subtasks in the DB immediately (`POST /subtasks`) — user confirms in the UI.

### Future stubs (not implemented now, but the framework is ready)

- C — Slack-style status update; D — custom idea (e.g. "stale task detector" or "backlog review agent"). Registry + contract allow adding them later with minimal changes.

---

## Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind + TanStack Query.
- **Backend:** Node.js + Express + TypeScript, REST.
- **DB:** SQLite via `better-sqlite3`.
- **Validation:** Zod (shared schemas).
- **LLM:** Anthropic SDK (`@anthropic-ai/sdk`), with a mock provider for development.
- **Dev:** `concurrently`, `tsx` (dev runtime for server), npm workspaces.
- **Tests:** Vitest (targeted: prioritisation pre-scoring, agent output parsing).

---

## Implementation Steps

1. **Monorepo scaffold:** workspaces, root `package.json` with `dev` (concurrently), `.env.example`, tsconfigs.
2. **shared:** domain types + Zod schemas.
3. **server/db:** SQLite, schema, migration on startup, repository (CRUD + filter/sort in SQL).
4. **server/routes:** REST for tasks and subtasks + error handling/validation via Zod.
5. **server/llm:** `LLMClient` interface, `MockClient` (deterministic), `AnthropicClient`, factory by env.
6. **server/agents:** `Agent` contract, `AgentContext`, registry, `/api/agents/:id/run` route.
7. **Agent A** (prioritisation) + tests for pre-scoring.
8. **Agent B** (decomposition) + tests for parsing/clarification branch.
9. **web (scaffolded by agent):** layout, task list + filters + sort, CRUD forms, task card with subtasks, agent panel with reasoning trace.
10. **web ↔ API integration**, manual UX polish.
11. **Documentation** — 3 artefacts:

    **11.1. README.md** — Must include:
    - **Setup instructions:** prerequisites (Node version), `npm install`, `npm run dev`, which ports come up (web :3000, API :4000), how to switch LLM from mock to real (`LLM_PROVIDER`, where to get a key).
    - **Architecture overview:** monorepo (shared/server/web), data flow web → REST → SQLite, where the agent layer lives.
    - **Trade-offs (conscious decisions):**
      - why **SQLite** (and its limits: single writer, local file, not for multi-instance);
      - why **separate Express** instead of Next API routes (explicit layer separation; cost — CORS + two processes);
      - why **TanStack Query** instead of Redux/Zustand (managing *server* state, cache/invalidation out of the box; client state stays in `useState`/URL);
      - why **mock LLM** in development (no token burn; real key wired via env);
      - **what was consciously NOT built and why:** 2 agents implemented (A+B), framework left for the rest; no auth (single user/team); no deployment (local only).
    - **List of AI features:** which agents exist, what each does, why it is *agentic* (multi-step / decision, not a single prompt).

    **11.2. AGENT_LOG.md** (repo root) — log of work done with the coding agent:
    - which coding agents/tools were used and on which tasks;
    - **what the agent scaffolded in the UI** (components, layout, styling);
    - where the agent helped and where **manual intervention / rework was needed and why**;
    - log kept *as we go*, not written at the end.

    **11.3. .env.example** (root) — all variables **without real values**: `LLM_PROVIDER`, `ANTHROPIC_API_KEY`, `PORT`/`API_PORT`, `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL`, SQLite file path.

    > Completeness check: README ✓, AGENT_LOG.md ✓, .env.example ✓, `npm install && npm run dev` starts without errors ✓.

---

## Verification (end-to-end)

- `npm install && npm run dev` at root → Express and Next start without errors.
- **CRUD:** create/edit/delete a task in the UI → verify persistence after server restart (SQLite file).
- **List:** filter by status and sort by priority/date work (verify sort is done at SQL level).
- **Agent A:** run on a mix of tasks with different ages/priorities/statuses → order is logical, explanations present; unit test for pre-scoring passes.
- **Agent B:** (a) clear task → valid subtasks, optional DB creation; (b) ambiguous task → agent asks clarifying questions instead of generating junk.
- **Mock ↔ real:** with `LLM_PROVIDER=mock` everything works without a key; with `LLM_PROVIDER=anthropic` + key → real calls.
- `vitest` — all tests green.
