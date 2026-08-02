// Detector tests. The detector is the top of the funnel — if it passes noise,
// the model will happily christen garbage; if it's too strict, the product
// never discovers anything. The thresholds and merge rules are pinned here.
//   npm test → node --experimental-strip-types --test tests/*.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_AUTHORS,
  MIN_ITEMS,
  clusterSpikes,
  findSpikes,
  phrasesOf,
  type PhraseSpike,
} from "../src/lib/pipeline/detect-engine.ts";
import type { RawItem } from "../src/lib/pipeline/types.ts";

let seq = 0;
function item(
  title: string,
  overrides: Partial<RawItem> = {}
): RawItem {
  seq++;
  return {
    id: `d-${seq}`,
    source: "reddit",
    platform: "Reddit",
    corpus: "sweep",
    query: overrides.query ?? "r/fashion",
    source_url: `https://example.com/${seq}`,
    author_handle: overrides.author_handle ?? `author${seq}`,
    author_id: null,
    container: overrides.container ?? "fashion",
    posted_at: "2026-08-01T00:00:00.000Z",
    captured_at: "2026-08-01T00:00:00.000Z",
    title,
    text: null,
    engagement: null,
    author_meta: null,
    media_refs: null,
    ...overrides,
  };
}

/** N items about a phrase from N distinct authors across 2+ containers. */
function burst(phrase: string, n: number): RawItem[] {
  return Array.from({ length: n }, (_, i) =>
    item(`spotted ${phrase} again wow number ${i}`, {
      container: i % 2 === 0 ? "fashion" : "streetwear",
    })
  );
}

/** Background chatter: unrelated single-author posts. */
function noise(n: number): RawItem[] {
  return Array.from({ length: n }, (_, i) =>
    item(`completely unrelated content piece variant ${i}`)
  );
}

// --- phrasesOf --------------------------------------------------------------

test("phrasesOf produces 1-3 grams, stopword- and short-word-filtered", () => {
  const phrases = phrasesOf(item("The barn jacket renaissance is here"));
  assert.ok(phrases.has("barn jacket"));
  assert.ok(phrases.has("barn jacket renaissance"));
  assert.ok(phrases.has("renaissance"));
  assert.ok(!phrases.has("the")); // stopword
  assert.ok(!phrases.has("is")); // too short
});

// --- findSpikes -------------------------------------------------------------

test("a genuine multi-author multi-venue burst is detected", () => {
  const spikes = findSpikes({
    current: [...burst("mocha mousse", 8), ...noise(30)],
    prior: noise(30),
    baseline: noise(30),
    knownNames: [],
  });
  assert.ok(spikes.some((s) => s.phrase === "mocha mousse"));
});

test("a phrase equally common last window is NOT a spike (novelty gate)", () => {
  const spikes = findSpikes({
    current: [...burst("mocha mousse", 8), ...noise(30)],
    prior: [...burst("mocha mousse", 8), ...noise(30)],
    baseline: noise(30),
    knownNames: [],
  });
  assert.ok(!spikes.some((s) => s.phrase === "mocha mousse"));
});

test("one account posting N times cannot fake a spike (author gate)", () => {
  const posts = Array.from({ length: MIN_ITEMS + 3 }, (_, i) =>
    item(`spotted mocha mousse again wow number ${i}`, {
      author_handle: "astroturfer",
      container: i % 2 === 0 ? "fashion" : "streetwear",
    })
  );
  const spikes = findSpikes({
    current: [...posts, ...noise(30)],
    prior: noise(30),
    baseline: noise(30),
    knownNames: [],
  });
  assert.ok(!spikes.some((s) => s.phrase === "mocha mousse"));
});

test("a single-venue burst is not a spike (container gate)", () => {
  const posts = Array.from({ length: MIN_AUTHORS + 2 }, (_, i) =>
    item(`spotted mocha mousse again wow number ${i}`, { container: "fashion" })
  );
  const spikes = findSpikes({
    current: [...posts, ...noise(30)],
    prior: noise(30),
    baseline: noise(30),
    knownNames: [],
  });
  assert.ok(!spikes.some((s) => s.phrase === "mocha mousse"));
});

test("phrases of already-tracked trends are measurements, not discoveries", () => {
  const spikes = findSpikes({
    current: [...burst("barn jacket", 8), ...noise(30)],
    prior: noise(30),
    baseline: noise(30),
    knownNames: ["Barn Jacket Renaissance"],
  });
  assert.ok(!spikes.some((s) => s.phrase.includes("barn jacket")));
});

test("a single word can never seed a spike, no matter how hot", () => {
  const posts = Array.from({ length: 20 }, (_, i) =>
    item(`renaissance sighting entry ${i}`, {
      container: i % 3 === 0 ? "fashion" : i % 3 === 1 ? "streetwear" : "beauty",
    })
  );
  const spikes = findSpikes({
    current: [...posts, ...noise(30)],
    prior: noise(30),
    baseline: noise(30),
    knownNames: [],
  });
  assert.ok(!spikes.some((s) => s.phrase === "renaissance"));
});

test("venue dialect is not a spike: phrase concentrated in one container", () => {
  // 10 items, 9 from r/castiron, 1 elsewhere -> top-container share 0.9.
  const posts = Array.from({ length: 10 }, (_, i) =>
    item(`cast iron skillet number ${i}`, {
      container: i === 0 ? "food" : "castiron",
    })
  );
  const spikes = findSpikes({
    current: [...posts, ...noise(30)],
    prior: noise(30),
    baseline: noise(30),
    knownNames: [],
  });
  assert.ok(!spikes.some((s) => s.phrase.includes("cast iron")));
});

test("baseline presence kills a phrase even when the prior window is empty (cold start)", () => {
  // "mocha mousse" chatters along in the baseline at a similar rate — the
  // conservative max(prior, baseline) expected rate must catch it.
  const baselineChatter = Array.from({ length: 8 }, (_, i) =>
    item(`mocha mousse ambient mention ${i}`, { corpus: "baseline" })
  );
  const spikes = findSpikes({
    current: [...burst("mocha mousse", 8), ...noise(30)],
    prior: [],
    baseline: [...baselineChatter, ...noise(22)],
    knownNames: [],
  });
  assert.ok(!spikes.some((s) => s.phrase === "mocha mousse"));
});

// --- clusterSpikes ----------------------------------------------------------

function spike(phrase: string, itemIds: string[], score = 10): PhraseSpike {
  return { phrase, itemIds, authors: 5, containers: 3, novelty: 5, score };
}

test("phrase variants riding the same items merge into one cluster", () => {
  const ids = ["a", "b", "c", "d", "e"];
  const clusters = clusterSpikes([
    spike("barn jacket renaissance", ids, 20),
    spike("barn jacket", ids.slice(0, 4), 15),
  ]);
  assert.equal(clusters.length, 1);
  assert.deepEqual(
    clusters[0].phrases.sort(),
    ["barn jacket", "barn jacket renaissance"]
  );
});

test("phrases on disjoint items stay separate clusters", () => {
  const clusters = clusterSpikes([
    spike("barn jacket", ["a", "b", "c", "d", "e"]),
    spike("mocha mousse", ["f", "g", "h", "i", "j"]),
  ]);
  assert.equal(clusters.length, 2);
});

test("clusters come back highest-score first", () => {
  const clusters = clusterSpikes([
    spike("small thing", ["a", "b", "c", "d", "e"], 5),
    spike("big thing", ["f", "g", "h", "i", "j"], 50),
  ]);
  assert.equal(clusters[0].phrases[0], "big thing");
});
