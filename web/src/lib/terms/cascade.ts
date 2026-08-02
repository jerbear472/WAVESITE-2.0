// Cross-source composite and the cascade — the layer where "spike on one
// platform" becomes "recognizable trend".
//
// breadth: how many sources are persistently above threshold today, counted
// over AVAILABLE sources only (a run that lost two adapters still scores).
//
// composite: weighted so breadth dominates magnitude — two sources at
// moderate z beat one source at extreme z. All inputs are z-scores from
// arithmetic; no model assigns any number here.
//
// cascade_state: derived from WHICH sources have fired and in what order,
// using the lifecycle ordering (earliest to latest):
//     bluesky + reddit  ->  google_trends  ->  youtube  ->  wikipedia
// Precedence: the latest-stage source firing today names the state. That
// encodes the spec's ladder (early only = embryonic, search = emerging,
// youtube = breaking, wikipedia = mainstream) and resolves mixed cases in
// favor of the later stage — if wikipedia is firing, the term is mainstream
// no matter what else is lit.
//
// Pure functions only — see tests/term-cascade.test.ts.

import { EARLY_SOURCES, type CascadeState, type SourceId } from "./types.ts";

export interface SourceSignal {
  source: SourceId;
  /** The source reported an observation today (adapter ran and had data). */
  available: boolean;
  /** Persistently above threshold today (3-of-5 rule already applied). */
  flagged: boolean;
  z_score: number | null;
  /** Earliest date this source was ever persistently flagged, or null. */
  first_fired: string | null;
}

export interface CompositeResult {
  breadth: number;
  composite_score: number;
  cascade_state: CascadeState;
  lead_estimate_days: number | null;
  sources_available: SourceId[];
  sources_flagged: SourceId[];
}

/** Breadth is worth BREADTH_WEIGHT per source; magnitude is the mean flagged
 *  z clamped to Z_CLAMP. With 10 vs a 4-point clamp, one source can never
 *  outscore two: max single-source composite = 10 + 4 = 14 < 20 = the floor
 *  for any two-source term. */
export const BREADTH_WEIGHT = 10;
export const Z_CLAMP = 4;

const DAY_MS = 86_400_000;

export function computeComposite(signals: SourceSignal[]): CompositeResult {
  const available = signals.filter((s) => s.available);
  const flagged = available.filter((s) => s.flagged);

  const breadth = flagged.length;
  const magnitude =
    flagged.length === 0
      ? 0
      : flagged.reduce(
          (sum, s) => sum + Math.min(Math.max(s.z_score ?? 0, 0), Z_CLAMP),
          0
        ) / flagged.length;
  const composite = Math.round((breadth * BREADTH_WEIGHT + magnitude) * 100) / 100;

  return {
    breadth,
    composite_score: composite,
    cascade_state: cascadeState(signals),
    lead_estimate_days: leadEstimate(signals),
    sources_available: available.map((s) => s.source),
    sources_flagged: flagged.map((s) => s.source),
  };
}

export function cascadeState(signals: SourceSignal[]): CascadeState {
  const firing = new Set(
    signals.filter((s) => s.available && s.flagged).map((s) => s.source)
  );
  const everFired = signals.some((s) => s.first_fired !== null);

  if (firing.has("wikipedia")) return "mainstream";
  if (firing.has("youtube")) return "breaking";
  if (firing.has("google_trends")) return "emerging";
  if (EARLY_SOURCES.some((s) => firing.has(s))) return "embryonic";
  // Previously fired somewhere, nothing above threshold now — the early
  // sources have gone quiet, which is the decay signature.
  if (everFired) return "decaying";
  return "dormant";
}

/** Days between the first source firing and the most recent first-firing —
 *  the empirical measure of how early the earliest source caught it. Needs
 *  at least two sources to have fired to mean anything. */
export function leadEstimate(signals: SourceSignal[]): number | null {
  const dates = signals
    .map((s) => s.first_fired)
    .filter((d): d is string => d !== null)
    .map((d) => Date.parse(`${d}T00:00:00Z`));
  if (dates.length < 2) return null;
  return Math.round((Math.max(...dates) - Math.min(...dates)) / DAY_MS);
}
