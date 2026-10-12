import { tool } from "@openai/agents";
import { z } from "zod";
import { getCtx } from "../context";
import { guard } from "./_shared";

export const click = tool({
  name: "click",
  description:
    "Click an element by its number from the latest observation. Returns the new page snapshot.",
  parameters: z.object({ elementId: z.number().int() }),
  async execute({ elementId }, runCtx) {
    const ctx = getCtx(runCtx);
    return guard(async () => {
      await ctx.session.click(elementId);
      return ctx.session.snapshotText();
    });
  },
});
