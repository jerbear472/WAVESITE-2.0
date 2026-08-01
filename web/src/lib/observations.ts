import type { TrendSnapshot } from "@/types";
import { getAllSnapshots, getPulseRuns } from "@/lib/data";
import {
  bucketDaily,
  type DailyPoint,
  type ObservationInput,
} from "@/lib/forecast-engine";

export type { DailyPoint, ObservationInput };

// ---------------------------------------------------------------------------
// Observation selectors — trend history keyed on real calendar time.
// trend_snapshots is the storage (one appended row per trend per run); these
// selectors are the only sanctioned read path for downstream views, so every
// consumer gets the same x-axis (UTC date), the same carry-forward rule, and
// the same mock/seed hygiene.
//
// Step 6 seam: everything here is keyed by (trend_id, date) — exactly the keys
// the forecast selectors expose — so overlaying predicted vs observed curves
// on the eventual sparkline board is a join, not a rewrite.
// ---------------------------------------------------------------------------

export interface ObservationOptions {
  /**
   * When true, only observations from live pulse runs count — mock-mode runs
   * (random-walk drift) and seeded synthetic history are excluded. Forecast
   * resolution and calibration must set this; charts may show everything.
   */
  realOnly?: boolean;
}

/** Raw observations per trend, oldest first, keyed by trend_id. */
export async function getObservationsByTrend(
  opts: ObservationOptions = {}
): Promise<Map<string, ObservationInput[]>> {
  const [snapshots, runs] = await Promise.all([
    getAllSnapshots(),
    getPulseRuns(1000),
  ]);
  const liveRunIds = new Set(
    runs.filter((r) => r.mode === "live").map((r) => r.id)
  );
  const byTrend = new Map<string, ObservationInput[]>();
  for (const s of snapshots) {
    if (opts.realOnly && !liveRunIds.has(s.run_id)) continue;
    const list = byTrend.get(s.trend_id) ?? [];
    list.push({ observed_at: s.captured_at, harmony: s.harmony });
    byTrend.set(s.trend_id, list);
  }
  for (const list of byTrend.values()) {
    list.sort((a, b) => a.observed_at.localeCompare(b.observed_at));
  }
  return byTrend;
}

export async function getObservationsForTrend(
  trendId: string,
  opts: ObservationOptions = {}
): Promise<ObservationInput[]> {
  return (await getObservationsByTrend(opts)).get(trendId) ?? [];
}

/**
 * Daily-bucketed harmony series for one trend. Days with no run carry the
 * last value forward flagged is_interpolated; gaps longer than 7 days are
 * null so the view breaks the line. `untilIso` extends the series to a later
 * date (e.g. today) under the same rules.
 */
export async function getDailySeries(
  trendId: string,
  opts: ObservationOptions & { untilIso?: string } = {}
): Promise<DailyPoint[]> {
  const observations = await getObservationsForTrend(trendId, opts);
  return bucketDaily(observations, opts.untilIso);
}

/** Batch daily series — the sparkline board's future data source. */
export async function getDailySeriesByTrend(
  opts: ObservationOptions & { untilIso?: string } = {}
): Promise<Map<string, DailyPoint[]>> {
  const byTrend = await getObservationsByTrend(opts);
  const out = new Map<string, DailyPoint[]>();
  for (const [trendId, observations] of byTrend) {
    out.set(trendId, bucketDaily(observations, opts.untilIso));
  }
  return out;
}

/** Latest snapshot per trend — convenience for state/source_count reads. */
export async function getLatestSnapshotByTrend(): Promise<
  Map<string, TrendSnapshot>
> {
  const snapshots = await getAllSnapshots();
  const latest = new Map<string, TrendSnapshot>();
  for (const s of snapshots) {
    const prev = latest.get(s.trend_id);
    if (!prev || s.captured_at > prev.captured_at) latest.set(s.trend_id, s);
  }
  return latest;
}
