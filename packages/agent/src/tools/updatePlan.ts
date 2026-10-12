import { tool } from "@openai/agents";
import { z } from "zod";
import { getCtx } from "../context";

export const updatePlan = tool({
  name: "update_plan",
  description:
    "Write or revise your numbered plan for the task. Call this first, and again whenever the plan changes.",
  parameters: z.object({
    steps: z.array(z.string().min(1)).min(1).max(12),
  }),
  async execute({ steps }, runCtx) {
    const ctx = getCtx(runCtx);
    ctx.plan = steps;
    ctx.onEvent({ type: "plan", steps });
    return `Plan saved with ${steps.length} steps.`;
  },
});
