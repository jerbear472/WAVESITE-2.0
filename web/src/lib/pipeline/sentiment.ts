import { z } from "zod";
import type { RawItem, SentimentLabel } from "@/lib/pipeline/types";
import { MODEL, generateStructured, isAIConfigured } from "@/lib/ai/provider";

// Per-item sentiment classification — the model's permitted role here is a
// LABEL per item (positive/neutral/negative/ironic), never a 0-100 magnitude.
// Labels aggregate arithmetically in metrics.ts. Classified once per item,
// cached in item_annotations.

const BATCH_SIZE = 40;
/** Cost bound per run. */
export const MAX_CLASSIFICATIONS = 400;

const batchSchema = z.object({
  labels: z.array(
    z.object({
      index: z.number(),
      sentiment: z.enum(["positive", "neutral", "negative", "ironic"]),
    })
  ),
});

export interface ClassifiedItem {
  item_id: string;
  sentiment: SentimentLabel;
  model: string;
}

/** Classify a set of items; failures skip the batch (no label, never a guess). */
export async function classifyItems(
  items: RawItem[]
): Promise<ClassifiedItem[]> {
  if (!isAIConfigured() || items.length === 0) return [];
  const capped = items.slice(0, MAX_CLASSIFICATIONS);
  const out: ClassifiedItem[] = [];

  for (let i = 0; i < capped.length; i += BATCH_SIZE) {
    const batch = capped.slice(i, i + BATCH_SIZE);
    const list = batch
      .map((item, j) => {
        const text = `${item.title ?? ""} — ${item.text ?? ""}`
          .slice(0, 240)
          .replace(/\s+/g, " ");
        return `${j}. [${item.platform}] ${text}`;
      })
      .join("\n");
    try {
      const result = await generateStructured({
        system:
          "You classify the emotional stance of social/media items toward their subject. positive = genuine enthusiasm or endorsement. negative = criticism, backlash, fatigue. ironic = mocking/deadpan participation, engagement without endorsement. neutral = informational or unclear. Classify the stance of the POST, not the pleasantness of its topic.",
        prompt: `Classify each item:\n${list}\n\nReturn JSON: { "labels": [{ "index": int, "sentiment": "positive"|"neutral"|"negative"|"ironic" }] } — one label per item.`,
        schema: batchSchema,
        maxTokens: 3000,
      });
      for (const l of result.labels) {
        const item = batch[l.index];
        if (!item) continue;
        out.push({ item_id: item.id, sentiment: l.sentiment, model: MODEL });
      }
    } catch (err) {
      console.error("[sentiment] batch classification failed, skipping:", err);
    }
  }
  return out;
}
