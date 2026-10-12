# Browser Agent

Browser Agent is an autonomous web research assistant. You describe a task in plain English, and one AI agent uses a real Playwright browser to search the web, inspect pages, interact with controls, collect verified findings, and return a structured answer.

The project is built as an MVP to make browser automation understandable and observable. Instead of hiding the work behind a loading spinner, the web app shows the plan, browser actions, extracted information, screenshots, and final result as the task runs.

> **In one sentence:** Browser Agent turns a natural-language request into a live, step-by-step browser workflow that produces evidence-backed results.

## Why this project exists

Most browser automation demos show only the final answer. That makes it difficult to understand what the agent did, whether it used the right sources, or why it failed.

Browser Agent is designed around a different idea: every task should be inspectable.

- The agent explains its plan.
- Each browser action becomes a visible timeline step.
- Findings keep their source URL.
- The final response is validated against a schema.
- Timeouts, cancellation, blocked pages, and worker shutdowns are handled explicitly.

## What the user experience looks like

1. The user opens the Next.js web app.
2. They enter a request such as:

   ```text
   Find three laptops under ₹80,000 with 16 GB RAM and include the product links.
   ```

3. The web app creates a task with status `QUEUED`.
4. The worker claims the task and changes its status to `RUNNING`.
5. The agent opens a browser, creates a plan, searches and navigates through pages, and uses browser tools to interact with the page.
6. The UI receives new steps over Server-Sent Events and displays them live.
7. The agent records verified candidates and their source URLs.
8. The worker saves the validated final result, closes the browser, and marks the task `SUCCEEDED`.
9. If something goes wrong, the task is marked `FAILED` or `CANCELLED`, and any useful partial findings are preserved.

## How the flow works, simply

```text
User request
     │
     ▼
Next.js UI ── POST /api/tasks ──► PostgreSQL
     ▲                               │
     │                               │ worker claims QUEUED task
     │                               ▼
     │                         Worker process
     │                               │
     │                               ▼
     │                     OpenAI Agents SDK agent
     │                               │
     │                               ▼
     │                         Playwright browser
     │                               │
     │                    steps, findings, screenshots
     │                               │
     └──── live SSE stream ◄────────┘
```

There are two important design choices behind this flow:

- **The web app and worker are separate processes.** Browser runs can take minutes, so they do not run inside a Next.js request handler.
- **PostgreSQL is also the job queue.** The worker atomically claims the oldest queued task using `FOR UPDATE SKIP LOCKED`. This keeps the MVP small and avoids adding Redis.

## Architecture

The repository is an npm workspaces monorepo with a Next.js application, a standalone worker, and shared packages.

### Main components

| Component | Responsibility |
| --- | --- |
| `src/` | Next.js UI and API routes for creating, viewing, streaming, and cancelling tasks |
| `worker/` | Polls for queued tasks, runs the agent, persists events, handles cancellation and cleanup |
| `packages/agent/` | The OpenAI Agents SDK agent, prompts, tools, output schemas, guardrails, and run logic |
| `packages/browser/` | Playwright browser session, page snapshots, screenshots, waiting, and browser interruptions |
| `packages/db/` | Drizzle database client, schema, migrations, and repositories |
| `packages/shared/` | Shared types, constants, and environment validation |
| `drizzle/` | Generated PostgreSQL migrations |
| `docs/` | Architecture and data-model notes |

### Request lifecycle

#### 1. A task is created

The task form sends a request to `POST /api/tasks`. The API validates the prompt, creates a database row, and returns the task ID. New tasks start in the `QUEUED` state.

#### 2. The worker claims the task

The worker polls PostgreSQL. When it finds work, it claims one queued task atomically and changes it to `RUNNING`. The MVP processes one task at a time.

#### 3. The agent controls a browser

The worker launches a `BrowserSession`, builds an `AgentContext`, and starts the single Browser Agent through the OpenAI Agents SDK.

The agent has tools for:

