# DevLog — Detailed Implementation Plan

Each step is described with:
- **What we do** — concrete actions and files.
- **Why** — what problem this solves.
- **Best practice** — how to do it right.
- **Anti-patterns to avoid** — what we consciously don't do.

Steps are sequential. Do not move to the next step until the current one boots and tests (where applicable) are green.

---

## Step 1 — Monorepo Scaffold

**What we do**
- Root `package.json` with npm workspaces: `packages/shared`, `packages/server`, `packages/web`.
- `dev` script via `concurrently` that starts server (:4000) and web (:3000) with one command.
- Base tsconfigs: root `tsconfig.base.json` + one per package extending it.
- `.env.example` at root, `.gitignore` (node_modules, `.env`, `*.sqlite`, `.next`).

**Why**
- `npm install && npm run dev` must start everything without errors. Workspaces give a single install for the whole repo.
- Shared tsconfig eliminates config duplication and settings drift between packages.

**Best practice**
- `packages/shared` must be a separate workspace package (`@devlog/shared`), not a relative `../../` import — makes the contract boundary explicit.
- Pin Node version in `engines` and `.nvmrc` to avoid environment surprises.
- `concurrently` with prefixes (`-n server,web -c blue,green`) so logs from the two processes are readable.

**Anti-patterns to avoid**
- ❌ One big package.json with everything mixed together → impossible to understand layer boundaries.
- ❌ Globally installed dependencies / reliance on local environment → "works on my machine".
- ❌ Committing `.env` or `*.sqlite`.

---

## Step 2 — packages/shared (Types + Zod Schemas)

**What we do**
- Domain types: `Task`, `Subtask`, `TaskStatus`, `Priority`.
- **Zod schemas** for: API request bodies (create/update task, create subtasks), responses, and **structured LLM output** (subtasks from agent B, ranking from agent A).
- Export both types (`z.infer`) and the schemas themselves.

**Why**
- Single source of truth for contracts. Both server and web import the same schema → types don't drift.
- Zod gives compile-time types and runtime validation simultaneously — critical at system boundaries (HTTP input, LLM output that cannot be trusted).

**Best practice**
- Derive TS types **from** Zod schemas (`type Task = z.infer<typeof TaskSchema>`), never duplicate by hand.
- Keep schemas narrow: separate `CreateTaskSchema` (no `id`/`createdAt`) and `TaskSchema` (full) — don't stuff everything into one partial.

**Anti-patterns to avoid**
- ❌ Duplicating types on frontend and backend → inevitable drift.
- ❌ Trusting raw JSON from LLM without validation → crash or garbage in the DB.
- ❌ `any`/`as` casts to bypass types instead of a proper schema.

---

## Step 3 — server/db (SQLite + Repository)

**What we do**
- `better-sqlite3`, DB file at `packages/server/data/devlog.sqlite` (path from env).
- Schema: `tasks` and `subtasks` tables (FK on task, `ON DELETE CASCADE`).
- Migration / `CREATE TABLE IF NOT EXISTS` at server startup.
- Repository (`taskRepository`, `subtaskRepository`): CRUD + list with **status filter and priority/date sorting at SQL level**.

**Why**
- Need persistence between restarts — SQLite gives a real file on disk.
- Repository isolates data access: routes and agents don't write SQL directly.

**Best practice**
- **Parameterised queries** (prepared statements) — always, no exceptions.
- Priority sort via an explicit order (`CASE priority WHEN 'high' THEN 0 ...`), because alphabetical would give high/low/medium in the wrong order.
- Store `createdAt` as ISO-8601 (TEXT) or epoch — consistent, one format.
- Repository returns already-typed objects (validated by Zod schema from shared).

**Anti-patterns to avoid**
- ❌ String-concatenated SQL → SQL injection.
- ❌ Filter/sort in JS after fetching everything → doesn't scale; the spec asks for "convenient" UX.
- ❌ SQL spread across routes and agents → duplication and untestable.

---

## Step 4 — server/routes (REST + Validation)

**What we do**
- Express router:
  - `GET /api/tasks` (query: `status`, `sortBy`, `order`)
  - `POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/:id`
  - `POST /api/tasks/:id/subtasks` (bulk)
  - `POST /api/agents/:agentId/run`
- Validate incoming data with Zod schemas from shared.
- Centralised error-handler middleware: Zod error → 400, not found → 404, other → 500.

**Why**
- Clean REST contract for the frontend to work against.
- Validation at the boundary = DB and agents only receive valid data.

**Best practice**
- Thin routes: parse → call repository/agent → respond. No business logic in the route.
- Consistent error format: `{ error: { message, code } }`.
- Correct HTTP codes (201 on create, 204 on delete).
- CORS only for `WEB_ORIGIN`, not `*`.

