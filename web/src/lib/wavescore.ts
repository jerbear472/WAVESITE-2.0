import type { Trend } from "@/types";

/**
 * WaveScore — the master ranking score for a trend.
 *
 * wavescore =
 *    25% momentum_score
 *  + 20% sentiment_score
 *  + 15% cross_platform_spread_score (else commercial_relevance_score)
 *  + 15% creator_adoption_score      (else momentum_score)
 *  + 10% audience_clarity_score      (else commercial_relevance_score)
 *  + 10% commercial_relevance_score
 *  -  5% saturation_score penalty
 *
 * For the MVP we rarely have the optional sub-scores, so each falls back to an
 * intelligent approximation drawn from the scores we do have.
 */
export interface WaveScoreInputs {
  momentum_score: number;
  sentiment_score: number;
  commercial_relevance_score: number;
  saturation_score: number;
  // Optional richer signals — present once real ingestion exists.
  cross_platform_spread_score?: number;
  creator_adoption_score?: number;
  audience_clarity_score?: number;
}

export function computeWaveScore(input: WaveScoreInputs): number {
  const momentum = clamp(input.momentum_score);
  const sentiment = clamp(input.sentiment_score);
  const commercial = clamp(input.commercial_relevance_score);
  const saturation = clamp(input.saturation_score);

  const crossPlatform = clamp(input.cross_platform_spread_score ?? commercial);
  const creatorAdoption = clamp(input.creator_adoption_score ?? momentum);
  const audienceClarity = clamp(input.audience_clarity_score ?? commercial);

  const raw =
    0.25 * momentum +
    0.2 * sentiment +
    0.15 * crossPlatform +
    0.15 * creatorAdoption +
    0.1 * audienceClarity +
    0.1 * commercial -
    0.05 * saturation;

  return Math.round(clamp(raw));
}

/** Recompute WaveScore for a trend record from its component scores. */
export function waveScoreForTrend(
  trend: Pick<
    Trend,
    | "momentum_score"
    | "sentiment_score"
    | "commercial_relevance_score"
    | "saturation_score"
  >
): number {
  return computeWaveScore(trend);
}

function clamp(n: number, min = 0, max = 100) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