- creating or updating a plan;
- navigating to a URL;
- observing the current page;
- clicking numbered page elements;
- entering text;
- selecting options;
- scrolling and going back;
- extracting structured information from page text;
- recording a finding with its source URL.

#### 4. Pages are reduced to useful observations

The browser layer does not send raw HTML to the model. It creates a compact snapshot containing the page URL, title, visible interactive elements, and trimmed main-content text. Interactive elements receive temporary numbers such as `[12] button "Filters"` or `[13] input "Search"`.

The agent can act only on numbers from the latest snapshot. After navigation or a meaningful page change, those numbers are invalidated and the agent must observe again. This reduces stale-element errors and keeps the model’s context manageable.

#### 5. Progress is persisted and streamed

The agent reports events through `onEvent`. The worker’s event sink converts those events into ordered `Step` rows and stores screenshots when available.

The task page opens an SSE connection to `/api/tasks/stream`. The API reads new steps from PostgreSQL and streams them to the browser, so the user sees progress without refreshing the page.

#### 6. Findings become the final answer

The agent records candidates through `record_finding`. Each finding contains data and a required source URL. The final result must match the `FinalResult` Zod schema before the worker saves it to the task.

This gives the application a simple evidence rule: results should come from pages visited during the run and recorded findings, not from an unsupported answer generated from memory.

#### 7. Cleanup is always attempted

The worker handles normal completion, errors, timeouts, cancellation, and process shutdown. It flushes pending events, preserves partial findings when possible, updates the task status, stops cancellation monitoring, and closes the Playwright browser in `finally`.

## Safety and failure handling

The project treats browser automation as a controlled workflow rather than an unlimited agent loop.

- **Step budget:** every task has a maximum number of agent turns; the default is 40.
- **Task timeout:** the worker aborts runs that exceed the configured wall-clock limit.
- **Cancellation:** queued and running tasks can be cancelled from the task page.
- **Domain checks:** navigation is checked by the agent’s URL policy before a page is opened.
- **Loop detection:** repeated actions on the same page can trigger a warning and graceful failure.
- **Stale element protection:** actions against old element numbers ask the agent to observe again.
- **Cookie and dialog handling:** common browser interruptions are handled in the Playwright layer.
- **Captcha and login walls:** the agent does not attempt to bypass them; the task should stop and explain the limitation.
- **Evidence tracking:** findings require source URLs, and the final output is schema-validated.

This is still an MVP. It should not be treated as a production system for high-stakes decisions, unrestricted account access, or actions that have irreversible side effects.

## Tech stack

- TypeScript with strict type checking
- Next.js 16 and React 19
- OpenAI Agents SDK for TypeScript
- Playwright for browser automation
- PostgreSQL 18 in Docker
- Drizzle ORM and generated migrations
- Zod for validation
- npm workspaces for package management

## Getting started

### Prerequisites

- Node.js with npm
- Docker Desktop or a Docker-compatible runtime
- An OpenAI API key

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

The included Docker Compose file starts PostgreSQL with these local development credentials:

```text
postgresql://myuser:mypassword@localhost:5432/browser_agent
```

### 3. Configure environment variables

Create `.env` from `.env.example` and set the database connection and OpenAI key. For the included Docker Compose service, the database URL should look like this:

```dotenv
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/browser_agent"
OPENAI_API_KEY="your-api-key"
HEADLESS=false
```

Keep `.env` private. It is ignored by Git and should never be committed.

### 4. Apply the database migrations

```bash
npm run db:migrate
```

### 5. Start the web app

In one terminal:

```bash
npm run dev
```

Open the local URL printed by Next.js, usually `http://localhost:3000`.

### 6. Start the worker

In a second terminal:

```bash
npm run worker
```

