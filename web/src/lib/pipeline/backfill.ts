import { getTrends } from "@/lib/data";
import type { Trend } from "@/types";
import type { RawItem } from "@/lib/pipeline/types";
import {
  isRedditConfigured,
  searchRedditHistory,
} from "@/lib/pipeline/connectors/reddit";
import {
  isYouTubeConfigured,
  searchYouTubeWindow,
} from "@/lib/pipeline/connectors/youtube";
import { fuzzyMatch, trendTerms } from "@/lib/pipeline/resolve";
import { normalizeText } from "@/lib/pipeline/dedup";
import { bestImageFor } from "@/lib/pipeline/media";
import { classifyItems } from "@/lib/pipeline/sentiment";
import { aggregateHistory } from "@/lib/pipeline/history-series";
import * as store from "@/lib/pipeline/store";

// The history bot. For one trend it walks BACK in time across Reddit and
// YouTube, collects the era's biggest posts with their true publish dates and
// engagement, and persists them into the same append-only corpus everything
// else reads. One pass turns a trend card's empty chart into a 12-month
// rise-and-fall curve. Items only link to the trend if they actually match
// it (fuzzy gate) — a loose search hit is corpus, not evidence.

const DAY_MS = 86_400_000;
/** Quarterly windows keep the youtube quota bill at ~4 searches per trend. */
const YT_QUARTERS = 4;

export interface BackfillReport {
  trend_id: string;
  collected: number;
  new_items: number;
  linked: number;
  span_days: number;
  sentiment_classified: number;
}

export async function runTrendBackfill(
  slug: string,
  opts: { includeYouTube?: boolean; trend?: Trend } = {}
): Promise<BackfillReport> {
  const includeYouTube = opts.includeYouTube ?? true;
  // Callers that already hold the trend can pass it to skip a full-table read.
  const trend =
    opts.trend ?? (await getTrends()).find((t) => t.slug === slug);
  if (!trend) throw new Error(`No trend with slug "${slug}"`);

  const now = Date.now();
  const capturedAt = new Date(now).toISOString();
  const collected: RawItem[] = [];

  if (isRedditConfigured()) {
    try {
      collected.push(...(await searchRedditHistory(trend.name, capturedAt)));
    } catch (err) {
      console.error(`[backfill] reddit history "${trend.name}" failed:`, err);
    }
  }
  if (includeYouTube && isYouTubeConfigured()) {
    const quarterMs = (365 / YT_QUARTERS) * DAY_MS;
    for (let q = 0; q < YT_QUARTERS; q++) {
      const before = new Date(now - q * quarterMs).toISOString();
      const after = new Date(now - (q + 1) * quarterMs).toISOString();
      try {
        collected.push(
          ...(await searchYouTubeWindow(trend.name, after, before, capturedAt))
        );
      } catch (err) {
        console.error(
          `[backfill] youtube window ${q} "${trend.name}" failed:`,
          err
        );
        break; // quota errors will repeat — stop burning calls
      }
    }
  }

  const unique = [...new Map(collected.map((i) => [i.id, i])).values()];
  const newItems = await store.insertRawItems(unique);

  // Link only items that genuinely match the trend — search results are a
  // net, the fuzzy gate is the sieve.
  const links = unique
    .filter((item) => {
      const matches = fuzzyMatch(item, [trend]);
      return matches.length > 0 && matches[0].confidence >= 0.5;
    })
    .map((item) => ({
      item_id: item.id,
      trend_id: trend.id,
      matched_by: "fuzzy" as const,
      confidence: 0.7,
    }));
  await store.upsertLinks(links);

  // The trend's card should show its real content: highest-engagement linked
  // item with renderable media becomes the hero image.
  const linkedItems = links
    .map((l) => unique.find((i) => i.id === l.item_id))
    .filter((i): i is RawItem => Boolean(i));

  // History sentiment is derived from per-post labels, never a model-authored
  // curve. Classify only newly encountered linked items; annotations are
  // durable and reused by every later timeline/history build.
  let sentimentClassified = 0;
  try {
    const annotations = await store.getAnnotations();
    const unlabeled = linkedItems.filter((item) => !annotations.has(item.id));
    const classified = await classifyItems(unlabeled);
    await store.insertAnnotations(classified);
    sentimentClassified = classified.length;
  } catch (err) {
    console.error(`[backfill] sentiment classification failed:`, err);
  }
  const hero = bestImageFor(linkedItems);
  if (hero) {
    try {
      await store.setTrendHeroImage(trend.id, hero);
    } catch (err) {
      console.error(`[backfill] hero image update failed:`, err);
    }
  }

  const linkedTimes = linkedItems.map((i) => Date.parse(i.posted_at));
  const spanDays =
    linkedTimes.length >= 2
      ? Math.round((Math.max(...linkedTimes) - Math.min(...linkedTimes)) / DAY_MS)
      : 0;

  return {
    trend_id: trend.id,
    collected: unique.length,
    new_items: newItems,
    linked: links.length,
    span_days: spanDays,
    sentiment_classified: sentimentClassified,
  };
}

