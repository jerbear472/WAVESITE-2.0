import { z } from "zod";
import {
  AINotConfiguredError,
  MODEL,
  generateStructuredWithUsage,
  isAIConfigured,
} from "@/lib/ai/provider";
import type { SourceId, TermRow } from "@/lib/terms/types";

// Frontier expansion — the ONE place in the ingestion layer where an AI call
// belongs. From the transient context texts an adapter surfaced during its
// counting pass (titles/snippets held in memory, never persisted), extract
// noun phrases that co-occur with tracked terms and add them as candidates.
//
// Batching is mandatory: ONE call per run per source, never one per item.
//
// Boundary (step 7): the model extracts and clusters LANGUAGE. It never
// assigns a numeric magnitude, score, or ranking — all numbers in this layer
// come from counts and arithmetic.

const ExtractionSchema = z.object({
  phrases: z
    .array(
      z.object({
        phrase: z.string(),
        category: z.string().optional(),
      })
    )
    .max(15),
});

export interface SpendMeter {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  est_usd: number;
  ceiling_usd: number;
  exceeded: boolean;
}

export function newSpendMeter(): SpendMeter {
  return {
    calls: 0,
    input_tokens: 0,
    output_tokens: 0,
    est_usd: 0,
    ceiling_usd: Number(process.env.TERMS_AI_CEILING_USD || 1.0),
    exceeded: false,
  };
}

// Prices are per million tokens, configurable so a model swap doesn't
// silently break the estimate. Defaults match the current default MODEL.
const USD_PER_MTOK_IN = Number(process.env.AI_USD_PER_MTOK_IN || 15);
const USD_PER_MTOK_OUT = Number(process.env.AI_USD_PER_MTOK_OUT || 75);

function record(meter: SpendMeter, usage: { input_tokens: number; output_tokens: number }) {
  meter.calls += 1;
  meter.input_tokens += usage.input_tokens;
  meter.output_tokens += usage.output_tokens;
  meter.est_usd =
    Math.round(
      (meter.input_tokens / 1e6) * USD_PER_MTOK_IN * 100 +
        (meter.output_tokens / 1e6) * USD_PER_MTOK_OUT * 100
    ) / 100;
  if (meter.est_usd >= meter.ceiling_usd) meter.exceeded = true;
}

const MAX_CONTEXTS_PER_SOURCE = 80;

/**
 * One batched extraction call for one source. Returns candidate phrases, or
 * [] when AI is unconfigured, the ceiling is hit, or there's nothing to read
 * — all of which are normal, not errors.
 */
export async function extractFrontierPhrases(
  source: SourceId,
  contextTexts: string[],
  trackedTerms: TermRow[],
  meter: SpendMeter
): Promise<{ phrase: string; category?: string }[]> {
  if (!isAIConfigured()) return [];
  if (meter.exceeded) {
    console.error(
      `[terms/frontier] AI spend ceiling $${meter.ceiling_usd} reached — skipping ${source} extraction`
    );
    return [];
  }
  const contexts = [...new Set(contextTexts)].slice(0, MAX_CONTEXTS_PER_SOURCE);
  if (contexts.length < 5) return [];

  const known = trackedTerms.map((t) => t.canonical).slice(0, 200);
  try {
    const { data, usage } = await generateStructuredWithUsage({
      system:
        "You extract candidate trend terms from platform text snippets. " +
        "Return noun phrases and short phrases (1-4 words) that look like " +
        "named things gaining attention: products, aesthetics, memes, " +
        "artists, formats, behaviors. Only phrases that appear in or are " +
        "directly implied by the snippets. Exclude: generic words, phrases " +
        "already in the known-terms list, usernames, and platform boilerplate. " +
        "Schema: {\"phrases\": [{\"phrase\": string, \"category\": string?}]} — at most 15.",
      prompt:
        `Source: ${source}\n\nKnown terms (exclude these and trivial variants):\n` +
        `${known.join(", ")}\n\nSnippets:\n` +
        contexts.map((c) => `- ${c}`).join("\n"),
      schema: ExtractionSchema,
      maxTokens: 1200,
    });
    record(meter, usage);
    return data.phrases;
  } catch (err) {
    if (err instanceof AINotConfiguredError) return [];
    // Extraction is enrichment, not measurement — a failed call costs us
    // candidates, never counts.
    console.error(`[terms/frontier] ${source} extraction failed (${MODEL}):`, err);
    return [];
  }
}
