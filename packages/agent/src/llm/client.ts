import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

export const MODEL = "gpt-4.1-mini"; // cheap and fast; this is a plain extraction call
const openai = new OpenAI(); // reads OPENAI_API_KEY from the environment

const SYSTEM_PROMPT = readFileSync(
  fileURLToPath(new URL("../prompts/extract.md", import.meta.url)),
  "utf8",
);

/** Non-agent LLM call: page text + instruction in, parsed JSON out. */
export async function extractJson(
  pageText: string,
  instruction: string,
): Promise<unknown> {
  const res = await openai.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Instruction: ${instruction}\n\nPAGE TEXT:\n${pageText}`,
      },
    ],
  });
  return JSON.parse(res.choices[0]?.message?.content ?? "{}");
}
