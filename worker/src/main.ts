import { setTimeout as sleep } from "node:timers/promises";

import { abortActiveTask, runTask } from "./runTask";
import { claimNext, recoverStuckTasks } from "./queue";
import { config } from "./config";

let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[worker] ${signal} received, shutting down`);
  abortActiveTask("shutdown"); // runTask marks the task FAILED and closes the browser
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

async function main() {
  const recovered = await recoverStuckTasks();
  if (recovered)
    console.log(`[worker] marked ${recovered} stale task(s) as failed`);

  console.log("[worker] polling for tasks…");

  while (!shuttingDown) {
    try {
      const task = await claimNext();
      if (!task) {
        await sleep(config.POLL_INTERVAL_MS);
        continue;
      }
      await runTask(task); // one task at a time for the MVP
    } catch (err) {
      // e.g. DB temporarily down: log, back off, keep the loop alive
      console.error("[worker] loop error", err);
      await sleep(config.POLL_INTERVAL_MS);
    }
  }

  console.log("[worker] stopped");
  process.exit(0);
}

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
