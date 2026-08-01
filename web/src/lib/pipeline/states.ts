import type { MetricName, PipelineState } from "@/lib/pipeline/types";

// State assignment from percentile bands — configuration, not model judgment.
// Bands live in pipeline_config (key 'state_bands') so they can be tuned
// without a deploy; these defaults are the fallback. Because inputs are
// percentiles, a typical run mathematically cannot put everything in one
// bucket the way absolute model scores did.

export interface StateBands {
  /** velocity percentile at or above which a trend is gaining. */
  rising_velocity: number;
  /** velocity percentile below which a trend is fading. */
  fading_velocity: number;
  /** saturation percentile above which a hot trend counts as established. */
  in_sync_saturation: number;
  /** author-concentration percentile above which "rising" is distrusted
   *  (one account manufacturing the look of a trend). */
  astroturf_concentration: number;
}

export const DEFAULT_STATE_BANDS: StateBands = {
  rising_velocity: 70,
  fading_velocity: 30,
  in_sync_saturation: 60,
  astroturf_concentration: 90,
};

/**
 * in_sync : gaining fast AND already broadly established (high saturation) —
 *           the culture has absorbed it and it is still moving.
 * rising  : gaining fast, not yet saturated.
 * fading  : bottom velocity band.
 * warming : the middle.
 * A "rising" read with extreme author concentration is demoted to warming —
 * velocity manufactured by one account is not a cultural motion.
 */
export function assignState(
  pct: Partial<Record<MetricName, number>>,
  bands: StateBands = DEFAULT_STATE_BANDS
): PipelineState {
  const velocity = pct.velocity ?? 50;
  const saturation = pct.saturation ?? 50;
  const concentration = pct.author_concentration ?? 50;

  if (velocity >= bands.rising_velocity) {
    if (concentration >= bands.astroturf_concentration) return "warming";
    return saturation >= bands.in_sync_saturation ? "in_sync" : "rising";
  }
  if (velocity < bands.fading_velocity) return "fading";
  return "warming";
}