The web app creates tasks, but the worker performs them. Both processes need access to the same `.env` file and PostgreSQL database.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install all workspace dependencies |
| `docker compose up -d` | Start local PostgreSQL |
| `npm run dev` | Start the Next.js development server |
| `npm run worker` | Start the task worker |
| `npm --workspace @app/worker run dev` | Start the worker with file watching |
| `npm run db:generate` | Generate a Drizzle migration from schema changes |
| `npm run db:migrate` | Apply migrations to PostgreSQL |
| `npm run db:push` | Push the schema directly for quick local development |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run test:agent` | Run the current agent and browser tests |
| `npm run browser:smoke` | Run the browser smoke script |
| `npm run build` | Build the Next.js application |
| `npm run lint` | Run ESLint |

## Project layout

```text
browser-agent/
├── src/
│   ├── app/                         # Next.js pages and API routes
│   │   ├── (main)/                  # Task form and live task page
│   │   └── api/tasks/               # Create, read, stream, and cancel APIs
│   ├── components/                  # UI components
│   ├── hooks/                       # Client-side hooks
│   └── lib/                         # API clients and shared UI types
├── worker/
│   └── src/
│       ├── main.ts                  # Polling loop and graceful shutdown
│       ├── queue.ts                 # PostgreSQL task claiming and recovery
│       ├── runTask.ts               # Browser, agent, persistence, cleanup
│       ├── eventSink.ts             # Agent events -> database steps
│       └── cancellation.ts          # Cancellation watcher
├── packages/
│   ├── agent/                       # Agent, tools, prompts, schemas, safety
│   ├── browser/                     # Playwright abstraction and snapshots
│   ├── db/                          # Drizzle client and repositories
│   └── shared/                      # Shared package code
├── drizzle/                         # Generated database migrations
├── docs/                            # Architecture and data documentation
├── docker-compose.yml               # Local PostgreSQL service
└── package.json                     # Workspace scripts and dependencies
```

## Data model

The application currently stores three core concepts:

- **Task:** the user prompt, lifecycle status, plan, final result, error, and timestamps.
- **Step:** an ordered timeline event such as a plan, tool call, message, or error. A step may reference a screenshot.
- **Finding:** structured candidate data linked to the task and the page URL where it was found.

Task statuses are:

```text
QUEUED → RUNNING → SUCCEEDED
                  ├→ FAILED
                  └→ CANCELLED
```

## Design principles

1. **Keep the agent focused.** There is one agent with many small browser tools; planning is represented as a tool call rather than a separate planner agent.
2. **Keep package boundaries clear.** The browser package knows Playwright, the agent package knows the Agents SDK, and the database package knows Drizzle.
3. **Prefer compact observations.** Useful page snapshots cost less context and are easier for the model to reason about than raw HTML.
4. **Make progress durable.** The database stores steps and findings while the task is running, not only after it finishes.
5. **Make answers verifiable.** Candidate findings carry source URLs and final output is validated with Zod.
6. **Fail safely.** Budgets, cancellation, cleanup, and explicit failure states are part of the normal lifecycle.

## Current MVP scope

The current implementation is intended for exploration and development. It supports web research and structured result collection, but it does not yet provide a complete approval system for sensitive actions such as purchasing, submitting important forms, or accessing authenticated accounts.

Possible future improvements include human approval checkpoints, stronger domain policies, richer authentication support, multi-worker scaling, better task retries, and production observability.

## Further reading

- [Architecture notes](docs/ARCHITECTURE.md)
- [Data and migration conventions](docs/DATA.md)
- [Contributor and agent instructions](AGENTS.md)

## A short social post

> I built Browser Agent, an autonomous web research assistant that turns plain-English requests into observable browser workflows. It uses the OpenAI Agents SDK and Playwright to plan a task, navigate real websites, extract structured information, record source URLs, and stream every step live to a Next.js UI. PostgreSQL acts as both the task queue and the source of truth for progress, findings, and results. The project is an MVP focused on making browser automation transparent, inspectable, and safer to understand. 🚀

## License

No license has been added yet. Until a license is published, assume that normal copyright restrictions apply to this repository.
