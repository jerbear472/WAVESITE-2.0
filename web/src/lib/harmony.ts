import type { LifecycleStage, Trend } from "@/types";

// ---------------------------------------------------------------------------
// Cultural Harmony — how deeply a trend is in sync with the culture right now.
// Distinct from WaveScore (opportunity/joinability): harmony measures resonance.
// A 95 means the culture has genuinely absorbed this trend — positive feeling,
// still gaining energy, echoing across channels, and not yet worn out.
// ---------------------------------------------------------------------------

/** Lifecycle expressed as cultural freshness, 0–100. */
const LIFECYCLE_FRESHNESS: Record<LifecycleStage, number> = {
  emerging: 82,
  accelerating: 100,
  resurfacing: 78,
  peaking: 64,
  saturated: 30,
  declining: 12,
};

/** Cross-channel spread from how many platforms a trend genuinely lives on. */
export function spreadScore(platformCount: number): number {
  if (platformCount <= 0) return 20;
  return Math.min(100, 28 + platformCount * 18);
}

/**
 * Cultural Harmony, 0–100.
 *   30% sentiment — the culture has to *like* it
 *   25% momentum — it has to still be gaining energy
 *   20% cross-channel spread — echoing across platforms, not a single-app blip
 *   15% lifecycle freshness — where it sits on the wave
 *   10% headroom — the inverse of saturation
 */
export function computeHarmony(trend: Trend): number {
  const raw =
    0.3 * clamp(trend.sentiment_score) +
    0.25 * clamp(trend.momentum_score) +
    0.2 * spreadScore(trend.best_platforms.length) +
    0.15 * LIFECYCLE_FRESHNESS[trend.lifecycle_stage] +
    0.1 * (100 - clamp(trend.saturation_score));
  return Math.round(clamp(raw));
}

// ---------------------------------------------------------------------------
// Tiers — the color language of the whole app. IN_SYNC (>= 90) is the rare,
// unmistakable marker: the trend has harmonized with the culture.
// ---------------------------------------------------------------------------

export type HarmonyTier = "in_sync" | "rising" | "warming" | "fading";

export interface HarmonyTierSpec {
  tier: HarmonyTier;
  label: string;
  /** Solid color on light surfaces. */
  color: string;
  /** Bright variant for dark panels / 3D field. */
  bright: string;
  /** Emissive glow color for the 3D field (only in_sync really glows). */
  glow: string;
  description: string;
}

export const HARMONY_TIERS: Record<HarmonyTier, HarmonyTierSpec> = {
  in_sync: {
    tier: "in_sync",
    label: "In sync",
    color: "#159a78",
    bright: "#34d399",
    glow: "#6ee7b7",
    description: "Harmonizing with the culture — join with confidence.",
  },
  rising: {
    tier: "rising",
    label: "Rising",
    color: "#3478f6",
    bright: "#55a9ff",
    glow: "#93c5fd",
    description: "Gaining resonance across channels.",
  },
  warming: {
    tier: "warming",
    label: "Warming",
    color: "#b77900",
    bright: "#fbbf24",
    glow: "#fcd34d",
    description: "Signal present but not yet culture-wide.",
  },
  fading: {
    tier: "fading",
    label: "Fading",
    color: "#8a94a6",
    bright: "#7d8698",
    glow: "#7d8698",
    description: "Out of sync — declining or worn out.",
  },
};

export function harmonyTier(harmony: number, trend?: Trend): HarmonyTierSpec {
  if (
    trend &&
    (trend.lifecycle_stage === "declining" ||
      trend.lifecycle_stage === "saturated")
  )
    return HARMONY_TIERS.fading;
  if (harmony >= 90) return HARMONY_TIERS.in_sync;
  if (harmony >= 74) return HARMONY_TIERS.rising;
  if (harmony >= 55) return HARMONY_TIERS.warming;
  return HARMONY_TIERS.fading;
}

/** Trend enriched with harmony + direction, ready for tiles and the 3D field. */
export interface HarmonizedTrend extends Trend {
  harmony: number;
  tier: HarmonyTier;
  /** Harmony change since the previous pulse snapshot (0 when unknown). */
  delta: number;
}

export function harmonize(trend: Trend, delta = 0): HarmonizedTrend {
  const harmony = computeHarmony(trend);
  return { ...trend, harmony, tier: harmonyTier(harmony, trend).tier, delta };
}

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}
