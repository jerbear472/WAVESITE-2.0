// Resolution-job tests. The job itself (lib/forecasts.ts) is a thin executor
// of planResolutions + evaluateForecast — the pure functions tested here.
// These two are the ones that would silently corrupt the track record:
// idempotency, the void rule, and every claim type's hit/miss/void boundary.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateForecast,
  planResolutions,
  type ForecastClaim,
  type ObservationInput,
} from "../src/lib/forecast-engine.ts";

const DAY_MS = 86_400_000;
const BASE = Date.UTC(2026, 0, 1);

function dayIso(offset: number, hour = 12): string {
  return new Date(BASE + offset * DAY_MS + hour * 3_600_000).toISOString();
}

function series(days: number, value: (d: number) => number): ObservationInput[] {
  return Array.from({ length: days + 1 }, (_, d) => ({
    observed_at: dayIso(d),
    harmony: Math.round(value(d)),
  }));
}

function claim(overrides: Partial<ForecastClaim>): ForecastClaim {
  return {
    forecast_id: "fc-test",
    trend_id: "trend-test",
    created_at: dayIso(0),
    claim_type: "peak_within",
    horizon_days: 30,
    target_value: null,
    resolves_at: dayIso(44), // 30d window + 14d confirmation lag
    status: "pending",
    ...overrides,
  };
}

/** Symmetric rise to 80 at `peakDay`, fall 2/day, floored at 40. */
const arc = (peakDay: number) => (d: number) =>
  d <= peakDay
    ? Math.max(40, 80 - 2 * (peakDay - d))
    : Math.max(40, 80 - 2 * (d - peakDay));

// --- peak_within -------------------------------------------------------------

test("peak_within: stays pending until resolves_at has passed", () => {
  const v = evaluateForecast(claim({}), series(20, arc(10)), dayIso(43));
  assert.equal(v.status, "pending");
});

test("peak_within: confirmed peak inside the window → hit, with peak date in detail", () => {
  const v = evaluateForecast(claim({}), series(45, arc(10)), dayIso(45));
  assert.equal(v.status, "hit");
  assert.equal(v.detail.peak_date, dayIso(10).slice(0, 10));
  assert.ok(typeof v.observed_value === "number");
});

test("peak_within: peak confirmed after the claim window → miss", () => {
  // Peak lands at day 40; window ended day 30.
  const v = evaluateForecast(claim({}), series(60, arc(40)), dayIso(60));
  assert.equal(v.status, "miss");
  assert.match(v.note, /after the/);
});

test("peak_within: plateau that never drops 5 points → miss, not hit", () => {
  // Rise to 80 by day 10, hold 78 forever: no confirmable peak exists.
  const v = evaluateForecast(
    claim({}),
    series(45, (d) => (d <= 10 ? 60 + 2 * d : 78)),
    dayIso(45)
  );
  assert.equal(v.status, "miss");
  assert.match(v.note, /no confirmed peak/);
});

test("peak_within: candidate peak with confirmation window still open → pending", () => {
  // Peak day 25 (inside window), observations stop at day 30: only 5 days of
  // decline seen, gap at evaluation is exactly 14d — not void, not decidable.
  const v = evaluateForecast(claim({}), series(30, arc(25)), dayIso(44));
  assert.equal(v.status, "pending");
  assert.match(v.note, /confirmation period still open/);
});

test("peak_within: pre-flag history cannot claim the maximum", () => {
  // Big spike at day -20, forecast created day 0, modest confirmed peak at
  // day 10 inside the window. The old spike must not turn this into a miss.
  const pre = series(45, arc(10));
  pre.unshift({ observed_at: dayIso(-20), harmony: 99 });
  const v = evaluateForecast(claim({}), pre, dayIso(45));
  assert.equal(v.status, "hit");
  assert.equal(v.detail.peak_date, dayIso(10).slice(0, 10));
});

// --- the void rule -----------------------------------------------------------

