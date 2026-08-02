import type { Forecast, PulseRun } from "@/types";
import type { HarmonizedTrend } from "@/lib/harmony";
import {
  applyForecastResolution,
  getForecasts,
  getResolutionLogs,
  insertForecasts,
} from "@/lib/data";
import { getObservationsByTrend } from "@/lib/observations";
import {
  PEAK_CONFIRMATION_LAG_DAYS,
  planResolutions,
  type ForecastClaim,
} from "@/lib/forecast-engine";

// ---------------------------------------------------------------------------
// Forecast log — emission, resolution, calibration. The scanning/scoring
// pipeline is untouched; emission hangs off the loop's output boundary
// (called from runPulse after snapshots are recorded).
// ---------------------------------------------------------------------------

/** Claim window for a peak_within forecast emitted on a "rising" flag. */
export const DEFAULT_PEAK_HORIZON_DAYS = 30;

/** sustains_above claim emitted on an "in_sync" flag: harmony stays at or
 *  above the rising-tier floor for the whole window. */
export const SUSTAIN_HORIZON_DAYS = 21;
export const SUSTAIN_TARGET = 74;

/** fades_below claim emitted when the measured lifecycle says peaking or
 *  saturated while harmony still sits above the fading line: the claim is
 *  that it crosses below within the window. */
export const FADE_HORIZON_DAYS = 30;
export const FADE_TARGET = 55;

/** Below this sample size the calibration surface says "not enough data". */
export const MIN_SAMPLE = 10;

const DAY_MS = 86_400_000;

/**
 * SEAM — confidence model.
 * The scoring model has no real notion of forecast confidence yet, so this is
 * a deliberate proxy: current harmony rescaled into (0.05..0.95). Replace this
 * single function when a real confidence model exists (e.g. calibrated on the
 * resolved-forecast history this file accumulates). Nothing else needs to
 * change: emission, resolution, and calibration all read confidence as an
 * opaque 0..1.
 */
export function deriveConfidence(trend: HarmonizedTrend): number {
  const c = trend.harmony / 100;
  return Math.round(Math.min(0.95, Math.max(0.05, c)) * 100) / 100;
}

/** Confidence for a fades_below claim: the more worn out the trend measures
 *  (low harmony, high saturation), the more confident the fade call. Same
 *  seam discipline as deriveConfidence — replace when a calibrated model
 *  exists. */
export function deriveFadeConfidence(trend: HarmonizedTrend): number {
  const c = (100 - trend.harmony) / 100 * 0.6 + trend.saturation_score / 100 * 0.4;
  return Math.round(Math.min(0.95, Math.max(0.05, c)) * 100) / 100;
}

/**
 * Emission rules — every flag the loop raises becomes a falsifiable claim.
 * One open claim per (trend, claim_type) at a time; mock runs never emit
 * (random-walk drift is not a forecast).
 *
 *   rising            → peak_within: reaches its (14-day-confirmed) peak
 *                       within 30 days.
 *   in_sync           → sustains_above: harmony holds ≥ 74 (the rising-tier
 *                       floor) for 21 straight days.
 *   peaking/saturated → fades_below: harmony crosses below 55 (the fading
 *                       line) within 30 days — only while it still sits
 *                       above that line, so the claim is genuinely at risk.
 */
