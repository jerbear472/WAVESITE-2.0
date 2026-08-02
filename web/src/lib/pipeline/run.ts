import type { Trend } from "@/types";
import { getTrends } from "@/lib/data";
import type {
  DistributionStats,
  MetricName,
  RawItem,
  RawMetrics,
  SentimentLabel,
  TrendMetricsRow,
} from "@/lib/pipeline/types";
import { METRIC_NAMES } from "@/lib/pipeline/types";
import {
  isRedditConfigured,
  sampleRedditBaseline,
  searchRedditItems,
} from "@/lib/pipeline/connectors/reddit";
import {
  isYouTubeConfigured,
  sampleYouTubeBaseline,
  searchYouTubeItems,
} from "@/lib/pipeline/connectors/youtube";
import { resolveItems, trendTerms } from "@/lib/pipeline/resolve";
import { classifyItems } from "@/lib/pipeline/sentiment";
import { computeRawMetrics } from "@/lib/pipeline/metrics";
import {
  HISTORY_WINDOW_DAYS,
  normalizeAgainstHistory,
} from "@/lib/pipeline/normalize";
import { DEFAULT_STATE_BANDS, assignState, type StateBands } from "@/lib/pipeline/states";
import { runSweep } from "@/lib/pipeline/sweep";
import { bestImageFor } from "@/lib/pipeline/media";
import { detectAndName, type DetectionReport } from "@/lib/pipeline/detect";
import * as store from "@/lib/pipeline/store";

// The measured pulse — collection separated from scoring.
//   1. COLLECT   individual items from real connectors (+ unfiltered baseline)
//   2. RESOLVE   items -> trends (fuzzy, model escalation, manual overrides)
//   3. CLASSIFY  per-item sentiment labels (model as classifier, cached)
//   4. COMPUTE   raw metrics — pure arithmetic on the stored corpus
//   5. NORMALIZE percentile vs trailing-90d history (provisional on cold start)
//   6. STATE     percentile bands from config
//   7. INSTRUMENT log every metric's distribution shape
// The legacy model-scored pulse (lib/pulse.ts) is untouched and still behind
// /api/pulse; this path is /api/pipeline/run, so both can run on the same day
// and be compared.

export const DEFAULT_WINDOW_DAYS = 14;
const DAY_MS = 86_400_000;

export interface MeasuredRunReport {
  run_id: string;
  window_start: string;
  window_end: string;
  sweep: { items: number; reddit_venues: number; youtube_categories: number };
  detection: DetectionReport;
  collected: { reddit: number; youtube: number; baseline: number; new_items: number };
  /** Trends skipped by targeted collection (no organic volume, not new). */
  ghosts_skipped: number;
  linked_items: number;
  classified: number;
  trends_measured: number;
  provisional: boolean;
  states: Record<string, number>;
  distributions: Record<string, DistributionStats>;
}

