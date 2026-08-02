// Per-source normalization — every term scored against ITSELF, never against
// other terms. Cross-term comparison happens only at the composite stage,
// using percentiles.
//
// For every (term, source, date):
//   baseline   = 30-day trailing mean and sd, EXCLUDING the current day
//   z_score    = (today - mean) / sd, with a Poisson floor on sd
//   percentile = rank of today's count within the term's own trailing 90 days
//
// Two noise controls, both required:
//   volume floor — no scoring below a per-source minimum count; low-count
//     terms generate enormous z-scores from trivial moves.
//   persistence — not flagged until z exceeds threshold on >=3 of the
//     trailing 5 days; single-day spikes are almost always noise.
//
// Pure functions only: no I/O, no "@/" imports, directly testable under
// `node --test` (see tests/term-normalize.test.ts).

import {
  DEFAULT_SCORING_CONFIG,
  type TermScoringConfig,
} from "./types.ts";

export interface DatedCount {
  date: string; // YYYY-MM-DD
  raw_count: number;
}

export interface DayScore {
  raw_count: number;
  baseline_mean: number | null;
  baseline_sd: number | null;
  baseline_n: number;
  z_score: number | null;
  percentile: number | null;
  suppressed: "volume_floor" | "insufficient_baseline" | null;
  flagged: boolean;
  persistent: boolean;
}

const DAY_MS = 86_400_000;

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS
  );
}

/** Trailing mean/sd over the `baselineDays` before `date` — the current day
 *  is EXCLUDED so today's spike cannot inflate its own baseline. Days with no
 *  observation simply aren't in the sample (missing ≠ zero: an adapter that
 *  didn't run that day measured nothing). */
export function baselineFor(
  series: DatedCount[],
  date: string,
  baselineDays: number
): { mean: number | null; sd: number | null; n: number } {
  const start = addDays(date, -baselineDays);
  const window = series.filter((p) => p.date >= start && p.date < date);
  const n = window.length;
  if (n === 0) return { mean: null, sd: null, n: 0 };
  const mean = window.reduce((s, p) => s + p.raw_count, 0) / n;
  const variance =
    window.reduce((s, p) => s + (p.raw_count - mean) ** 2, 0) / n;
  return { mean, sd: Math.sqrt(variance), n };
}

/** z with a floored sd: max(sd, sqrt(mean), 1). A flat baseline would
 *  otherwise make any move register as infinite; sqrt(mean) is the Poisson
 *  noise floor appropriate for count data. */
export function zScore(value: number, mean: number, sd: number): number {
  const floor = Math.max(sd, Math.sqrt(Math.max(mean, 1)), 1);
  return (value - mean) / floor;
}

/** Percentile rank of `value` within `reference`, 0-100, mean-rank ties.
 *  Same convention as the corpus pipeline's normalizer. */
export function percentileRank(value: number, reference: number[]): number {
  const n = reference.length;
  if (n === 0) return 50;
  let below = 0;
  let equal = 0;
  for (const r of reference) {
    if (r < value) below++;
    else if (r === value) equal++;
  }
  return Math.round(((below + equal / 2) / n) * 1000) / 10;
}

/** Score a single day of a term's series against its own history. */
export function scoreDay(
  series: DatedCount[],
  date: string,
  cfg: Pick<
    TermScoringConfig,
    "z_threshold" | "baseline_days" | "min_baseline_n"
  >,
  volumeFloor: number
): Omit<DayScore, "percentile" | "persistent"> {
  const today = series.find((p) => p.date === date);
  const raw = today?.raw_count ?? 0;
  const { mean, sd, n } = baselineFor(series, date, cfg.baseline_days);

  if (raw < volumeFloor) {
    return {
      raw_count: raw,
      baseline_mean: mean,
      baseline_sd: sd,
      baseline_n: n,
      z_score: null,
      suppressed: "volume_floor",
      flagged: false,
    };
  }
  if (n < cfg.min_baseline_n || mean === null || sd === null) {
    return {
      raw_count: raw,
      baseline_mean: mean,
      baseline_sd: sd,
      baseline_n: n,
      z_score: null,
      suppressed: "insufficient_baseline",
      flagged: false,
    };
  }
  const z = zScore(raw, mean, sd);
  return {
    raw_count: raw,
    baseline_mean: round3(mean),
    baseline_sd: round3(sd),
    baseline_n: n,
    z_score: round3(z),
    suppressed: null,
    flagged: z >= cfg.z_threshold,
  };
}

/** Full scoring for the target date: day score + self-percentile over the
 *  trailing 90 days + the 3-of-5 persistence rule (the target day counts as
 *  one of the five; days with no observation count as not flagged). */
export function scoreTermSource(
  series: DatedCount[],
  date: string,
  cfg: TermScoringConfig = DEFAULT_SCORING_CONFIG,
  volumeFloor = 0
): DayScore {
  const day = scoreDay(series, date, cfg, volumeFloor);

  const pctStart = addDays(date, -cfg.percentile_days);
  const reference = series
    .filter((p) => p.date >= pctStart && p.date < date)
    .map((p) => p.raw_count);
  const percentile =
    reference.length > 0 ? percentileRank(day.raw_count, reference) : null;

  let hits = 0;
  for (let back = 0; back < cfg.persistence_window; back++) {
    const d = addDays(date, -back);
    const scored =
      back === 0 ? day : scoreDay(series, d, cfg, volumeFloor);
    if (scored.flagged) hits++;
  }
  const persistent = day.flagged && hits >= cfg.persistence_hits;

  return { ...day, percentile, persistent };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
