// Hashtag derivation for the tiktok adapter. The stakes: a wrong hashtag
// silently measures the wrong thing, and an unnecessarily long one measures
// nothing — verified live that full editorial names miss while short atoms
// carry the volume.
//   npm test → node --experimental-strip-types --test tests/*.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { toHashtag, hashtagCandidates } from "../src/lib/terms/hashtag.ts";

test("normalizes to bare alphanumerics", () => {
  assert.equal(toHashtag("Back to School!"), "backtoschool");
  assert.equal(toHashtag("girl dinner"), "girldinner");
});

test("parenthetical qualifiers are editorial, not part of the hashtag", () => {
  assert.equal(
    toHashtag("Car Detailing & Cleaning ASMR (Satisfying Before/After)"),
    "cardetailingcleaningasmr"
  );
  assert.equal(
    toHashtag("Toy Car to Real Car Transition (Red Integra / FUSE Transition)"),
    "toycartorealcartransition"
  );
});

test("phrases that normalize to nothing yield no candidates", () => {
  assert.equal(toHashtag("(…)"), "");
  assert.deepEqual(hashtagCandidates("(…)", []), []);
});

test("candidates: canonical first, variants as fallback, deduped and capped", () => {
  assert.deepEqual(
    hashtagCandidates("straw totes", ["straw tote", "STRAW-TOTES"]),
    ["strawtotes", "strawtote"]
  );
  assert.deepEqual(
    hashtagCandidates("face taping", ["face tapings", "facetape"], 3),
    ["facetaping", "facetapings", "facetape"]
  );
});
