import { tool } from "@openai/agents";
import { z } from "zod";
import { getCtx } from "../context";
import { guard } from "./_shared";

export const scroll = tool({
  name: "scroll",
  description:
    "Scroll the page up or down by about one screen. Use when the items you need are not in view, or when the snapshot says 'at bottom' is false.",
  parameters: z.object({ direction: z.enum(["up", "down"]) }),
  async execute({ direction }, runCtx) {
    const ctx = getCtx(runCtx);
    return guard(async () => {
      await ctx.session.scroll(direction);
      return ctx.session.snapshotText();
    });
  },
});
