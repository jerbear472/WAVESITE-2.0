import type { PulseRun, Trend, TrendSnapshot } from "@/types";
import {
  getTrends,
  recordPulseRun,
  recordSnapshots,
  upsertTrendBySlug,
} from "@/lib/data";
import { harmonize } from "@/lib/harmony";
import { computeWaveScore } from "@/lib/wavescore";
import { emitForecastsForRun, resolveDueForecasts } from "@/lib/forecasts";
import {
  lifecycleFromCascade,
  momentumFromMeasurement,
  saturationFloor,
} from "@/lib/lifecycle";
import { slugifyTerm } from "@/lib/terms/registry";
import {
  getActiveTerms,
  getLatestComposites,
  linkTermToTrend,
} from "@/lib/terms/store";
import type { CompositeRow, TermRow } from "@/lib/terms/types";
import { getLatestMetricsRun, getMetricsForRun } from "@/lib/pipeline/store";
import type { TrendMetricsRow } from "@/lib/pipeline/types";
import { rescoreTrend } from "@/lib/measured-scores";
import { hashtagCandidates } from "@/lib/terms/hashtag";
import { fetchHashtagStats } from "@/lib/tiktok-stats";
import { generateStructured, isAIConfigured } from "@/lib/ai/provider";
import { pulseDiscoverySchema } from "@/lib/ai/schemas";

// ---------------------------------------------------------------------------
// Measured sync — the step that makes the daily measurement crons the spine
// of the product. Runs after /api/terms/run (and /api/pipeline/run):
//
//   1. REFRESH  — every library trend whose term has a fresh composite gets
//                 its lifecycle_stage, momentum, and saturation set from the
//                 measured cascade instead of the LLM's label.
//   2. PROMOTE  — promoted terms (accelerating on ≥2 independent sources)
//                 with no trend yet become new library trends: measured
//                 fields pinned by arithmetic, editorial fields written by
//                 one batched Claude call (plain fallback without a key).
//   3. SNAPSHOT — the whole field is snapshotted as a live run, so history,
//                 deltas, and the forecast track record accrue daily even if
//                 nobody clicks anything.
//   4. FORECAST — emission + resolution run at the same output boundary
//                 pulse uses.
//
// The trends table stays the single product surface; this module is the only
// bridge from the measurement tables into it.
// ---------------------------------------------------------------------------

/** How many days back a composite may be and still drive a refresh — covers
 *  adapter outages without letting week-old data masquerade as "today". */
const COMPOSITE_MAX_AGE_DAYS = 3;

/** New-trend promotions per run are capped: one batched enrichment call stays
 *  cheap and the library grows at a reviewable pace. */
const MAX_NEW_TRENDS_PER_SYNC = 8;

const ENRICH_SYSTEM = `You are the editorial engine of WaveSight, a cultural-intelligence terminal. WaveSight's measurement layer (real daily counts from Bluesky, Reddit, Google Trends, YouTube, and Wikipedia) has detected terms accelerating on multiple independent platforms. Your job is to turn each measured term into a full trend record: what it is, why it is spreading, who it is for.

You are NOT deciding whether these are trends — the measurements already did. You are describing them. If you genuinely do not recognize a term, still write the record from what the term itself and its measured platforms imply, and say plainly in detailed_summary that the meaning is still forming.

Scoring guidance (0-100 integers): sentiment_score = how positively culture feels; brand_safety_score; commercial_relevance_score. Be discriminating. momentum_score and saturation_score will be OVERWRITTEN by measured values — set your honest guess anyway.

best_platforms must use these names where applicable: TikTok, Instagram, YouTube, X, Reddit, Pinterest, Threads, Twitch, Discord, Bluesky.`;

