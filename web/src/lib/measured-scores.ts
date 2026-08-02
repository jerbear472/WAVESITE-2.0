import type { Trend } from "../types/index.ts";
import { computeWaveScore } from "./wavescore.ts";

// ---------------------------------------------------------------------------
// Measured score substitution — the fix for the identical-default problem.
//
// Model-assigned absolute scores compress (audit: sentiment sd=7, most
// wavescores landing on the same number), so wherever a measured quantity
// exists it REPLACES the model's guess as a WaveScore input:
//   sentiment  ← corpus net sentiment (per-item labels, arithmetic ratio)
//   spread     ← cross-platform breadth (term composite, else corpus)
//   adoption   ← unique authors (log-scaled: 10→26, 1k→75, 10k+→100)
// Model numbers remain only where nothing is measured yet — and identical
// scores across trends shrink as measurement covers the board.
//
// Pure functions, relative imports only — exercised by tests/*.test.ts under
// node --test like cascade.ts.
// ---------------------------------------------------------------------------

/** What measurement knows about a trend right now. All optional — pass what
 *  exists, the rest of the score stays model-derived. */
export interface MeasuredSignals {
  /** Cross-platform breadth from the term composite (sources firing). */
  breadth?: number | null;
  /** Distinct platforms present in the trend's corpus window. */
  corpusBreadth?: number | null;
  /** Unique authors in the corpus window, or hashtag creator count. */
  uniqueAuthors?: number | null;
  /** Corpus net sentiment in [-1, 1] (netSentiment in pipeline/metrics). */
  sentimentNet?: number | null;
}

export function sentimentScoreFromNet(net: number | null | undefined): number | null {
  if (net === null || net === undefined || Number.isNaN(net)) return null;
  const clamped = Math.max(-1, Math.min(1, net));
  return Math.round(50 + clamped * 50);
}

/** Breadth → 0-100 spread. Five independent platforms firing = saturated
 *  spread; the corpus's 1-2 platforms honestly reads as modest. */
export function spreadFromBreadth(breadth: number): number {
  return Math.max(0, Math.min(100, Math.round(breadth * 20)));
}

/** Log-scaled creator adoption: participation is judged by how many distinct
 *  people make the thing, not how loud any one post is. */
export function adoptionFromAuthors(uniqueAuthors: number): number {
  if (uniqueAuthors <= 0) return 0;
  return Math.min(100, Math.round(Math.log10(uniqueAuthors + 1) * 25));
}

/** Re-derive sentiment + wavescore for a trend from measured signals.
 *  Returns a new record; the input is not mutated. */
export function rescoreTrend(trend: Trend, m: MeasuredSignals): Trend {
  const sentiment = sentimentScoreFromNet(m.sentimentNet);

  const breadth =
    m.breadth != null && m.breadth > 0
      ? m.breadth
      : m.corpusBreadth != null && m.corpusBreadth > 0
        ? m.corpusBreadth
        : null;
  const spread = breadth !== null ? spreadFromBreadth(breadth) : undefined;

  const adoption =
    m.uniqueAuthors != null && m.uniqueAuthors > 0
      ? adoptionFromAuthors(m.uniqueAuthors)
      : undefined;

  const next: Trend = { ...trend };
  if (sentiment !== null) next.sentiment_score = sentiment;
  next.wavescore = computeWaveScore({
    momentum_score: next.momentum_score,
    sentiment_score: next.sentiment_score,
    commercial_relevance_score: next.commercial_relevance_score,
    saturation_score: next.saturation_score,
    cross_platform_spread_score: spread,
    creator_adoption_score: adoption,
  });
  return next;
}
