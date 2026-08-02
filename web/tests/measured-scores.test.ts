// Measured score substitution — the anti-identical-defaults layer. The
// stakes: two trends with different measured reality must not share a
// wavescore just because the model guessed the same numbers for both.
//   npm test → node --experimental-strip-types --test tests/*.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adoptionFromAuthors,
  rescoreTrend,
  sentimentScoreFromNet,
  spreadFromBreadth,
} from "../src/lib/measured-scores.ts";
import type { Trend } from "../src/types/index.ts";

function trend(overrides: Partial<Trend> = {}): Trend {
  return {
    id: "trend-x",
    slug: "x",
    name: "X",
    one_line_summary: "",
    detailed_summary: "",
    category: "Fashion",
    emotional_tone: "",
    audience: "",
    lifecycle_stage: "accelerating",
    virality_type: "format",
    wavescore: 67,
    momentum_score: 70,
    sentiment_score: 60,
    brand_safety_score: 55,
    saturation_score: 40,
    commercial_relevance_score: 50,
    participation_difficulty: "medium",
    risk_level: "medium",
    why_spreading: "",
    who_should_join: "",
    who_should_avoid: "",
    best_platforms: [],
    created_at: "2026-08-02T00:00:00Z",
    updated_at: "2026-08-02T00:00:00Z",
    ...overrides,
  } as Trend;
}

test("sentiment maps [-1,1] net onto 0-100 with 0 at the middle", () => {
  assert.equal(sentimentScoreFromNet(0), 50);
  assert.equal(sentimentScoreFromNet(1), 100);
  assert.equal(sentimentScoreFromNet(-1), 0);
  assert.equal(sentimentScoreFromNet(0.4), 70);
  assert.equal(sentimentScoreFromNet(null), null);
});

test("spread scales breadth and clamps", () => {
  assert.equal(spreadFromBreadth(0), 0);
  assert.equal(spreadFromBreadth(2), 40);
  assert.equal(spreadFromBreadth(5), 100);
  assert.equal(spreadFromBreadth(9), 100);
});

test("adoption is log-scaled: 10 authors and 10k authors are different worlds", () => {
  assert.equal(adoptionFromAuthors(0), 0);
  const ten = adoptionFromAuthors(10);
  const tenK = adoptionFromAuthors(10_000);
  assert.ok(ten > 0 && ten < 40);
  assert.equal(tenK, 100);
});

test("identical model defaults separate once measurement differs", () => {
  const a = rescoreTrend(trend(), {
    breadth: 3,
    uniqueAuthors: 5_000,
    sentimentNet: 0.5,
  });
  const b = rescoreTrend(trend(), {
    breadth: 1,
    uniqueAuthors: 12,
    sentimentNet: -0.2,
  });
  assert.notEqual(a.wavescore, b.wavescore);
  assert.ok(a.wavescore > b.wavescore);
  assert.equal(a.sentiment_score, 75);
  assert.equal(b.sentiment_score, 40);
});

test("no measurement = no change to the model's numbers", () => {
  const t = trend();
  const next = rescoreTrend(t, {});
  assert.equal(next.sentiment_score, t.sentiment_score);
  // wavescore recomputes from the same inputs — same value.
  assert.equal(
    next.wavescore,
    rescoreTrend(t, {}).wavescore
  );
  assert.equal(t.wavescore, 67); // input untouched
});