test("void: observation gap over 14 days before resolution → void, never miss", () => {
  const v = evaluateForecast(claim({}), series(10, arc(5)), dayIso(45));
  assert.equal(v.status, "void");
  assert.match(v.note, /observation gap/);
  assert.ok((v.detail.gap_days as number) > 14);
});

test("void: no observations at all → void", () => {
  const v = evaluateForecast(claim({}), [], dayIso(45));
  assert.equal(v.status, "void");
});

// --- sustains_above / fades_below -------------------------------------------

const sustains = () =>
  claim({
    claim_type: "sustains_above",
    horizon_days: 14,
    target_value: 70,
    resolves_at: dayIso(14),
  });

test("sustains_above: window minimum at or above target → hit", () => {
  const v = evaluateForecast(sustains(), series(15, () => 75), dayIso(15));
  assert.equal(v.status, "hit");
  assert.equal(v.observed_value, 75);
});

test("sustains_above: a single day below target → miss with the observed minimum", () => {
  const v = evaluateForecast(
    sustains(),
    series(15, (d) => (d === 7 ? 65 : 75)),
    dayIso(15)
  );
  assert.equal(v.status, "miss");
  assert.equal(v.observed_value, 65);
});

test("sustains_above: an unobserved gap >7d inside the window → void (unverifiable)", () => {
  const observations = [
    ...series(2, () => 75),
    { observed_at: dayIso(12), harmony: 75 },
    { observed_at: dayIso(14), harmony: 75 },
  ];
  const v = evaluateForecast(sustains(), observations, dayIso(15));
  assert.equal(v.status, "void");
});

const fades = () =>
  claim({
    claim_type: "fades_below",
    horizon_days: 14,
    target_value: 60,
    resolves_at: dayIso(14),
  });

test("fades_below: any observed day under target → hit", () => {
  const v = evaluateForecast(
    fades(),
    series(15, (d) => (d === 9 ? 55 : 70)),
    dayIso(15)
  );
  assert.equal(v.status, "hit");
  assert.equal(v.observed_value, 55);
});

test("fades_below: never below target with full coverage → miss", () => {
  const v = evaluateForecast(fades(), series(15, () => 70), dayIso(15));
  assert.equal(v.status, "miss");
});

test("fades_below: never observed below but the window has holes → void", () => {
  const observations = [
    ...series(2, () => 70),
    { observed_at: dayIso(13), harmony: 70 },
    { observed_at: dayIso(14), harmony: 70 },
  ];
  const v = evaluateForecast(fades(), observations, dayIso(15));
  assert.equal(v.status, "void");
});

// --- planResolutions: the job's walk ----------------------------------------

test("planResolutions acts only on pending forecasts that are due and decidable", () => {
  const observations = new Map([["trend-test", series(45, arc(10))]]);
  const due = claim({ forecast_id: "fc-due" });
  const notDue = claim({ forecast_id: "fc-not-due", resolves_at: dayIso(100) });
  const alreadyResolved = claim({ forecast_id: "fc-done", status: "hit" });

  const actions = planResolutions(
    [due, notDue, alreadyResolved],
    observations,
    dayIso(45)
  );
  assert.equal(actions.length, 1);
  assert.equal(actions[0].forecast_id, "fc-due");
  assert.equal(actions[0].status, "hit");
});

test("planResolutions is idempotent: once applied, a re-run plans nothing", () => {
  const observations = new Map([["trend-test", series(45, arc(10))]]);
  const forecast = claim({ forecast_id: "fc-once" });

  const first = planResolutions([forecast], observations, dayIso(45));
  assert.equal(first.length, 1);

  // Apply the resolution the way the job does, then walk again.
  forecast.status = first[0].status;
  const second = planResolutions([forecast], observations, dayIso(45));
  assert.equal(second.length, 0);
});

test("planResolutions never proposes mutating an already-resolved row, even with new data", () => {
  // Resolved as miss; later observations would now say hit. The record stands.
  const forecast = claim({ forecast_id: "fc-final", status: "miss" });
  const actions = planResolutions(
    [forecast],
    new Map([["trend-test", series(45, arc(10))]]),
    dayIso(60)
  );
  assert.equal(actions.length, 0);
});
