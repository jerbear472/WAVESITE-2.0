// Trend identity dedup tests. The threshold pairs here are REAL duplicate
// families pulled from the production library on 2026-08-02 (four
// netflix-documentary-* rows, three single-take-* rows, …) plus real
// non-duplicate pairs that must never merge. If a threshold change breaks
// one of these, it will recreate the duplicate pileup the scan suffered from.
//   npm test → node --experimental-strip-types --test tests/*.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findDuplicateTrend,
  isNearDuplicate,
  trendTokens,
} from "../src/lib/trend-dedup.ts";

function near(a: string, b: string): boolean {
  return isNearDuplicate(trendTokens(a), trendTokens(b));
}

test("real duplicate families from the library merge", () => {
  // netflix-documentary family (was 4 rows)
  assert.ok(near("netflix-documentary-format", "netflix-documentary-chair-sit"));
  assert.ok(near("netflix-documentary-format", "netflix-documentary-meme"));
  assert.ok(near("netflix-documentary-chair-format", "netflix-documentary-format"));
  // single-take family (was 3 rows)
  assert.ok(near("single-take-pov-skits", "single-take-pov-lip-sync"));
  assert.ok(near("single-take-pov-skits", "single-take-low-production-skit"));
  // stopword-only difference (was 2 rows)
  assert.ok(
    near("me-at-same-age-as-my-parents", "me-at-the-same-age-as-my-parents")
  );
  // reworded but same phenomenon (was 2 rows)
  assert.ok(
    near("paparazzi-dubstep-transition", "paparazzi-dubstep-glowup-transition")
  );
});

test("distinct trends never merge", () => {
  assert.ok(!near("gas-station-car-flex", "car-detailing-asmr-before-after"));
  assert.ok(!near("phonk-supercar-edit", "toy-car-to-real-car-transition"));
  assert.ok(!near("back-to-school-nostalgia-prep", "00s-athleisure-nostalgia"));
  assert.ok(!near("loud-luxury-character-dressing", "90s-indie-grunge-layering-revival"));
  assert.ok(
    !near("childhood-photo-glow-up-transition", "gone-fishin-nostalgic-glow-up-transition")
  );
});

test("single shared token is never enough", () => {
  assert.ok(!near("cornflower-blue-wash", "blue-bins-are-back"));
});

test("tokens: stopwords drop, light plural stem, punctuation splits", () => {
  assert.deepEqual(
    [...trendTokens("Me at the Same Age as My Parents")].sort(),
    ["age", "parent", "same"]
  );
  assert.deepEqual(
    [...trendTokens("Single-Take POV Skits")].sort(),
    ["pov", "single", "skit", "take"]
  );
});

test("findDuplicateTrend prefers exact slug, then fuzzy, else null", () => {
  const pool = [
    { name: "Netflix Documentary Format", slug: "netflix-documentary-format" },
    { name: "Gas Station Car Flex", slug: "gas-station-car-flex" },
  ];
  assert.equal(
    findDuplicateTrend(
      { name: "whatever", slug: "netflix-documentary-format" },
      pool
    ),
    pool[0]
  );
  assert.equal(
    findDuplicateTrend(
      { name: "Netflix Documentary Meme", slug: "netflix-documentary-meme" },
      pool
    ),
    pool[0]
  );
  assert.equal(
    findDuplicateTrend(
      { name: "Cottagecore Picnic Aesthetic", slug: "cottagecore-picnic-aesthetic" },
      pool
    ),
    null
  );
});
