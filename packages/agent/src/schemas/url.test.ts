import assert from "node:assert/strict";
import test from "node:test";
import { zodResponsesFunction, zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { FinalResult } from "./finalResult";
import { urlSchema } from "./url";
import { navigate } from "../tools/navigate";

test("URL schemas stay compatible with OpenAI structured outputs", () => {
  const outputSchema = zodTextFormat(FinalResult, "output").schema as {
    properties: { items: { items: { properties: { url: Record<string, unknown> } } } };
  };
  assert.equal(outputSchema.properties.items.items.properties.url.format, undefined);

  const findingSchema = zodResponsesFunction({
    name: "record_finding",
    parameters: z.object({
      name: z.string(),
      price: z.number(),
      ram: z.string(),
      url: urlSchema,
    }),
    function: () => undefined,
  }).parameters as { properties: { url: Record<string, unknown> } };
  assert.equal(findingSchema.properties.url.format, undefined);
  assert.equal(
    (navigate.parameters as { properties: { url: Record<string, unknown> } })
      .properties.url.format,
    undefined,
  );

  assert.equal(urlSchema.safeParse("https://example.com/item").success, true);
  assert.equal(urlSchema.safeParse("not a URL").success, false);
});
