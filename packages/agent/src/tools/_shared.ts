import { BrowserActionError } from "@app/browser";

/**
 * Wraps a tool body. Browser errors become text the model can read and react to.
 * Anything else (a bug, a crashed browser) still throws and ends the run.
 */
export async function guard(fn: () => Promise<string>): Promise<string> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof BrowserActionError) return `Error: ${err.message}`;
    throw err;
  }
}