export async function emitForecastsForRun(
  run: PulseRun,
  trends: HarmonizedTrend[]
): Promise<Forecast[]> {
  if (run.mode !== "live") return [];

  const pending = await getForecasts({ status: "pending" });
  const open = new Set(pending.map((f) => `${f.claim_type}:${f.trend_id}`));
  const createdMs = Date.parse(run.ran_at);
  const at = (days: number) => new Date(createdMs + days * DAY_MS).toISOString();

  const base = (t: HarmonizedTrend) => ({
    trend_id: t.id,
    created_at: run.ran_at,
    created_in_run_id: run.id,
    status: "pending" as const,
    resolved_at: null,
    observed_value: null,
    resolution_note: null,
  });

  const fresh: Forecast[] = [];

  for (const t of trends.filter((x) => x.tier === "rising")) {
    if (open.has(`peak_within:${t.id}`)) continue;
    fresh.push({
      // Deterministic ids: re-running emission for the same run is a no-op.
      forecast_id: `fc-${run.id}-${t.slug}-peak`,
      ...base(t),
      claim_type: "peak_within",
      horizon_days: DEFAULT_PEAK_HORIZON_DAYS,
      target_value: null,
      confidence: deriveConfidence(t),
      // Claim-window end + confirmation lag: peaks are only confirmable
      // 14 days in arrears, and resolves_at owns that lag.
      resolves_at: at(DEFAULT_PEAK_HORIZON_DAYS + PEAK_CONFIRMATION_LAG_DAYS),
    });
  }

  for (const t of trends.filter((x) => x.tier === "in_sync")) {
    if (open.has(`sustains_above:${t.id}`)) continue;
    fresh.push({
      forecast_id: `fc-${run.id}-${t.slug}-sustain`,
      ...base(t),
      claim_type: "sustains_above",
      horizon_days: SUSTAIN_HORIZON_DAYS,
      target_value: SUSTAIN_TARGET,
      confidence: deriveConfidence(t),
      resolves_at: at(SUSTAIN_HORIZON_DAYS),
    });
  }

  for (const t of trends.filter(
    (x) =>
      (x.lifecycle_stage === "peaking" || x.lifecycle_stage === "saturated") &&
      x.harmony >= FADE_TARGET
  )) {
    if (open.has(`fades_below:${t.id}`)) continue;
    fresh.push({
      forecast_id: `fc-${run.id}-${t.slug}-fade`,
      ...base(t),
      claim_type: "fades_below",
      horizon_days: FADE_HORIZON_DAYS,
      target_value: FADE_TARGET,
      confidence: deriveFadeConfidence(t),
      resolves_at: at(FADE_HORIZON_DAYS),
    });
  }

  await insertForecasts(fresh);
  if (fresh.length > 0) {
    const byType = fresh.reduce<Record<string, number>>((acc, f) => {
      acc[f.claim_type] = (acc[f.claim_type] ?? 0) + 1;
      return acc;
    }, {});
    console.log(
      `[forecasts] run ${run.id}: emitted ${fresh.length} claim(s) — ` +
        Object.entries(byType)
          .map(([k, n]) => `${k}×${n}`)
          .join(", ")
    );
  }
  return fresh;
}

export interface ResolutionSummary {
  checked: number;
  resolved: number;
  hits: number;
  misses: number;
  voids: number;
}

/**
 * The resolution job. Walks pending forecasts whose resolves_at has passed,
 * evaluates each against real observations (live runs only — never mock
 * drift), and writes status/resolved_at/observed_value exactly once.
 * Idempotent and safe to re-run: planResolutions only ever proposes actions
 * for pending rows, and applyForecastResolution is guarded on status=pending
 * at both store layers plus the DB trigger. Every resolution is logged to
 * forecast_resolution_log for auditability.
 */
export async function resolveDueForecasts(
  nowIso: string = new Date().toISOString()
): Promise<ResolutionSummary> {
  const pending = await getForecasts({ status: "pending" });
  const observations = await getObservationsByTrend({ realOnly: true });
  const actions = planResolutions(pending as ForecastClaim[], observations, nowIso);

  const summary: ResolutionSummary = {
    checked: pending.length,
    resolved: 0,
    hits: 0,
    misses: 0,
    voids: 0,
  };
  for (const action of actions) {
    const applied = await applyForecastResolution({
      ...action,
      resolved_at: nowIso,
    });
    if (!applied) continue;
    summary.resolved += 1;
    if (action.status === "hit") summary.hits += 1;
    else if (action.status === "miss") summary.misses += 1;
    else summary.voids += 1;
    console.log(
      `[forecasts] resolved ${action.forecast_id} → ${action.status}: ${action.note}`
    );
  }
  return summary;
}

