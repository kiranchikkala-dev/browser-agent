Guidance for AI coding agents (and humans) working in this repo. Read this before changing code.

## 1. What this project is

An autonomous browser agent. The user submits a natural-language task (e.g. "Find the three cheapest laptops under ₹80,000 with 16GB RAM"). The agent plans, navigates websites with Playwright, interacts with pages, extracts data, decides, and returns a structured final result. Progress streams live to a Next.js UI.

**Scope: MVP.** Prefer the simplest thing that works. Do not add features that are not listed here.

## 2. Tech stack

- Language: TypeScript (strict)
- Runtime / package manager: Node.js with npm workspaces
- Browser automation: Playwright (library usage, not the test runner)
- Agent framework: OpenAI Agents SDK for TypeScript (`@openai/agents`)
- Frontend + API: Next.js (App Router)
- Database: PostgreSQL 16 in Docker
- ORM: Drizzle ORM
- Validation: Zod (tool params, agent output, env)

The worker runs under Node.js, as does the rest of the application.

## 3. Architecture

```
Next.js (UI + API routes)
   │  POST /api/tasks        -> create Task (QUEUED)
   │  GET  /api/tasks/:id/stream (SSE) <- reads Step rows
   ▼
PostgreSQL (Drizzle ORM)  <───────┐
   ▲                              │ writes steps / findings / result
   │ claim job (SKIP LOCKED)      │
Worker (standalone Node.js process) ─────────────┘
   ├─ Agent (OpenAI Agents SDK, streaming run)
   ├─ BrowserSession (Playwright)
   └─ Tools (navigate, observe, click, type_text, extract, ...)
```

- `web` and `worker` are **separate processes**. They communicate only through Postgres.
- Postgres is also the job queue. No Redis.
- Agent runs are long (minutes). Never run them inside a Next.js route handler.

## 4. Repo layout

```
browser-agent/
├─ AGENTS.md
├─ package.json                # workspaces: apps/*, packages/*
├─ bunfig.toml
├─ tsconfig.base.json
├─ docker-compose.yml          # postgres only
├─ .env.example
├─ apps/
│  ├─ web/                     # Next.js
│  │  ├─ app/
│  │  │  ├─ page.tsx                       # task form + recent tasks
│  │  │  ├─ tasks/[id]/page.tsx            # live timeline + result
│  │  │  └─ api/tasks/
│  │  │     ├─ route.ts                    # POST create, GET list
│  │  │     └─ [id]/
│  │  │        ├─ route.ts                 # GET details, cancel
│  │  │        ├─ stream/route.ts          # SSE
│  │  │        └─ screenshots/[stepId]/route.ts
│  │  ├─ components/                       # TaskForm, StepTimeline, StepCard, ResultTable, StatusBadge, ScreenshotViewer
│  │  ├─ hooks/useTaskStream.ts            # EventSource wrapper
│  │  └─ lib/                              # api.ts, sse.ts
│  └─ worker/
│     └─ src/
│        ├─ main.ts            # poll loop, SIGTERM handling
│        ├─ queue.ts           # claim next QUEUED task
│        ├─ runTask.ts         # launch browser -> run agent -> save result -> cleanup
│        ├─ eventSink.ts       # AgentEvent -> Step row (+ screenshot)
│        ├─ cancellation.ts    # abort when Task.status === CANCELLED
│        └─ config.ts
├─ packages/
│  ├─ agent/                   # ALL OpenAI Agents SDK code
│  │  └─ src/
│  │     ├─ index.ts           # public API: runBrowserTask()
│  │     ├─ runAgent.ts        # run() with stream, maxTurns, context
│  │     ├─ agent.ts           # the single Agent definition
│  │     ├─ context.ts         # AgentContext type
│  │     ├─ prompts/           # system.md, extract.md
│  │     ├─ tools/             # one file per tool + index.ts
│  │     ├─ schemas/           # finalResult.ts, finding.ts, events.ts
│  │     ├─ guardrails/        # inputGuardrail.ts, domainPolicy.ts
│  │     ├─ events/mapStreamEvent.ts
│  │     ├─ safety/            # loopDetector.ts, stepBudget.ts
│  │     └─ llm/client.ts      # OpenAI client for non-agent calls (extract)
│  ├─ browser/                 # Playwright layer, no LLM knowledge
│  │  └─ src/
│  │     ├─ BrowserSession.ts
│  │     ├─ snapshot/          # buildSnapshot, elementRegistry, formatSnapshot, pageText
│  │     ├─ interruptions/     # cookieBanners, dialogs
│  │     ├─ waiting.ts
│  │     └─ screenshots.ts
│  ├─ db/
│  │  ├─ src/schema.ts             # Drizzle table definitions
│  │  ├─ src/index.ts              # Drizzle database client
│  │  └─ drizzle/                  # Generated migrations
│  └─ shared/                  # types, constants, env (Zod)
├─ data/screenshots/{taskId}/{stepIndex}.png   # gitignored
└─ scripts/cli.ts, seed.ts
```

