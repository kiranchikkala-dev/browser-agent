import { ClaimedTask, taskRepo } from "@app/db/src/repositories/taskRepo";

/**
 * Atomically claim the oldest QUEUED task and mark it RUNNING.
 * The SQL lives in taskRepo.claimNext (FOR UPDATE SKIP LOCKED), so several
 * workers can poll safely without ever picking the same task.
 */
export async function claimNext(): Promise<ClaimedTask | null> {
  return taskRepo.claimNext();
}

/**
 * Call once on startup. If a previous worker crashed, its task is still
 * RUNNING forever. With a single worker, anything RUNNING at boot is stale.
 * (With multiple workers you'd need heartbeats instead.)
 */
export async function recoverStuckTasks(): Promise<number> {
  return taskRepo.failStuck("Worker restarted while this task was running");
}
