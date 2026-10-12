export const TASK_STATUSES = ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type Task = { id: string; prompt: string; status: TaskStatus; plan?: string[] | null; result?: unknown; error?: string | null; maxSteps: number; createdAt: string; updatedAt?: string };
export type TaskStep = { id: string; taskId: string; index: number; type: "PLAN" | "TOOL_CALL" | "MESSAGE" | "ERROR"; toolName?: string | null; outputSummary?: string | null; durationMs?: number | null; createdAt: string };
