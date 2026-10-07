# Browser Agent MVP

This is an autonomous browser agent: a user submits a natural-language task, a single OpenAI Agents SDK agent drives Playwright to complete it, and a Next.js UI streams progress live.

npm workspaces monorepo (`apps/web`, `apps/worker`, `packages/*`). Use npm for installs and scripts, not bun, pnpm or yarn.

- Start Postgres with `docker compose up -d`; run Drizzle migrations from the project root.
- Try the agent without the UI or DB: `npm run cli -- "<task>"`.

Where to look:

- Package boundaries and how the pieces talk: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- The agent, its tools, and how pages are observed: [docs/AGENT.md](docs/AGENT.md)
- Database and Drizzle conventions: [docs/DATA.md](docs/DATA.md)
- Safety and failure handling: [docs/SAFETY.md](docs/SAFETY.md)

For Next.js work in `apps/web`, see `apps/web/AGENTS.md` and the docs bundled in `node_modules/next/dist/docs/`.