## 5. Dependency rules (enforce these)

```
web ──────► db, shared
worker ───► agent, browser, db, shared
agent ────► browser (types only), shared
browser ──► shared
db ───────► shared
```

- `browser` must never import `agent` or `db`. It is a pure Playwright wrapper.
- `agent` must never import `db`. It reports progress via `ctx.onEvent(...)`; the worker's `eventSink.ts` persists.
- Only `packages/agent` imports `@openai/agents`.
- Only `packages/browser` imports `playwright`.
- Only the database module imports `drizzle-orm`.

## 6. Agent design

**One agent, many tools.** There are no separate planner/verifier agents and no handoffs.

- **Planning** is the `update_plan` tool. The plan is stored in run context and persisted as a PLAN step.
- **Extraction** is the `extract` tool: a plain nested LLM call (not an agent) that turns page text + instruction into JSON.
- **Finishing** is enforced by the agent's `outputType` (Zod `FinalResult`). The run ends when the model returns a valid final output.
- **Result data** must come from `record_finding` calls plus verified page content. Never invent data.

### Agent context (`AgentContext`)

Passed via the SDK run context and read by tools through `RunContext`:

- `taskId`
- `session` (BrowserSession)
- `plan: string[]`
- `findings: Finding[]`
- `stepCount: number`
- `allowedDomains?: string[]`
- `onEvent: (e: AgentEvent) => void`

Tools stay stateless; all state lives in the context.

### Tools

| Tool                                  | Purpose                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| `update_plan(steps)`                  | Write/revise the plan. Called first and whenever the plan changes. |
| `navigate(url)`                       | Open a URL (checked against domain policy). Returns a snapshot.    |
| `observe()`                           | Return current page snapshot.                                      |
| `click(elementId)`                    | Click an element by number from the latest snapshot.               |
| `type_text(elementId, text, submit?)` | Fill an input, optionally press Enter.                             |
| `select(elementId, value)`            | Choose a dropdown/filter option.                                   |
| `scroll(direction)`                   | Scroll to load more content.                                       |
| `go_back()`                           | Browser back.                                                      |
| `extract(instruction)`                | Structured extraction from the current page via nested LLM call.   |
| `record_finding(item)`                | Save a candidate result with its source URL.                       |

Rules for tools:

- One file per tool in `packages/agent/src/tools/`, exported through `tools/index.ts`.
- Parameters defined with Zod. Keep descriptions short and imperative; they are prompt text.
- Return compact strings. Tool output is the biggest context cost.
- Errors are returned as readable strings the model can act on, not thrown (except fatal session errors).

### Observation strategy

Never send raw HTML to the model. `buildSnapshot` produces:

- page URL and title
- a numbered list of visible interactive elements, e.g. `[12] button "Filters"`, `[13] input "Search"`
- trimmed main-content text
- hard caps on element count and text length

The model refers to elements **only by number**. `elementRegistry` maps number -> Playwright locator and is **invalidated on every navigation or major DOM change**, forcing a fresh `observe`. Screenshots are saved as artifacts for the UI; vision is an optional fallback, not the default.

### SDK usage

- Run with `stream: true` and iterate events; map each to an `AgentEvent` in `events/mapStreamEvent.ts`.
- Set `maxTurns` (default 40) as the hard step budget. On exceeding it, catch the error and return a best-effort result from `ctx.findings`.
- Prune old snapshots from history (SDK input-filter hook, or truncate tool outputs) so only the latest snapshot stays in full.
- Built-in SDK tracing stays on; tag traces with `taskId`. The `Step` table is the source of truth for the UI.
- Risky actions (checkout, login, form submit) must use tool approval and pause for a human decision. Not required for the first cut.
- SDK signatures change between versions. Check current `@openai/agents` docs before relying on event names or options.

### System prompt rules (`prompts/system.md`)

1. Start by calling `update_plan` with steps and the exact constraints.
2. Call `observe` after anything that may have changed the page.
3. Refer to elements only by numbers from the latest observation.
4. Use `extract` for lists of items instead of reading manually.
5. Save every candidate with `record_finding`, including the source URL.
6. If an action fails twice, try a different approach and update the plan.
7. Stop when constraints are satisfied. Never invent data.

## 7. Data model (Drizzle)

