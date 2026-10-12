import { tool } from "@openai/agents";
import { z } from "zod";
import { getCtx } from "../context";
import { guard } from "./_shared";

export const typeText = tool({
  name: "type_text",
  description:
    "Type text into an input by its number, replacing any existing text. Set submit to true to press Enter, for search boxes.",
  parameters: z.object({
    elementId: z.number().int(),
    text: z.string(),
    submit: z.boolean(),
  }),
  async execute({ elementId, text, submit }, runCtx) {
    const ctx = getCtx(runCtx);
    return guard(async () => {
      await ctx.session.type(elementId, text, submit);
      return ctx.session.snapshotText();
    });
  },
});
