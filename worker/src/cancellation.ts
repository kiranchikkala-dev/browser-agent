import { taskRepo } from "@app/db/src/repositories/taskRepo";
import { config } from "./config";

/**
 * The web app cancels a task by setting its status to CANCELLED in the DB.
 * This poller notices and aborts the running agent through the AbortController.
 * Returns a function that stops the poller.
 */
export function watchCancellation(taskId: string, controller: AbortController) {
  let checking = false;

  const timer = setInterval(async () => {
    if (checking || controller.signal.aborted) return; // skip overlapping checks
    checking = true;
    try {
      const status = await taskRepo.getStatus(taskId);
      if (status === "CANCELLED") controller.abort("cancelled");
    } catch (err) {
      console.error(`[task ${taskId}] cancellation check failed`, err);
    } finally {
      checking = false;
    }
  }, config.CANCEL_CHECK_MS);

  return () => clearInterval(timer);
}
