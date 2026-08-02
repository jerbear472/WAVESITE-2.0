import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTrendNarrative } from "../src/lib/trend-narrative.ts";
import type { Forecast, Trend } from "../src/types/index.ts";
import type { TrendHistory } from "../src/lib/pipeline/backfill.ts";

const trend = {
  lifecycle_stage: "accelerating",
  risk_level: "low",
  saturation_score: 35,
  momentum_score: 84,
} as Trend;

const history = {
  months: [
    { period: "2026-06", volume: 5, engagement: 4, sentiment: 0.2, labeled_items: 5, sentiment_counts: { positive: 3, neutral: 1, negative: 1, ironic: 0 } },
    { period: "2026-07", volume: 9, engagement: 9, sentiment: 0.6, labeled_items: 9, sentiment_counts: { positive: 7, neutral: 1, negative: 0, ironic: 1 } },
  ],
  total_items: 14,
  labeled_items: 14,
  coverage_months: 2,
  source_counts: { reddit: 8, youtube: 6 },
  source_first_seen: {
    reddit: "2026-06-02T00:00:00.000Z",
    youtube: "2026-06-18T00:00:00.000Z",
  },
  sentiment_counts: { positive: 10, neutral: 2, negative: 1, ironic: 1 },
  confidence: "medium",
  markers: [],
  trend_id: "trend-1",
  slug: "test",
} satisfies TrendHistory;

test("narrative exposes observed propagation and sentiment composition", () => {
  const narrative = buildTrendNarrative(trend, history, []);
  assert.deepEqual(narrative.propagation.map((item) => item.source), ["Reddit", "YouTube"]);
  assert.equal(narrative.sentiment.find((item) => item.label === "positive")?.percent, 71);
  assert.match(narrative.whyNow, /Reddit → YouTube/);
});

test("forecast copy carries its resolution window and invalidation rule", () => {
  const forecast = {
    forecast_id: "fc-1",
    trend_id: "trend-1",
    created_at: "2026-08-01T00:00:00.000Z",
    created_in_run_id: "run-1",
    claim_type: "sustains_above",
    horizon_days: 21,
    target_value: 74,
    confidence: 0.78,
    resolves_at: "2026-08-22T00:00:00.000Z",
    status: "pending",
    resolved_at: null,
    observed_value: null,
    resolution_note: null,
  } satisfies Forecast;
  const narrative = buildTrendNarrative(trend, history, [forecast]);
  assert.match(narrative.forecast?.claim ?? "", /at or above 74/);
  assert.match(narrative.forecast?.invalidation ?? "", /below 74/);
  assert.equal(narrative.forecast?.confidence, 78);
});

test("thin evidence stays explicit and no forecast is invented", () => {
  const narrative = buildTrendNarrative(trend, null, []);
  assert.equal(narrative.decision.confidence, "unverified");
  assert.equal(narrative.propagation.length, 0);
  assert.equal(narrative.forecast, null);
});