// ---------------------------------------------------------------------------
// History series — what the trend-card chart renders. Monthly buckets of
// deduplicated volume and log-scaled engagement (log so one viral post reads
// as a strong month, not as the only month).
// ---------------------------------------------------------------------------

export interface HistoryBucket {
  /** YYYY-MM */
  period: string;
  volume: number;
  /** Σ log10(1 + engagement) over the bucket's items, rounded. */
  engagement: number;
  /** Arithmetic net of post labels, -1..1; null means not enough evidence. */
  sentiment: number | null;
  labeled_items: number;
  sentiment_counts: Record<import("@/lib/pipeline/types").SentimentLabel, number>;
}

/** The real post that grounds a chart marker — title, link, true numbers. */
export interface EvidenceRef {
  title: string | null;
  url: string;
  source: "reddit" | "youtube";
  container: string | null;
  posted_at: string;
  engagement: Record<string, number> | null;
}

/**
 * A notable point on the arc. Peaks are the months the trend crested;
 * troughs are the quiet valleys between crests. Each carries the month's
 * highest-engagement item so the shape of the line is checkable against a
 * real post, not just claimed.
 */
export interface HistoryMarker {
  period: string;
  kind: "peak" | "trough";
  engagement: number;
  volume: number;
  evidence: EvidenceRef | null;
}

export interface TrendHistory {
  trend_id: string;
  slug: string;
  months: HistoryBucket[];
  markers: HistoryMarker[];
  total_items: number;
  labeled_items: number;
  sentiment_counts: Record<import("@/lib/pipeline/types").SentimentLabel, number>;
  coverage_months: number;
  source_counts: Partial<Record<RawItem["source"], number>>;
  source_first_seen: Partial<Record<RawItem["source"], string>>;
  confidence: "low" | "medium" | "high";
}

