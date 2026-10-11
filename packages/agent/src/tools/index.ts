import { tool, RunContext } from "@openai/agents";
import { z } from "zod";
import type { AgentContext } from "../context";
import { urlSchema } from "../schemas/url";

type Ctx = RunContext<AgentContext>;

export const updatePlan = tool({
  name: "update_plan",
  description:
    "Write or revise your step-by-step plan. Call this first, and again when the plan changes.",
  parameters: z.object({ steps: z.array(z.string()).min(1) }),
  async execute({ steps }, ctx?: Ctx) {
    ctx!.context.plan = steps;
    return "Plan saved.";
  },
});

export const navigate = tool({
  name: "navigate",
  description: "Open a URL in the browser.",
  parameters: z.object({ url: urlSchema }),
  async execute({ url }, ctx?: Ctx) {
    const { session } = ctx!.context;
    await session.goto(url);
    return session.snapshotText(); // compact, numbered elements
  },
});

export const observe = tool({
  name: "observe",
  description:
    "Get the current page state: URL, visible text, and numbered interactive elements.",
  parameters: z.object({}),
  async execute(_args, ctx?: Ctx) {
    return ctx!.context.session.snapshotText();
  },
});

export const click = tool({
  name: "click",
  description: "Click an element by its number from the latest observation.",
  parameters: z.object({ elementId: z.number().int() }),
  async execute({ elementId }, ctx?: Ctx) {
    const { session } = ctx!.context;
    await session.click(elementId);
    return session.snapshotText();
  },
});

export const typeText = tool({
  name: "type_text",
  description: "Type into an input element by number. Optionally press Enter.",
  parameters: z.object({
    elementId: z.number().int(),
    text: z.string(),
    submit: z.boolean().default(false),
  }),
  async execute({ elementId, text, submit }, ctx?: Ctx) {
    const { session } = ctx!.context;
    await session.type(elementId, text, submit);
    return session.snapshotText();
  },
});

export const extract = tool({
  name: "extract",
  description:
    "Extract structured data from the current page, e.g. all product cards with name, price, RAM.",
  parameters: z.object({ instruction: z.string() }),
  async execute({ instruction }, ctx?: Ctx) {
    const pageText = await ctx!.context.session.pageText();
    // Nested plain LLM call (not an agent): pageText + instruction -> JSON.
    // Use the OpenAI client with a JSON schema / structured output here.
    return JSON.stringify(await extractWithLLm(pageText, instruction));
  },
});

export const recordFinding = tool({
  name: "record_finding",
  description: "Save a candidate result. Always include the source URL.",
  parameters: z.object({
    name: z.string(),
    price: z.number(),
    ram: z.string(),
    url: urlSchema,
  }),
  async execute(item, ctx?: Ctx) {
    ctx!.context.findings.push(item);
    return `Saved. Total findings: ${ctx!.context.findings.length}`;
  },
});

export const browserTools = [
  updatePlan,
  navigate,
  observe,
  click,
  typeText,
  extract,
  recordFinding,
];
