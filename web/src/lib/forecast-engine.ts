// ---------------------------------------------------------------------------
// Forecast engine — every rule that can silently corrupt the track record
// lives here, as pure functions over plain data. No imports, no IO, no clock:
// callers pass `now` in. This is what the unit tests exercise directly
// (tests/*.test.ts run this file under node --test), and what the resolution
// job in lib/forecasts.ts executes the output of.
//
// Pinned definitions (do not change casually — they define the published
// track record):
//   * All series are keyed on CALENDAR DATE (UTC), never run index. Runs are
//     irregular; run index would misrepresent elapsed time.
//   * Daily bucketing carries the last known value forward on days with no
//     run, flagged is_interpolated. Never across a gap longer than 7 days —
//     those days are null and views break the line.
//   * A trend has PEAKED on date D if the 7-day centered rolling mean of
//     harmony at D is the maximum within the observation window, AND the
//     rolling mean stays at least 5 points below that maximum for 14
//     consecutive days after D. Peaks are only confirmable 14 days in arrears.
//   * VOID: if the gap since the trend's last real observation exceeds 14
//     days at evaluation time, the forecast is void, not miss. We do not
//     score ourselves on missing data.
// ---------------------------------------------------------------------------

export const MAX_CARRY_FORWARD_DAYS = 7;
export const PEAK_DROP_POINTS = 5;
export const PEAK_CONFIRMATION_LAG_DAYS = 14;
export const VOID_GAP_DAYS = 14;
export const ROLLING_WINDOW_DAYS = 7; // centered: D-3 .. D+3

export interface ObservationInput {
  /** ISO timestamp of the observation (snapshot captured_at). */
  observed_at: string;
  harmony: number;
}

export interface DailyPoint {
  /** UTC calendar date, YYYY-MM-DD. */
  date: string;
  /** Null when the gap since the last real observation exceeds 7 days. */
  harmony: number | null;
  /** True when the value was carried forward from an earlier day. */
  is_interpolated: boolean;
}

export interface PeakResult {
  /** Date of the confirmed peak (rolling-mean maximum), or null. */
  peak_date: string | null;
  /** Rolling-mean value at the peak. */
  peak_value: number | null;
  /** True when the 14-day, 5-point drop confirmation completed. */
  confirmed: boolean;
  /** Last day of the confirmation run (peak becomes citable from here). */
  confirmed_at: string | null;
}

export type EngineStatus = "pending" | "hit" | "miss" | "void";

export interface ForecastClaim {
  forecast_id: string;
  trend_id: string;
  created_at: string;
  claim_type: "peak_within" | "sustains_above" | "fades_below";
  horizon_days: number;
  target_value: number | null;
  resolves_at: string;
  status: EngineStatus;
}

export interface Verdict {
  status: EngineStatus;
  observed_value: number | null;
  note: string;
  detail: Record<string, unknown>;
}

// --- date helpers (UTC only; no Date.now — callers supply now) --------------

const DAY_MS = 86_400_000;

export function toEpochDay(iso: string): number {
  return Math.floor(Date.parse(iso) / DAY_MS);
}

export function epochDayToDate(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

// --- Step 1: daily bucketing -------------------------------------------------

/**
 * Bucket raw observations to daily granularity, oldest first. The last
 * observation of each UTC day wins. Days with no run carry the last known
 * value forward with is_interpolated: true, but never across a gap longer
 * than 7 days — those days are null so views break the line.
 *
 * `untilIso` (optional) extends the series past the last observation, e.g. to
 * "today", subject to the same carry-forward limit.
 */
export function bucketDaily(
  observations: ObservationInput[],
  untilIso?: string
): DailyPoint[] {
  if (observations.length === 0) return [];
  const byDay = new Map<number, number>();
  for (const o of [...observations].sort((a, b) =>
    a.observed_at.localeCompare(b.observed_at)
  )) {
    byDay.set(toEpochDay(o.observed_at), o.harmony);
  }
  const days = [...byDay.keys()].sort((a, b) => a - b);
  const first = days[0];
  const lastObserved = days[days.length - 1];
  const last = untilIso
    ? Math.max(lastObserved, toEpochDay(untilIso))
    : lastObserved;

  const out: DailyPoint[] = [];
  let lastRealDay = first;
  let lastRealValue = byDay.get(first)!;
  for (let d = first; d <= last; d++) {
    const real = byDay.get(d);
    if (real !== undefined) {
      lastRealDay = d;
      lastRealValue = real;
      out.push({ date: epochDayToDate(d), harmony: real, is_interpolated: false });
    } else if (d - lastRealDay <= MAX_CARRY_FORWARD_DAYS) {
      out.push({
        date: epochDayToDate(d),
        harmony: lastRealValue,
        is_interpolated: true,
      });
    } else {
      out.push({ date: epochDayToDate(d), harmony: null, is_interpolated: false });
    }
  }
  return out;
}

// --- Step 3: peak detection --------------------------------------------------

/**
 * 7-day centered rolling mean (D-3 .. D+3) over a daily series. Averages the
 * non-null values in the window; null where the center day is null (inside a
 * broken gap there is nothing honest to report).
 */
export function centeredRollingMean(daily: DailyPoint[]): (number | null)[] {
  const half = Math.floor(ROLLING_WINDOW_DAYS / 2);
  return daily.map((p, i) => {
    if (p.harmony === null) return null;
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(daily.length - 1, i + half); j++) {
      const v = daily[j].harmony;
      if (v !== null) {
        sum += v;
        n += 1;
      }
    }
    return n === 0 ? null : sum / n;
  });
}

