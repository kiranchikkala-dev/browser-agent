import type { BrowserSession } from "@app/browser";
import { Findings } from "@app/db";

export interface AgentContext {
  taskId: string;
  session: BrowserSession; // Playwright wrapper
  plan: string[]; // updated by update_plan
  findings: Findings[]; // scratchpad
  stepCount: number;
  allowedDomains?: string[];
  onEvent: (e: AgentEvent) => void; // worker persists these to Postgres
}
