import { z } from "zod";
import type { Trend } from "@/types";
import type { ItemTrendLink, RawItem } from "@/lib/pipeline/types";
import { normalizeText } from "@/lib/pipeline/dedup";
import { generateStructured, isAIConfigured } from "@/lib/ai/provider";

// Entity resolution — which trend(s) does an item belong to?
// Fuzzy term matching first (deterministic, free), model escalation only for
// the ambiguous middle band, manual merge as the human override. This is one
// of the model's permitted roles: clustering, never numeric magnitude.

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "in", "on", "for", "to", "with",
  "trend", "aesthetic", "core", "era", "new", "style",
]);

/** Match terms for a trend: full name plus significant tokens. */
export function trendTerms(trend: Pick<Trend, "name" | "slug">): string[] {
  const name = normalizeText(trend.name);
  const tokens = name.split(" ").filter((t) => t.length > 2 && !STOPWORDS.has(t));
  return [name, ...tokens];
}

export interface FuzzyMatch {
  trend_id: string;
  confidence: number;
}

/**
 * Deterministic fuzzy match of one item against all trends.
 *   full trend name in text        -> 0.95
 *   all significant tokens present -> 0.8
 *   >=60% of tokens (min 2)        -> 0.5 (ambiguous — escalate)
 */
export function fuzzyMatch(
  item: RawItem,
  trends: Pick<Trend, "id" | "name" | "slug">[]
): FuzzyMatch[] {
  const hay = normalizeText(`${item.title ?? ""} ${item.text ?? ""}`);
  if (!hay) return [];
  const out: FuzzyMatch[] = [];
  for (const trend of trends) {
    const [fullName, ...tokens] = trendTerms(trend);
    if (fullName.length > 3 && hay.includes(fullName)) {
      out.push({ trend_id: trend.id, confidence: 0.95 });
      continue;
    }
    if (tokens.length === 0) continue;
    const present = tokens.filter((t) => hay.includes(t)).length;
    if (present === tokens.length && tokens.length >= 2) {
      out.push({ trend_id: trend.id, confidence: 0.8 });
    } else if (present >= 2 && present / tokens.length >= 0.6) {
      out.push({ trend_id: trend.id, confidence: 0.5 });
    }
  }
  return out.sort((a, b) => b.confidence - a.confidence);
}

const escalationSchema = z.object({
  decisions: z.array(
    z.object({
      item_index: z.number(),
      trend_id: z.string().nullable(),
    })
  ),
});

/** Cost bound: at most this many ambiguous items go to the model per run. */
export const MAX_ESCALATIONS = 40;

/**
 * Model escalation for the ambiguous band. The model picks which candidate
 * trend (or none) an item genuinely belongs to — a clustering judgment, not
 * a score. Failures degrade to "no link", never to a guess.
 */
export async function escalateAmbiguous(
  ambiguous: { item: RawItem; candidates: FuzzyMatch[] }[],
  trends: Pick<Trend, "id" | "name" | "one_line_summary">[]
): Promise<ItemTrendLink[]> {
  if (ambiguous.length === 0 || !isAIConfigured()) return [];
  const batch = ambiguous.slice(0, MAX_ESCALATIONS);
  const trendById = new Map(trends.map((t) => [t.id, t]));

  const list = batch
    .map(({ item, candidates }, i) => {
      const cands = candidates
        .map((c) => {
          const t = trendById.get(c.trend_id);
          return t ? `${t.id} ("${t.name}": ${t.one_line_summary})` : c.trend_id;
        })
        .join(" | ");
      const text = `${item.title ?? ""} ${item.text ?? ""}`.slice(0, 300);
      return `${i}. [${item.platform}] "${text}" — candidates: ${cands}`;
    })
    .join("\n");

  try {
    const result = await generateStructured({
      system:
        "You are WaveSight's entity-resolution engine. For each social item, decide which ONE of its candidate trends it is genuinely about, or null if none. Surface-level keyword overlap is not enough — the item must actually be about the trend. Never invent trend ids.",
      prompt: `Items and their candidate trend ids:\n${list}\n\nReturn JSON: { "decisions": [{ "item_index": int, "trend_id": string or null }] } — one decision per item, trend_id must be copied exactly from that item's candidates or be null.`,
      schema: escalationSchema,
      maxTokens: 4000,
    });
    const links: ItemTrendLink[] = [];
    for (const d of result.decisions) {
      const entry = batch[d.item_index];
      if (!entry || !d.trend_id) continue;
      // Only accept ids that were actually candidates for that item.
      if (!entry.candidates.some((c) => c.trend_id === d.trend_id)) continue;
      links.push({
        item_id: entry.item.id,
        trend_id: d.trend_id,
        matched_by: "model",
        confidence: 0.7,
      });
    }
    return links;
  } catch (err) {
    console.error("[resolve] escalation failed, ambiguous items unlinked:", err);
    return [];
  }
}

/**
 * Full resolution pass: fuzzy links for confident matches, model escalation
 * for the ambiguous band. Returns links ready to upsert.
 */
export async function resolveItems(
  items: RawItem[],
  trends: Pick<Trend, "id" | "name" | "slug" | "one_line_summary">[]
): Promise<ItemTrendLink[]> {
  const links: ItemTrendLink[] = [];
  const ambiguous: { item: RawItem; candidates: FuzzyMatch[] }[] = [];

  for (const item of items) {
    const matches = fuzzyMatch(item, trends);
    const confident = matches.filter((m) => m.confidence >= 0.8);
    const mid = matches.filter((m) => m.confidence >= 0.4 && m.confidence < 0.8);
    for (const m of confident) {
      links.push({
        item_id: item.id,
        trend_id: m.trend_id,
        matched_by: "fuzzy",
        confidence: m.confidence,
      });
    }
    if (confident.length === 0 && mid.length > 0) {
      ambiguous.push({ item, candidates: mid });
    }
  }

  const escalated = await escalateAmbiguous(ambiguous, trends);
  return [...links, ...escalated];
}
