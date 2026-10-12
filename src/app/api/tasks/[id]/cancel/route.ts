import { taskRepo } from "@app/db/src/repositories/taskRepo";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const task = await taskRepo.cancel(id);

  if (task) return Response.json(task);

  const existingTask = await taskRepo.get(id);
  if (!existingTask) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }

  return Response.json(
    { error: "Only queued or running tasks can be cancelled." },
    { status: 409 },
  );
}
