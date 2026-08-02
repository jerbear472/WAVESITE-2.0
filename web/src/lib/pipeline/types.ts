// Measured-pipeline types. The corpus item is the atom: everything the
// pipeline publishes must be recomputable from stored RawItems alone.

export type ItemSource = "reddit" | "youtube";
export type CorpusKind = "trend" | "baseline" | "sweep";

export interface RawItem {
  id: string;
  source: ItemSource;
  platform: string;
  corpus: CorpusKind;
  /** The query/listing that fetched it ('' for baseline listings). */
  query: string;
  source_url: string;
  author_handle: string | null;
  author_id: string | null;
  /** Subreddit or YouTube channel id. */
  container: string | null;
  posted_at: string;
  captured_at: string;
  title: string | null;
  text: string | null;
  engagement: Record<string, number> | null;
  /** Follower/size context captured at collection time (reproducibility). */
  author_meta: Record<string, number> | null;
  media_refs: Record<string, string> | null;
}

export type MatchedBy = "fuzzy" | "model" | "manual";

export interface ItemTrendLink {
  item_id: string;
  trend_id: string;
  matched_by: MatchedBy;
  confidence: number | null;
}

export type SentimentLabel = "positive" | "neutral" | "negative" | "ironic";

export interface ItemAnnotation {
  item_id: string;
  sentiment: SentimentLabel;
  model: string | null;
  classified_at: string;
}

/** Raw computed metrics for one trend in one window. All measured, no model. */
export interface RawMetrics {
  volume: number;
  unique_authors: number;
  velocity: number;
  acceleration: number;
  breadth: number;
  lift: number;
  saturation: number;
  author_concentration: number;
  /** Aggregated from per-item model labels — arithmetic, not model magnitude. */
  sentiment_net: number | null;
}

export type MetricName = keyof RawMetrics;

export const METRIC_NAMES: MetricName[] = [
  "volume",
  "unique_authors",
  "velocity",
  "acceleration",
  "breadth",
  "lift",
  "saturation",
  "author_concentration",
  "sentiment_net",
];

export type PipelineState = "in_sync" | "rising" | "warming" | "fading";

export interface TrendMetricsRow {
  id: string;
  run_id: string;
  trend_id: string;
  window_start: string;
  window_end: string;
  raw: RawMetrics;
  percentiles: Partial<Record<MetricName, number>>;
  state: PipelineState | null;
  provisional: boolean;
}

export interface DistributionStats {
  n: number;
  min: number;
  max: number;
  median: number;
  sd: number;
  /** Ten fixed 0-100 buckets (percentile space) or value-space for raw. */
  buckets: number[];
}