/**
 * Pinned peak rule. Finds the rolling-mean maximum (first day attaining it),
 * then requires 14 consecutive days after it — all non-null — at least
 * 5 points below that maximum. Missing days never count toward confirmation:
 * a peak cannot be confirmed through a data gap.
 */
export function detectPeak(daily: DailyPoint[]): PeakResult {
  const means = centeredRollingMean(daily);
  let peakIdx = -1;
  let peakValue = -Infinity;
  for (let i = 0; i < means.length; i++) {
    const m = means[i];
    if (m !== null && m > peakValue) {
      peakValue = m;
      peakIdx = i;
    }
  }
  if (peakIdx < 0) {
    return { peak_date: null, peak_value: null, confirmed: false, confirmed_at: null };
  }

  let run = 0;
  for (let i = peakIdx + 1; i < means.length; i++) {
    const m = means[i];
    if (m !== null && m <= peakValue - PEAK_DROP_POINTS) {
      run += 1;
      if (run >= PEAK_CONFIRMATION_LAG_DAYS) {
        return {
          peak_date: daily[peakIdx].date,
          peak_value: round1(peakValue),
          confirmed: true,
          confirmed_at: daily[i].date,
        };
      }
    } else {
      run = 0;
    }
  }
  return {
    peak_date: daily[peakIdx].date,
    peak_value: round1(peakValue),
    confirmed: false,
    confirmed_at: null,
  };
}

// --- Step 4: evaluation ------------------------------------------------------

/**
 * Evaluate one forecast against its trend's raw observations at time `now`.
 * Pure and deterministic: same inputs, same verdict. Returns status "pending"
 * when the claim is not yet honestly decidable (caller leaves the row alone).
 */
export function evaluateForecast(
  forecast: ForecastClaim,
  observations: ObservationInput[],
  nowIso: string
): Verdict {
  const now = toEpochDay(nowIso);
  const created = toEpochDay(forecast.created_at);
  const claimEnd = created + forecast.horizon_days;

  if (now < toEpochDay(forecast.resolves_at)) {
    return {
      status: "pending",
      observed_value: null,
      note: "resolves_at has not passed",
      detail: {},
    };
  }

  if (observations.length === 0) {
    return {
      status: "void",
      observed_value: null,
      note: "no observations for this trend",
      detail: { gap_days: null },
    };
  }

  // Void rule: the trend stopped appearing in scans. Measured against real
  // observations only — carried-forward points are not sightings.
  const lastReal = Math.max(...observations.map((o) => toEpochDay(o.observed_at)));
  const gapDays = Math.min(now, claimEnd + PEAK_CONFIRMATION_LAG_DAYS) - lastReal;
  if (gapDays > VOID_GAP_DAYS) {
    return {
      status: "void",
      observed_value: null,
      note: `observation gap of ${gapDays}d exceeds ${VOID_GAP_DAYS}d before resolution`,
      detail: { gap_days: gapDays, last_observed: epochDayToDate(lastReal) },
    };
  }

  const daily = bucketDaily(observations, nowIso);

  if (forecast.claim_type === "peak_within") {
    return evaluatePeakWithin(daily, created, claimEnd);
  }
  const windowPoints = daily.filter((p) => {
    const d = toEpochDay(p.date + "T00:00:00Z");
    return d >= created && d <= claimEnd;
  });
  if (forecast.claim_type === "sustains_above") {
    return evaluateSustainsAbove(windowPoints, forecast.target_value ?? 0);
  }
  return evaluateFadesBelow(windowPoints, forecast.target_value ?? 0);
}

