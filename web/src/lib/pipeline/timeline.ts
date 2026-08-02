import type { Trend } from "@/types";
import { getTrends } from "@/lib/data";
import type { PipelineState, RawItem, SentimentLabel } from "@/lib/pipeline/types";
import { dedupeItems } from "@/lib/pipeline/dedup";
import * as store from "@/lib/pipeline/store";

// Trend timelines — the rise-and-fall read. Because raw_items carries the
// item's real posted_at (not our capture time), a single collection run
// yields a genuine trailing curve; scheduled runs extend and correct it.
// Volume is deduplicated per day; sentiment is the day's net of per-item
// labels. Forecast calls are pinned onto the same time axis so the chart
// shows what we predicted and how it resolved.

const DAY_MS = 86_400_000;

export interface TimelineDay {
  /** UTC day, YYYY-MM-DD. */
  date: string;
  volume: number;
  /** Net sentiment of that day's labeled items, -1..1; null = no labels. */
  sentiment: number | null;
}

export interface ForecastMarker {
  forecast_id: string;
  claim_type: string;
  created_at: string;
  resolves_at: string;
  horizon_days: number;
  confidence: number;
  status: "pending" | "hit" | "miss" | "void";
}

export interface TrendTimeline {
  trend: Pick<
    Trend,
    "id" | "name" | "slug" | "category" | "one_line_summary" | "origin" | "created_at"
  >;
  days: TimelineDay[];
  totals: { volume: number; unique_authors: number; sentiment_net: number | null };
  /** Velocity percentile from the latest measured run (null = not measured). */
  velocity_pct: number | null;
  state: PipelineState | null;
  provisional: boolean;
  forecasts: ForecastMarker[];
}

export interface TimelineResponse {
  window_start: string;
  window_end: string;
  run_id: string | null;
  /** Trends with organic volume, sorted by velocity percentile (desc). */
  movers: TrendTimeline[];
  /** Trends with zero organic volume in the window — archive candidates. */
  quiet: { id: string; name: string; slug: string }[];
}

function utcDay(iso: string): string {
  return iso.slice(0, 10);
}

export async function buildTimelines(
  windowDays = 30
): Promise<TimelineResponse> {
  const now = Date.now();
  const windowEnd = new Date(now).toISOString();
  const windowStart = new Date(now - windowDays * DAY_MS).toISOString();

  const [trends, targeted, swept, links, annotations, runId] = await Promise.all([
    getTrends(),
    store.getItemsInWindow("trend", windowStart, windowEnd),
    store.getItemsInWindow("sweep", windowStart, windowEnd),
    store.getLinks(),
    store.getAnnotations(),
    store.getLatestMetricsRun(),
  ]);
  const items = [
    ...new Map([...targeted, ...swept].map((i) => [i.id, i])).values(),
  ];
  const metricsRows = runId ? await store.getMetricsForRun(runId) : [];
  const metricsByTrend = new Map(metricsRows.map((r) => [r.trend_id, r]));
  const forecastsByTrend = await store.getForecastsForTrends(
    trends.map((t) => t.id)
  );

  const itemsById = new Map(items.map((i) => [i.id, i]));
  const itemsByTrend = new Map<string, RawItem[]>();
  for (const link of links) {
    const item = itemsById.get(link.item_id);
    if (!item) continue;
    const list = itemsByTrend.get(link.trend_id) ?? [];
    list.push(item);
    itemsByTrend.set(link.trend_id, list);
  }

  // Fixed day axis, oldest -> today, shared by every trend.
  const dayKeys: string[] = [];
  for (let d = windowDays - 1; d >= 0; d--) {
    dayKeys.push(utcDay(new Date(now - d * DAY_MS).toISOString()));
  }

  const movers: TrendTimeline[] = [];
  const quiet: TimelineResponse["quiet"] = [];

  for (const trend of trends) {
    const { canonical } = dedupeItems(itemsByTrend.get(trend.id) ?? []);
    if (canonical.length === 0) {
      quiet.push({ id: trend.id, name: trend.name, slug: trend.slug });
      continue;
    }

    const byDay = new Map<string, { volume: number; labels: SentimentLabel[] }>();
    for (const item of canonical) {
      const day = utcDay(item.posted_at);
      const bucket = byDay.get(day) ?? { volume: 0, labels: [] };
      bucket.volume++;
      const label = annotations.get(item.id)?.sentiment;
      if (label) bucket.labels.push(label);
      byDay.set(day, bucket);
    }

    const days: TimelineDay[] = dayKeys.map((date) => {
      const bucket = byDay.get(date);
      return {
        date,
        volume: bucket?.volume ?? 0,
        sentiment: bucket ? netOfLabels(bucket.labels) : null,
      };
    });

    const metrics = metricsByTrend.get(trend.id);
    movers.push({
      trend: {
        id: trend.id,
        name: trend.name,
        slug: trend.slug,
        category: trend.category,
        one_line_summary: trend.one_line_summary,
        origin: trend.origin,
        created_at: trend.created_at,
      },
      days,
      totals: {
        volume: canonical.length,
        unique_authors: metrics?.raw.unique_authors ?? 0,
        sentiment_net: metrics?.raw.sentiment_net ?? null,
      },
      velocity_pct: metrics?.percentiles.velocity ?? null,
      state: metrics?.state ?? null,
      provisional: metrics?.provisional ?? true,
      forecasts: forecastsByTrend.get(trend.id) ?? [],
    });
  }

  movers.sort((a, b) => (b.velocity_pct ?? -1) - (a.velocity_pct ?? -1));

  return { window_start: windowStart, window_end: windowEnd, run_id: runId, movers, quiet };
}

function netOfLabels(labels: SentimentLabel[]): number | null {
  if (labels.length === 0) return null;
  let pos = 0;
  let neg = 0;
  let ironic = 0;
  for (const l of labels) {
    if (l === "positive") pos++;
    else if (l === "negative") neg++;
    else if (l === "ironic") ironic++;
  }
  return Math.round(((pos - neg - 0.25 * ironic) / labels.length) * 100) / 100;
}
