import { tool } from "@openai/agents";
import { z } from "zod";
import { getCtx } from "../context";
import { urlSchema } from "../schemas/url";
import { guard } from "./_shared";

export const navigate = tool({
  name: "navigate",
  description:
    "Open a full URL in the browser. Returns the page snapshot. Use for the start site or a product page.",
  parameters: z.object({ url: urlSchema }),
  async execute({ url }, runCtx) {
    const ctx = getCtx(runCtx);
    return guard(async () => {
      if (!ctx.hasSearched) {
        return "Error: Search first using the search tool. Direct navigation is only allowed after a browser search.";
      }
      const host = new URL(url).hostname;
      const allowed = ctx.allowedDomains ?? [];
      if (
        allowed.length &&
        !allowed.some((d) => host === d || host.endsWith(`.${d}`))
      ) {
        return `Error: ${host} is not allowed. Allowed domains: ${allowed.join(", ")}`;
      }
      await ctx.session.goto(url);
      return ctx.session.snapshotText();
    });
  },
});
