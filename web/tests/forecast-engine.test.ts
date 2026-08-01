// Peak-detection rule tests. This rule defines the published track record —
// if it drifts, every resolved forecast is silently wrong, so the pinned
// definition is exercised at its boundaries here.
//
// Runs on the built-in node test runner (no dependencies):
//   npm test   →  node --experimental-strip-types --test tests/*.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bucketDaily,
  centeredRollingMean,
  detectPeak,
  toEpochDay,
  type DailyPoint,
  type ObservationInput,
} from "../src/lib/forecast-engine.ts";

const DAY_MS = 86_400_000;
const BASE = Date.UTC(2026, 0, 1); // 2026-01-01

function dayIso(offset: number, hour = 12): string {
  return new Date(BASE + offset * DAY_MS + hour * 3_600_000).toISOString();
}

function dayDate(offset: number): string {
  return new Date(BASE + offset * DAY_MS).toISOString().slice(0, 10);
}

function obs(values: [number, number][]): ObservationInput[] {
  return values.map(([d, harmony]) => ({ observed_at: dayIso(d), harmony }));
}

/** Build a DailyPoint[] directly from per-day values (null = broken gap). */
function mkDaily(values: (number | null)[]): DailyPoint[] {
  return values.map((v, i) => ({
    date: dayDate(i),
    harmony: v,
    is_interpolated: false,
  }));
}

// --- daily bucketing ---------------------------------------------------------

test("bucketDaily keys on calendar date and the last observation of a day wins", () => {
  const daily = bucketDaily([
    { observed_at: dayIso(0, 9), harmony: 40 },
    { observed_at: dayIso(0, 18), harmony: 44 },
    { observed_at: dayIso(1), harmony: 50 },
  ]);
  assert.equal(daily.length, 2);
  assert.deepEqual(daily[0], {
    date: dayDate(0),
    harmony: 44,
    is_interpolated: false,
  });
  assert.equal(daily[1].harmony, 50);
});

test("bucketDaily carries the last value forward on missing days, flagged is_interpolated", () => {
  const daily = bucketDaily(obs([[0, 60], [3, 66]]));
  assert.equal(daily.length, 4);
  assert.deepEqual(
    daily.map((p) => [p.harmony, p.is_interpolated]),
    [
      [60, false],
      [60, true],
      [60, true],
      [66, false],
    ]
  );
});

test("bucketDaily never interpolates across a gap longer than 7 days — returns null", () => {
  const daily = bucketDaily(obs([[0, 60], [10, 70]]));
  // days 1..7 carried (gap <= 7), days 8..9 null (gap > 7), day 10 real
  assert.equal(daily.length, 11);
  assert.equal(daily[7].harmony, 60);
  assert.equal(daily[7].is_interpolated, true);
  assert.equal(daily[8].harmony, null);
  assert.equal(daily[9].harmony, null);
  assert.equal(daily[10].harmony, 70);
});

test("bucketDaily untilIso extends the series under the same carry rules", () => {
  const daily = bucketDaily(obs([[0, 60]]), dayIso(10));
  assert.equal(daily.length, 11);
  assert.equal(daily[7].harmony, 60); // carried
  assert.equal(daily[8].harmony, null); // beyond 7-day carry
});

// --- rolling mean ------------------------------------------------------------

test("centeredRollingMean averages a 7-day window and is null where the center is null", () => {
  const means = centeredRollingMean(mkDaily([10, 20, 30, 40, 50, 60, 70]));
  assert.equal(means[3], 40); // full window
  assert.equal(means[0], (10 + 20 + 30 + 40) / 4); // truncated at the edge
  const withGap = centeredRollingMean(mkDaily([10, null, 30]));
  assert.equal(withGap[1], null);
});

// --- the pinned peak rule ----------------------------------------------------

// Flat 80 for 10 days, then flat 70: rolling-mean max is 80 (first at day 0),
// the mean crosses below 75 (= max - 5) from day 10 onward.
function plateauSeries(totalDays: number, tail = 70): (number | null)[] {
  return Array.from({ length: totalDays + 1 }, (_, d) => (d < 10 ? 80 : tail));
}

test("detectPeak confirms after exactly 14 consecutive days at least 5 below the max", () => {
  // Below-threshold run starts at day 10; day 23 is the 14th day.
  const confirmed = detectPeak(mkDaily(plateauSeries(23)));
  assert.equal(confirmed.confirmed, true);
  assert.equal(confirmed.peak_date, dayDate(0));
  assert.equal(confirmed.confirmed_at, dayDate(23));
});

test("detectPeak does NOT confirm with only 13 days below — the lag is intentional", () => {
  const result = detectPeak(mkDaily(plateauSeries(22)));
  assert.equal(result.confirmed, false);
  assert.equal(result.peak_date, dayDate(0)); // candidate exists, unconfirmed
});

test("detectPeak does NOT confirm when the drop is smaller than 5 points", () => {
  const result = detectPeak(mkDaily(plateauSeries(40, 76))); // 80 → 76: only 4 down
  assert.equal(result.confirmed, false);
});

test("detectPeak never confirms across a data gap — null days break the run", () => {
  // 80×10, then 70s with a null at day 17: runs of 7 and 13 days, never 14.
  const values = plateauSeries(30);
  values[17] = null;
  const result = detectPeak(mkDaily(values));
  assert.equal(result.confirmed, false);
  // Extend past the gap so an unbroken 14-day run exists after it: confirms.
  const longer = plateauSeries(31);
  longer[17] = null;
  const confirmed = detectPeak(mkDaily(longer));
  assert.equal(confirmed.confirmed, true);
  assert.equal(confirmed.confirmed_at, dayDate(31));
});

test("detectPeak picks the first day the rolling-mean maximum is attained", () => {
  // Symmetric rise/fall of 2/day around day 10 — unique interior max there.
  const values = Array.from({ length: 40 }, (_, d) =>
    d <= 10 ? 60 + 2 * d : Math.max(40, 80 - 2 * (d - 10))
  );
  const result = detectPeak(mkDaily(values));
  assert.equal(result.confirmed, true);
  assert.equal(result.peak_date, dayDate(10));
  assert.ok((result.peak_value ?? 0) < 80); // rolling mean smooths the spike
});

test("toEpochDay/date helpers round-trip on UTC dates", () => {
  assert.equal(toEpochDay(dayIso(5)), toEpochDay(dayDate(5) + "T00:00:00Z"));
});
