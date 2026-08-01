import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type {
  ItemAnnotation,
  ItemTrendLink,
  RawItem,
  TrendMetricsRow,
  DistributionStats,
} from "@/lib/pipeline/types";
import type { HistoryPoint } from "@/lib/pipeline/normalize";

// Storage boundary for the measured pipeline. Unlike the demo store in
// lib/data.ts there is no in-memory fallback: a corpus that evaporates on
// restart cannot back a reproducibility guarantee, so Supabase is required.

function client(): SupabaseClient {
  const c = getSupabaseAdminClient();
  if (!c) {
    throw new Error(
      "Measured pipeline requires Supabase (SUPABASE_SERVICE_ROLE_KEY). "
      + "There is deliberately no in-memory fallback for the corpus."
    );
  }
  return c;
}

/** Persist items; re-capturing an existing id is a no-op (append-only). */
export async function insertRawItems(items: RawItem[]): Promise<number> {
  if (items.length === 0) return 0;
  const { error, count } = await client()
    .from("raw_items")
    .upsert(items, { onConflict: "id", ignoreDuplicates: true, count: "exact" });
  if (error) throw new Error(`raw_items insert: ${error.message}`);
  return count ?? 0;
}

/** PostgREST caps any single response at ~1000 rows regardless of .limit();
 *  every corpus-sized read must page with .range() or it silently truncates. */
const PAGE = 1000;

async function fetchAllPages<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  label: string,
  maxRows = 50_000
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < maxRows; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(`${label}: ${error.message}`);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export async function getItemsInWindow(
  corpus: "trend" | "baseline",
  windowStartIso: string,
  windowEndIso: string
): Promise<RawItem[]> {
  return fetchAllPages<RawItem>(
    (from, to) =>
      client()
        .from("raw_items")
        .select("*")
        .eq("corpus", corpus)
        .gte("posted_at", windowStartIso)
        .lt("posted_at", windowEndIso)
        .order("id")
        .range(from, to),
    "raw_items read"
  );
}

export async function upsertLinks(links: ItemTrendLink[]): Promise<void> {
  if (links.length === 0) return;
  const { error } = await client()
    .from("item_trend_links")
    .upsert(links, { onConflict: "item_id,trend_id", ignoreDuplicates: true });
  if (error) throw new Error(`item_trend_links upsert: ${error.message}`);
}

export async function getLinks(): Promise<ItemTrendLink[]> {
  return fetchAllPages<ItemTrendLink>(
    (from, to) =>
      client()
        .from("item_trend_links")
        .select("item_id, trend_id, matched_by, confidence")
        .order("item_id")
        .range(from, to),
    "item_trend_links read"
  );
}

/** Manual merge: move all links from one trend to another (human override). */
export async function mergeTrendLinks(
  fromTrendId: string,
  toTrendId: string
): Promise<number> {
  const c = client();
  const { data, error } = await c
    .from("item_trend_links")
    .select("item_id")
    .eq("trend_id", fromTrendId);
  if (error) throw new Error(`merge read: ${error.message}`);
  const items = (data ?? []).map((r) => r.item_id as string);
  if (items.length === 0) return 0;
  await upsertLinks(
    items.map((item_id) => ({
      item_id,
      trend_id: toTrendId,
      matched_by: "manual" as const,
      confidence: 1,
    }))
  );
  const { error: delErr } = await c
    .from("item_trend_links")
    .delete()
    .eq("trend_id", fromTrendId);
  if (delErr) throw new Error(`merge delete: ${delErr.message}`);
  return items.length;
}

export async function getAnnotations(): Promise<Map<string, ItemAnnotation>> {
  const rows = await fetchAllPages<ItemAnnotation>(
    (from, to) =>
      client().from("item_annotations").select("*").order("item_id").range(from, to),
    "item_annotations read"
  );
  return new Map(rows.map((a) => [a.item_id, a]));
}

export async function insertAnnotations(
  rows: { item_id: string; sentiment: string; model: string }[]
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await client()
    .from("item_annotations")
    .upsert(rows, { onConflict: "item_id", ignoreDuplicates: true });
  if (error) throw new Error(`item_annotations upsert: ${error.message}`);
}

