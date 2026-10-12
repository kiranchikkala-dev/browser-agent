import { run } from "@openai/agents";

import type { AgentContext } from "./context";
import { browserAgent } from "./agent";
import { mapStreamEvent } from "./events/mapStreamEvent";
import { searchUrl } from "./tools/search";

export type BrowserTaskRunOptions = {
  signal?: AbortSignal;
  maxTurns?: number | null;
};

export async function runBrowserTask(
  prompt: string,
  ctx: AgentContext,
  options: BrowserTaskRunOptions = {},
) {
  // Establish browser-grounded context before the model gets a chance to
  // answer from memory or choose a direct URL. The model can still use the
  // search tool to refine the query afterwards.
  if (!ctx.hasSearched) {
    await ctx.session.goto(searchUrl(prompt));
    ctx.hasSearched = true;
  }

  const stream = await run(browserAgent, prompt, {
    context: ctx,
    stream: true,
    signal: options.signal,
    maxTurns: options.maxTurns ?? 40, // hard step budget
  });

  for await (const event of stream) {
    if (event.type === "run_item_stream_event") {
      // event.name: "tool_called" | "tool_output" | "message_output_created" ...
      const mappedEvent = mapStreamEvent(event);
      if (mappedEvent) {
        ctx.onEvent(mappedEvent); // worker writes a Step row, UI gets it via SSE
      }
    }
  }

  await stream.completed;
  return stream.finalOutput; // typed as z.infer<typeof FinalResult>
}