// ---------------------------------------------------------------------------
// Step 5 — calibration surface. Every number carries its sample size; any
// number with n < MIN_SAMPLE is reported as null (the view must render
// "not enough data", never a small-sample statistic).
// ---------------------------------------------------------------------------

export interface Gated {
  value: number | null;
  n: number;
}

export interface DecileBucket {
  /** 0..9 — forecasts with confidence in [decile/10, (decile+1)/10). */
  decile: number;
  label: string;
  n: number;
  hit_rate: number | null;
}

export interface CalibrationReport {
  window_days: number;
  generated_at: string;
  n_pending: number;
  /** Resolved (hit+miss+void) inside the window. */
  n_resolved: number;
  /** Scoreable outcomes (hit+miss) — voids are excluded from accuracy. */
  n_scored: number;
  hit_rate: Gated;
  brier: Gated;
  /** Days from the "rising" flag to the observed peak, hit peak_within only. */
  median_lead_days: Gated;
  /** Voids / resolved. High void rate = the scanner itself is unstable. */
  void_rate: Gated;
  deciles: DecileBucket[];
  min_sample: number;
}

export async function getCalibration(
  windowDays = 90,
  nowIso: string = new Date().toISOString()
): Promise<CalibrationReport> {
  const cutoff = new Date(Date.parse(nowIso) - windowDays * DAY_MS).toISOString();
  const [all, logs] = await Promise.all([getForecasts(), getResolutionLogs()]);

  const pending = all.filter((f) => f.status === "pending");
  const resolved = all.filter(
    (f) =>
      f.status !== "pending" && f.resolved_at !== null && f.resolved_at >= cutoff
  );
  const scored = resolved.filter((f) => f.status === "hit" || f.status === "miss");
  const hits = scored.filter((f) => f.status === "hit");
  const voids = resolved.filter((f) => f.status === "void");

  const gate = (value: number | null, n: number): Gated => ({
    value: n >= MIN_SAMPLE && value !== null ? value : null,
    n,
  });

  const brierSum = scored.reduce((acc, f) => {
    const outcome = f.status === "hit" ? 1 : 0;
    return acc + (f.confidence - outcome) ** 2;
  }, 0);

  // Lead time: created_at (the first rising flag of this claim) → observed
  // peak date, read from the audit log's structured detail.
  const peakDateByForecast = new Map<string, string>();
  for (const log of logs) {
    const d = log.detail?.peak_date;
    if (typeof d === "string") peakDateByForecast.set(log.forecast_id, d);
  }
  const leads = hits
    .filter((f) => f.claim_type === "peak_within")
    .map((f) => {
      const peakDate = peakDateByForecast.get(f.forecast_id);
      if (!peakDate) return null;
      return Math.round(
        (Date.parse(peakDate) - Date.parse(f.created_at)) / DAY_MS
      );
    })
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b);
  const medianLead =
    leads.length === 0
      ? null
      : leads.length % 2
        ? leads[(leads.length - 1) / 2]
        : (leads[leads.length / 2 - 1] + leads[leads.length / 2]) / 2;

  const deciles: DecileBucket[] = Array.from({ length: 10 }, (_, i) => {
    const inBucket = scored.filter(
      (f) => Math.min(9, Math.floor(f.confidence * 10)) === i
    );
    const bucketHits = inBucket.filter((f) => f.status === "hit").length;
    return {
      decile: i,
      label: `${i * 10}–${i * 10 + 10}%`,
      n: inBucket.length,
      hit_rate:
        inBucket.length >= MIN_SAMPLE ? bucketHits / inBucket.length : null,
    };
  });

  return {
    window_days: windowDays,
    generated_at: nowIso,
    n_pending: pending.length,
    n_resolved: resolved.length,
    n_scored: scored.length,
    hit_rate: gate(scored.length ? hits.length / scored.length : null, scored.length),
    brier: gate(scored.length ? brierSum / scored.length : null, scored.length),
    median_lead_days: gate(medianLead, leads.length),
    void_rate: gate(
      resolved.length ? voids.length / resolved.length : null,
      resolved.length
    ),
    deciles,
    min_sample: MIN_SAMPLE,
  };
}
