import type { Page } from "playwright";

// Only looks for accept-style buttons INSIDE containers that look like cookie/consent banners.
const BANNER =
  '[id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i], [aria-label*="cookie" i]';

export async function dismissCookieBanner(page: Page) {
  try {
    await page
      .locator(BANNER)
      .getByRole("button", {
        name: /^(accept|accept all|agree|i agree|allow all|got it|ok)/i,
      })
      .first()
      .click({ timeout: 800 });
  } catch {
    // no banner, nothing to do
  }
}
