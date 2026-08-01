import { z } from "zod";

// Zod schemas validate every structured AI output before it reaches the app.
// They double as the JSON contract we describe to the model.

export const score = z.number().int().min(0).max(100);

export const analyzeSignalSchema = z.object({
  detected_phrases: z.array(z.string()).default([]),
  detected_entities: z.array(z.string()).default([]),
  detected_emotions: z.array(z.string()).default([]),
  possible_trend_names: z.array(z.string()).default([]),
  sentiment: z.enum(["positive", "mixed", "negative", "ironic", "risky"]),
  sentiment_score: score,
  audience: z.string(),
  category: z.string(),
  risk_notes: z.string(),
  why_this_might_matter: z.string(),
});
export type AnalyzeSignalResult = z.infer<typeof analyzeSignalSchema>;

export const clusterTrendSchema = z.object({
  trend_name: z.string(),
  slug: z.string().optional(),
  summary: z.string(),
  detailed_summary: z.string().optional(),
  category: z.string(),
  emotional_tone: z.string(),
  audience: z.string(),
  lifecycle_stage: z.enum([
    "emerging",
    "accelerating",
    "peaking",
    "saturated",
    "declining",
    "resurfacing",
  ]),
  virality_type: z.enum([
    "meme",
    "aesthetic",
    "challenge",
    "phrase",
    "product_behavior",
    "sound",
    "format",
    "backlash",
    "recommendation_loop",
    "identity_signal",
    "other",
  ]),
  why_spreading: z.string(),
  who_should_join: z.string(),
  who_should_avoid: z.string(),
  best_platforms: z.array(z.string()).default([]),
});
export type ClusterTrendResult = z.infer<typeof clusterTrendSchema>;

export const scoreTrendSchema = z.object({
  wavescore: score,
  momentum_score: score,
  sentiment_score: score,
  brand_safety_score: score,
  saturation_score: score,
  commercial_relevance_score: score,
  participation_difficulty: z.enum(["easy", "medium", "hard"]),
  risk_level: z.enum(["low", "medium", "high"]),
});
export type ScoreTrendResult = z.infer<typeof scoreTrendSchema>;

// One fully-formed trend from the Pulse discovery loop — cluster fields plus
// component scores in a single pass, so a run needs one model call.
export const pulseTrendSchema = z.object({
  trend_name: z.string(),
  slug: z.string().optional(),
  summary: z.string(),
  detailed_summary: z.string(),
  category: z.string(),
  emotional_tone: z.string(),
  audience: z.string(),
  lifecycle_stage: z.enum([
    "emerging",
    "accelerating",
    "peaking",
    "saturated",
    "declining",
    "resurfacing",
  ]),
  virality_type: z.enum([
    "meme",
    "aesthetic",
    "challenge",
    "phrase",
    "product_behavior",
    "sound",
    "format",
    "backlash",
    "recommendation_loop",
    "identity_signal",
    "other",
  ]),
  momentum_score: score,
  sentiment_score: score,
  brand_safety_score: score,
  saturation_score: score,
  commercial_relevance_score: score,
  participation_difficulty: z.enum(["easy", "medium", "hard"]),
  risk_level: z.enum(["low", "medium", "high"]),
  why_spreading: z.string(),
  who_should_join: z.string(),
  who_should_avoid: z.string(),
  best_platforms: z.array(z.string()).min(1),
  creative_angles: z.array(z.string()).default([]),
  sample_hooks: z.array(z.string()).default([]),
});
export type PulseTrendResult = z.infer<typeof pulseTrendSchema>;

export const pulseDiscoverySchema = z.object({
  trends: z.array(pulseTrendSchema).min(1),
  field_notes: z.string(),
});
export type PulseDiscoveryResult = z.infer<typeof pulseDiscoverySchema>;

// ---------------------------------------------------------------------------
// Deep scan — web-search-grounded discovery. Every trend must carry real
// source links and an honest fit read against the user's brief.
// ---------------------------------------------------------------------------

export const trendSourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  outlet: z.string().optional(),
});

export const deepScanTrendSchema = pulseTrendSchema.extend({
  sources: z.array(trendSourceSchema).min(1),
  fit_score: score,
  fit_reasons: z.array(z.string()).min(1).max(3),
});
export type DeepScanTrendResult = z.infer<typeof deepScanTrendSchema>;

export const deepScanSchema = z.object({
  trends: z.array(deepScanTrendSchema).min(1),
  field_notes: z.string(),
});
export type DeepScanResult = z.infer<typeof deepScanSchema>;

export const marketSignalSchema = z.object({
  trend_slug: z.string().nullable(),
  venue: z.enum(["kalshi", "polymarket"]),
  market_title: z.string(),
  url: z.string().url(),
  implied_probability: score,
  sentiment_probability: score,
  edge: z.enum(["sentiment_ahead", "market_ahead", "aligned"]),
  rationale: z.string(),
});

export const marketAnalysisSchema = z.object({
  signals: z.array(marketSignalSchema),
  market_notes: z.string(),
});
export type MarketAnalysisResult = z.infer<typeof marketAnalysisSchema>;

// The brief is a HOW-TO for hopping on one specific trend — anchored to its
// real mechanics, with a shootable storyboard. Never a fresh campaign concept.
export const storyboardFrameSchema = z.object({
  /** e.g. "0–2s", "3–7s" */
  timestamp: z.string(),
  /** What the camera sees, one concrete sentence. */
  shot: z.string(),
  /** The text overlay burned on screen, exactly as typed. */
  on_screen_text: z.string(),
  /** Camera/edit note: cut, zoom, transition, pacing. */
  direction: z.string(),
});

export const creativeBriefSchema = z.object({
  recommendation: z.string(),
  why_it_fits: z.string(),
  /** What the trend actually IS — its format/sound/joke structure. */
  trend_mechanics: z.string(),
  creative_strategy: z.string(),
  /** Ordered how-to: from prep to posting, executable tomorrow. */
  steps: z
    .array(z.object({ title: z.string(), detail: z.string() }))
    .min(3)
    .max(7),
  /** The visual: shot-by-shot vertical-video storyboard. */
  storyboard: z.array(storyboardFrameSchema).min(3).max(6),
  /** The audio to use — named sound, style of track, or VO approach. */
  sound: z.string(),
  hashtags: z.array(z.string()).min(2).max(8),
  hooks: z.array(z.string()).min(1),
  post_formats: z.array(z.string()).min(1),
  do_this: z.array(z.string()).min(1),
  avoid_this: z.array(z.string()).min(1),
  risk_notes: z.string(),
  best_platform: z.string(),
  suggested_caption: z.string(),
});
export type CreativeBriefResult = z.infer<typeof creativeBriefSchema>;
export type StoryboardFrame = z.infer<typeof storyboardFrameSchema>;
