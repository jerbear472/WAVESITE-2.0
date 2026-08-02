import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyScanHit } from "../src/lib/scan-classification.ts";

test("an absent result is described as new to the user's scan, not new to culture", () => {
  assert.equal(
    classifyScanHit({
      lifecycle: "emerging",
      fit: 80,
      hadPreviousScan: true,
    }),
    "new_to_you"
  );
});

test("a material fit increase is newly relevant", () => {
  assert.equal(
    classifyScanHit({
      lifecycle: "emerging",
      fit: 82,
      previousFit: 70,
      hadPreviousScan: true,
    }),
    "newly_relevant"
  );
});

test("lifecycle classifications explain returning matches", () => {
  assert.equal(
    classifyScanHit({
      lifecycle: "resurfacing",
      fit: 75,
      previousFit: 74,
      hadPreviousScan: true,
    }),
    "resurfacing"
  );
  assert.equal(
    classifyScanHit({
      lifecycle: "accelerating",
      fit: 75,
      previousFit: 74,
      hadPreviousScan: true,
    }),
    "accelerating"
  );
});

test("first scans avoid unsupported novelty claims", () => {
  assert.equal(
    classifyScanHit({
      lifecycle: "emerging",
      fit: 75,
      hadPreviousScan: false,
    }),
    "known_match"
  );
});
