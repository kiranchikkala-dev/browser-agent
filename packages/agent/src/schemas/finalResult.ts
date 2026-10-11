import { z } from "zod";
import { urlSchema } from "./url";

export const FinalResult = z.object({
  summary: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      price: z.number(),
      ram: z.string(),
      url: urlSchema,
    }),
  ),
  notes: z.string().nullable(),
});

export type FinalResultType = z.infer<typeof FinalResult>;
