import type { Task } from "./task-types";
export async function getTasks(signal?: AbortSignal): Promise<Task[]> {
  const response = await fetch("/api/tasks", { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load tasks");
  return response.json();
}
export async function createTask(prompt: string): Promise<Task> {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? "Unable to create task");
  return body;
}
export async function getTask(id: string, signal?: AbortSignal): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Task not found");
  return response.json();
}
export async function cancelTask(id: string): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}/cancel`, { method: "POST" });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? "Unable to cancel task");
  return body;
}
export function notifyTasksChanged() {
  window.dispatchEvent(new Event("tasks:changed"));
}