export async function runMeasuredPulse(
  opts: { windowDays?: number } = {}
): Promise<MeasuredRunReport> {
  const windowDays = opts.windowDays ?? DEFAULT_WINDOW_DAYS;
  const now = new Date();
  const nowIso = now.toISOString();
  const windowStart = new Date(now.getTime() - windowDays * DAY_MS).toISOString();
  const runId = `mrun-${now.getTime()}`;

  // -- 0. SWEEP + DETECT -------------------------------------------------
  // The firehose first: broad venue sweep, then bottom-up detection names
  // what is spiking BEFORE targeted collection — so a trend born this run
  // is measured this run.
  const sweep = await runSweep(nowIso);
  await store.insertRawItems(sweep.items);

  let detection: DetectionReport = {
    clusters_found: 0,
    trends_created: [],
    dismissed: 0,
  };
  try {
    detection = await detectAndName({
      runId,
      windowEndIso: nowIso,
      knownTrends: (await getTrends()).map((t) => ({ id: t.id, name: t.name })),
    });
  } catch (err) {
    console.error("[pipeline] detection failed — continuing without it:", err);
  }

  const trends = (await getTrends()) as Trend[];

  // -- 1. COLLECT --------------------------------------------------------
  // Targeted collection deepens coverage of trends that exist. Ghosts —
  // no organic volume last run and not recently born — get no queries;
  // quota goes to reality. (First run: no prior metrics, collect for all.)
  const lastRunId = await store.getLatestMetricsRun();
  const prevMetrics = lastRunId ? await store.getMetricsForRun(lastRunId) : [];
  const activeIds = new Set(
    prevMetrics.filter((r) => r.raw.volume > 0).map((r) => r.trend_id)
  );
  const isFreshTrend = (t: Trend) =>
    Date.parse(t.created_at) > now.getTime() - 14 * DAY_MS;
  const collectFor = trends.filter(
    (t) => prevMetrics.length === 0 || activeIds.has(t.id) || isFreshTrend(t)
  );
  const ghostsSkipped = trends.length - collectFor.length;

  const collectedItems: RawItem[] = [];
  let redditCount = 0;
  let youtubeCount = 0;

  for (const trend of collectFor) {
    const term = trend.name;
    if (isRedditConfigured()) {
      try {
        const items = await searchRedditItems(term, nowIso);
        redditCount += items.length;
        collectedItems.push(...items);
      } catch (err) {
        console.error(`[pipeline] reddit search "${term}" failed:`, err);
      }
    }
    if (isYouTubeConfigured()) {
      try {
        const items = await searchYouTubeItems(term, windowStart, nowIso);
        youtubeCount += items.length;
        collectedItems.push(...items);
      } catch (err) {
        console.error(`[pipeline] youtube search "${term}" failed:`, err);
      }
    }
  }

  // Baseline corpus: same sources, NO trend filtering. Required — lift and
  // every "compared to what?" answer depends on it.
  const baselineItems: RawItem[] = [];
  if (isRedditConfigured()) {
    try {
      baselineItems.push(...(await sampleRedditBaseline(nowIso)));
    } catch (err) {
      console.error("[pipeline] reddit baseline failed:", err);
    }
  }
  if (isYouTubeConfigured()) {
    try {
      baselineItems.push(...(await sampleYouTubeBaseline(nowIso)));
    } catch (err) {
      console.error("[pipeline] youtube baseline failed:", err);
    }
  }

  const newItems = await store.insertRawItems([
    ...collectedItems,
    ...baselineItems,
  ]);

  // -- Scoring reads from the corpus, not from what this run happened to
  // fetch: the window may include items captured by earlier runs. Sweep
  // items count as evidence too — an organic firehose mention of a trend is
  // worth more than a query hit, not less.
  const [targeted, sweptWindow, corpusBaseline] = await Promise.all([
    store.getItemsInWindow("trend", windowStart, nowIso),
    store.getItemsInWindow("sweep", windowStart, nowIso),
    store.getItemsInWindow("baseline", windowStart, nowIso),
  ]);
  const corpusTrendItems = [
    ...new Map([...targeted, ...sweptWindow].map((i) => [i.id, i])).values(),
  ];

  // -- 2. RESOLVE --------------------------------------------------------
  const links = await resolveItems(corpusTrendItems, trends);
  await store.upsertLinks(links);
  const allLinks = await store.getLinks(); // includes prior manual merges
  const itemsById = new Map(corpusTrendItems.map((i) => [i.id, i]));
  const itemsByTrend = new Map<string, RawItem[]>();
  for (const link of allLinks) {
    const item = itemsById.get(link.item_id);
    if (!item) continue;
    const list = itemsByTrend.get(link.trend_id) ?? [];
    list.push(item);
    itemsByTrend.set(link.trend_id, list);
  }

  // -- 3. CLASSIFY (cached per item) -------------------------------------
  const annotations = await store.getAnnotations();
  const linkedItems = [...new Set(allLinks.map((l) => l.item_id))]
    .map((id) => itemsById.get(id))
    .filter((i): i is RawItem => Boolean(i));
  const unclassified = linkedItems.filter((i) => !annotations.has(i.id));
  const fresh = await classifyItems(unclassified);
  await store.insertAnnotations(fresh);
  const sentimentByItem = new Map<string, SentimentLabel>();
  for (const [id, a] of annotations) {
    if (a.sentiment) sentimentByItem.set(id, a.sentiment);
  }
  for (const c of fresh) sentimentByItem.set(c.item_id, c.sentiment);

  // -- 4. COMPUTE --------------------------------------------------------
  const rawByTrend = new Map<string, RawMetrics>();
  for (const trend of trends) {
    const items = itemsByTrend.get(trend.id) ?? [];
    rawByTrend.set(
      trend.id,
      computeRawMetrics({
        items,
        baselineItems: corpusBaseline,
        terms: trendTerms(trend),
        windowStart,
        windowEnd: nowIso,
        sentimentByItem,
      })
    );
  }

  // -- 5. NORMALIZE ------------------------------------------------------
  const historySince = new Date(
    now.getTime() - HISTORY_WINDOW_DAYS * DAY_MS
  ).toISOString();
  const historyByMetric = new Map(
    await Promise.all(
      METRIC_NAMES.map(async (m) => {
        return [m, await store.getMetricHistory(m, historySince)] as const;
      })
    )
  );

  const bands =
    (await store.getConfig<StateBands>("state_bands")) ?? DEFAULT_STATE_BANDS;

  const metricRows: TrendMetricsRow[] = [];
  let anyProvisional = false;
  const stateCounts: Record<string, number> = {};

  for (const trend of trends) {
    const raw = rawByTrend.get(trend.id)!;
    const percentiles: Partial<Record<MetricName, number>> = {};
    let provisional = false;
    for (const metric of METRIC_NAMES) {
      const value = raw[metric];
      if (value === null) continue;
      const withinRun = trends
        .map((t) => rawByTrend.get(t.id)![metric])
        .filter((v): v is number => v !== null);
      const result = normalizeAgainstHistory(
        value,
        historyByMetric.get(metric) ?? [],
        withinRun,
        nowIso
      );
      percentiles[metric] = result.percentile;
      provisional = provisional || result.provisional;
    }
    anyProvisional = anyProvisional || provisional;
    const state = assignState(percentiles, bands);
    stateCounts[state] = (stateCounts[state] ?? 0) + 1;
    metricRows.push({
      id: `tm-${runId}-${trend.id}`,
      run_id: runId,
      trend_id: trend.id,
      window_start: windowStart,
      window_end: nowIso,
      raw,
      percentiles,
      state,
      provisional,
    });
  }

  await store.insertTrendMetrics(metricRows);
  await store.insertMetricHistory(
    metricRows.flatMap((row) =>
      METRIC_NAMES.filter((m) => row.raw[m] !== null).map((m) => ({
        id: `mh-${runId}-${row.trend_id}-${m}`,
        metric: m,
        raw_value: row.raw[m] as number,
        trend_id: row.trend_id,
        run_id: runId,
        recorded_at: nowIso,
      }))
    )
  );

  // -- 6.5 REAL IMAGERY --------------------------------------------------
  // Refresh each measured trend's hero image from its best corpus media so
  // cards show actual trend content, not stock art. Best-effort.
  for (const trend of trends) {
    const items = itemsByTrend.get(trend.id) ?? [];
    if (items.length === 0) continue;
    const hero = bestImageFor(items);
    if (hero && hero !== trend.hero_image_url) {
      try {
        await store.setTrendHeroImage(trend.id, hero);
      } catch (err) {
        console.error(`[pipeline] hero image for ${trend.slug} failed:`, err);
      }
    }
  }

  // -- 7. INSTRUMENT -----------------------------------------------------
  const distributions: Record<string, DistributionStats> = {};
  for (const metric of METRIC_NAMES) {
    const values = metricRows
      .map((r) => r.percentiles[metric])
      .filter((v): v is number => v !== undefined);
    if (values.length > 0) distributions[metric] = distStats(values);
  }
  await store.insertRunDistributions(runId, distributions);

  return {
    run_id: runId,
    window_start: windowStart,
    window_end: nowIso,
    sweep: {
      items: sweep.items.length,
      reddit_venues: sweep.reddit_venues,
      youtube_categories: sweep.youtube_categories,
    },
    detection,
    ghosts_skipped: ghostsSkipped,
    collected: {
      reddit: redditCount,
      youtube: youtubeCount,
      baseline: baselineItems.length,
      new_items: newItems,
    },
    linked_items: linkedItems.length,
    classified: fresh.length,
    trends_measured: metricRows.length,
    provisional: anyProvisional,
    states: stateCounts,
    distributions,
  };
}

export function distStats(values: number[]): DistributionStats {
  const v = [...values].sort((a, b) => a - b);
  const n = v.length;
  const mean = v.reduce((s, x) => s + x, 0) / n;
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / n);
  const median = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
  const buckets = new Array<number>(10).fill(0);
  for (const x of values) {
    buckets[Math.max(0, Math.min(9, Math.floor(x / 10)))]++;
  }
  return {
    n,
    min: v[0],
    max: v[n - 1],
    median: round1(median),
    sd: round1(sd),
    buckets,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