- **Task**: `id, prompt, status (QUEUED|RUNNING|SUCCEEDED|FAILED|CANCELLED), plan JSONB?, result JSONB?, error?, maxSteps, createdAt, startedAt?, finishedAt?`
- **Step**: `id, taskId, index, type (PLAN|TOOL_CALL|MESSAGE|ERROR), toolName?, args JSONB?, outputSummary?, screenshotPath?, durationMs?, createdAt` with a unique constraint on `(taskId, index)`
- **Finding**: `id, taskId, data JSONB, sourceUrl, createdAt`

Conventions:

- Real columns for anything filtered/sorted; `JSONB` for flexible blobs. Validate JSONB values with Zod on read and write.
- `Step.index` comes from `ctx.stepCount`.
- Job claim uses raw SQL with `FOR UPDATE SKIP LOCKED` in `worker/queue.ts`.
- Export one Drizzle database client from the database module for application and worker access.
- Use `npm run db:generate` to generate migrations, then `npm run db:migrate` to apply them. Use `npm run db:push` for quick local schema syncing without a migration file.

## 8. End-to-end flow

1. `TaskForm` -> `POST /api/tasks` -> `taskRepo.create()` (QUEUED).
2. Worker loop claims the task (-> RUNNING).
3. `runTask.ts` launches `BrowserSession`, builds `AgentContext`, calls `runBrowserTask()`.
4. Agent loops: `update_plan` -> tools -> ... Each tool call emits an `AgentEvent`; `eventSink` writes a `Step` (and screenshot).
5. `stream/route.ts` polls `stepRepo.listAfter(cursor)` and pushes SSE; `useTaskStream` updates the timeline.
6. Agent returns `FinalResult` (validated by `outputType`). Worker saves it, sets SUCCEEDED, closes the browser.
7. On error/timeout/cancel: set FAILED/CANCELLED, save partial findings, always close the browser in `finally`.

## 9. Safety and failure handling

- **Domain policy**: `navigate` checks allowlist/blocklist before opening any URL.
- **Loop detection**: same action + same URL repeated (3x) -> inject a warning into the next tool output; then fail gracefully.
- **Stale element IDs**: any action on an invalid ID returns "Page changed, call observe."
- **Popups/cookie banners**: handled in `browser/interruptions`, not by the model.
- **Captcha / login walls**: record a step marked "needs human" and stop; do not attempt to bypass.
- **Hallucination control**: every finding needs a `sourceUrl`; final items must come from recorded findings.
- **Budgets**: `maxTurns`, wall-clock timeout, per-task browser cleanup.

## 10. Conventions

- TypeScript strict; no `any` without a comment explaining why.
- Env vars are parsed once via Zod in `packages/shared/src/env.ts`. Never read `process.env` elsewhere.
- Prompts live in `.md` files, not inline strings.
- Keep tool outputs and snapshots small. When in doubt, truncate.
- Log with a `taskId` on every line in the worker.
- No secrets in the repo. Use `.env`; keep `.env.example` current.
- Keep functions small and each package independently testable.

## 11. Commands

```
docker compose up -d                          # start Postgres
npm install
npm run db:generate                           # generate a Drizzle migration
npm run db:migrate                             # apply migrations
npm run db:studio                              # inspect DB
npm run cli -- "<task>"                       # run agent from terminal (no DB/UI)
npm --workspace apps/worker run dev           # start worker
npm --workspace apps/web run dev              # start web
```

## 12. Build order (status checklist)

- [ ] `packages/browser`: BrowserSession + snapshot, verified by hand with no LLM
- [ ] `packages/agent`: tools + single agent, proven via `scripts/cli.ts`
- [ ] `schemas/finalResult` + `update_plan` + structured output
- [ ] `packages/db`: schema, migration, repositories
- [ ] `apps/worker`: queue claim, runTask, eventSink
- [ ] `apps/web`: task form, task page, SSE timeline, result table
- [ ] Hardening: loop detector, interruptions, screenshots, cancellation, domain policy
- [ ] Later: approvals for risky actions, optional verification step

## 13. Do / Don't for coding agents

**Do**

- Respect the dependency rules in section 5.
- Update this file when you change architecture, tools, or the data model.
- Test browser code without the LLM first; test the agent via the CLI before wiring the DB.

**Don't**

- Don't add extra agents, handoffs, Redis, or new services without being asked.
- Don't import Playwright, Drizzle ORM, or the Agents SDK outside their owning package.
- Don't send raw HTML or full-page dumps to the model.
- Don't run agent loops inside Next.js route handlers.
- Don't fabricate results or skip `sourceUrl` on findings.
