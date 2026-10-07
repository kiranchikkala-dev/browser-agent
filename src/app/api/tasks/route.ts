import { desc } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";

type CreateTaskBody = { prompt?: unknown; maxSteps?: unknown };

function isCreateTaskBody(value: unknown): value is CreateTaskBody {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  const recentTasks = await db
    .select({
      id: tasks.id,
      prompt: tasks.prompt,
      status: tasks.status,
      maxSteps: tasks.maxSteps,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .orderBy(desc(tasks.createdAt))
    .limit(25);
  console.log("🚀 ~ GET ~ recentTasks:", recentTasks);

  return Response.json(recentTasks);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
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

  const [task] = await db
    .insert(tasks)
    .values({ prompt, maxSteps })
    .returning();
  if (!task)
    return Response.json({ error: "Could not create task." }, { status: 500 });
  return Response.json(task, { status: 201 });
}
