"use client";

import { useParams } from "next/navigation";
import React, { Suspense } from "react";
import {
  Check,
  CircleAlert,
  ChevronDown,
  Loader2,
  Wrench,
  X,
} from "lucide-react";
import { cancelTask, getTask, notifyTasksChanged } from "@/lib/tasks";
import type { Task, TaskStep } from "@/lib/task-types";
import { Button } from "@/components/ui/button";

function statusLabel(status: Task["status"]) {
  return {
    QUEUED: "Queued",
    RUNNING: "Running",
    SUCCEEDED: "Completed",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
  }[status];
}

const TERMINAL_STATUSES: Task["status"][] = [
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
];

function stepSummary(step: TaskStep) {
  const rawStep = step as TaskStep & { output_summary?: string | null };
  return (
    rawStep.outputSummary ?? rawStep.output_summary ?? "No details available"
  );
}

function Result({ result }: { result: unknown }) {
  if (!result) return null;
  if (typeof result === "string")
    return (
      <div className="max-w-2xl rounded-2xl rounded-tl-sm border bg-card px-5 py-4 text-sm leading-6 shadow-sm">
        <p className="whitespace-pre-wrap">{result}</p>
      </div>
    );

  if (typeof result !== "object") return null;

  const data = result as {
    summary?: unknown;
    items?: unknown;
    notes?: unknown;
  };
  const items = Array.isArray(data.items) ? data.items : [];

  return (
    <div className="max-w-2xl rounded-2xl rounded-tl-sm border bg-card px-5 py-4 text-sm leading-6 shadow-sm">
      {typeof data.summary === "string" ? (
        <p className="whitespace-pre-wrap">{data.summary}</p>
      ) : null}
      {items.length > 0 ? (
        <ul className="mt-4 space-y-3" aria-label="Results">
          {items.map((item, index) => {
            if (!item || typeof item !== "object") return null;
            const entry = item as Record<string, unknown>;
            const name =
              typeof entry.name === "string"
                ? entry.name
                : `Result ${index + 1}`;
            const details = [
              typeof entry.price === "number"
                ? `Price: ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(entry.price)}`
                : null,
              typeof entry.ram === "string" ? `RAM: ${entry.ram}` : null,
            ].filter(Boolean);
            return (
              <li
                key={`${name}-${index}`}
                className="border-t pt-3 first:border-0 first:pt-0"
              >
                <p className="font-medium">{name}</p>
                {details.length > 0 ? (
                  <p className="mt-0.5 text-muted-foreground">
                    {details.join(" · ")}
                  </p>
                ) : null}
                {typeof entry.url === "string" ? (
                  <a
                    className="mt-1 inline-block font-medium text-primary underline-offset-4 hover:underline"
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View result<span className="sr-only">: {name}</span>
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {typeof data.notes === "string" && data.notes ? (
        <p className="mt-4 border-t pt-3 text-muted-foreground">{data.notes}</p>
      ) : null}
      {typeof data.summary !== "string" &&
      items.length === 0 &&
      !(typeof data.notes === "string" && data.notes) ? (
        <p className="text-muted-foreground">
          The task completed successfully.
        </p>
      ) : null}
    </div>
  );
}

function TaskPageContent() {
  const { taskid } = useParams<{ taskid: string }>();
  const [task, setTask] = React.useState<Task | null>(null);
  const [steps, setSteps] = React.useState<TaskStep[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);

  const handleCancel = async () => {
    if (!task || isCancelling) return;
    setIsCancelling(true);
    setError(null);
    try {
      setTask(await cancelTask(task.id));
      notifyTasksChanged();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Unable to cancel task",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  React.useEffect(() => {
    const controller = new AbortController();
    void getTask(taskid, controller.signal)
      .then(setTask)
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Unable to load task");
      });
    return () => controller.abort();
  }, [taskid]);

  React.useEffect(() => {
    if (!taskid || !task || TERMINAL_STATUSES.includes(task.status)) return;
    const controller = new AbortController();
    let disposed = false;
    let terminalReceived = false;
    const source = new EventSource(
      `/api/tasks/stream?id=${encodeURIComponent(taskid)}`,
    );
    source.addEventListener("step", (event) => {
      const step = JSON.parse((event as MessageEvent).data) as TaskStep;
      setSteps((current) =>
        current.some((item) => item.index === step.index)
          ? current
          : [...current, step],
      );
    });
    source.addEventListener("done", async (event) => {
      terminalReceived = true;
      source.close();
      const { status } = JSON.parse((event as MessageEvent).data) as {
        status: Task["status"];
      };
      try {
        // The stream only carries the terminal status. Fetch the completed row
        // so result/error is rendered without requiring a browser refresh.
        const completedTask = await getTask(taskid, controller.signal);
        if (!disposed) {
          setTask(completedTask);
          setError(null);
        }
      } catch (refreshError) {
        if (!disposed && !controller.signal.aborted) {
          setTask((current) =>
            current && current.status !== status
              ? { ...current, status }
              : current,
          );
          setError(
            refreshError instanceof Error
              ? refreshError.message
              : "Unable to load the completed task",
          );
        }
      }
    });
    source.addEventListener("error", () => {
      if (terminalReceived || disposed) return;
      setError("The live task stream disconnected. Refresh to reconnect.");
      source.close();
    });
    return () => {
      disposed = true;
      controller.abort();
      source.close();
    };
  }, [task, taskid]);

  if (error && !task)
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      </div>
    );
  if (!task)
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-5 py-10 sm:px-8">
      <div className="mb-10">
        <div className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
          {task.status === "RUNNING" || task.status === "QUEUED" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : task.status === "SUCCEEDED" ? (
            <Check className="size-4 text-emerald-600" />
          ) : (
            <CircleAlert className="size-4 text-destructive" />
          )}
          <span>{statusLabel(task.status)}</span>
          {task.status === "RUNNING" || task.status === "QUEUED" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => void handleCancel()}
              disabled={isCancelling}
              aria-label="Cancel task"
            >
              {isCancelling ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <X className="size-3.5" />
              )}
              {isCancelling ? "Cancelling…" : "Cancel"}
            </Button>
          ) : null}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {task.prompt}
        </h1>
      </div>
      {error ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <section aria-labelledby="progress-heading">
        <details className="group overflow-hidden rounded-xl border bg-card">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <span id="progress-heading">Activity</span>
            <span className="ml-auto flex items-center gap-2 text-xs font-normal text-muted-foreground">
              {steps.length === 0
                ? "Waiting to start"
                : `${steps.length} ${steps.length === 1 ? "step" : "steps"}`}
              <ChevronDown
                className="size-4 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </span>
          </summary>
          <div className="border-t px-3 py-3">
            {steps.length === 0 ? (
              <p className="px-1 py-2 text-sm text-muted-foreground">
                Waiting for the browser agent to start…
              </p>
            ) : (
              <ol className="space-y-2">
                {steps.map((step) => (
                  <li
                    key={step.id}
                    className="flex gap-3 rounded-lg border bg-background p-3 text-sm"
                  >
                    <span className="mt-0.5 shrink-0 text-muted-foreground">
                      {step.type === "TOOL_CALL" ? (
                        <Wrench className="size-4" />
                      ) : step.type === "ERROR" ? (
                        <CircleAlert className="size-4 text-destructive" />
                      ) : (
                        <Check className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">
                        {step.type === "TOOL_CALL"
                          ? (step.toolName ?? "Browser action")
                          : step.type === "PLAN"
                            ? "Plan"
                            : step.type === "ERROR"
                              ? "Error"
                              : "Update"}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
                        {stepSummary(step)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </details>
      </section>
      {task.status === "SUCCEEDED" && task.result ? (
        <section aria-labelledby="result-heading" className="mt-10">
          <h2
            id="result-heading"
            className="mb-4 text-sm font-medium text-muted-foreground"
          >
            Result
          </h2>
          <Result result={task.result} />
        </section>
      ) : null}
      {task.status === "FAILED" && task.error ? (
        <section aria-labelledby="error-heading" className="mt-10">
          <h2
            id="error-heading"
            className="mb-4 text-sm font-medium text-muted-foreground"
          >
            Failure reason
          </h2>
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {task.error}
          </p>
        </section>
      ) : null}
    </main>
  );
}

function TaskPageFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function TaskPage() {
  return (
    <Suspense fallback={<TaskPageFallback />}>
      <TaskPageContent />
    </Suspense>
  );
}
