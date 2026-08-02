import type {
  DailyReport,
  Forecast,
  ForecastResolutionLog,
  LifecycleStage,
  PulseRun,
  RiskLevel,
  Signal,
  Trend,
  TrendEvidence,
  TrendSnapshot,
  TrendWithSignals,
} from "@/types";
import {
  SEED_DAILY_REPORT,
  SEED_SIGNALS,
  SEED_TREND_SIGNALS,
  SEED_TRENDS,
} from "@/lib/seed-data";
import { isSupabaseConfigured } from "@/lib/supabase";
import { sentimentBucket, type SentimentBucket } from "@/lib/scores";
import { computeHarmony, harmonyTier } from "@/lib/harmony";

export { sentimentBucket };
export type { SentimentBucket };

// ---------------------------------------------------------------------------
// Data-access layer. Mock-first: when Supabase isn't configured (or a query
// fails), we serve the seeded dataset from an in-memory store. The async
// signatures and the Supabase branch mean swapping to the real database later
// requires no changes at the call sites.
// ---------------------------------------------------------------------------

// In-memory store, cloned from seed so writes during a dev session persist
// across requests without mutating the seed source. It lives on globalThis so
// that every Next.js route bundle in the same server process shares one
// instance (otherwise an admin write wouldn't be visible to a page render).
interface Store {
  trends: Trend[];
  signals: Signal[];
  trendSignals: typeof SEED_TREND_SIGNALS;
  reports: DailyReport[];
  pulseRuns: PulseRun[];
  snapshots: TrendSnapshot[];
  evidence: TrendEvidence[];
  forecasts: Forecast[];
  resolutionLog: ForecastResolutionLog[];
}

const globalForStore = globalThis as unknown as { __wavesightStore?: Store };

// Declared before the store initializer below — seedHistory() runs during
// module evaluation and consts are not hoisted.
const SEED_RUN_COUNT = 12;
const SEED_RUN_STEP_MS = 12 * 60 * 60 * 1000;

const store: Store =
  globalForStore.__wavesightStore ??
  (globalForStore.__wavesightStore = (() => {
    const trends = SEED_TRENDS.map((t) => ({ ...t }));
    const history = seedHistory(trends);
    return {
      trends,
      signals: SEED_SIGNALS.map((s) => ({ ...s })),
      trendSignals: SEED_TREND_SIGNALS.map((ts) => ({ ...ts })),
      reports: [{ ...SEED_DAILY_REPORT }],
      pulseRuns: history.runs.slice().reverse(),
      snapshots: history.snapshots,
      evidence: [],
      forecasts: [],
      resolutionLog: [],
    };
  })());

// Older dev servers may hold a store created before the pulse fields existed.
store.pulseRuns ??= [];
store.snapshots ??= [];
store.evidence ??= [];
store.forecasts ??= [];
store.resolutionLog ??= [];

// ---------------------------------------------------------------------------
// Seeded history — without a database the timeline would start empty, so the
// mock store opens with 12 synthetic pulse runs (12h apart) whose score arcs
// follow each trend's lifecycle stage: declining trends show a past spike that
// collapsed, emerging ones a recent takeoff, resurfacing ones a dip-and-return.
// Arcs end exactly at the trend's current scores, so "now" always agrees with
// the live tiles. Real pulse runs simply append past the seeds.
// ---------------------------------------------------------------------------

/** Shape multiplier for a score's path through time; p=1 (now) is always 1. */
function arcShape(stage: Trend["lifecycle_stage"], p: number): number {
  switch (stage) {
    case "emerging":
      return 0.38 + 0.62 * p * p * p;
    case "accelerating":
      return 0.45 + 0.55 * p * p;
    case "peaking":
      // Climb, overshoot slightly, settle back to the current value.
      return p < 0.8 ? 0.5 + 0.68 * (p / 0.8) : 1.18 - 0.18 * ((p - 0.8) / 0.2);
    case "saturated":
      // Was hotter before; long slow cool-down into the present.
      return 1.45 - 0.45 * p;
    case "declining":
      // The classic story: a sharp spike that then fell apart.
      return p < 0.3 ? 0.9 + 1.3 * (p / 0.3) : 2.2 - 1.2 * ((p - 0.3) / 0.7);
    case "resurfacing":
      // Faded out, then found a second wave.
      return p < 0.5 ? 1.0 - 0.55 * (p / 0.5) : 0.45 + 0.55 * ((p - 0.5) / 0.5);
  }
}

