import { run } from "@openai/agents";

import type { AgentContext } from "./context";
import { browserAgent } from "./agent";
import { mapStreamEvent } from "./events/mapStreamEvent";

export async function runBrowserTask(prompt: string, ctx: AgentContext) {
  const stream = await run(browserAgent, prompt, {
    context: ctx,
    stream: true,
    maxTurns: 40, // hard step budget
  });

  for await (const event of stream) {
    if (event.type === "run_item_stream_event") {
      // event.name: "tool_called" | "tool_output" | "message_output_created" ...
      ctx.onEvent(mapStreamEvent(event)); // worker writes a Step row, UI gets it via SSE
    }
  }

  await stream.completed;
  return stream.finalOutput; // typed as z.infer<typeof FinalResult>
}