**Anti-patterns to avoid**
- ❌ Business logic in controllers → impossible to reuse/test.
- ❌ `try/catch` with `console.log` in every route → duplication; use one error middleware.
- ❌ Returning 200 on error with `success: false` → breaks HTTP semantics.

---

## Step 5 — server/llm (Provider Abstraction)

**What we do**
- `LLMClient` interface: `complete(prompt, opts?: LLMCompleteOptions): Promise<string>`. Options include `maxTokens`, `temperature`, `systemPrompt`.
- `MockClient` — **deterministic** realistic responses (one scenario per agent, including an "ambiguous task" branch for decomposition).
- `AnthropicClient` — real calls via `@anthropic-ai/sdk`; supports `systemPrompt` via the `system` field.
- `createLLMClient()` factory selects implementation based on `LLM_PROVIDER` (`mock` | `anthropic`); model overridable via `LLM_MODEL` env.
- `prompts.ts` — `SYSTEM_PROMPTS` object with ready-to-use system prompts for each agent (prioritisation, decomposition). Agents import these and pass via `opts.systemPrompt`.

**Why**
- Allows development and testing without burning tokens; production uses the real LLM **without changing agent code**.
- Agents depend on the interface, not on a concrete SDK.
- System prompts in a single file make them easy to iterate on without touching agent logic.

**Best practice**
- Dependency inversion: agent receives `LLMClient`, does not import Anthropic directly.
- Mock must be *realistic* (return schema-valid output) so the real parsing path is tested.
- Read the key on the backend only; never expose it to the client.
- Default `LLM_PROVIDER=mock` so everything works out of the box without a key.

**Anti-patterns to avoid**
- ❌ Direct SDK calls from the agent body → can't swap in a mock, can't test.
- ❌ `if (provider === 'mock')` scattered across agents → selection logic belongs in one place (the factory).
- ❌ Key in the frontend or in a commit.

---

## Step 6 — server/agents (Agent Framework)

**What we do**
- `Agent<Input, Output>` contract: `id`, `describe()`, `run(input, ctx)`.
- `AgentContext`: access to repositories, `LLMClient`, logger.
- `AgentResult`: result + **step trace / reasoning**.
- `registry.ts`: map of `id → Agent`.
- Route `POST /api/agents/:agentId/run` fetches the agent from the registry and calls it.

**Why**
- This is the infrastructure that makes agents *extensible*: adding C/D later = one registration.
- The reasoning trace is needed so the UI can show "why the agent decided this" — makes agenticity transparent to the user.

**Best practice**
- Single entry point (`/agents/:id/run`) + registry → open for extension, closed for modification (Open/Closed).
- Each agent is a separate module with its own prompts and parsing.
- Unknown `agentId` → 404 with a list of available agents.

**Anti-patterns to avoid**
- ❌ Separate hardcoded route per agent → duplication, doesn't scale.
- ❌ `switch(agentId)` in the route → must edit the route every time an agent is added.
- ❌ Agent that reaches into HTTP/req/res → layer mixing; an agent must be a pure function over its context.

---

## Step 7 — Agent A: Prioritisation

**What we do**
1. Fetches active tasks from the repository.
2. **Deterministic pre-scoring in code** (`scoring.ts`): `score = priority_score + status_score + age_score`
   - **Priority:** high → 30, medium → 15, low → 0.
   - **Status:** in-progress → +20, todo → 0; done tasks are excluded entirely.
   - **Age:** linear 0–25 pts over the first 7 days, then capped at 25 — prevents ancient tasks from infinitely outranking fresh high-priority ones.
   - Result: sorted `ScoredTask[]` descending by score; passed as context to the LLM prompt.
3. LLM step: based on scores, produces an ordered list "what to start with" + reasoning per item. Output schema: `{ rankedTasks: [{ taskId, reasoning }], summary }` — rank is implicit by array position.
4. Returns `AgentResult<PrioritisationOutput>` with the ranked list and a step trace.
- **Tests (Vitest)** for step 2 — deterministic.

