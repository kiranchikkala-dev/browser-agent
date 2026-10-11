import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import { buildSnapshot, ID_ATTR } from "./snapshot/buildSnapshot";
import { formatSnapshot } from "./snapshot/formatSnapshot";
import { dismissCookieBanner } from "./interruptions/dismissCookieBanner";
import { waitForSettled } from "./waiting";
import { Snapshot } from "./snapshot/types";

/** Errors whose message is written for the MODEL to read and recover from. */
export class BrowserActionError extends Error {}

export type LaunchOptions = {
  headless?: boolean;
  /** "chrome" uses your installed Google Chrome instead of Playwright's Chromium. */
  channel?: "chrome";
};

export class BrowserSession {
  /** True when element numbers from the last snapshot can no longer be trusted. */
  private stale = true;

  private constructor(
    private browser: Browser,
    private context: BrowserContext,
    private page: Page,
  ) {}

  static async launch(opts: LaunchOptions = {}) {
    const browser = await chromium.launch({
      headless: opts.headless ?? true,
      channel: opts.channel,
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "en-IN",
      timezoneId: "Asia/Kolkata",
    });
    context.setDefaultTimeout(10_000);
    context.setDefaultNavigationTimeout(30_000);

    const page = await context.newPage();
    const session = new BrowserSession(browser, context, page);
    session.attachPage(page);

    // Links that open a new tab: follow the newest tab.
    context.on("page", (p) => {
      session.page = p;
      session.stale = true;
      session.attachPage(p);
    });

    return session;
  }

  private attachPage(page: Page) {
    page.on("dialog", (d) => d.dismiss().catch(() => {}));
    page.on("framenavigated", (frame) => {
      if (frame === this.page.mainFrame()) this.stale = true;
    });
    page.on("close", () => {
      const pages = this.context.pages();
      if (pages.length && this.page === page) {
        this.page = pages[pages.length - 1];
        this.stale = true;
      }
    });
  }

  // ---------- reading ----------

  url() {
    return this.page.url();
  }

  async snapshot(): Promise<Snapshot> {
    await waitForSettled(this.page);
    const snap = await buildSnapshot(this.page);
    this.stale = false;
    return snap;
  }

  async snapshotText(): Promise<string> {
    return formatSnapshot(await this.snapshot());
  }

  /** Larger clean text for the extract tool (not the viewport-limited snapshot). */
  async pageText(maxChars = 15_000): Promise<string> {
    return this.page.evaluate((max) => {
      const root =
        (document.querySelector("main") as HTMLElement | null) ?? document.body;
      return (root.innerText || "")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, max);
    }, maxChars);
  }

  async screenshot(): Promise<Buffer> {
    return this.page.screenshot({ type: "png" });
  }

  // ---------- acting ----------

  async goto(url: string) {
    if (!/^https?:\/\//i.test(url)) {
      throw new BrowserActionError(
        `Invalid URL "${url}". Use a full http(s) URL.`,
      );
    }
    try {
      await this.page.goto(url, { waitUntil: "domcontentloaded" });
    } catch (err) {
      throw new BrowserActionError(
        `Could not open ${url}: ${(err as Error).message.split("\n")[0]}`,
      );
    }
    await waitForSettled(this.page);
    await dismissCookieBanner(this.page);
    this.stale = true;
  }

  async click(id: number) {
    const el = this.locator(id);
    try {
      await el.scrollIntoViewIfNeeded({ timeout: 3_000 });
      await el.click({ timeout: 5_000 });
    } catch {
      throw new BrowserActionError(
        `Could not click [${id}]. It may be hidden, covered by another element, or disabled. Try scrolling or another element, then observe.`,
      );
    }
    await waitForSettled(this.page);
  }

  async type(id: number, text: string, submit = false) {
    const el = this.locator(id);
    try {
      await el.fill(text, { timeout: 5_000 }); // fill() clears existing text first
      if (submit) await el.press("Enter");
    } catch {
      throw new BrowserActionError(
        `Could not type into [${id}]. It may not be a text input.`,
      );
    }
    await waitForSettled(this.page);
  }

  async select(id: number, value: string) {
    const el = this.locator(id);
    try {
      await el
        .selectOption({ label: value }, { timeout: 5_000 })
        .catch(() => el.selectOption({ value }, { timeout: 5_000 }));
    } catch {
      throw new BrowserActionError(
        `Could not select "${value}" in [${id}]. Check the options list.`,
      );
    }
    await waitForSettled(this.page);
  }

  async scroll(direction: "up" | "down") {
    await this.page.evaluate((dir) => {
      const dy = window.innerHeight * 0.8 * (dir === "down" ? 1 : -1);
      window.scrollBy(0, dy);
    }, direction);
    await this.page.waitForTimeout(400); // lazy-loaded content
    this.stale = true; // what is "in view" changed
  }

  async goBack() {
    await this.page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
    await waitForSettled(this.page);
    this.stale = true;
  }

  async close() {
    await this.context.close().catch(() => {});
    await this.browser.close().catch(() => {});
  }

  // ---------- internals ----------

  private locator(id: number) {
    if (!Number.isInteger(id) || id < 1) {
      throw new BrowserActionError(`Invalid element number ${id}.`);
    }
    if (this.stale) {
      throw new BrowserActionError(
        "The page changed since the last observation. Call observe to get current element numbers.",
      );
    }
    return this.page.locator(`[${ID_ATTR}="${id}"]`).first();
  }
}
