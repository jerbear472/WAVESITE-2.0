// WaveSight domain model — mirrors the Supabase schema (see supabase/schema.sql).
// These types are the single source of truth shared across the data layer, the AI
// service, and the UI.

export type UserType =
  | "creator"
  | "marketer"
  | "agency"
  | "artist"
  | "brand"
  | "admin";

export type SignalSource =
  | "youtube"
  | "tiktok"
  | "reddit"
  | "instagram"
  | "article"
  | "manual"
  | "google_trends"
  | "other";

export type LifecycleStage =
  | "emerging"
  | "accelerating"
  | "peaking"
  | "saturated"
  | "declining"
  | "resurfacing";

export type ViralityType =
  | "meme"
  | "aesthetic"
  | "challenge"
  | "phrase"
  | "product_behavior"
  | "sound"
  | "format"
  | "backlash"
  | "recommendation_loop"
  | "identity_signal"
  | "other";

export type ParticipationDifficulty = "easy" | "medium" | "hard";
export type RiskLevel = "low" | "medium" | "high";

export type BriefGoal =
  | "awareness"
  | "engagement"
  | "sales"
  | "music_promotion"
  | "community_growth"
  | "campaign_idea";

export type BriefTone =
  | "funny"
  | "premium"
  | "wholesome"
  | "edgy"
  | "educational"
  | "aspirational";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  user_type: UserType;
  company: string | null;
  created_at: string;
}

export interface Signal {
  id: string;
  source: SignalSource;
  url: string | null;
  title: string | null;
  text: string | null;
  creator_name: string | null;
  platform_engagement_json: Record<string, unknown> | null;
  raw_metadata_json: Record<string, unknown> | null;
  detected_phrases: string[];
  detected_entities: string[];
  detected_emotions: string[];
  submitted_by: string | null;
  created_at: string;
  ingested_at: string | null;
}

/** A real link backing a trend claim — article, post, video, tracker. */
export interface TrendSource {
  title: string;
  url: string;
  /** Where it lives, e.g. "TikTok", "Reddit", "Vogue", "Google Trends". */
  outlet?: string;
}

export interface Trend {
  id: string;
  name: string;
  slug: string;
  one_line_summary: string;
  detailed_summary: string;
  category: string;
  emotional_tone: string;
  audience: string;
  lifecycle_stage: LifecycleStage;
  virality_type: ViralityType;
  wavescore: number;
  momentum_score: number;
  sentiment_score: number;
  brand_safety_score: number;
  saturation_score: number;
  commercial_relevance_score: number;
  participation_difficulty: ParticipationDifficulty;
  risk_level: RiskLevel;
  why_spreading: string;
  who_should_join: string;
  who_should_avoid: string;
  best_platforms: string[];
  // Editorial extras used by the trend detail view. Optional so AI-clustered
  // trends remain valid before these are populated.
  creative_angles?: string[];
  sample_hooks?: string[];
  /** Live links backing this trend — populated by deep scans. */
  sources?: TrendSource[];
  /** How this trend entered the library (absent on pre-pulse records = seed). */
  origin?: "seed" | "pulse" | "import" | "scan";
  created_at: string;
  updated_at: string;
}

export interface TrendSignal {
  id: string;
  trend_id: string;
  signal_id: string;
  relevance_score: number;
  created_at: string;
}

export interface CreativeBrief {
  id: string;
  trend_id: string;
  user_type: UserType;
  target_audience: string | null;
  brand_or_creator_description: string | null;
  recommendation: string;
  hooks: string[];
  post_formats: string[];
  do_this: string[];
  avoid_this: string[];
  risk_notes: string;
  suggested_caption?: string;
  best_platform?: string;
  why_it_fits?: string;
  created_at: string;
}

export interface SavedTrend {
  id: string;
  user_id: string;
  trend_id: string;
  notes: string | null;
  created_at: string;
}

export interface DailyReport {
  id: string;
  report_date: string;
  title: string;
  summary: string;
  top_trend_ids: string[];
  generated_report: string;
  created_at: string;
}

// Convenience composite used on the trend detail page.
export interface TrendWithSignals extends Trend {
  signals: Signal[];
}