**Why**
- The agent must consider priority + age + status, *not just rank order* → that's the "agentic" part (multiple steps + decision).
- Pre-scoring in code makes the logic transparent, testable, and cheaper (LLM doesn't do maths).

**Best practice**
- Separate **deterministic** (scoring — code) from **linguistic** (explanations/nuance — LLM). Test the former; let LLM handle the latter.
- Scoring is a pure function `(tasks, now) => scored[]` → easy to cover with tests for combinations of age/priority/status.

**Anti-patterns to avoid**
- ❌ One prompt "sort the tasks" → not an agent, no explanation, not deterministic.
- ❌ Priority logic only in the prompt → untestable, non-deterministic.
- ❌ Depending on the current time without injecting `now` → untestable (tests must pass a fixed `now`).

---

## Step 8 — Agent B: Decomposition

**What we do**
1. Input: task (title + description).
2. **Clarity self-assessment step:** if description is insufficient → return `needsClarification` + specific questions.
3. If clear → generate subtasks, **validated by Zod schema** from shared.
4. Optionally create subtasks in the DB (via repository) — user confirms in the UI.
- **Tests** for output parsing and the clarification branch.

**Why**
- If the task is ambiguous, the agent must clarify before generating. This is the second decision step → true agenticity.
- Validated output = no LLM garbage ends up in the DB.

**Best practice**
- Two explicit result branches: `clarify` (questions) and `subtasks` (result) — type-safe via discriminated union.
- DB creation is a separate step requiring confirmation, not automatic (agent proposes, human decides).
- Always parse LLM output via Zod `safeParse` with error handling.

**Anti-patterns to avoid**
- ❌ Generate subtasks for any input, even an empty description → garbage output.
- ❌ Auto-write to DB without confirmation → agent acts behind the user's back.
- ❌ `JSON.parse` without validation → crash on invalid LLM output.

---

## Step 9 — packages/web (Scaffolded by Agent)

**What we do**
- Next.js App Router. UI scaffolded by a coding agent; manual edits logged in AGENT_LOG.
- Components: layout, task list (filter by status, sort by priority/date), create/edit form, task card with subtasks, agent panel with reasoning trace.
- Tailwind for styles.

**Why**
- This is the product the user sees — good UI/UX matters on its own.
- The reasoning panel makes agenticity *visible* to the user.

**Best practice**
- Presentational components separate from data-fetching (TanStack Query hooks).
- Semantic accessible HTML (labels, buttons, not div-buttons).
- Filter/sort state in the URL (shareable, survives refresh).
- Log in AGENT_LOG *as you go*: what the agent generated, what was edited manually and why.

**Anti-patterns to avoid**
- ❌ `fetch` + `useState` + `useEffect` by hand in every component → boilerplate (that's what Step 10 / TanStack Query is for).
- ❌ Global store (Redux) for trivial client state → over-engineering.
- ❌ Query logic inside JSX components → mixed responsibilities.

---

## Step 10 — web ↔ API Integration (TanStack Query)

**What we do**
- `QueryClientProvider` at the root.
- Hooks: `useTasks(filters)`, `useTask(id)`, mutations `useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useRunAgent`.
- After mutations / agent runs — `invalidateQueries` on relevant keys.
- Base API client (one `fetch` wrapper with base URL from `NEXT_PUBLIC_API_URL` and error handling).

**Why**
- Almost all DevLog state is *server state*. TanStack Query manages exactly that: cache, invalidation, loading/error out of the box.
- Example: agent B creates subtasks → invalidate `['task', id]` → the card re-renders automatically.

**Best practice**
- Stable cache key structure (`['tasks', filters]`, `['task', id]`).
- Invalidation instead of manually merging data into the cache.
- Client state (modals, forms) — local `useState`/URL, **not** in QueryClient.
- One API client wrapper, not bare `fetch` in every hook.

**Anti-patterns to avoid**
- ❌ Duplicating server data in a separate store and syncing manually.
- ❌ Manual `loading`/`error` state for every request.
- ❌ Hardcoded `localhost:4000` in components instead of env.

---

## Step 11 — Documentation

> Details in [PLAN.md](./PLAN.md), section 11. Principle only here.

**What we do**
- README (setup + architecture + trade-offs + agent list), AGENT_LOG.md, `.env.example`.

**Why**
- README and AGENT_LOG make project decisions transparent — why things were done this way and what was consciously skipped. Honesty matters more than polish.

**Best practice**
- Keep AGENT_LOG *as you go*, not at the end.
- In the README, explicitly state **what was consciously NOT done and why** (2 agents implemented, framework left for the rest; no auth — single user/team; no deployment — local only).
- `.env.example` — all variables without values.

**Anti-patterns to avoid**
- ❌ Documenting from memory at the end → decisions and manual edits get forgotten.
- ❌ A polished log that hides where the agent was wrong.
- ❌ Real keys in `.env.example` or in the repo.

---

## Order of Work

Steps are **sequential and dependent**: 1→2→3 (foundation), 4 (API), 5→6 (LLM + framework), 7→8 (agents), 9→10 (UI + integration), 11 (docs, but AGENT_LOG starts at step 9). Do not proceed until the current step boots and tests (where applicable) are green.
