import { tool } from "@openai/agents";
import { z } from "zod";

import { getCtx } from "../context";
import { guard } from "./_shared";

export const SEARCH_ENGINE_URL = "https://www.bing.com/search?cc=IN&setlang=en-IN&q=";

export function searchUrl(query: string) {
  return `${SEARCH_ENGINE_URL}${encodeURIComponent(query.trim())}`;
}

export const search = tool({
  name: "search",
  description:
    "Search the web in the browser. This must be the first browser action for every task, including factual questions and shopping requests. Use the user's request as the query and return the search-results snapshot.",
  parameters: z.object({ query: z.string().trim().min(1).max(500) }),
  async execute({ query }, runCtx) {
    const ctx = getCtx(runCtx);
    return guard(async () => {
      await ctx.session.goto(searchUrl(query));
      ctx.hasSearched = true;
      return ctx.session.snapshotText();
    });
  },
});
