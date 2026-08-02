// Measured lifecycle mapping tests. This mapping is what replaces the LLM's
// lifecycle label with arithmetic — a wrong branch here silently mislabels
// every measured trend on the radar, in harmony, and in forecast emission.
//   npm test → node --experimental-strip-types --test tests/*.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lifecycleFromCascade,
  momentumFromMeasurement,
  saturationFloor,
} from "../src/lib/lifecycle.ts";

test("cascade states map onto the aligned lifecycle ladder", () => {
  assert.equal(lifecycleFromCascade("embryonic"), "emerging");
  assert.equal(lifecycleFromCascade("emerging"), "accelerating");
  assert.equal(lifecycleFromCascade("breaking"), "peaking");
  assert.equal(lifecycleFromCascade("mainstream"), "saturated");
  assert.equal(lifecycleFromCascade("decaying"), "declining");
});

test("dormant keeps the previous stage, defaults to emerging for new trends", () => {
  assert.equal(lifecycleFromCascade("dormant", "peaking"), "peaking");
  assert.equal(lifecycleFromCascade("dormant", "declining"), "declining");
  assert.equal(lifecycleFromCascade("dormant"), "emerging");
});

test("a cooled trend that fires again resurfaces instead of restarting", () => {
  assert.equal(lifecycleFromCascade("embryonic", "declining"), "resurfacing");
  assert.equal(lifecycleFromCascade("emerging", "saturated"), "resurfacing");
  assert.equal(lifecycleFromCascade("breaking", "declining"), "resurfacing");
  // Mainstream/decaying are not re-ignition — they map normally.
  assert.equal(lifecycleFromCascade("mainstream", "declining"), "saturated");
  assert.equal(lifecycleFromCascade("decaying", "saturated"), "declining");
  // A healthy trend firing early sources is NOT resurfacing.
  assert.equal(lifecycleFromCascade("embryonic", "accelerating"), "emerging");
});

test("momentum scales with breadth and magnitude, clamped to 0-100", () => {
  assert.equal(momentumFromMeasurement(0, 0), 15);
  // composite = breadth*10 + mean flagged z (clamped 4)
  assert.equal(momentumFromMeasurement(2, 22), 54); // z̄=2
  assert.equal(momentumFromMeasurement(3, 33), 71); // z̄=3
  assert.equal(momentumFromMeasurement(5, 54), 100); // z̄=4 → clamped
  // Magnitude below breadth*10 never goes negative.
  assert.equal(momentumFromMeasurement(2, 15), 44);
});

test("saturation floors only bind for mainstream and decaying", () => {
  assert.equal(saturationFloor("mainstream"), 65);
  assert.equal(saturationFloor("decaying"), 60);
  assert.equal(saturationFloor("embryonic"), 0);
  assert.equal(saturationFloor("emerging"), 0);
  assert.equal(saturationFloor("breaking"), 0);
  assert.equal(saturationFloor("dormant"), 0);
});
