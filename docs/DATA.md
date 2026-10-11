# Data

Drizzle ORM with PostgreSQL. Models: Task (with status and result), Step (ordered per task), Finding (candidate result plus source URL). The schema is TypeScript; read the schema files for the current shape rather than relying on this doc.

- Use real columns for anything filtered or sorted, and `jsonb` for flexible blobs. Type the blobs with `.$type<...>()` and validate with Zod on read and write.
- Step order comes from the agent's step counter and is unique per task.
- The worker claims jobs with raw SQL (Drizzle's `sql` template) using `FOR UPDATE SKIP LOCKED`. Use the actual table names defined in the schema.
- Create one database client and connection pool and reuse it (stash it on `globalThis` in Next.js dev so hot reload doesn't leak connections).
- Change the schema by editing the TypeScript schema, then generate and apply migrations with `drizzle-kit`.
