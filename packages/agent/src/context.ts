import type { BrowserSession } from "@app/browser";
import type { AgentEvent } from "./schemas/events";
import type { Finding } from "./schemas/finding";

export type AgentContext = {
  taskId: string;
  session: BrowserSession;
  plan: string[];
  findings: Finding[];
  stepCount: number;
  hasSearched?: boolean;
  allowedDomains?: string[];
  onEvent: (e: AgentEvent) => void;
};

/** Tools call this to get the shared AgentContext from the SDK's run context. */
export function getCtx(runCtx: unknown): AgentContext {
  const ctx = (runCtx as { context?: AgentContext } | undefined)?.context;
  if (!ctx) throw new Error("Tool called without an AgentContext");
  return ctx;
}
