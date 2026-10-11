import { z } from "zod";

const schema = z.object({
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1500),
  TASK_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 60 * 1000),
  CANCEL_CHECK_MS: z.coerce.number().int().positive().default(2000),
  HEADLESS: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  SCREENSHOT_DIR: z.string().default("data/screenshots"),
});

// Parsed once at startup. Fails fast with a readable error if env is invalid.
export const config = schema.parse(process.env);
