import type { LifecycleStage } from "../types/index.ts";

export type ScanClassification =
  | "new_to_you"
  | "newly_relevant"
  | "accelerating"
  | "resurfacing"
  | "known_match";

export const SCAN_CLASSIFICATION_LABEL: Record<ScanClassification, string> = {
  new_to_you: "New to your scan",
  newly_relevant: "Newly relevant",
  accelerating: "Accelerating",
  resurfacing: "Resurfacing",
  known_match: "Known match",
};

/** Classifies why a scan result deserves attention without claiming that a
 * result is new to the internet when we only know it is new to this user. */
export function classifyScanHit(input: {
  lifecycle: LifecycleStage;
  fit: number;
  previousFit?: number;
  hadPreviousScan: boolean;
}): ScanClassification {
  if (input.hadPreviousScan && input.previousFit === undefined) return "new_to_you";
  if (
    input.previousFit !== undefined &&
    input.fit >= input.previousFit + 10
  ) {
    return "newly_relevant";
  }
  if (input.lifecycle === "resurfacing") return "resurfacing";
  if (input.lifecycle === "accelerating") return "accelerating";
  return "known_match";
}
