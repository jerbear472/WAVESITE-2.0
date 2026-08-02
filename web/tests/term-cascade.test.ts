// Cascade state machine + composite tests. The cascade is the product: a
// wrong precedence quietly relabels every term's lifecycle position, and a
// composite that lets magnitude beat breadth rebuilds the exact single-source
// noise the layer exists to kill.
//   npm test → node --experimental-strip-types --test tests/*.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BREADTH_WEIGHT,
  Z_CLAMP,
  cascadeState,
  computeComposite,
  leadEstimate,
  type SourceSignal,
} from "../src/lib/terms/cascade.ts";
import { SOURCE_IDS, type SourceId } from "../src/lib/terms/types.ts";

function signals(
  overrides: Partial<Record<SourceId, Partial<SourceSignal>>>
): SourceSignal[] {
  return SOURCE_IDS.map((source) => ({
    source,
    available: true,
    flagged: false,
    z_score: null,
    first_fired: null,
    ...overrides[source],
  }));
}

// --- cascade state machine --------------------------------------------------

test("nothing measured, nothing ever fired -> dormant", () => {
  assert.equal(cascadeState(signals({})), "dormant");
});

test("early sources only -> embryonic", () => {
  const s = signals({
    bluesky: { flagged: true, z_score: 2.5, first_fired: "2026-07-30" },
  });
  assert.equal(cascadeState(s), "embryonic");
  const both = signals({
    bluesky: { flagged: true, first_fired: "2026-07-30" },
    reddit: { flagged: true, first_fired: "2026-07-31" },
  });
  assert.equal(cascadeState(both), "embryonic");
});

test("early plus search -> emerging", () => {
  const s = signals({
    reddit: { flagged: true, first_fired: "2026-07-25" },
    google_trends: { flagged: true, first_fired: "2026-07-30" },
  });
  assert.equal(cascadeState(s), "emerging");
});

test("search plus youtube -> breaking", () => {
  const s = signals({
    google_trends: { flagged: true, first_fired: "2026-07-28" },
    youtube: { flagged: true, first_fired: "2026-07-31" },
  });
  assert.equal(cascadeState(s), "breaking");
});

test("wikipedia firing -> mainstream, regardless of what else is lit", () => {
  const s = signals({
    bluesky: { flagged: true, first_fired: "2026-07-01" },
    reddit: { flagged: true, first_fired: "2026-07-02" },
    google_trends: { flagged: true, first_fired: "2026-07-10" },
    youtube: { flagged: true, first_fired: "2026-07-20" },
    wikipedia: { flagged: true, first_fired: "2026-07-30" },
  });
  assert.equal(cascadeState(s), "mainstream");
});

test("previously fired, nothing above threshold now -> decaying", () => {
  const s = signals({
    bluesky: { flagged: false, first_fired: "2026-07-01" },
    google_trends: { flagged: false, first_fired: "2026-07-10" },
  });
  assert.equal(cascadeState(s), "decaying");
});

test("a flagged source that is UNAVAILABLE today cannot drive the state", () => {
  // Wikipedia adapter down today: its flag can't be evaluated, so the state
  // falls to the best available evidence (youtube -> breaking).
  const s = signals({
    wikipedia: { available: false, flagged: true, first_fired: "2026-07-20" },
    youtube: { flagged: true, first_fired: "2026-07-25" },
  });
  assert.equal(cascadeState(s), "breaking");
});

// --- composite: breadth dominates magnitude ---------------------------------

test("two sources at moderate z beat one source at extreme z", () => {
  const twoModerate = computeComposite(
    signals({
      bluesky: { flagged: true, z_score: 2.2, first_fired: "2026-07-30" },
      reddit: { flagged: true, z_score: 2.4, first_fired: "2026-07-31" },
    })
  );
  const oneExtreme = computeComposite(
    signals({
      youtube: { flagged: true, z_score: 25, first_fired: "2026-07-31" },
    })
  );
  assert.ok(
    twoModerate.composite_score > oneExtreme.composite_score,
    `${twoModerate.composite_score} should beat ${oneExtreme.composite_score}`
  );
});

test("z contribution is clamped — no single-source z can close the breadth gap", () => {
  // Max single-source composite is BREADTH_WEIGHT + Z_CLAMP; the floor for
  // any two flagged sources is 2 * BREADTH_WEIGHT. The invariant is
  // structural, not tuned.
  assert.ok(BREADTH_WEIGHT + Z_CLAMP < 2 * BREADTH_WEIGHT);
  const absurd = computeComposite(
    signals({ wikipedia: { flagged: true, z_score: 1e6, first_fired: "2026-07-30" } })
  );
  assert.ok(absurd.composite_score <= BREADTH_WEIGHT + Z_CLAMP);
});

test("breadth counts only AVAILABLE sources — a lost adapter shrinks the panel, not the score to zero", () => {
  const r = computeComposite(
    signals({
      bluesky: { flagged: true, z_score: 3, first_fired: "2026-07-30" },
      reddit: { flagged: true, z_score: 3, first_fired: "2026-07-30" },
      youtube: { available: false },
      wikipedia: { available: false },
    })
  );
  assert.equal(r.breadth, 2);
  assert.deepEqual(r.sources_available.sort(), ["bluesky", "google_trends", "reddit"].sort());
  assert.ok(r.composite_score >= 2 * BREADTH_WEIGHT);
});

test("unflagged sources contribute nothing to the composite", () => {
  const r = computeComposite(signals({}));
  assert.equal(r.breadth, 0);
  assert.equal(r.composite_score, 0);
});

// --- lead estimate ----------------------------------------------------------

test("lead estimate is the span from first firing to the most recent first-firing", () => {
  const s = signals({
    bluesky: { first_fired: "2026-07-01" },
    google_trends: { first_fired: "2026-07-15" },
    youtube: { first_fired: "2026-07-25" },
  });
  assert.equal(leadEstimate(s), 24);
});

test("lead estimate needs at least two fired sources", () => {
  assert.equal(leadEstimate(signals({})), null);
  assert.equal(
    leadEstimate(signals({ bluesky: { first_fired: "2026-07-01" } })),
    null
  );
});
