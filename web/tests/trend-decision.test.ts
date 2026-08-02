import { test } from "node:test";
import assert from "node:assert/strict";
import { decideTrend, type DecisionHistory } from "../src/lib/trend-decision.ts";

const base = {
  lifecycle_stage: "accelerating" as const,
  risk_level: "low" as const,
  saturation_score: 38,
  momentum_score: 82,
};

function history(overrides: Partial<DecisionHistory> = {}): DecisionHistory {
  return {
    months: [
      { volume: 2, engagement: 2, sentiment: 0.1 },
      { volume: 3, engagement: 3, sentiment: 0.2 },
      { volume: 4, engagement: 4, sentiment: 0.2 },
      { volume: 8, engagement: 8, sentiment: 0.5 },
      { volume: 9, engagement: 9, sentiment: 0.7 },
    ],
    total_items: 26,
    coverage_months: 5,
    labeled_items: 20,
    confidence: "high",
    ...overrides,
  };
}

test("an accelerating low-saturation trend produces an evidence-aware Act call", () => {
  const decision = decideTrend(base, history());
  assert.equal(decision.action, "Act");
  assert.equal(decision.window, "Active participation window");
  assert.match(decision.change, /Sentiment improving/);
  assert.equal(decision.confidence, "high");
});

test("declining and saturated trends are avoided", () => {
  assert.equal(
    decideTrend({ ...base, lifecycle_stage: "declining" }).action,
    "Avoid"
  );
  assert.equal(decideTrend({ ...base, saturation_score: 90 }).action, "Avoid");
});

test("high risk prevents an Act call and missing history is explicit", () => {
  const decision = decideTrend({ ...base, risk_level: "high" });
  assert.equal(decision.action, "Watch");
  assert.equal(decision.confidence, "unverified");
  assert.equal(decision.evidence, "No measured history yet");
});

test("engagement change is used when sentiment coverage is insufficient", () => {
  const decision = decideTrend(base, history({ labeled_items: 0 }));
  assert.match(decision.change, /Engagement rising/);
});