// ---------------------------------------------------------------------------
// Pulse — the recurring Claude discovery loop that refreshes the trend field.
// ---------------------------------------------------------------------------

/** One execution of the discovery loop. */
export interface PulseRun {
  id: string;
  ran_at: string;
  mode: "live" | "mock";
  trends_discovered: number;
  trends_updated: number;
  focus: string;
  notes: string | null;
}

/** Harmony tier at capture time — mirrors HarmonyTier in lib/harmony. */
export type TrendState = "in_sync" | "rising" | "warming" | "fading";

/**
 * Point-in-time score capture taken after every pulse run. Append-only: one
 * row per trend per run, never updated in place. This is the observation
 * history the forecast log resolves against, so downstream views key on
 * captured_at (real time), never run index.
 */
export interface TrendSnapshot {
  id: string;
  trend_id: string;
  run_id: string;
  wavescore: number;
  harmony: number;
  momentum_score: number;
  sentiment_score: number;
  /** Tier at capture time. Null on rows older than the forecast-log migration. */
  state?: TrendState | null;
  /** Evidence items recorded for this trend in this run (0 = model-attested). */
  source_count?: number | null;
  captured_at: string;
}

// ---------------------------------------------------------------------------
// Evidence — the raw items behind a score, so a strategist can answer
// "says who" in front of a client. Append-only, capped per trend per run.
// ---------------------------------------------------------------------------

export interface TrendEvidence {
  id: string;
  trend_id: string;
  /** Null for evidence captured outside a pulse run (e.g. deep scans). */
  run_id: string | null;
  source_url: string;
  platform: string;
  author_handle: string | null;
  captured_at: string;
  excerpt: string | null;
  engagement_metrics: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Forecasts — every flag the system raises, as a falsifiable claim that gets
// resolved and scored. The published track record is built from these rows.
// ---------------------------------------------------------------------------

export type ForecastClaimType = "peak_within" | "sustains_above" | "fades_below";
export type ForecastStatus = "pending" | "hit" | "miss" | "void";

export interface Forecast {
  forecast_id: string;
  trend_id: string;
  created_at: string;
  created_in_run_id: string;
  claim_type: ForecastClaimType;
  /** Length of the claim window in days, counted from created_at. */
  horizon_days: number;
  /** Threshold for sustains_above / fades_below; null for peak_within. */
  target_value: number | null;
  confidence: number;
  /**
   * When the forecast becomes resolvable. For peak_within this is claim-window
   * end PLUS the 14-day confirmation lag — peaks are only confirmable in
   * arrears, and that lag is deliberately baked in here.
   */
  resolves_at: string;
  status: ForecastStatus;
  resolved_at: string | null;
  observed_value: number | null;
  resolution_note: string | null;
}

/** Append-only audit row written once per resolution attempt that resolves. */
export interface ForecastResolutionLog {
  id: string;
  forecast_id: string;
  evaluated_at: string;
  status: ForecastStatus;
  observed_value: number | null;
  /** Structured evaluation detail, e.g. { peak_date, peak_value, gap_days }. */
  detail: Record<string, unknown> | null;
}

/** How a trend entered the library. */
export type TrendOrigin = "seed" | "pulse" | "import" | "scan";

// ---------------------------------------------------------------------------
// Prediction market aggregation — live Kalshi/Polymarket markets matched to
// scanned trends, with a sentiment-vs-odds read to inform bets.
// ---------------------------------------------------------------------------

export type MarketVenue = "kalshi" | "polymarket";

/** A live prediction market relevant to the scanned cultural field. */
export interface MarketSignal {
  /** Slug of the scanned trend this market relates to, if any. */
  trend_slug: string | null;
  venue: MarketVenue;
  market_title: string;
  url: string;
  /** Market-implied probability of YES, 0-100. */
  implied_probability: number;
  /** What public sentiment across the internet suggests, 0-100. */
  sentiment_probability: number;
  /** Direction of the divergence between sentiment and market odds. */
  edge: "sentiment_ahead" | "market_ahead" | "aligned";
  /** 1-2 sentence read on why, citing the sentiment evidence. */
  rationale: string;
}
