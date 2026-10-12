import { tool } from "@openai/agents";
import z from "zod";
import { getCtx } from "../context";
import { guard } from "./_shared";

export const observe = tool({
  name: "observe",
  description:
    "Get the current page: URL, visible interactive elements with their numbers, and page text. Call after anything that may have changed the page.",
  parameters: z.object({}),
  async execute(_args, runCtx) {
    const ctx = getCtx(runCtx);
    return guard(() => ctx.session.snapshotText());
  },
});
