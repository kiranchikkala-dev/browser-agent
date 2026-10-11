import type { Snapshot, SnapshotElement } from "./types";

function formatElement(e: SnapshotElement): string {
  const kind = e.type ? `${e.role}[${e.type}]` : e.role;
  const parts = [`[${e.id}] ${kind} "${e.label}"`];
  if (e.href) parts.push(`-> ${e.href}`);
  if (e.value) parts.push(`value="${e.value}"`);
  if (e.options?.length) parts.push(`options: ${e.options.join(" | ")}`);
  if (e.checked !== undefined)
    parts.push(e.checked ? "(checked)" : "(unchecked)");
  if (e.disabled) parts.push("(disabled)");
  return parts.join(" ");
}

/** Compact text the model reads. Keep this small: it is the main context cost. */
export function formatSnapshot(s: Snapshot): string {
  const atBottom = s.scroll.y + s.scroll.viewport >= s.scroll.height - 5;
  const lines = [
    `URL: ${s.url}`,
    `Title: ${s.title}`,
    `Scroll: ${s.scroll.y}px of ${s.scroll.height}px (viewport ${s.scroll.viewport}px)${atBottom ? " - at bottom" : ""}`,
    "",
    "Interactive elements in view:",
    ...(s.elements.length ? s.elements.map(formatElement) : ["(none)"]),
    "",
    "Page text:",
    s.text || "(empty)",
  ];
  return lines.join("\n");
}
