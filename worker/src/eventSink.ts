import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config";
import { taskRepo } from "@app/db/src/repositories/taskRepo";
import { stepRepo } from "@app/db/src/repositories/stepRepo";
import { AgentEvent } from "../../packages/agent/src/schemas/events";

const MAX_SUMMARY = 2000;
const truncate = (s: string) =>
  s.length > MAX_SUMMARY ? `${s.slice(0, MAX_SUMMARY)}…[truncated]` : s;

type PendingCall = { toolName: string; args: unknown; startedAt: number };

/**
 * Turns agent events into Step rows. The agent package only calls onEvent();
 * this is the only place that knows about the database and the filesystem.
 *
 * Events are written one at a time, in order, so Step.index stays sequential
 * even though onEvent() itself is synchronous.
 */
export function createEventSink(taskId: string) {
  let index = 0;
  let chain: Promise<void> = Promise.resolve();
  const pending = new Map<string, PendingCall>();

  async function saveScreenshot(stepIndex: number, png: Buffer) {
    const relative = path.join(taskId, `${stepIndex}.png`);
    const full = path.join(config.SCREENSHOT_DIR, relative);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, png);
    return relative; // stored relative to SCREENSHOT_DIR
  }

  async function handle(event: AgentEvent) {
    switch (event.type) {
      case "plan": {
        await taskRepo.savePlan(taskId, event.steps);
        await stepRepo.append({
          taskId,
          index: index++,
          type: "PLAN",
          outputSummary: truncate(
            event.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
          ),
        });
        break;
      }

      case "tool_call": {
        // Don't write yet; we write ONE row per tool call when the output arrives.
        pending.set(event.callId, {
          toolName: event.toolName,
          args: event.args,
          startedAt: Date.now(),
        });
        break;
      }

      case "tool_output": {
        const call = pending.get(event.callId);
        pending.delete(event.callId);
        const stepIndex = index++;
        const screenshotPath = event.screenshot
          ? await saveScreenshot(stepIndex, event.screenshot)
          : undefined;

        await stepRepo.append({
          taskId,
          index: stepIndex,
          type: "TOOL_CALL",
          toolName: call?.toolName ?? event.toolName,
          args: (call?.args ?? undefined) as object | undefined,
          outputSummary: truncate(event.output),
          screenshotPath,
          durationMs: call ? Date.now() - call.startedAt : undefined,
        });
        break;
      }

      case "message": {
        await stepRepo.append({
          taskId,
          index: index++,
          type: "MESSAGE",
          outputSummary: truncate(event.text),
        });
        break;
      }

      case "error": {
        await stepRepo.append({
          taskId,
          index: index++,
          type: "ERROR",
          outputSummary: truncate(event.message),
        });
        break;
      }
    }
  }

  return {
    /** Pass this as ctx.onEvent. Never throws; DB errors are logged. */
    onEvent(event: AgentEvent) {
      chain = chain
        .then(() => handle(event))
        .catch((err) =>
          console.error(`[task ${taskId}] event sink error`, err),
        );
    },
    /** Await before finalizing the task so no step is lost. */
    flush: () => chain,
  };
}
