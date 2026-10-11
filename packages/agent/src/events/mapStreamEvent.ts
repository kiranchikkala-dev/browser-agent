// packages/agent/src/events/mapStreamEvent.ts
import type { AgentEvent } from "../schemas/events";

// Confirm these field names against your installed @openai/agents version.
export function mapStreamEvent(event: any): AgentEvent | null {
  if (event.type !== "run_item_stream_event") return null;

  const item = event.item;

  switch (event.name) {
    case "tool_called":
      return {
        type: "tool_call",
        callId: item.rawItem.callId,
        toolName: item.rawItem.name,
        args: safeJson(item.rawItem.arguments),
      };

    case "tool_output":
      return {
        type: "tool_output",
        callId: item.rawItem.callId,
        toolName: item.rawItem.name ?? "unknown",
        output: String(item.output),
      };

    case "message_output_created":
      return { type: "message", text: extractText(item) };

    default:
      return null;
  }
}

function safeJson(s: unknown) {
  try {
    return typeof s === "string" ? JSON.parse(s) : s;
  } catch {
    return s;
  }
}

function extractText(item: any): string {
  return item.rawItem?.content?.map((c: any) => c.text ?? "").join("") ?? "";
}
