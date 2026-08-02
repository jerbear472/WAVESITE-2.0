import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateHistory } from "../src/lib/pipeline/history-series.ts";
import type { RawItem, SentimentLabel } from "../src/lib/pipeline/types.ts";

function item(
  id: string,
  period: string,
  source: RawItem["source"],
  engagement: Record<string, number> = { views: 99 }
): RawItem {
  return {
    id,
    source,
    platform: source === "youtube" ? "YouTube" : "Reddit",
    corpus: "trend",
    query: "test trend",
    source_url: `https://example.com/${id}`,
    author_handle: id,
    author_id: id,
    container: "test",
    posted_at: `${period}-15T12:00:00.000Z`,
    captured_at: "2026-08-02T12:00:00.000Z",
    title: `Post ${id}`,
    text: null,
    engagement,
    author_meta: null,
    media_refs: null,
  };
}

test("history aggregates measured volume, engagement, and post-level sentiment", () => {
  const items = [
    item("a", "2026-06", "reddit", { score: 100 }),
    item("b", "2026-06", "youtube", { views: 999 }),
    item("c", "2026-07", "reddit", { score: 10 }),
  ];
  const labels = new Map<string, { sentiment: SentimentLabel }>([
    ["a", { sentiment: "positive" }],
    ["b", { sentiment: "negative" }],
    ["c", { sentiment: "ironic" }],
  ]);
  const result = aggregateHistory(items, labels, ["2026-05", "2026-06", "2026-07"]);

  assert.equal(result.total_items, 3);
  assert.equal(result.labeled_items, 3);
  assert.equal(result.coverage_months, 2);
  assert.deepEqual(result.source_counts, { reddit: 2, youtube: 1 });
  assert.equal(result.months[1].sentiment, 0);
  assert.equal(result.months[2].sentiment, -0.25);
  assert.deepEqual(result.sentiment_counts, {
    positive: 1,
    neutral: 0,
    negative: 1,
    ironic: 1,
  });
  assert.equal(result.source_first_seen.reddit, "2026-06-15T12:00:00.000Z");
  assert.equal(result.topByPeriod.get("2026-06")?.id, "a");
});

test("history confidence reflects breadth, time coverage, and label coverage", () => {
  const periods = ["2026-04", "2026-05", "2026-06", "2026-07"];
  const items = periods.flatMap((period, month) =>
    Array.from({ length: 5 }, (_, i) =>
      item(`${month}-${i}`, period, i % 2 ? "youtube" : "reddit")
    )
  );
  const labels = new Map(
    items.slice(0, 10).map((entry) => [entry.id, { sentiment: "positive" as const }])
  );

  assert.equal(aggregateHistory(items, labels, periods).confidence, "high");
  assert.equal(aggregateHistory(items.slice(0, 3), labels, periods).confidence, "low");
});

test("items outside the requested axis do not inflate coverage", () => {
  const result = aggregateHistory(
    [item("old", "2024-01", "reddit"), item("current", "2026-07", "reddit")],
    new Map(),
    ["2026-06", "2026-07"]
  );
  assert.equal(result.total_items, 1);
  assert.equal(result.coverage_months, 1);
});