export async function buildTrendHistories(
  months = 12
): Promise<TrendHistory[]> {
  const now = Date.now();
  const start = new Date(now - months * 30.5 * DAY_MS).toISOString();
  const end = new Date(now).toISOString();

  const [trends, targeted, swept, links, annotations] = await Promise.all([
    getTrends(),
    store.getItemsInWindow("trend", start, end),
    store.getItemsInWindow("sweep", start, end),
    store.getLinks(),
    store.getAnnotations(),
  ]);
  const itemsById = new Map(
    [...targeted, ...swept].map((i) => [i.id, i])
  );
  const byTrend = new Map<string, RawItem[]>();
  for (const link of links) {
    const item = itemsById.get(link.item_id);
    if (!item) continue;
    const list = byTrend.get(link.trend_id) ?? [];
    list.push(item);
    byTrend.set(link.trend_id, list);
  }

  // Shared month axis, oldest -> current.
  const periods: string[] = [];
  for (let m = months - 1; m >= 0; m--) {
    const d = new Date(now);
    d.setUTCMonth(d.getUTCMonth() - m);
    periods.push(d.toISOString().slice(0, 7));
  }

  const out: TrendHistory[] = [];
  for (const trend of trends) {
    const history = aggregateHistory(byTrend.get(trend.id) ?? [], annotations, periods);
    if (history.total_items === 0) continue;
    const { topByPeriod, ...summary } = history;
    out.push({
      trend_id: trend.id,
      slug: trend.slug,
      ...summary,
      markers: findMarkers(history.months, topByPeriod),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Marker detection — where the arc crested and where it went quiet. Pure and
// deterministic: same buckets in, same markers out.
// ---------------------------------------------------------------------------

const MAX_PEAKS = 2;
/** A valley only counts if it dips to <= 60% of the smaller flanking crest —
 *  shallower wobbles are noise, not story beats. */
const TROUGH_RATIO = 0.6;

function toEvidence(item: RawItem | undefined): EvidenceRef | null {
  if (!item) return null;
  return {
    title: item.title,
    url: item.source_url,
    source: item.source,
    container: item.container,
    posted_at: item.posted_at,
    engagement: item.engagement,
  };
}

function findMarkers(
  months: HistoryBucket[],
  topByPeriod: Map<string, RawItem>
): HistoryMarker[] {
  const eng = months.map((m) => m.engagement);
  const dataIdx = months.flatMap((m, i) => (m.volume > 0 ? [i] : []));
  if (dataIdx.length < 2) return [];

  // Local maxima (plateau-tolerant: >= both neighbors, > 0).
  const candidates = dataIdx.filter((i) => {
    const left = eng[i - 1] ?? 0;
    const right = eng[i + 1] ?? 0;
    return eng[i] > 0 && eng[i] >= left && eng[i] >= right;
  });
  // Greedy top-N by height, at least two months apart so twin peaks on
  // adjacent months don't both claim a marker.
  const peaks: number[] = [];
  for (const i of [...candidates].sort((a, b) => eng[b] - eng[a])) {
    if (peaks.every((p) => Math.abs(p - i) >= 2)) peaks.push(i);
    if (peaks.length >= MAX_PEAKS) break;
  }
  peaks.sort((a, b) => a - b);

  // Troughs: the deepest month strictly between consecutive peaks, and the
  // valley after the last peak when the trend has visibly cooled since.
  const troughs: number[] = [];
  const spans: Array<[number, number]> = [];
  for (let s = 0; s < peaks.length - 1; s++) spans.push([peaks[s], peaks[s + 1]]);
  const lastData = dataIdx[dataIdx.length - 1];
  if (peaks.length > 0 && lastData > peaks[peaks.length - 1] + 1) {
    spans.push([peaks[peaks.length - 1], lastData]);
  }
  for (const [a, b] of spans) {
    let low = -1;
    for (let i = a + 1; i < b; i++) {
      if (low === -1 || eng[i] < eng[low]) low = i;
    }
    if (low === -1) continue;
    const flank = Math.min(eng[a], eng[b]);
    if (flank > 0 && eng[low] <= flank * TROUGH_RATIO) troughs.push(low);
  }

  return [
    ...peaks.map((i) => ({ kind: "peak" as const, i })),
    ...troughs.map((i) => ({ kind: "trough" as const, i })),
  ]
    .sort((a, b) => a.i - b.i)
    .map(({ kind, i }) => ({
      period: months[i].period,
      kind,
      engagement: months[i].engagement,
      volume: months[i].volume,
      evidence: toEvidence(topByPeriod.get(months[i].period)),
    }));
}

/** Terms sanity check used by the API layer (avoids backfilling ghosts of
 *  one-word names like "Look" that would net the whole internet). */
export function isBackfillableName(name: string): boolean {
  return normalizeText(name).split(" ").filter(Boolean).length >= 2 ||
    trendTerms({ name, slug: "" }).length > 1;
}