export async function insertTrendMetrics(rows: TrendMetricsRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await client().from("trend_metrics").insert(rows);
  if (error) throw new Error(`trend_metrics insert: ${error.message}`);
}

export async function insertMetricHistory(
  rows: { id: string; metric: string; raw_value: number; trend_id: string; run_id: string; recorded_at: string }[]
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await client()
    .from("metric_history")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error(`metric_history insert: ${error.message}`);
}

export async function getMetricHistory(
  metric: string,
  sinceIso: string
): Promise<HistoryPoint[]> {
  const rows = await fetchAllPages<{ raw_value: number; recorded_at: string }>(
    (from, to) =>
      client()
        .from("metric_history")
        .select("raw_value, recorded_at")
        .eq("metric", metric)
        .gte("recorded_at", sinceIso)
        .order("id")
        .range(from, to),
    "metric_history read"
  );
  return rows.map((r) => ({
    raw_value: Number(r.raw_value),
    recorded_at: r.recorded_at,
  }));
}

export async function insertRunDistributions(
  runId: string,
  stats: Record<string, DistributionStats>
): Promise<void> {
  const rows = Object.entries(stats).map(([metric, s]) => ({
    id: `rd-${runId}-${metric}`,
    run_id: runId,
    metric,
    stats: s,
  }));
  if (rows.length === 0) return;
  const { error } = await client().from("run_distributions").insert(rows);
  if (error) throw new Error(`run_distributions insert: ${error.message}`);
}

export async function getConfig<T>(key: string): Promise<T | null> {
  const { data, error } = await client()
    .from("pipeline_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(`pipeline_config read: ${error.message}`);
  return (data?.value as T) ?? null;
}

export async function getLatestMetricsRun(): Promise<string | null> {
  const { data, error } = await client()
    .from("trend_metrics")
    .select("run_id, created_at")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(`trend_metrics read: ${error.message}`);
  return data?.[0]?.run_id ?? null;
}

export async function getMetricsForRun(runId: string): Promise<TrendMetricsRow[]> {
  const { data, error } = await client()
    .from("trend_metrics")
    .select("*")
    .eq("run_id", runId);
  if (error) throw new Error(`trend_metrics read: ${error.message}`);
  return (data ?? []) as TrendMetricsRow[];
}

export async function getForecastsForTrends(
  trendIds: string[]
): Promise<Map<string, {
  forecast_id: string;
  claim_type: string;
  created_at: string;
  resolves_at: string;
  horizon_days: number;
  confidence: number;
  status: "pending" | "hit" | "miss" | "void";
}[]>> {
  const out = new Map<string, {
    forecast_id: string;
    claim_type: string;
    created_at: string;
    resolves_at: string;
    horizon_days: number;
    confidence: number;
    status: "pending" | "hit" | "miss" | "void";
  }[]>();
  if (trendIds.length === 0) return out;
  const { data, error } = await client()
    .from("forecasts")
    .select(
      "forecast_id, trend_id, claim_type, created_at, resolves_at, horizon_days, confidence, status"
    )
    .in("trend_id", trendIds)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(`forecasts read: ${error.message}`);
  for (const row of data ?? []) {
    const { trend_id, ...marker } = row as { trend_id: string } & {
      forecast_id: string;
      claim_type: string;
      created_at: string;
      resolves_at: string;
      horizon_days: number;
      confidence: number;
      status: "pending" | "hit" | "miss" | "void";
    };
    const list = out.get(trend_id) ?? [];
    list.push(marker);
    out.set(trend_id, list);
  }
  return out;
}

export async function getDistributionsForRun(
  runId: string
): Promise<{ metric: string; stats: DistributionStats }[]> {
  const { data, error } = await client()
    .from("run_distributions")
    .select("metric, stats")
    .eq("run_id", runId);
  if (error) throw new Error(`run_distributions read: ${error.message}`);
  return (data ?? []) as { metric: string; stats: DistributionStats }[];
}
