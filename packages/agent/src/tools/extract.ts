import { tool } from "@openai/agents";
import { z } from "zod";

import { getCtx } from "../context";
import { guard } from "./_shared";
import { extractJson } from "../llm/client";

export const extract = tool({
  name: "extract",
  description:
    "Read the full text of the current page and pull out structured data. Describe the fields you want in instruction. Returns JSON. Use it for lists of products, not for single facts.",
  parameters: z.object({ instruction: z.string() }),
  async execute({ instruction }, runCtx) {
    const ctx = getCtx(runCtx);
    return guard(async () => {
      const text = await ctx.session.pageText();
      const data = await extractJson(text, instruction);
      return JSON.stringify(data);
    });
  },
});
