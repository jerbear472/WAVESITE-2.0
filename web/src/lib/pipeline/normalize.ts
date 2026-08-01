// Percentile normalization — the guarantee of spread.
//
// Every score exposed to the UI is the percentile rank of a raw metric within
// a FIXED reference distribution: the trailing 90 days of metric_history
// across all trends. Never per-run min/max — per-run rescaling would make
// positions incomparable across time.
//
// Cold start: below MIN_HISTORY_DAYS of history the reference is the current
// run's own values and the result is flagged provisional.

export const HISTORY_WINDOW_DAYS = 90;
export const MIN_HISTORY_DAYS = 30;
export const MIN_HISTORY_POINTS = 40;

/**
 * Percentile rank of `value` within `reference`, 0-100.
 * Mean-rank convention: ties take the average of their positions, so a
 * reference of identical values maps everything to 50 rather than 0 or 100.
 * Empty reference returns 50 (no information, not extreme).
 */
export function percentileRank(value: number, reference: number[]): number {
  const n = reference.length;
  if (n === 0) return 50;
  let below = 0;
  let equal = 0;
  for (const r of reference) {
    if (r < value) below++;
    else if (r === value) equal++;
  }
  return round1(((below + equal / 2) / n) * 100);
}

export interface HistoryPoint {
  raw_value: number;
  recorded_at: string;
}

export interface NormalizeResult {
  percentile: number;
  provisional: boolean;
  reference_n: number;
}

/**
 * Normalize one raw value against its metric's rolling history.
 * `withinRunValues` is the fallback reference for the cold start — the same
 * metric across all trends in the current run.
 */
export function normalizeAgainstHistory(
  value: number,
  history: HistoryPoint[],
  withinRunValues: number[],
  nowIso: string
): NormalizeResult {
  const now = Date.parse(nowIso);
  const windowStart = now - HISTORY_WINDOW_DAYS * 86_400_000;
  const inWindow = history.filter((h) => {
    const t = Date.parse(h.recorded_at);
    return t >= windowStart && t <= now;
  });

  const spanDays =
    inWindow.length >= 2
      ? (Math.max(...inWindow.map((h) => Date.parse(h.recorded_at))) -
          Math.min(...inWindow.map((h) => Date.parse(h.recorded_at)))) /
        86_400_000
      : 0;

  const mature =
    spanDays >= MIN_HISTORY_DAYS && inWindow.length >= MIN_HISTORY_POINTS;

  if (mature) {
    return {
      percentile: percentileRank(value, inWindow.map((h) => h.raw_value)),
      provisional: false,
      reference_n: inWindow.length,
    };
  }
  return {
    percentile: percentileRank(value, withinRunValues),
    provisional: true,
    reference_n: withinRunValues.length,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