function evaluatePeakWithin(
  daily: DailyPoint[],
  created: number,
  claimEnd: number
): Verdict {
  // Observation window for the peak: from the flag onward. Earlier history
  // must not let a pre-flag spike claim the maximum.
  const window = daily.filter((p) => toEpochDay(p.date + "T00:00:00Z") >= created);
  const peak = detectPeak(window);

  if (peak.confirmed && peak.peak_date !== null) {
    const peakDay = toEpochDay(peak.peak_date + "T00:00:00Z");
    if (peakDay <= claimEnd) {
      return {
        status: "hit",
        observed_value: peak.peak_value,
        note: `peak confirmed at ${peak.peak_date} (rolling mean ${peak.peak_value})`,
        detail: {
          peak_date: peak.peak_date,
          peak_value: peak.peak_value,
          confirmed_at: peak.confirmed_at,
        },
      };
    }
    return {
      status: "miss",
      observed_value: peak.peak_value,
      note: `peak confirmed at ${peak.peak_date}, after the ${epochDayToDate(claimEnd)} claim window`,
      detail: { peak_date: peak.peak_date, peak_value: peak.peak_value },
    };
  }

  // No confirmed peak. If the candidate maximum sits close enough to the end
  // of the observed series that its 14-day confirmation window is still open,
  // the claim is not yet decidable — leave it pending rather than guess.
  // "End of series" means the last non-null day: trailing broken-gap padding
  // carries no information and must not close the confirmation window.
  const lastObserved = [...window].reverse().find((p) => p.harmony !== null);
  const lastDate = lastObserved ? lastObserved.date : null;
  if (peak.peak_date !== null && lastDate !== null) {
    const peakDay = toEpochDay(peak.peak_date + "T00:00:00Z");
    const lastDay = toEpochDay(lastDate + "T00:00:00Z");
    if (peakDay <= claimEnd && lastDay - peakDay < PEAK_CONFIRMATION_LAG_DAYS) {
      return {
        status: "pending",
        observed_value: null,
        note: "candidate peak inside window; confirmation period still open",
        detail: { peak_date: peak.peak_date, peak_value: peak.peak_value },
      };
    }
  }
  return {
    status: "miss",
    observed_value: peak.peak_value,
    note: "no confirmed peak within the claim window",
    detail: { peak_date: peak.peak_date, peak_value: peak.peak_value },
  };
}

function evaluateSustainsAbove(window: DailyPoint[], target: number): Verdict {
  const values = window.map((p) => p.harmony);
  if (values.length === 0 || values.some((v) => v === null)) {
    // A >7-day hole inside a "stays above throughout" claim is unverifiable.
    return {
      status: "void",
      observed_value: null,
      note: "claim window contains an unobserved gap longer than 7 days",
      detail: {},
    };
  }
  const min = Math.min(...(values as number[]));
  if (min >= target) {
    return {
      status: "hit",
      observed_value: min,
      note: `stayed at or above ${target} (window minimum ${min})`,
      detail: { window_min: min },
    };
  }
  return {
    status: "miss",
    observed_value: min,
    note: `dropped to ${min}, below ${target}`,
    detail: { window_min: min },
  };
}

function evaluateFadesBelow(window: DailyPoint[], target: number): Verdict {
  const observed = window.filter((p) => p.harmony !== null);
  const below = observed.find((p) => (p.harmony as number) < target);
  if (below) {
    return {
      status: "hit",
      observed_value: below.harmony,
      note: `dropped below ${target} on ${below.date}`,
      detail: { crossed_on: below.date },
    };
  }
  const hasGap = window.length === 0 || window.some((p) => p.harmony === null);
  if (hasGap) {
    // Never seen below target, but the window has holes it could have faded
    // through unseen.
    return {
      status: "void",
      observed_value: null,
      note: "never observed below target, and the window has unobserved gaps",
      detail: {},
    };
  }
  const min = Math.min(...observed.map((p) => p.harmony as number));
  return {
    status: "miss",
    observed_value: min,
    note: `never dropped below ${target} (window minimum ${min})`,
    detail: { window_min: min },
  };
}

// --- Step 4: the resolution plan ---------------------------------------------

export interface ResolutionAction {
  forecast_id: string;
  status: Exclude<EngineStatus, "pending">;
  observed_value: number | null;
  note: string;
  detail: Record<string, unknown>;
}

/**
 * Walk forecasts and produce the resolutions that are due. Idempotent by
 * construction: already-resolved rows are never touched, not-yet-due and
 * not-yet-decidable claims produce no action. Running it twice on the same
 * data yields actions only for rows still pending.
 */
export function planResolutions(
  forecasts: ForecastClaim[],
  observationsByTrend: Map<string, ObservationInput[]>,
  nowIso: string
): ResolutionAction[] {
  const actions: ResolutionAction[] = [];
  for (const f of forecasts) {
    if (f.status !== "pending") continue;
    const verdict = evaluateForecast(
      f,
      observationsByTrend.get(f.trend_id) ?? [],
      nowIso
    );
    if (verdict.status === "pending") continue;
    actions.push({
      forecast_id: f.forecast_id,
      status: verdict.status,
      observed_value: verdict.observed_value,
      note: verdict.note,
      detail: verdict.detail,
    });
  }
  return actions;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