function seedHistory(trends: Trend[]): {
  runs: PulseRun[];
  snapshots: TrendSnapshot[];
} {
  const runs: PulseRun[] = [];
  const snapshots: TrendSnapshot[] = [];
  const now = Date.now();
  for (let r = 0; r < SEED_RUN_COUNT; r++) {
    const ranAt = new Date(
      now - (SEED_RUN_COUNT - 1 - r) * SEED_RUN_STEP_MS
    ).toISOString();
    const runId = `pulse-seed-${r}`;
    runs.push({
      id: runId,
      ran_at: ranAt,
      mode: "mock",
      trends_discovered: r === 0 ? trends.length : 0,
      trends_updated: r === 0 ? 0 : trends.length,
      focus: "seeded history",
      notes: null,
    });
    const p = r / (SEED_RUN_COUNT - 1);
    for (const [ti, t] of trends.entries()) {
      // Deterministic wobble so lines look organic but never change on reload.
      const wobble = Math.sin(p * 9 + ti * 2.3) * 2.5;
      const m = clampScore(
        t.momentum_score * arcShape(t.lifecycle_stage, p) + wobble
      );
      const s = clampScore(
        t.sentiment_score * (0.82 + 0.18 * arcShape(t.lifecycle_stage, p)) +
          wobble * 0.6
      );
      const patched = { ...t, momentum_score: m, sentiment_score: s };
      const source = p === 1 ? t : patched;
      const harmony = computeHarmony(source);
      snapshots.push({
        id: `snap-${runId}-${ti}`,
        trend_id: t.id,
        run_id: runId,
        wavescore: t.wavescore,
        harmony,
        momentum_score: source.momentum_score,
        sentiment_score: source.sentiment_score,
        state: harmonyTier(harmony, source).tier,
        source_count: 0,
        captured_at: ranAt,
      });
    }
  }
  return { runs, snapshots };
}

function clampScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export interface TrendFilters {
  category?: string;
  platform?: string;
  audience?: string;
  lifecycle?: LifecycleStage;
  risk?: RiskLevel;
  sentiment?: "positive" | "mixed" | "cautious";
  search?: string;
}

