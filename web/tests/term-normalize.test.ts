// Term normalization tests — baseline calculation, the volume floor, and the
// persistence rule. These three are where silent corruption enters: a
// baseline that includes today mutes every spike, a missing floor turns
// low-count noise into giant z-scores, and a broken persistence rule floods
// the cascade with single-day spikes.
//   npm test → node --experimental-strip-types --test tests/*.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  baselineFor,
  percentileRank,
  scoreTermSource,
  zScore,
  type DatedCount,
} from "../src/lib/terms/normalize.ts";
import { DEFAULT_SCORING_CONFIG } from "../src/lib/terms/types.ts";

const DAY_MS = 86_400_000;
const TARGET = "2026-08-01";

/** Build a series ending at TARGET: values[i] lands (values.length-1-i) days
 *  before TARGET, so the last element IS the target day. */
function series(values: number[]): DatedCount[] {
  const end = Date.parse(`${TARGET}T00:00:00Z`);
  return values.map((raw_count, i) => ({
    date: new Date(end - (values.length - 1 - i) * DAY_MS)
      .toISOString()
      .slice(0, 10),
    raw_count,
  }));
}

const cfg = { ...DEFAULT_SCORING_CONFIG };

// --- baseline calculation ---------------------------------------------------

test("baseline excludes the current day — today's spike cannot mute itself", () => {
  const s = series([10, 10, 10, 10, 10, 10, 10, 1000]);
  const b = baselineFor(s, TARGET, cfg.baseline_days);
  assert.equal(b.n, 7);
  assert.equal(b.mean, 10); // the 1000 on the target day is not in its own baseline
  assert.equal(b.sd, 0);
});

test("baseline only reaches back the configured window", () => {
  // 40 days of 100s followed by 30 days of 10s then the target day: the
  // 30-day window (days -30..-1) holds only the 10s, none of the 100s.
  const s = series([...Array(40).fill(100), ...Array(30).fill(10), 999]);
  const b = baselineFor(s, TARGET, 30);
  assert.equal(b.n, 30);
  assert.equal(b.mean, 10);
});

test("days with no observation are absent from the baseline, not zeros", () => {
  // Only 3 observed days in the trailing window — n must be 3, and the mean
  // must be the mean of observed values, not diluted by phantom zeros.
  const sparse: DatedCount[] = [
    { date: "2026-07-10", raw_count: 20 },
    { date: "2026-07-20", raw_count: 30 },
    { date: "2026-07-30", raw_count: 40 },
    { date: TARGET, raw_count: 500 },
  ];
  const b = baselineFor(sparse, TARGET, 30);
  assert.equal(b.n, 3);
  assert.equal(b.mean, 30);
});

test("empty baseline returns nulls, never NaN", () => {
  const b = baselineFor([{ date: TARGET, raw_count: 5 }], TARGET, 30);
  assert.equal(b.n, 0);
  assert.equal(b.mean, null);
  assert.equal(b.sd, null);
});

test("z-score floors sd at the Poisson noise level — flat baselines can't explode", () => {
  // mean 100, sd 0: floor is sqrt(100)=10, so +30 is z=3, not infinity.
  assert.equal(zScore(130, 100, 0), 3);
  // A real sd larger than the floor is used as-is.
  assert.equal(zScore(140, 100, 20), 2);
});

test("insufficient baseline suppresses scoring instead of guessing", () => {
  const s = series([10, 10, 10, 50]); // only 3 prior days < min_baseline_n (7)
  const r = scoreTermSource(s, TARGET, cfg, 0);
  assert.equal(r.suppressed, "insufficient_baseline");
  assert.equal(r.z_score, null);
  assert.equal(r.flagged, false);
});

// --- volume floor -----------------------------------------------------------

test("volume floor suppresses scoring below the minimum count", () => {
  // 2 -> 4 mentions is a +z move on its own baseline, but with a floor of 5
  // it must be suppressed: low-count terms make enormous z from trivia.
  const s = series([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4]);
  const r = scoreTermSource(s, TARGET, cfg, 5);
  assert.equal(r.suppressed, "volume_floor");
  assert.equal(r.z_score, null);
  assert.equal(r.flagged, false);
});

test("volume floor records the raw count even while suppressing", () => {
  const s = series([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4]);
  const r = scoreTermSource(s, TARGET, cfg, 5);
  assert.equal(r.raw_count, 4); // a withheld score is data, not a gap
});

test("at or above the floor, scoring proceeds normally", () => {
  const s = series([...Array(14).fill(10), 60]);
  const r = scoreTermSource(s, TARGET, cfg, 5);
  assert.equal(r.suppressed, null);
  assert.ok(r.z_score !== null && r.z_score > cfg.z_threshold);
  assert.equal(r.flagged, true);
});

// --- persistence rule (3 of trailing 5) -------------------------------------

test("a single-day spike is flagged but NOT persistent", () => {
  const s = series([...Array(20).fill(10), 200]);
  const r = scoreTermSource(s, TARGET, cfg, 0);
  assert.equal(r.flagged, true);
  assert.equal(r.persistent, false); // 1 of 5 < 3 required
});

test("three elevated days in the window make the flag persistent", () => {
  // 20 quiet days, then three consecutive spike days ending at the target.
  const s = series([...Array(20).fill(10), 200, 210, 220]);
  const r = scoreTermSource(s, TARGET, cfg, 0);
  assert.equal(r.flagged, true);
  assert.equal(r.persistent, true);
});

test("elevated days OUTSIDE the trailing window don't count", () => {
  // Spikes 6-8 days ago, quiet since, spike again today: only today is
  // within the 5-day window, so persistence must not trigger.
  const s = series([...Array(15).fill(10), 200, 200, 200, 10, 10, 10, 10, 200]);
  const r = scoreTermSource(s, TARGET, cfg, 0);
  assert.equal(r.flagged, true);
  assert.equal(r.persistent, false);
});

test("persistence requires TODAY to be flagged — a fading term is not newly persistent", () => {
  // Three spike days then two quiet days ending at the target: 3 hits exist
  // in the window but today is calm, so nothing should be flagged today.
  const s = series([...Array(20).fill(10), 200, 210, 220, 10, 10]);
  const r = scoreTermSource(s, TARGET, cfg, 0);
  assert.equal(r.flagged, false);
  assert.equal(r.persistent, false);
});

test("missing days inside the window count as not-flagged, not as hits", () => {
  // Only 2 observed spike days in the trailing 5 (the rest unobserved):
  // 2 hits < 3 required.
  const base = series([...Array(25).fill(10)]).slice(0, 21); // ends 4 days early
  const s: DatedCount[] = [
    ...base,
    { date: "2026-07-31", raw_count: 200 },
    { date: TARGET, raw_count: 200 },
  ];
  const r = scoreTermSource(s, TARGET, cfg, 0);
  assert.equal(r.flagged, true);
  assert.equal(r.persistent, false);
});

// --- percentile (self-history only) -----------------------------------------

test("percentile ranks today within the term's own trailing days", () => {
  const s = series([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 95]);
  const r = scoreTermSource(s, TARGET, cfg, 0);
  assert.ok(r.percentile !== null && r.percentile > 85);
});

test("percentileRank of empty reference is the uninformative middle", () => {
  assert.equal(percentileRank(7, []), 50);
});
