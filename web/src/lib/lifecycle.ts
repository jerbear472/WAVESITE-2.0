// ---------------------------------------------------------------------------
// Measured lifecycle — the bridge between the term layer's evidence-based
// cascade (which sources fired, in what order) and the library's editorial
// lifecycle_stage. Before this module the stage was an LLM-assigned label;
// with it, any trend the measurement layer observes gets its stage set by
// arithmetic over real cross-platform counts.
//
// Cascade ladder (earliest → latest):  bluesky/reddit → google_trends →
// tiktok/youtube → wikipedia. Library ladder: emerging → accelerating →
// peaking → saturated → declining (+ resurfacing). The two ladders align 1:1:
//
//   embryonic  → emerging      (early social only — new signal, unproven)
//   emerging   → accelerating  (search interest firing — gaining steam)
//   breaking   → peaking       (TikTok/YouTube firing — into mass reach)
//   mainstream → saturated     (Wikipedia lookups — everyone knows)
//   decaying   → declining     (previously fired, everything quiet now)
//   dormant    → (no update — nothing measured, keep the editorial stage)
//
// Resurfacing is a transition, not a cascade state: a trend the library had
// as declining/saturated whose early-or-mid sources start firing again.
//
// Pure functions, no "@/" aliases — exercised directly by tests/*.test.ts
// under node --test like cascade.ts.
// ---------------------------------------------------------------------------

import type { CascadeState } from "./terms/types.ts";
import type { LifecycleStage } from "../types/index.ts";

const CASCADE_TO_STAGE: Record<
  Exclude<CascadeState, "dormant">,
  LifecycleStage
> = {
  embryonic: "emerging",
  emerging: "accelerating",
  breaking: "peaking",
  mainstream: "saturated",
  decaying: "declining",
};

/** Cascade states that mean "energy is flowing again" for a cooled trend. */
const REIGNITION_STATES: CascadeState[] = ["embryonic", "emerging", "breaking"];

/**
 * Lifecycle stage from today's cascade state. `previous` (the trend's current
 * library stage) enables the resurfacing rule and the dormant no-op; pass
 * undefined for a brand-new trend.
 */
export function lifecycleFromCascade(
  cascade: CascadeState,
  previous?: LifecycleStage
): LifecycleStage {
  if (cascade === "dormant") return previous ?? "emerging";
  if (
    (previous === "declining" || previous === "saturated") &&
    REIGNITION_STATES.includes(cascade)
  ) {
    return "resurfacing";
  }
  return CASCADE_TO_STAGE[cascade];
}

/**
 * Momentum from measurement. Composite = breadth × 10 + mean flagged z
 * clamped to 4 (see terms/cascade.ts), so we recover the two components and
 * rescale: breadth (how many independent platforms are accelerating) carries
 * most of the weight, magnitude (how hard) the rest.
 *
 *   breadth 0            → 15  (nothing persistently firing — low energy)
 *   breadth 2, z̄ 2       → 54
 *   breadth 3, z̄ 3       → 71
 *   breadth 5, z̄ 4       → 100
 */
export function momentumFromMeasurement(
  breadth: number,
  compositeScore: number
): number {
  if (breadth <= 0) return 15;
  const magnitude = Math.max(0, compositeScore - breadth * 10);
  return clamp(Math.round(20 + breadth * 12 + magnitude * 5));
}

/**
 * Saturation floor by cascade state. Mainstream (Wikipedia firing) means the
 * mass audience has arrived — saturation can't honestly sit below 65. Decay
 * after having fired broadly means the wave has passed through — floor 60.
 * Everything else leaves the editorial saturation reading alone (floor 0).
 */
export function saturationFloor(cascade: CascadeState): number {
  if (cascade === "mainstream") return 65;
  if (cascade === "decaying") return 60;
  return 0;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}
