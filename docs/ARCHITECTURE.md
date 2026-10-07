# Architecture

`web` (Next.js) and `worker` (standalone process) are separate processes that communicate only through Postgres. Postgres is also the job queue. Agent runs last minutes, so they live in the worker, not in route handlers.

Flow: the UI creates a task -> the worker claims it -> the agent runs against a Playwright session -> each step is written to the DB -> the UI streams new steps over SSE -> the final result is saved.

## Package boundaries

- `browser`: Playwright wrapper, no knowledge of LLMs or the DB.
- `agent`: all OpenAI Agents SDK code. It reports progress through an `onEvent` callback and does not touch the DB.
- `db`: Drizzle client and repositories.
- `shared`: types, constants, Zod-validated env.
- `worker`: wires agent, browser and db together.
- `web`: UI and API routes, reads from db.

Only the owning package imports its library: Playwright in `browser`, the Agents SDK in `agent`, Drizzle in `db`.

## Conventions

- Read env vars once through the Zod loader in `shared`.
- Prompts live in `.md` files, not inline strings.
- Include the task id on every worker log line.
