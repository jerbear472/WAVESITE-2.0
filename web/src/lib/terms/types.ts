// Term signals layer — shared types.
//
// Core principle: we store MEASUREMENTS, not content. Counts, velocities,
// first-seen dates, derived scores. Links and short excerpts for provenance
// only. No content archive — a compliance requirement and a cost decision.
//
// This file is imported by pure modules and by tests, so it must not depend
// on "@/" path aliases or anything with side effects.

/** Lifecycle ordering, earliest to latest. Cascade position derives from
 *  WHICH of these fire and in what order. */
export const SOURCE_IDS = [
  "bluesky",
  "reddit",
  "google_trends",
  "youtube",
  "wikipedia",
] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export const EARLY_SOURCES: SourceId[] = ["bluesky", "reddit"];

export type TermStatus = "candidate" | "tracked" | "promoted" | "retired";

export interface TermRow {
  term_id: string;
  canonical: string;
  variants: string[];
  category: string | null;
  status: TermStatus;
  source_of_discovery: string;
  trend_id: string | null;
  wiki_title: string | null;
  first_seen_at: string;
  retired_at: string | null;
}

/** One (term, source, UTC day) measurement. meta is provenance only. */
export interface ObservationRow {
  id: string; // `${term_id}|${source}|${obs_date}` — idempotence key
  term_id: string;
  source: SourceId;
  obs_date: string; // YYYY-MM-DD, UTC calendar day
  raw_count: number;
  approximate: boolean;
  meta: { link?: string; excerpt?: string } | null;
  captured_at: string;
}

export interface ScoreRow {
  id: string; // `${term_id}|${source}|${score_date}`
  term_id: string;
  source: SourceId;
  score_date: string;
  raw_count: number;
  baseline_mean: number | null;
  baseline_sd: number | null;
  baseline_n: number;
  z_score: number | null;
  percentile: number | null;
  suppressed: "volume_floor" | "insufficient_baseline" | null;
  flagged: boolean;
  persistent: boolean;
}

export type CascadeState =
  | "dormant"
  | "embryonic"
  | "emerging"
  | "breaking"
  | "mainstream"
  | "decaying";

export interface CompositeRow {
  id: string; // `${term_id}|${score_date}`
  term_id: string;
  score_date: string;
  breadth: number;
  composite_score: number;
  cascade_state: CascadeState;
  lead_estimate_days: number | null;
  sources_available: SourceId[];
  sources_flagged: SourceId[];
  sources_missing: SourceId[];
  first_fired: Partial<Record<SourceId, string>>;
}

/** What an adapter returns for one (term, date) query.
 *  raw_count null = the source has no data for this term (a missing article,
 *  an empty index) — distinct from a measured zero.
 *  context_texts are TRANSIENT: fed to frontier extraction in-memory during
 *  the run and never persisted. */
export interface AdapterFetchResult {
  raw_count: number | null;
  approximate?: boolean;
  meta?: { link?: string; excerpt?: string } | null;
  context_texts?: string[];
  units?: number; // platform quota units this query consumed
}

export interface SourceAdapter {
  source: SourceId;
  displayName: string;
  /** Independently disableable — no single source is required for a run. */
  enabled(): boolean;
  disabledReason(): string | null;
  /** Declared limits; the scheduler respects them (throttle + hard stop). */
  rateLimit: {
    minIntervalMs: number;
    /** Platform daily unit cap this adapter budgets against, if any. */
    dailyUnits?: number;
    unitsPerQuery?: number;
  };
  countForDate(term: TermRow, date: string): Promise<AdapterFetchResult>;
  /** Only sources with real history implement this (wikipedia). Used to seed
   *  baselines so day one isn't 30 days of provisional silence. */
  backfill?(
    term: TermRow,
    fromDate: string,
    toDate: string
  ): Promise<{ date: string; raw_count: number }[]>;
}

/** Tunable scoring thresholds — read from pipeline_config key
 *  'term_scoring' with these defaults, so tuning needs no deploy. */
export interface TermScoringConfig {
  z_threshold: number;
  /** Per-source minimum raw_count before scoring is allowed. Low-count terms
   *  generate enormous z-scores from trivial moves. */
  volume_floor: Record<SourceId, number>;
  persistence_window: number; // trailing days examined
  persistence_hits: number; // flagged days required within the window
  baseline_days: number;
  min_baseline_n: number;
  percentile_days: number;
}

export const DEFAULT_SCORING_CONFIG: TermScoringConfig = {
  z_threshold: 2,
  volume_floor: {
    wikipedia: 100, // pageviews/day below this are statistical fog
    bluesky: 3,
    google_trends: 5, // interest index 0-100
    youtube: 3,
    reddit: 3,
  },
  persistence_window: 5,
  persistence_hits: 3,
  baseline_days: 30,
  min_baseline_n: 7,
  percentile_days: 90,
};
