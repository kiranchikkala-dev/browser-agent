import { and, asc, eq, gt } from "drizzle-orm";
import { db, steps } from "../..";
export type NewStep = typeof steps.$inferInsert;

export const stepRepo = {
  async append(data: NewStep) {
    await db.insert(steps).values(data);
  },

  /** For the SSE route: everything after the last index the client has seen. */
  async listAfter(taskId: string, cursor: number) {
    return db
      .select()
      .from(steps)
      .where(and(eq(steps.taskId, taskId), gt(steps.index, cursor)))
      .orderBy(asc(steps.index));
  },
};
