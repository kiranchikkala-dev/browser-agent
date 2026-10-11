import { z } from "zod";
import { urlSchema } from "./url";

export const Finding = z.object({
  name: z.string(),
  price: z.number(),
  ram: z.string(),
  url: urlSchema,
});
export type Finding = z.infer<typeof Finding>;
