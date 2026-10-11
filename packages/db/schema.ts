import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  index,
  uuid,
} from "drizzle-orm/pg-core";

export const taskStatus = pgEnum("task_status", [
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);

export const stepType = pgEnum("step_type", [
  "PLAN",
  "TOOL_CALL",
  "MESSAGE",
  "ERROR",
]);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    prompt: text("prompt").notNull(),
    status: taskStatus("status").default("QUEUED").notNull(),
    plan: jsonb("plan"),
    result: jsonb("result"),
    error: text("error"),
    maxSteps: integer("max_steps").default(40).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("tasks_status_created_at_idx").on(table.status, table.createdAt),
  ],
);

export const steps = pgTable(
  "steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    index: integer("index").notNull(),
    type: stepType("type").notNull(),
    toolName: text("tool_name"),
    args: jsonb("args"),
    outputSummary: text("output_summary"),
    screenshotPath: text("screenshot_path"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("steps_task_id_index_unique").on(table.taskId, table.index),
    index("steps_task_id_created_at_idx").on(table.taskId, table.createdAt),
  ],
);

export const findings = pgTable(
  "findings",
  {
    id: uuid("id").primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    data: jsonb("data").notNull(),
    sourceUrl: text("source_url").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    taskIdIndex: index("findings_task_id_idx").on(table.taskId),
  }),
);

export type Task = typeof tasks.$inferSelect;
export type Findings = typeof findings.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
