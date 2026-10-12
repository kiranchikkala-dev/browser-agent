import test from "node:test";
import assert from "node:assert/strict";
import {
  NETWORK_IDLE_TIMEOUT_MS,
  RENDER_BUFFER_MS,
  waitForSettled,
} from "./waiting";

test("waitForSettled uses a short bounded readiness budget", async () => {
  const calls: Array<[string, unknown]> = [];
  const page = {
    waitForLoadState: async (state: string, options?: unknown) => {
      calls.push([state, options]);
    },
    waitForTimeout: async (timeout: number) => {
      calls.push(["timeout", timeout]);
    },
  };

  await waitForSettled(page as never);

  assert.deepEqual(calls, [
    ["domcontentloaded", { timeout: 10_000 }],
    ["networkidle", { timeout: NETWORK_IDLE_TIMEOUT_MS }],
    ["timeout", RENDER_BUFFER_MS],
  ]);
});