function applyFilters(trends: Trend[], f: TrendFilters): Trend[] {
  return trends.filter((t) => {
    if (f.category && !t.category.toLowerCase().includes(f.category.toLowerCase()))
      return false;
    if (
      f.platform &&
      !t.best_platforms.some((p) =>
        p.toLowerCase().includes(f.platform!.toLowerCase())
      )
    )
      return false;
    if (f.audience && !t.audience.toLowerCase().includes(f.audience.toLowerCase()))
      return false;
    if (f.lifecycle && t.lifecycle_stage !== f.lifecycle) return false;
    if (f.risk && t.risk_level !== f.risk) return false;
    if (f.sentiment && sentimentBucket(t.sentiment_score) !== f.sentiment)
      return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      const hay = `${t.name} ${t.one_line_summary} ${t.category} ${t.audience}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export async function getTrends(filters: TrendFilters = {}): Promise<Trend[]> {
  // Supabase path (best-effort; falls back to mock on any error).
  if (isSupabaseConfigured()) {
    const remote = await trySupabaseTrends();
    if (remote) return applyFilters(remote, filters).sort(byWaveScore);
  }
  return applyFilters(store.trends, filters).sort(byWaveScore);
}

export async function getTrendBySlug(
  slug: string
): Promise<TrendWithSignals | null> {
  // Memory first (covers seeds and this process's fresh writes), then
  // Supabase — pipeline-discovered trends live only in the database, and
  // missing this branch made every one of them 404 from the radar.
  const trend =
    store.trends.find((t) => t.slug === slug) ??
    (await trySupabaseTrend("slug", slug));
  if (!trend) return null;
  return { ...trend, signals: getSignalsForTrendId(trend.id) };
}

export async function getTrendById(id: string): Promise<Trend | null> {
  return (
    store.trends.find((t) => t.id === id) ??
    (await trySupabaseTrend("id", id))
  );
}

export function getSignalsForTrendId(trendId: string): Signal[] {
  const signalIds = store.trendSignals
    .filter((ts) => ts.trend_id === trendId)
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .map((ts) => ts.signal_id);
  return signalIds
    .map((id) => store.signals.find((s) => s.id === id))
    .filter((s): s is Signal => Boolean(s));
}

export async function getAllSignals(): Promise<Signal[]> {
  return [...store.signals].sort((a, b) =>
    (b.created_at ?? "").localeCompare(a.created_at ?? "")
  );
}

export async function createSignal(input: Partial<Signal>): Promise<Signal> {
  const signal: Signal = {
    id: input.id ?? `signal-${store.signals.length + 1}-${Date.now()}`,
    source: input.source ?? "manual",
    url: input.url ?? null,
    title: input.title ?? null,
    text: input.text ?? null,
    creator_name: input.creator_name ?? null,
    platform_engagement_json: input.platform_engagement_json ?? null,
    raw_metadata_json: input.raw_metadata_json ?? null,
    detected_phrases: input.detected_phrases ?? [],
    detected_entities: input.detected_entities ?? [],
    detected_emotions: input.detected_emotions ?? [],
    submitted_by: input.submitted_by ?? null,
    created_at: new Date().toISOString(),
    ingested_at: new Date().toISOString(),
  };
  store.signals.unshift(signal);
  return signal;
}

export async function attachSignalToTrend(
  signalId: string,
  trendId: string,
  relevance = 80
): Promise<void> {
  if (
    store.trendSignals.some(
      (ts) => ts.signal_id === signalId && ts.trend_id === trendId
    )
  )
    return;
  store.trendSignals.push({
    id: `ts-${store.trendSignals.length + 1}`,
    trend_id: trendId,
    signal_id: signalId,
    relevance_score: relevance,
    created_at: new Date().toISOString(),
  });
}

export async function createTrend(trend: Trend): Promise<Trend> {
  store.trends.unshift(trend);
  return trend;
}

export async function getLatestDailyReport(): Promise<DailyReport | null> {
  const client = await adminClient();
  if (client) {
    const { data, error } = await client
      .from("daily_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(1);
    if (!error && data && data.length > 0) return data[0] as DailyReport;
  }
  return (
    [...store.reports].sort((a, b) =>
      b.report_date.localeCompare(a.report_date)
    )[0] ?? null
  );
}

/** Insert-or-refresh the day's issue, keyed by report_date. */
export async function upsertDailyReport(report: DailyReport): Promise<void> {
  const i = store.reports.findIndex(
    (r) => r.report_date === report.report_date
  );
  if (i >= 0) store.reports[i] = report;
  else store.reports.unshift(report);
  const client = await adminClient();
  if (client) {
    const { error } = await client
      .from("daily_reports")
      .upsert(report, { onConflict: "report_date" });
    if (error) console.error("[data] daily report upsert failed:", error.message);
  }
}

export interface DashboardStats {
  risingWaves: number;
  positiveSentiment: number;
  brandSafe: number;
  backlashForming: number;
  totalTrends: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // Derived from getTrends() so the stat tiles count the same trends the
  // radar list renders (Supabase when configured, seeds otherwise).
  const trends = await getTrends();
  return {
    totalTrends: trends.length,
    risingWaves: trends.filter(
      (t) =>
        t.lifecycle_stage === "emerging" ||
        t.lifecycle_stage === "accelerating" ||
        t.lifecycle_stage === "resurfacing"
    ).length,
    positiveSentiment: trends.filter((t) => t.sentiment_score >= 78).length,
    brandSafe: trends.filter(
      (t) => t.brand_safety_score >= 80 && t.risk_level === "low"
    ).length,
    backlashForming: trends.filter(
      (t) =>
        t.virality_type === "backlash" ||
        t.risk_level === "high" ||
        t.sentiment_score < 65
    ).length,
  };
}

/** Distinct filter option values derived from the current dataset. */
export async function getFilterOptions() {
  const trends = await getTrends();
  const categories = unique(trends.map((t) => t.category));
  const platforms = unique(trends.flatMap((t) => t.best_platforms));
  return { categories, platforms };
}

// ---------------------------------------------------------------------------
// Pulse loop persistence — runs, score snapshots, and slug-keyed upserts.
// ---------------------------------------------------------------------------

/** Server-side admin client for privileged writes; null when not configured. */
async function adminClient() {
  if (!isSupabaseConfigured()) return null;
  try {
    const { getSupabaseAdminClient } = await import("@/lib/supabase");
    return getSupabaseAdminClient();
  } catch {
    return null;
  }
}

/**
 * Insert-or-update a trend keyed by slug, so repeated pulse runs refresh
 * scores and summaries instead of duplicating the trend. Writes go to the
 * in-memory store (immediate consistency) and best-effort to Supabase
 * (durability across restarts/deploys).
 */
export async function upsertTrendBySlug(
  trend: Trend
): Promise<{ trend: Trend; created: boolean }> {
  const existing = store.trends.find((t) => t.slug === trend.slug);
  let result: { trend: Trend; created: boolean };
  if (existing) {
    Object.assign(existing, {
      ...trend,
      id: existing.id,
      created_at: existing.created_at,
      origin: existing.origin ?? trend.origin,
      updated_at: new Date().toISOString(),
    });
    result = { trend: existing, created: false };
  } else {
    store.trends.unshift(trend);
    result = { trend, created: true };
  }
  const client = await adminClient();
  if (client) {
    // The trends table has no `sources` column — evidence lives in
    // trend_evidence. Including it here made every scan-origin upsert fail
    // silently, so scan trends never persisted. Strip it.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sources: _sources, ...row } = result.trend;
    const { error } = await client
      .from("trends")
      .upsert(row, { onConflict: "slug" });
    if (error) console.error("[data] trend upsert failed:", error.message);
  }
  return result;
}

export async function recordPulseRun(run: PulseRun): Promise<PulseRun> {
  store.pulseRuns.unshift(run);
  const client = await adminClient();
  if (client) {
    const { error } = await client.from("pulse_runs").insert(run);
    if (error) console.error("[data] pulse run insert failed:", error.message);
  }
  return run;
}

export async function getPulseRuns(limit = 20): Promise<PulseRun[]> {
  const client = await adminClient();
  if (client) {
    const { data, error } = await client
      .from("pulse_runs")
      .select("*")
      .order("ran_at", { ascending: false })
      .limit(limit);
    if (!error && data && data.length > 0) return data as PulseRun[];
  }
  return store.pulseRuns.slice(0, limit);
}

export async function recordSnapshots(
  snapshots: TrendSnapshot[]
): Promise<void> {
  store.snapshots.push(...snapshots);
  const client = await adminClient();
  if (client) {
    const { error } = await client.from("trend_snapshots").insert(snapshots);
    if (error) console.error("[data] snapshot insert failed:", error.message);
  }
}

/** All snapshots, oldest first. Supabase when it has data, else the seeds. */
export async function getAllSnapshots(): Promise<TrendSnapshot[]> {
  const client = await adminClient();
  if (client) {
    const { data, error } = await client
      .from("trend_snapshots")
      .select("*")
      .order("captured_at", { ascending: true })
      .limit(5000);
    if (!error && data && data.length > 0) return data as TrendSnapshot[];
  }
  return [...store.snapshots].sort((a, b) =>
    a.captured_at.localeCompare(b.captured_at)
  );
}

/**
 * Harmony/wavescore movement per trend: latest snapshot minus the one before
 * it. Trends with fewer than two snapshots report 0 (no known direction yet).
 */
export async function getTrendDeltas(): Promise<
  Map<string, { harmony: number; wavescore: number }>
> {
  const byTrend = new Map<string, TrendSnapshot[]>();
  for (const snap of await getAllSnapshots()) {
    const list = byTrend.get(snap.trend_id) ?? [];
    list.push(snap);
    byTrend.set(snap.trend_id, list);
  }
  const deltas = new Map<string, { harmony: number; wavescore: number }>();
  for (const [trendId, snaps] of byTrend) {
    if (snaps.length < 2) {
      deltas.set(trendId, { harmony: 0, wavescore: 0 });
      continue;
    }
    const [prev, latest] = snaps.slice(-2);
    deltas.set(trendId, {
      harmony: latest.harmony - prev.harmony,
      wavescore: latest.wavescore - prev.wavescore,
    });
  }
  return deltas;
}

// ---------------------------------------------------------------------------
// Evidence — append-only raw items behind each score (trend_evidence).
// The 20-per-trend-per-run cap is enforced by the emitting boundary before
// this is called; this layer just stores what it is given.
// ---------------------------------------------------------------------------

export async function recordEvidence(rows: TrendEvidence[]): Promise<void> {
  if (rows.length === 0) return;
  const fresh = rows.filter(
    (r) => !store.evidence.some((e) => e.id === r.id)
  );
  store.evidence.push(...fresh);
  const client = await adminClient();
  if (client) {
    // Ids are deterministic per (trend, url); re-capturing the same item is a
    // no-op rather than a failed batch.
    const { error } = await client
      .from("trend_evidence")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
    if (error) console.error("[data] evidence insert failed:", error.message);
  }
}

export async function getEvidenceForTrend(
  trendId: string,
  limit = 100
): Promise<TrendEvidence[]> {
  const client = await adminClient();
  if (client) {
    const { data, error } = await client
      .from("trend_evidence")
      .select("*")
      .eq("trend_id", trendId)
      .order("captured_at", { ascending: false })
      .limit(limit);
    if (!error && data && data.length > 0) return data as TrendEvidence[];
  }
  return store.evidence
    .filter((e) => e.trend_id === trendId)
    .sort((a, b) => b.captured_at.localeCompare(a.captured_at))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Forecasts — the falsifiable claim log. Claims are inserted once; resolution
// writes status/resolved_at/observed_value exactly once per row (the DB
// trigger in migration 003 enforces the same rule server-side).
// ---------------------------------------------------------------------------

export async function insertForecasts(rows: Forecast[]): Promise<void> {
  if (rows.length === 0) return;
  const fresh = rows.filter(
    (r) => !store.forecasts.some((f) => f.forecast_id === r.forecast_id)
  );
  store.forecasts.push(...fresh);
  const client = await adminClient();
  if (client) {
    // Deterministic ids + ignoreDuplicates make re-emission a no-op.
    const { error } = await client
      .from("forecasts")
      .upsert(rows, { onConflict: "forecast_id", ignoreDuplicates: true });
    if (error) console.error("[data] forecast insert failed:", error.message);
  }
}

export async function getForecasts(
  opts: { status?: Forecast["status"]; sinceIso?: string } = {}
): Promise<Forecast[]> {
  const client = await adminClient();
  if (client) {
    let query = client.from("forecasts").select("*");
    if (opts.status) query = query.eq("status", opts.status);
    if (opts.sinceIso) query = query.gte("created_at", opts.sinceIso);
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(2000);
    if (!error && data) return data as Forecast[];
  }
  return store.forecasts
    .filter((f) => (opts.status ? f.status === opts.status : true))
    .filter((f) => (opts.sinceIso ? f.created_at >= opts.sinceIso : true))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/**
 * Resolve one pending forecast, exactly once. The status='pending' guard on
 * both stores makes re-runs no-ops; an already-resolved row is never mutated.
 * Every successful resolution appends an audit row to forecast_resolution_log.
 */
export async function applyForecastResolution(action: {
  forecast_id: string;
  status: "hit" | "miss" | "void";
  observed_value: number | null;
  note: string;
  detail: Record<string, unknown>;
  resolved_at: string;
}): Promise<boolean> {
  const local = store.forecasts.find(
    (f) => f.forecast_id === action.forecast_id
  );
  let applied = false;
  if (local && local.status === "pending") {
    local.status = action.status;
    local.resolved_at = action.resolved_at;
    local.observed_value = action.observed_value;
    local.resolution_note = action.note;
    applied = true;
  }
  const client = await adminClient();
  if (client) {
    const { data, error } = await client
      .from("forecasts")
      .update({
        status: action.status,
        resolved_at: action.resolved_at,
        observed_value: action.observed_value,
        resolution_note: action.note,
      })
      .eq("forecast_id", action.forecast_id)
      .eq("status", "pending")
      .select("forecast_id");
    if (error) {
      console.error("[data] forecast resolution failed:", error.message);
    } else if (data && data.length > 0) {
      applied = true;
    }
  }
  if (applied) {
    const logRow: ForecastResolutionLog = {
      id: `frl-${action.forecast_id}`,
      forecast_id: action.forecast_id,
      evaluated_at: action.resolved_at,
      status: action.status,
      observed_value: action.observed_value,
      detail: { ...action.detail, note: action.note },
    };
    store.resolutionLog.push(logRow);
    if (client) {
      const { error } = await client
        .from("forecast_resolution_log")
        .upsert(logRow, { onConflict: "id", ignoreDuplicates: true });
      if (error)
        console.error("[data] resolution log insert failed:", error.message);
    }
  }
  return applied;
}

export async function getResolutionLogs(): Promise<ForecastResolutionLog[]> {
  const client = await adminClient();
  if (client) {
    const { data, error } = await client
      .from("forecast_resolution_log")
      .select("*")
      .order("evaluated_at", { ascending: false })
      .limit(2000);
    if (!error && data) return data as ForecastResolutionLog[];
  }
  return [...store.resolutionLog].sort((a, b) =>
    b.evaluated_at.localeCompare(a.evaluated_at)
  );
}

// ---------------------------------------------------------------------------
// Timeline — the full pulse history, shaped for charting and time travel.
// ---------------------------------------------------------------------------

export interface HistoryPoint {
  run_id: string;
  ran_at: string;
  harmony: number;
  momentum_score: number;
  sentiment_score: number;
  wavescore: number;
}

export interface TrendSeries {
  trend: Pick<Trend, "id" | "name" | "slug" | "category" | "lifecycle_stage">;
  points: HistoryPoint[];
}

export interface PulseHistory {
  /** Runs oldest → newest (charting order). */
  runs: PulseRun[];
  series: TrendSeries[];
}

/** Pulse runs + per-trend score series, joined and ready for the timeline. */
export async function getPulseHistory(limitRuns = 40): Promise<PulseHistory> {
  const [runsDesc, snapshots, trends] = await Promise.all([
    getPulseRuns(limitRuns),
    getAllSnapshots(),
    getTrends(),
  ]);
  const runs = [...runsDesc].sort((a, b) => a.ran_at.localeCompare(b.ran_at));
  const runIds = new Set(runs.map((r) => r.id));
  const trendById = new Map(trends.map((t) => [t.id, t]));

  const byTrend = new Map<string, HistoryPoint[]>();
  for (const s of snapshots) {
    if (!runIds.has(s.run_id) || !trendById.has(s.trend_id)) continue;
    const list = byTrend.get(s.trend_id) ?? [];
    list.push({
      run_id: s.run_id,
      ran_at: s.captured_at,
      harmony: s.harmony,
      momentum_score: s.momentum_score,
      sentiment_score: s.sentiment_score,
      wavescore: s.wavescore,
    });
    byTrend.set(s.trend_id, list);
  }

  const series: TrendSeries[] = [];
  for (const [trendId, points] of byTrend) {
    const t = trendById.get(trendId)!;
    series.push({
      trend: {
        id: t.id,
        name: t.name,
        slug: t.slug,
        category: t.category,
        lifecycle_stage: t.lifecycle_stage,
      },
      points: points.sort((a, b) => a.ran_at.localeCompare(b.ran_at)),
    });
  }
  // Most harmonized trends first so the chart's legend order matches the board.
  series.sort(
    (a, b) =>
      (b.points.at(-1)?.harmony ?? 0) - (a.points.at(-1)?.harmony ?? 0)
  );
  return { runs, series };
}

function byWaveScore(a: Trend, b: Trend) {
  return b.wavescore - a.wavescore;
}

function unique(arr: string[]) {
  return Array.from(new Set(arr)).sort();
}

// Best-effort Supabase reader. Kept defensive so a missing table or schema
// mismatch never breaks the app — it simply falls back to seeded data.
async function trySupabaseTrends(): Promise<Trend[] | null> {
  try {
    const { getSupabaseClient } = await import("@/lib/supabase");
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client.from("trends").select("*");
    if (error || !data || data.length === 0) return null;
    return data as Trend[];
  } catch {
    return null;
  }
}

/** Single-trend Supabase lookup by slug or id, same defensive posture. */
async function trySupabaseTrend(
  column: "slug" | "id",
  value: string
): Promise<Trend | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { getSupabaseClient } = await import("@/lib/supabase");
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
      .from("trends")
      .select("*")
      .eq(column, value)
      .maybeSingle();
    if (error || !data) return null;
    return data as Trend;
  } catch {
    return null;
  }
}
