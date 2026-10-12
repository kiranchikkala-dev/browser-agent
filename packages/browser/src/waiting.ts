import type { Page } from "playwright";

export const NETWORK_IDLE_TIMEOUT_MS = 750;
export const RENDER_BUFFER_MS = 100;

/**
 * Pragmatic "page is ready enough" wait for an agent: DOM loaded, then give
 * network a short chance to go quiet, then a small buffer for client-side
 * rendering. All waits are capped and failures are ignored on purpose, since
 * some sites never go network-idle.
 */
export async function waitForSettled(page: Page) {
  await page
    .waitForLoadState("domcontentloaded", { timeout: 10_000 })
    .catch(() => {});
  await page
    .waitForLoadState("networkidle", { timeout: NETWORK_IDLE_TIMEOUT_MS })
    .catch(() => {});
  await page.waitForTimeout(RENDER_BUFFER_MS);
}
