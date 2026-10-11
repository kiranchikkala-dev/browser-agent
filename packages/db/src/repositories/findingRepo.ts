import { db } from "../..";
import { findings } from "../../schema";

type FindingInput = { url: string } & Record<string, unknown>;

export const findingRepo = {
  async addMany(taskId: string, items: FindingInput[]) {
    if (!items.length) return;
    await db
      .insert(findings)
      .values(
        items.map((item) => ({ taskId, data: item, sourceUrl: item.url })),
      );
  },
};
