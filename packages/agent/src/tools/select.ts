import { tool } from "@openai/agents";
import { z } from "zod";
import { getCtx } from "../context";
import { guard } from "./_shared";

export const select = tool({
  name: "select",
  description:
    "Choose an option in a dropdown by its number. value must match an option label from the snapshot.",
  parameters: z.object({
    elementId: z.number().int(),
    value: z.string(),
  }),
  async execute({ elementId, value }, runCtx) {
    const ctx = getCtx(runCtx);
    return guard(async () => {
      await ctx.session.select(elementId, value);
      return ctx.session.snapshotText();
    });
  },
});
