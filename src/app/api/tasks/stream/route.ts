import { stepRepo } from "@app/db/src/repositories/stepRepo";
import { taskRepo } from "@app/db/src/repositories/taskRepo";
import { NextRequest } from "next/server";
const TERMINAL = ["SUCCEEDED", "FAILED", "CANCELLED"];

export async function GET(
  req: NextRequest,
) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "Task id is required." }, { status: 400 });
  let cursor = Number(
    req.headers.get("last-event-id") ?? url.searchParams.get("after") ?? -1,
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown, eventId?: number) => {
        let msg = `event: ${event}\n`;
        if (eventId !== undefined) msg += `id: ${eventId}\n`;
        msg += `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(msg));
      };

      try {
        while (!req.signal.aborted) {
          for (const s of await stepRepo.listAfter(id, cursor)) {
            send("step", s, s.index);
            cursor = s.index;
          }
          const status = await taskRepo.getStatus(id);
          if (!status) {
            send("error", { message: "Task not found" }, cursor);
            break;
          }
          if (TERMINAL.includes(status)) {
            send("done", { status });
            break;
          }
          await new Promise((r) => setTimeout(r, 500));
        }
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
