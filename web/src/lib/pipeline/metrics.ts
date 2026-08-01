import type { RawItem, RawMetrics, SentimentLabel } from "@/lib/pipeline/types";
import {
  dedupeItems,
  topAuthorConcentration,
  uniqueAuthors,
} from "@/lib/pipeline/dedup";
import { normalizeText } from "@/lib/pipeline/dedup";

// Computed metrics — NO model calls anywhere in this file. Every number is a
// pure function of stored items (plus per-item sentiment labels that were
// classified separately and aggregate arithmetically here). Given the same
// corpus, the same numbers.

const DAY_MS = 86_400_000;

/** Big-account thresholds for the saturation metric (share of items from
 *  high-reach venues/accounts, using sizes captured at collection time). */
export const SATURATION_YT_SUBSCRIBERS = 100_000;
export const SATURATION_REDDIT_SUB_SIZE = 2_000_000;

export interface MetricsInput {
  /** Items linked to the trend, already restricted to the window. */
  items: RawItem[];
  /** Baseline corpus items in the same window (unfiltered control). */
  baselineItems: RawItem[];
  /** Trend match terms (for lift: organic presence in the control corpus). */
  terms: string[];
  windowStart: string;
  windowEnd: string;
  /** Per-item sentiment labels (item id -> label), model-classified upstream. */
  sentimentByItem?: Map<string, SentimentLabel>;
}

/** Daily deduplicated volume by posted_at, over the window (UTC days). */
export function dailyVolumes(
  items: RawItem[],
  windowStart: string,
  windowEnd: string
): number[] {
  const start = Date.parse(windowStart);
  const end = Date.parse(windowEnd);
  const days = Math.max(1, Math.ceil((end - start) / DAY_MS));
  const counts = new Array<number>(days).fill(0);
  for (const item of items) {
    const t = Date.parse(item.posted_at);
    if (t < start || t >= end) continue;
    counts[Math.min(days - 1, Math.floor((t - start) / DAY_MS))]++;
  }
  return counts;
}

/** Least-squares slope of a daily series: items/day per day. */
export function slope(series: number[]): number {
  const n = series.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = series.reduce((s, y) => s + y, 0) / n;
  let num = 0;
  let den = 0;
  for (let x = 0; x < n; x++) {
    num += (x - meanX) * (series[x] - meanY);
    den += (x - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

/** Does an item's text mention any of the trend terms? (for lift) */
export function mentionsAny(item: RawItem, normTerms: string[]): boolean {
  const hay = normalizeText(`${item.title ?? ""} ${item.text ?? ""}`);
  return normTerms.some((t) => t.length > 0 && hay.includes(t));
}

/** Share of items from high-reach accounts/venues, 0-1. */
export function saturationShare(items: RawItem[]): number {
  if (items.length === 0) return 0;
  let big = 0;
  for (const i of items) {
    const meta = i.author_meta ?? {};
    if (
      (i.source === "youtube" &&
        (meta["subscriber_count"] ?? 0) >= SATURATION_YT_SUBSCRIBERS) ||
      (i.source === "reddit" &&
        (meta["container_subscribers"] ?? 0) >= SATURATION_REDDIT_SUB_SIZE)
    ) {
      big++;
    }
  }
  return big / items.length;
}

/**
 * Net sentiment from per-item labels, -1..1. Arithmetic aggregation of a
 * per-item classification — the one place model output enters, as a label,
 * never as a magnitude. Ironic counts as mildly negative (0.25 weight):
 * ironic distance is participation without endorsement.
 */
export function netSentiment(
  items: RawItem[],
  labels: Map<string, SentimentLabel>
): number | null {
  let pos = 0;
  let neg = 0;
  let ironic = 0;
  let n = 0;
  for (const i of items) {
    const l = labels.get(i.id);
    if (!l) continue;
    n++;
    if (l === "positive") pos++;
    else if (l === "negative") neg++;
    else if (l === "ironic") ironic++;
  }
  if (n === 0) return null;
  return (pos - neg - 0.25 * ironic) / n;
}

/** All raw metrics for one trend in one window. Deterministic. */
export function computeRawMetrics(input: MetricsInput): RawMetrics {
  const { canonical } = dedupeItems(input.items);

  const daily = dailyVolumes(canonical, input.windowStart, input.windowEnd);
  const velocity = slope(daily);
  const half = Math.floor(daily.length / 2);
  const acceleration =
    daily.length >= 4 ? slope(daily.slice(half)) - slope(daily.slice(0, half)) : 0;

  const normTerms = input.terms.map(normalizeText).filter((t) => t.length > 2);
  const { canonical: baselineCanonical } = dedupeItems(input.baselineItems);
  const baselineMentions = baselineCanonical.filter((b) =>
    mentionsAny(b, normTerms)
  ).length;
  // Lift: organic presence in the unfiltered control corpus, per mille.
  // 0 = the culture-at-large sample never mentions it (query-bubble only).
  const lift =
    baselineCanonical.length === 0
      ? 0
      : (baselineMentions / baselineCanonical.length) * 1000;

  return {
    volume: canonical.length,
    unique_authors: uniqueAuthors(canonical),
    velocity: round3(velocity),
    acceleration: round3(acceleration),
    breadth: new Set(canonical.map((i) => i.platform)).size,
    lift: round3(lift),
    saturation: round3(saturationShare(canonical)),
    author_concentration: round3(topAuthorConcentration(canonical)),
    sentiment_net: input.sentimentByItem
      ? roundOrNull(netSentiment(canonical, input.sentimentByItem))
      : null,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function roundOrNull(n: number | null): number | null {
  return n === null ? null : round3(n);
}
