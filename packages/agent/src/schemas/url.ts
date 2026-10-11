import { z } from "zod";

/**
 * Validate URLs at runtime without emitting JSON Schema's `uri` format.
 * OpenAI structured outputs do not accept that format in response schemas.
 */
export const urlSchema = z.string().refine(
  (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  { message: "Expected an absolute URL" },
);
