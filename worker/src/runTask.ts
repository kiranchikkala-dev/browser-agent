import { BrowserSession } from "@app/browser";

import { createEventSink } from "./eventSink";
import { AgentContext } from "../../packages/agent/src/context";
import { runBrowserTask } from "../../packages/agent/src/runAgent";
import { ClaimedTask, taskRepo } from "@app/db/src/repositories/taskRepo";
import { watchCancellation } from "./cancellation";
import { config } from "./config";
import { findingRepo } from "@app/db/src/repositories/findingRepo";

// Lets main.ts abort the running task on SIGINT/SIGTERM.
let activeController: AbortController | null = null;
export function abortActiveTask(reason: string) {
  activeController?.abort(reason);
}

const message = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

/** Full lifecycle of ONE task: browser -> agent -> save -> cleanup. */
export async function runTask(task: ClaimedTask) {
  const log = (...args: unknown[]) => console.log(`[task ${task.id}]`, ...args);
  log("started:", task.prompt);

  const controller = new AbortController();
  activeController = controller;

  const sink = createEventSink(task.id);
  const stopWatching = watchCancellation(task.id, controller);
  const timeout = setTimeout(
    () => controller.abort("timeout"),
    config.TASK_TIMEOUT_MS,
  );

  let session: BrowserSession | undefined;
  const ctx: Partial<AgentContext> = { findings: [] };

  try {
    session = await BrowserSession.launch({ headless: config.HEADLESS });

    const fullCtx: AgentContext = {
      taskId: task.id,
      session,
      plan: [],
      findings: [],
      stepCount: 0,
      onEvent: sink.onEvent,
    };
    ctx.findings = fullCtx.findings; // keep a handle so partial findings survive errors

    const result = await runBrowserTask(task.prompt, fullCtx, {
      signal: controller.signal,
      maxTurns: task.maxSteps,
    });

    await sink.flush();
    await findingRepo.addMany(task.id, fullCtx.findings);
    await taskRepo.markSucceeded(task.id, result); // only updates if still RUNNING
    log("succeeded");
  } catch (err) {
    await sink.flush();

    // Keep whatever the agent found before it stopped.
    if (ctx.findings?.length) {
      await findingRepo.addMany(task.id, ctx.findings).catch(() => {});
    }

    const reason = controller.signal.aborted
      ? String(controller.signal.reason)
      : null;

    if (reason === "cancelled") {
      log("cancelled"); // status is already CANCELLED, nothing to write
    } else if (reason === "timeout") {
      await taskRepo.markFailed(task.id, "Task timed out");
      log("timed out");
    } else if (reason === "shutdown") {
      await taskRepo.markFailed(
        task.id,
        "Worker shut down while task was running",
      );
      log("stopped by shutdown");
    } else {
      await taskRepo.markFailed(task.id, message(err));
      log("failed:", message(err));
    }
  } finally {
    clearTimeout(timeout);
    stopWatching();
    activeController = null;
    await session
      ?.close()
      .catch((err) => log("browser close failed:", message(err)));
  }
}
