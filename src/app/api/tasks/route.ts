import { db, desc, tasks } from "@app/db";
import { taskRepo } from "@app/db/src/repositories/taskRepo";
type CreateTaskBody = { prompt?: unknown; maxSteps?: unknown };

function isCreateTaskBody(value: unknown): value is CreateTaskBody {
  return typeof value === "object" && value !== null;
}

export async function GET(params: Request) {
  try {
    const recentTasks = await db
      .select({
        id: tasks.id,
        prompt: tasks.prompt,
        createdAt: tasks.createdAt,
        status: tasks.status,
        maxSteps: tasks.maxSteps,
      })
      .from(tasks)
      .orderBy(desc(tasks.createdAt))
      .limit(20);
    return Response.json(recentTasks);
  } catch (err) {
    const message = err instanceof Error ? err?.message : "";
  }
}
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }
  if (!isCreateTaskBody(body) || typeof body.prompt !== "string") {
    return Response.json({ error: "prompt is required." }, { status: 400 });
  }
  const prompt = body.prompt.trim();

  if (prompt.length < 3 || prompt.length > 4_000) {
    return Response.json(
      { error: "prompt must be between 3 and 4,000 characters." },
      { status: 400 },
    );
  }

  const maxSteps =
    typeof body.maxSteps === "number" && Number.isInteger(body.maxSteps)
      ? Math.min(Math.max(body.maxSteps, 1), 200)
      : 40;

  // const [task] = await db
  //   .insert(tasks)
  //   .values({
  //     prompt,
  //     maxSteps,
  //   })
  //   .returning();
  const task = await taskRepo.create(prompt);

  if (!task)
    return Response.json({ error: "Could not create task." }, { status: 500 });
  return Response.json(task, { status: 201 });
}
