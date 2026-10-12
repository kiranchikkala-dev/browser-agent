import { tool } from "@openai/agents";
import { z } from "zod";
import { getCtx } from "../context";
import { guard } from "./_shared";

export const goBack = tool({
  name: "go_back",
  description:
    "Go back to the previous page in the browser. Use when a page is a dead end, such as an unrelated product or a login wall.",
  parameters: z.object({}),
  async execute(_args, runCtx) {
    const ctx = getCtx(runCtx);
    return guard(async () => {
      await ctx.session.goBack();
      return ctx.session.snapshotText();
    });
  },
});
