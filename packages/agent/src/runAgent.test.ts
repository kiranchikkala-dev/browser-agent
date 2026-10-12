import test from "node:test";
import assert from "node:assert/strict";

import { runBrowserTask } from "./runAgent";

test("runBrowserTask honors an already-aborted signal", async () => {
  const controller = new AbortController();
  controller.abort("test");

  await assert.rejects(
    runBrowserTask(
      "find laptops",
      {
        taskId: "test-task",
        session: {} as never,
        plan: [],
        findings: [],
        stepCount: 0,
        onEvent: () => {},
      },
      { signal: controller.signal, maxTurns: 1 },
    ),
  );
});