export interface MeasuredSyncReport {
  run_id: string;
  /** Terms with a fresh composite this run — what was actually measured. */
  terms_measured: number;
  /** Terms persistently firing on ≥1 platform right now. */
  firing: number;
  refreshed: number;
  promoted_new: number;
  skipped_dormant: number;
  /** Trends snapshotted into history this run. */
  snapshotted: number;
  enrichment: "ai" | "fallback" | "none";
  forecast_emitted: number;
  forecast_resolved: number;
  /** Claims still open after this run — context for emitted=0. */
  forecasts_open: number;
  notes: string[];
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function runMeasuredSync(): Promise<MeasuredSyncReport> {
  const notes: string[] = [];
  const runId = `sync-${todayUtc()}-${Date.now().toString(36)}`;

  const sinceDate = new Date(
    Date.now() - COMPOSITE_MAX_AGE_DAYS * 86_400_000
  )
    .toISOString()
    .slice(0, 10);

  const [terms, composites, trends] = await Promise.all([
    getActiveTerms(),
    getLatestComposites(sinceDate),
    getTrends(),
  ]);

  // Corpus metrics feed sentiment/spread/adoption into WaveScore so measured
  // trends stop sharing the model's compressed default numbers.
  let metricsByTrendId = new Map<string, TrendMetricsRow>();
  try {
    const metricsRun = await getLatestMetricsRun();
    if (metricsRun) {
      metricsByTrendId = new Map(
        (await getMetricsForRun(metricsRun)).map((r) => [r.trend_id, r])
      );
    }
  } catch (err) {
    notes.push(`corpus metrics unavailable: ${msg(err)}`);
  }

  const termById = new Map(terms.map((t) => [t.term_id, t]));
  // A term maps to a trend via its stored trend_id, or by the deterministic
  // slug both seeding paths share (`term-${slugifyTerm(trend.name)}`).
  const trendById = new Map(trends.map((t) => [t.id, t]));
  const trendByTermId = new Map<string, Trend>();
  for (const t of trends) trendByTermId.set(`term-${slugifyTerm(t.name)}`, t);
  for (const term of terms) {
    if (term.trend_id && trendById.has(term.trend_id)) {
      trendByTermId.set(term.term_id, trendById.get(term.trend_id)!);
    }
  }

  // --- 1. REFRESH existing trends from their measured cascade ---------------
  let refreshed = 0;
  let skippedDormant = 0;
  const breadthByTrendId = new Map<string, number>();
  const rescoredIds = new Set<string>();
  const newcomers: { term: TermRow; composite: CompositeRow }[] = [];

  for (const [termId, composite] of composites) {
    const term = termById.get(termId);
    if (!term) continue; // retired since scoring
    const trend = trendByTermId.get(termId);

    if (!trend) {
      if (term.status === "promoted" || composite.breadth >= 2) {
        newcomers.push({ term, composite });
      }
      continue;
    }

    breadthByTrendId.set(trend.id, composite.breadth);
    if (composite.cascade_state === "dormant") {
      skippedDormant++;
      continue;
    }

    const stage = lifecycleFromCascade(
      composite.cascade_state,
      trend.lifecycle_stage
    );
    const momentum = momentumFromMeasurement(
      composite.breadth,
      composite.composite_score
    );
    const saturation = Math.max(
      trend.saturation_score,
      saturationFloor(composite.cascade_state)
    );

    const mrow = metricsByTrendId.get(trend.id);
    rescoredIds.add(trend.id);
    const next = rescoreTrend(
      {
        ...trend,
        lifecycle_stage: stage,
        momentum_score: momentum,
        saturation_score: saturation,
      },
      {
        breadth: composite.breadth,
        corpusBreadth: mrow?.raw.breadth,
        uniqueAuthors: mrow?.raw.unique_authors,
        sentimentNet: mrow?.raw.sentiment_net,
      }
    );

    if (
      stage === trend.lifecycle_stage &&
      momentum === trend.momentum_score &&
      saturation === trend.saturation_score &&
      next.sentiment_score === trend.sentiment_score &&
      next.wavescore === trend.wavescore
    ) {
      continue; // nothing moved — don't churn updated_at
    }
    try {
      await upsertTrendBySlug(next);
      refreshed++;
    } catch (err) {
      notes.push(`refresh failed for ${trend.slug}: ${msg(err)}`);
    }
  }

  // --- 1b. RESCORE corpus-measured trends without a firing term ------------
  // Backfilled/scanned trends have real posts, authors, and sentiment labels
  // even before any term composite fires — use them so their scores separate
  // from the model defaults.
  let rescoredFromCorpus = 0;
  for (const [trendId, mrow] of metricsByTrendId) {
    if (rescoredIds.has(trendId)) continue;
    const trend = trendById.get(trendId);
    if (!trend) continue;
    const next = rescoreTrend(trend, {
      corpusBreadth: mrow.raw.breadth,
      uniqueAuthors: mrow.raw.unique_authors,
      sentimentNet: mrow.raw.sentiment_net,
    });
    if (
      next.wavescore === trend.wavescore &&
      next.sentiment_score === trend.sentiment_score
    ) {
      continue;
    }
    try {
      await upsertTrendBySlug(next);
      rescoredFromCorpus++;
    } catch (err) {
      notes.push(`corpus rescore failed for ${trend.slug}: ${msg(err)}`);
    }
  }
  if (rescoredFromCorpus > 0) {
    notes.push(`rescored ${rescoredFromCorpus} trends from corpus metrics`);
  }

  // --- 1c. GROUND still-unmeasured trends via TikTok hashtag adoption ------
  // Trends with neither a firing term nor corpus metrics keep the model's
  // compressed defaults forever unless something real touches them. Distinct
  // creator counts on the trend's hashtag are that something. Capped per run
  // (unofficial mirror, sequential cron budget); newest trends first so scan
  // discoveries ground quickly.
  const TIKTOK_GROUND_CAP = 12;
  let grounded = 0;
  let groundAttempts = 0;
  const ungrounded = trends
    .filter((t) => !rescoredIds.has(t.id) && !metricsByTrendId.has(t.id))
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  for (const trend of ungrounded) {
    if (groundAttempts >= TIKTOK_GROUND_CAP) break;
    groundAttempts++;
    try {
      for (const tag of hashtagCandidates(trend.name, [])) {
        const stats = await fetchHashtagStats(tag);
        if (stats && stats.users > 0) {
          const next = rescoreTrend(trend, { uniqueAuthors: stats.users });
          if (next.wavescore !== trend.wavescore) {
            await upsertTrendBySlug(next);
            grounded++;
          }
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 1200));
    } catch (err) {
      notes.push(`tiktok grounding stopped: ${msg(err)}`);
      break; // mirror down — don't burn the rest of the cap this run
    }
  }
  if (grounded > 0) {
    notes.push(
      `grounded ${grounded}/${groundAttempts} trends via TikTok hashtag adoption`
    );
  }

  // --- 2. PROMOTE measured newcomers into the library -----------------------
  newcomers.sort(
    (a, b) => b.composite.composite_score - a.composite.composite_score
  );
  const toPromote = newcomers.slice(0, MAX_NEW_TRENDS_PER_SYNC);
  if (newcomers.length > toPromote.length) {
    notes.push(
      `${newcomers.length - toPromote.length} measured newcomers deferred to the next sync (cap ${MAX_NEW_TRENDS_PER_SYNC}/run)`
    );
  }

  let promotedNew = 0;
  let enrichment: MeasuredSyncReport["enrichment"] = "none";
  if (toPromote.length > 0) {
    const enriched = await enrichNewcomers(toPromote, notes);
    enrichment = enriched.mode;
    for (const { term, composite, trend } of enriched.records) {
      try {
        const res = await upsertTrendBySlug(trend);
        breadthByTrendId.set(res.trend.id, composite.breadth);
        try {
          await linkTermToTrend(term.term_id, res.trend.id);
        } catch (err) {
          notes.push(`term link failed for ${term.term_id}: ${msg(err)}`);
        }
        promotedNew++;
      } catch (err) {
        notes.push(`promotion failed for ${term.canonical}: ${msg(err)}`);
      }
    }
  }

  // --- 2b. IMAGE REPAIR — real og:images for scan trends still on the
  // waveform fallback, harvested from their recorded evidence URLs ----------
  try {
    const { getEvidenceForTrend } = await import("@/lib/data");
    const { harvestOgImage } = await import("@/lib/og-image");
    const needsImage = trends
      .filter((t) => !t.hero_image_url && t.origin === "scan")
      .slice(0, 8);
    for (const t of needsImage) {
      const evidence = await getEvidenceForTrend(t.id, 5);
      if (evidence.length === 0) continue;
      const image = await harvestOgImage(evidence.map((e) => e.source_url));
      if (image) {
        await upsertTrendBySlug({ ...t, hero_image_url: image });
        notes.push(`harvested source image for ${t.slug}`);
      }
    }
  } catch (err) {
    notes.push(`image repair failed: ${msg(err)}`);
  }

  // --- 3. RUN RECORD + SNAPSHOT the whole field -----------------------------
  const run: PulseRun = {
    id: runId,
    ran_at: new Date().toISOString(),
    // Live: these snapshots are real measurements, and forecast emission /
    // resolution (realOnly) must count them.
    mode: "live",
    trends_discovered: promotedNew,
    trends_updated: refreshed,
    focus: "measured sync — term cascade → trend library",
    notes: notes.length ? notes.join(" | ") : null,
  };
  await recordPulseRun(run);

  const all = await getTrends();
  const harmonizedAll = all.map((t) => harmonize(t));
  const snapshots: TrendSnapshot[] = harmonizedAll.map((t, i) => ({
    id: `snap-${runId}-${i}`,
    trend_id: t.id,
    run_id: runId,
    wavescore: t.wavescore,
    harmony: t.harmony,
    momentum_score: t.momentum_score,
    sentiment_score: t.sentiment_score,
    state: t.tier,
    // Breadth = independent sources persistently firing — the honest count.
    source_count: breadthByTrendId.get(t.id) ?? 0,
    captured_at: run.ran_at,
  }));
  await recordSnapshots(snapshots);

  // --- 4. FORECAST emission + resolution at the output boundary -------------
  let emitted = 0;
  let resolved = 0;
  try {
    emitted = (await emitForecastsForRun(run, harmonizedAll)).length;
  } catch (err) {
    notes.push(`forecast emission failed: ${msg(err)}`);
  }
  try {
    resolved = (await resolveDueForecasts()).resolved;
  } catch (err) {
    notes.push(`forecast resolution failed: ${msg(err)}`);
  }
  let forecastsOpen = 0;
  try {
    const { getForecasts } = await import("@/lib/data");
    forecastsOpen = (await getForecasts({ status: "pending" })).length;
  } catch {
    // count is advisory only
  }

  const firing = [...composites.values()].filter(
    (c) => c.sources_flagged.length > 0
  ).length;

  return {
    run_id: runId,
    terms_measured: composites.size,
    firing,
    refreshed,
    promoted_new: promotedNew,
    skipped_dormant: skippedDormant,
    snapshotted: snapshots.length,
    enrichment,
    forecast_emitted: emitted,
    forecast_resolved: resolved,
    forecasts_open: forecastsOpen,
    notes,
  };
}

/**
 * Promote one term into the library on demand — the Signals Desk's "promote"
 * action. Works even for terms with no fresh composite (a human explicitly
 * chose it): the measured fields fall back to the quiet defaults and refresh
 * on the next daily sync.
 */
export async function promoteTermToLibrary(
  termId: string
): Promise<{ trend: Trend; created: boolean }> {
  const terms = await getActiveTerms();
  const term = terms.find((t) => t.term_id === termId);
  if (!term) throw new Error(`unknown or retired term: ${termId}`);

  const sinceDate = new Date(Date.now() - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const composites = await getLatestComposites(sinceDate).catch(
    () => new Map<string, CompositeRow>()
  );
  const composite: CompositeRow =
    composites.get(termId) ?? {
      id: `${termId}|manual`,
      term_id: termId,
      score_date: sinceDate,
      breadth: 0,
      composite_score: 0,
      cascade_state: "dormant",
      lead_estimate_days: null,
      sources_available: [],
      sources_flagged: [],
      sources_missing: [],
      first_fired: {},
    };

  const notes: string[] = [];
  const enriched = await enrichNewcomers([{ term, composite }], notes);
  const record = enriched.records[0];
  const res = await upsertTrendBySlug(record.trend);
  try {
    await linkTermToTrend(term.term_id, res.trend.id);
  } catch {
    // best-effort; the slug-derived term id still matches on the next sync
  }
  return res;
}

// --- newcomer enrichment -----------------------------------------------------

interface EnrichedRecord {
  term: TermRow;
  composite: CompositeRow;
  trend: Trend;
}

async function enrichNewcomers(
  items: { term: TermRow; composite: CompositeRow }[],
  notes: string[]
): Promise<{ records: EnrichedRecord[]; mode: "ai" | "fallback" }> {
  if (isAIConfigured()) {
    try {
      const prompt = enrichPrompt(items);
      const result = await generateStructured({
        system: ENRICH_SYSTEM,
        prompt,
        schema: pulseDiscoverySchema,
        maxTokens: 16000,
      });
      const bySlug = new Map(
        result.trends.map((t) => [
          slugifyTerm(t.slug || t.trend_name),
          t,
        ])
      );
      const records = items.map(({ term, composite }) => {
        const d = bySlug.get(slugifyTerm(term.canonical));
        return {
          term,
          composite,
          trend: d
            ? measuredTrend(term, composite, {
                name: d.trend_name,
                one_line_summary: d.summary,
                detailed_summary: d.detailed_summary,
                category: d.category,
                emotional_tone: d.emotional_tone,
                audience: d.audience,
                virality_type: d.virality_type,
                sentiment_score: d.sentiment_score,
                brand_safety_score: d.brand_safety_score,
                commercial_relevance_score: d.commercial_relevance_score,
                participation_difficulty: d.participation_difficulty,
                risk_level: d.risk_level,
                why_spreading: d.why_spreading,
                who_should_join: d.who_should_join,
                who_should_avoid: d.who_should_avoid,
                best_platforms: d.best_platforms,
                creative_angles: d.creative_angles,
                sample_hooks: d.sample_hooks,
              })
            : fallbackTrend(term, composite),
        };
      });
      return { records, mode: "ai" };
    } catch (err) {
      notes.push(`AI enrichment failed, using fallback records: ${msg(err)}`);
    }
  }
  return {
    records: items.map(({ term, composite }) => ({
      term,
      composite,
      trend: fallbackTrend(term, composite),
    })),
    mode: "fallback",
  };
}

function enrichPrompt(
  items: { term: TermRow; composite: CompositeRow }[]
): string {
  const list = items
    .map(({ term, composite }) => {
      const lead =
        composite.lead_estimate_days !== null
          ? `, earliest source led by ~${composite.lead_estimate_days}d`
          : "";
      return `- "${term.canonical}" (slug MUST be "${slugifyTerm(term.canonical)}"${term.category ? `, category hint: ${term.category}` : ""}) — measured ${composite.cascade_state}, accelerating on ${composite.sources_flagged.join(" + ") || "no source today"} (breadth ${composite.breadth}, composite ${composite.composite_score}${lead})`;
    })
    .join("\n");
  return `Today is ${new Date().toDateString()}. WaveSight's measurement layer detected these terms accelerating across independent platforms. Write one full trend record per term — ${items.length} records total, in the same order, each with the exact slug given:

${list}

Return a JSON object with EXACTLY this shape:
{
  "trends": [
    {
      "trend_name": string (a clean display name for the term),
      "slug": string (the EXACT slug given above),
      "summary": string (one sharp line),
      "detailed_summary": string (2-4 sentences),
      "category": string,
      "emotional_tone": string,
      "audience": string,
      "lifecycle_stage": one of "emerging" | "accelerating" | "peaking" | "saturated" | "declining" | "resurfacing" (your read — it will be overridden by the measured cascade),
      "virality_type": one of "meme" | "aesthetic" | "challenge" | "phrase" | "product_behavior" | "sound" | "format" | "backlash" | "recommendation_loop" | "identity_signal" | "other",
      "momentum_score": integer 0-100,
      "sentiment_score": integer 0-100,
      "brand_safety_score": integer 0-100,
      "saturation_score": integer 0-100,
      "commercial_relevance_score": integer 0-100,
      "participation_difficulty": one of "easy" | "medium" | "hard",
      "risk_level": one of "low" | "medium" | "high",
      "why_spreading": string,
      "who_should_join": string,
      "who_should_avoid": string,
      "best_platforms": array of platform names (at least 1),
      "creative_angles": array of 2-3 strings,
      "sample_hooks": array of 2-3 strings
    }
  ],
  "field_notes": string (2-3 sentences on the pattern across this batch)
}
Every enum value must match EXACTLY — no other words, no capitalization changes.`;
}

/** Editorial fields the enrichment supplies; measured fields are pinned here. */
interface EditorialFields {
  name: string;
  one_line_summary: string;
  detailed_summary: string;
  category: string;
  emotional_tone: string;
  audience: string;
  virality_type: Trend["virality_type"];
  sentiment_score: number;
  brand_safety_score: number;
  commercial_relevance_score: number;
  participation_difficulty: Trend["participation_difficulty"];
  risk_level: Trend["risk_level"];
  why_spreading: string;
  who_should_join: string;
  who_should_avoid: string;
  best_platforms: string[];
  creative_angles?: string[];
  sample_hooks?: string[];
}

function measuredTrend(
  term: TermRow,
  composite: CompositeRow,
  editorial: EditorialFields
): Trend {
  const slug = slugifyTerm(term.canonical);
  const now = new Date().toISOString();
  const momentum = momentumFromMeasurement(
    composite.breadth,
    composite.composite_score
  );
  const saturation = Math.max(30, saturationFloor(composite.cascade_state));
  const trend: Trend = {
    id: `trend-${slug}`,
    slug,
    name: editorial.name,
    one_line_summary: editorial.one_line_summary,
    detailed_summary: editorial.detailed_summary,
    category: editorial.category,
    emotional_tone: editorial.emotional_tone,
    audience: editorial.audience,
    // Measured, not opined:
    lifecycle_stage: lifecycleFromCascade(composite.cascade_state),
    momentum_score: momentum,
    saturation_score: saturation,
    virality_type: editorial.virality_type,
    wavescore: 0,
    sentiment_score: editorial.sentiment_score,
    brand_safety_score: editorial.brand_safety_score,
    commercial_relevance_score: editorial.commercial_relevance_score,
    participation_difficulty: editorial.participation_difficulty,
    risk_level: editorial.risk_level,
    why_spreading: editorial.why_spreading,
    who_should_join: editorial.who_should_join,
    who_should_avoid: editorial.who_should_avoid,
    best_platforms: editorial.best_platforms,
    creative_angles: editorial.creative_angles,
    sample_hooks: editorial.sample_hooks,
    origin: "detected",
    created_at: now,
    updated_at: now,
  };
  // Spread comes from the measured breadth, so two newcomers with different
  // cross-platform reach never share a wavescore by default.
  return rescoreTrend(trend, { breadth: composite.breadth });
}

/** Honest minimal record when no AI key is configured (or the call failed):
 *  the measurements are real, the editorial layer says so and waits. */
function fallbackTrend(term: TermRow, composite: CompositeRow): Trend {
  const platforms = composite.sources_flagged.map(platformName);
  return measuredTrend(term, composite, {
    name: titleCase(term.canonical),
    one_line_summary: `Measured acceleration on ${composite.sources_flagged.length || "multiple"} independent platforms (${composite.cascade_state}).`,
    detailed_summary: `"${term.canonical}" is accelerating on ${composite.sources_flagged.join(", ") || "tracked sources"} — breadth ${composite.breadth}, composite ${composite.composite_score}. Detected by the measurement layer; editorial context will fill in as the AI enrichment runs.`,
    category: term.category ?? "Culture",
    emotional_tone: "forming",
    audience: "Early adopters",
    virality_type: "other",
    sentiment_score: 60,
    brand_safety_score: 55,
    commercial_relevance_score: 50,
    participation_difficulty: "medium",
    risk_level: "medium",
    why_spreading: `Independent acceleration on ${composite.sources_flagged.join(" and ") || "tracked sources"} within the same window — cross-platform echo, not a single-app blip.`,
    who_should_join: "Trend-watchers who move early and verify as they go.",
    who_should_avoid: "Brands that need an established meaning before joining.",
    best_platforms: platforms.length ? platforms : ["Reddit"],
  });
}

function platformName(source: string): string {
  switch (source) {
    case "bluesky":
      return "Bluesky";
    case "reddit":
      return "Reddit";
    case "youtube":
      return "YouTube";
    case "tiktok":
      return "TikTok";
    case "google_trends":
      return "Google Trends";
    case "wikipedia":
      return "Wikipedia";
    default:
      return source;
  }
}

function titleCase(s: string): string {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
