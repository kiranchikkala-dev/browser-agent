import { tool } from "@openai/agents";
import { getCtx } from "../context";
import { Finding } from "../schemas/finding";
import { guard } from "./_shared";

export const recordFinding = tool({
  name: "record_finding",
  description:
    "Save one verified candidate that meets the task constraints. Only call this for items you have confirmed on the page. The url must be the product page.",
  parameters: Finding,
  async execute(item, runCtx) {
    const ctx = getCtx(runCtx);
    return guard(async () => {
      if (ctx.findings.some((f) => f.url === item.url)) {
        return `Already saved: ${item.name}. Total findings: ${ctx.findings.length}.`;
      }
      ctx.findings.push(item);
      return `Saved: ${item.name}. Total findings: ${ctx.findings.length}.`;
    });
  },
});
