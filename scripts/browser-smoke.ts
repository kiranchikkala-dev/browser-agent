import { BrowserSession } from "@app/browser";

const session = await BrowserSession.launch({ headless: false });

try {
  await session.goto("https://www.wikipedia.org");

  const first = await session.snapshot();
  console.log("=== SNAPSHOT 1 ===");
  console.log(await session.snapshotText());

  const search = first.elements.find(
    (e) => e.tag === "input" && ["search", "text"].includes(e.type ?? "text"),
  );
  if (!search) throw new Error("No search input found in snapshot");

  await session.type(search.id, "Playwright (software)", true);

  console.log("\n=== SNAPSHOT 2 (after search) ===");
  console.log(await session.snapshotText());

  await session.scroll("down");
  console.log("\n=== SNAPSHOT 3 (after scroll) ===");
  console.log(await session.snapshotText());
} finally {
  await session.close();
}
