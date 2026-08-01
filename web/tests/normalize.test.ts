// Percentile normalizer tests. This is where silent distortion enters: a
// wrong rank convention compresses or splays every published score, and a
// broken cold-start gate publishes confident numbers with no reference.
//   npm test → node --experimental-strip-types --test tests/*.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_HISTORY_DAYS,
  MIN_HISTORY_POINTS,
  normalizeAgainstHistory,
  percentileRank,
  type HistoryPoint,
} from "../src/lib/pipeline/normalize.ts";

const DAY_MS = 86_400_000;
const NOW = "2026-08-01T00:00:00.000Z";

function daysAgo(d: number): string {
  return new Date(Date.parse(NOW) - d * DAY_MS).toISOString();
}

function history(values: number[], spreadDays: number): HistoryPoint[] {
  // Spread values evenly across the trailing spreadDays.
  return values.map((raw_value, i) => ({
    raw_value,
    recorded_at: daysAgo((i / Math.max(1, values.length - 1)) * spreadDays),
  }));
}

// --- percentileRank ---------------------------------------------------------

test("empty reference returns the uninformative middle, not an extreme", () => {
  assert.equal(percentileRank(42, []), 50);
});

test("value below all reference points ranks near 0", () => {
  assert.equal(percentileRank(1, [10, 20, 30, 40]), 0);
});

test("value above all reference points ranks 100", () => {
  assert.equal(percentileRank(99, [10, 20, 30, 40]), 100);
});

test("median of an odd reference ranks 50", () => {
  assert.equal(percentileRank(30, [10, 20, 30, 40, 50]), 50);
});

test("ties use mean rank: identical reference maps to 50, not 0 or 100", () => {
  assert.equal(percentileRank(7, [7, 7, 7, 7]), 50);
});

test("partial ties average their positions", () => {
  // below=1, equal=2, n=4 -> (1 + 1) / 4 = 50
  assert.equal(percentileRank(20, [10, 20, 20, 30]), 50);
});

test("rank is monotonic in the value", () => {
  const ref = [3, 1, 4, 1, 5, 9, 2, 6];
  let prev = -1;
  for (const v of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const r = percentileRank(v, ref);
    assert.ok(r >= prev, `rank must not decrease (${v}: ${r} < ${prev})`);
    prev = r;
  }
});

test("compressed raw values still separate by construction", () => {
  // The failure mode this whole pipeline exists to kill: raw values packed
  // into a narrow band must still spread across percentile space.
  const ref = [70, 71, 72, 73, 74, 75, 76, 77, 78, 79];
  assert.equal(percentileRank(70, ref), 5);
  assert.equal(percentileRank(75, ref), 55);
  assert.equal(percentileRank(79, ref), 95);
});

// --- normalizeAgainstHistory ------------------------------------------------

function matureValues(): number[] {
  return Array.from({ length: MIN_HISTORY_POINTS }, (_, i) => i); // 0..39
}

test("mature history: ranks against history, not provisional", () => {
  const h = history(matureValues(), MIN_HISTORY_DAYS + 10);
  const r = normalizeAgainstHistory(100, h, [1, 2, 3], NOW);
  assert.equal(r.provisional, false);
  assert.equal(r.percentile, 100);
  assert.equal(r.reference_n, MIN_HISTORY_POINTS);
});

test("cold start by span: enough points but too few days -> provisional within-run", () => {
  const h = history(matureValues(), MIN_HISTORY_DAYS - 5);
  const r = normalizeAgainstHistory(5, h, [0, 5, 10], NOW);
  assert.equal(r.provisional, true);
  assert.equal(r.percentile, 50); // middle of the within-run values
});

test("cold start by count: enough days but too few points -> provisional", () => {
  const h = history([1, 2, 3], MIN_HISTORY_DAYS + 20);
  const r = normalizeAgainstHistory(2, h, [1, 2, 3], NOW);
  assert.equal(r.provisional, true);
});

test("history outside the 90-day window is ignored", () => {
  // All points recorded ~200 days ago: window filter drops them entirely.
  const stale: HistoryPoint[] = matureValues().map((v) => ({
    raw_value: v,
    recorded_at: daysAgo(200),
  }));
  const r = normalizeAgainstHistory(39, stale, [39, 100], NOW);
  assert.equal(r.provisional, true);
});

test("fixed reference scale: same value, same history -> same percentile regardless of the current batch", () => {
  const h = history(matureValues(), MIN_HISTORY_DAYS + 10);
  const a = normalizeAgainstHistory(20, h, [1, 2], NOW);
  const b = normalizeAgainstHistory(20, h, [500, 900, 1300], NOW);
  assert.equal(a.percentile, b.percentile); // batch must not move the scale
  assert.equal(a.provisional, false);
});
