import { and, eq, or, sql } from "drizzle-orm";
import { db, tasks } from "../..";

export type ClaimedTask = { id: string; prompt: string; maxSteps: number };

export const taskRepo = {
  async create(prompt: string) {
    const [row] = await db.insert(tasks).values({ prompt }).returning();
    return row;
  },

  async get(id: string) {
    const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
    return row ?? null;
  },

  async getStatus(id: string) {
    const [row] = await db
      .select({ status: tasks.status })
      .from(tasks)
      .where(eq(tasks.id, id));
    return row?.status ?? null;
  },

  async cancel(id: string) {
    const [row] = await db
      .update(tasks)
      .set({ status: "CANCELLED", finishedAt: new Date() })
      .where(
        and(
          eq(tasks.id, id),
          or(eq(tasks.status, "QUEUED"), eq(tasks.status, "RUNNING")),
        ),
      )
      .returning();
    return row ?? null;
  },

  /**
   * Atomic claim: one statement, so there is no read-then-update race.
   * FOR UPDATE SKIP LOCKED makes concurrent workers skip rows already claimed.
   * Assumes node-postgres (db.execute returns { rows }) and snake_case columns.
   */
  async claimNext(): Promise<ClaimedTask | null> {
    const res = await db.execute(sql`
      UPDATE tasks
      SET status = 'RUNNING', started_at = now()
      WHERE id = (
        SELECT id FROM tasks
        WHERE status = 'QUEUED'
        ORDER BY created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, prompt, max_steps AS "maxSteps"
    `);
    return (res.rows[0] as ClaimedTask | undefined) ?? null;
  },

  async savePlan(id: string, plan: string[]) {
    await db.update(tasks).set({ plan }).where(eq(tasks.id, id));
  },

  // The "status = RUNNING" guard stops a finished run from overwriting CANCELLED.
  async markSucceeded(id: string, result: unknown) {
    await db
      .update(tasks)
      .set({ status: "SUCCEEDED", result, finishedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.status, "RUNNING")));
  },

  async markFailed(id: string, error: string) {
    await db
      .update(tasks)
      .set({ status: "FAILED", error, finishedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.status, "RUNNING")));
  },

  async failStuck(error: string) {
    const rows = await db
      .update(tasks)
      .set({ status: "FAILED", error, finishedAt: new Date() })
      .where(eq(tasks.status, "RUNNING"))
      .returning({ id: tasks.id });
    return rows.length;
  },
};
