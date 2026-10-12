import type { Page } from "playwright";
import type { Snapshot } from "./types";

export const ID_ATTR = "data-agent-id";
const MAX_ELEMENTS = 60;
const MAX_TEXT = 4000;

/**
 * Tags every visible, interactive element in (or near) the viewport with a
 * data-agent-id attribute and returns a compact description of them.
 * The number the model sees == the attribute value, so click(12) is just
 * locator('[data-agent-id="12"]'). Old ids are wiped on every snapshot.
 */
function buildSnapshotInPage({ attr, maxElements, maxText }: { attr: string; maxElements: number; maxText: number }) {
      document
        .querySelectorAll(`[${attr}]`)
        .forEach(function (el) { el.removeAttribute(attr); });

      const selector = [
        "a[href]",
        "button",
        'input:not([type="hidden"])',
        "select",
        "textarea",
        '[role="button"]',
        '[role="link"]',
        '[role="tab"]',
        '[role="menuitem"]',
        '[role="checkbox"]',
        '[role="option"]',
        '[contenteditable="true"]',
        "[onclick]",
      ].join(",");

      const clean = function (s: string | null | undefined, n: number) {
        return (s ?? "").replace(/\s+/g, " ").replace(/"/g, "'").trim().slice(0, n);
      };

      const isVisible = function (el: Element) {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return false;
        const s = getComputedStyle(el);
        return (
          s.visibility !== "hidden" &&
          s.display !== "none" &&
          parseFloat(s.opacity) > 0.05
        );
      };

      const inView = function (el: Element) {
        const r = el.getBoundingClientRect();
        return (
          r.bottom > -50 &&
          r.top < window.innerHeight + 50 &&
          r.right > 0 &&
          r.left < window.innerWidth
        );
      };

      const labelOf = function (el: Element) {
        const h = el as HTMLElement;
        const img = el.querySelector("img[alt]") as HTMLImageElement | null;
        return (
          clean(el.getAttribute("aria-label"), 80) ||
          clean(h.innerText, 80) ||
          clean(el.getAttribute("placeholder"), 80) ||
          clean(el.getAttribute("title"), 80) ||
          clean(img?.alt, 80) ||
          clean((el as HTMLInputElement).value, 80) ||
          clean(el.getAttribute("name"), 80)
        );
      };

      const roleOf = function (el: Element) {
        const explicit = el.getAttribute("role");
        if (explicit) return explicit;
        const tag = el.tagName.toLowerCase();
        return tag === "a" ? "link" : tag;
      };

      const elements: Snapshot["elements"] = [];
      let nextId = 1;

      for (const el of Array.from(document.querySelectorAll(selector))) {
        if (elements.length >= maxElements) break;
        if (!isVisible(el) || !inView(el)) continue;

        const tag = el.tagName.toLowerCase();
        const input = el as HTMLInputElement;
        const id = nextId++;
        el.setAttribute(attr, String(id));

        const item: Snapshot["elements"][number] = {
          id,
          tag,
          role: roleOf(el),
          label: labelOf(el),
        };

        if (tag === "input") item.type = input.type || "text";
        if (tag === "a") {
          const href = (el as HTMLAnchorElement).getAttribute("href") ?? "";
          item.href = clean(href, 80);
        }
        if (tag === "input" || tag === "textarea") {
          if (input.type !== "password" && input.value)
            item.value = clean(input.value, 60);
          if (input.type === "checkbox" || input.type === "radio")
            item.checked = input.checked;
        }
        if (tag === "select") {
          item.options = Array.from((el as HTMLSelectElement).options)
            .slice(0, 15)
            .map(function (o) { return clean(o.text, 40); });
          item.value = clean(
            (el as HTMLSelectElement).selectedOptions[0]?.text,
            40,
          );
        }
        if ((el as HTMLButtonElement).disabled) item.disabled = true;

        elements.push(item);
      }

      const root =
        (document.querySelector("main") as HTMLElement | null) ?? document.body;
      const text = (root.innerText || "")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, maxText);

      return {
        url: location.href,
        title: document.title,
        elements,
        text,
        scroll: {
          y: Math.round(window.scrollY),
          height: Math.round(document.documentElement.scrollHeight),
          viewport: window.innerHeight,
        },
      };
}

export async function buildSnapshot(page: Page): Promise<Snapshot> {
  // tsx adds its __name helper around typed nested functions. A browser page
  // does not have that Node-side helper, so remove the wrappers before sending
  // the self-contained function to Playwright.
  const pageFunction = buildSnapshotInPage
    .toString()
    .replaceAll("__name(", "(")
    .replace(/,\"(?:clean|isVisible|inView|labelOf|roleOf)\"\)/g, ")");

  const args = JSON.stringify({
    attr: ID_ATTR,
    maxElements: MAX_ELEMENTS,
    maxText: MAX_TEXT,
  });
  return page.evaluate(`(${pageFunction})(${args})`);
}
