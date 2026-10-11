import { Agent } from "@openai/agents";
import { AgentContext } from "./context";
import { browserTools } from "./tools";
import { FinalResult } from "./schemas/finalResult";

export const browserAgent = new Agent<AgentContext>({
  name: "Browser Agent",
  model: "gpt-4o-mini",
  instructions: `
You control a web browser to complete the user's task autonomously.

Rules:
1. Start by calling update_plan with your steps and the exact constraints.
2. Use observe after anything that may have changed the page.
3. Refer to elements ONLY by the numbers in the latest observation.
4. Use extract for lists of items instead of reading them manually.
5. Every candidate must be saved with record_finding, including its source URL.
6. If an action fails twice, try a different approach and update your plan.
7. Stop when the constraints are satisfied. Never invent data.
  `,
  tools: browserTools,
  outputType: FinalResult,
});
