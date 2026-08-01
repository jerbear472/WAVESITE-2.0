import type { PulseRun, Trend, TrendSnapshot } from "@/types";
import {
  getPulseRuns,
  getTrendDeltas,
  getTrends,
  recordPulseRun,
  recordSnapshots,
  upsertTrendBySlug,
} from "@/lib/data";
import { computeWaveScore } from "@/lib/wavescore";
import { harmonize, type HarmonizedTrend } from "@/lib/harmony";
import { emitForecastsForRun, resolveDueForecasts } from "@/lib/forecasts";
import { generateStructured } from "@/lib/ai/provider";
import { pulseDiscoverySchema, type PulseTrendResult } from "@/lib/ai/schemas";

// ---------------------------------------------------------------------------
// Pulse — the discovery loop. Each run asks Claude for the strongest current
// social-media and fashion trends, folds them into the library (slug-keyed
// upsert), then snapshots every trend's scores so the next run can compute
// rising/declining direction. Mock mode drifts existing scores instead.
// ---------------------------------------------------------------------------

const DISCOVERY_SYSTEM = `You are the discovery engine of WaveSight, a cultural-intelligence terminal used by marketers and creators. Your job: surface the internet trends most worth knowing about RIGHT NOW, across social media culture AND fashion/aesthetics, and score them honestly.

Scoring guidance (all 0-100 integers):
- momentum_score: how fast it is gaining energy right now
- sentiment_score: how positively the culture feels about it (78+ = genuinely loved)
- brand_safety_score: how safe for a mainstream brand to touch
- saturation_score: how played-out it already is (high = worn out)
- commercial_relevance_score: how much commercial opportunity it carries
Be discriminating: most trends should NOT score above 85 on sentiment or momentum. Reserve the combination of very high sentiment + high momentum + broad platform spread for the rare trend that has truly harmonized with the culture.

best_platforms must use these names where applicable: TikTok, Instagram, YouTube, X, Reddit, Pinterest, Threads, Twitch, Discord.`;

function discoveryPrompt(count: number, focus: string, existing: Trend[]) {
  const known = existing
    .map((t) => `- ${t.name} (slug: ${t.slug})`)
    .join("\n");
  return `Today is ${new Date().toDateString()}. Based on your deepest knowledge of internet culture, produce the ${count} trends most worth tracking right now. Focus: ${focus}.

Mix required: roughly half social-media/content trends (memes, formats, sounds, behaviors) and half fashion/aesthetic trends (styles, silhouettes, colors, subcultural looks). Include at least one trend that is clearly declining or saturated — the terminal must show what is OUT as well as what is in.

Already in the library (if one of these is still among the most important trends, return it again with the SAME slug and refreshed scores; otherwise prefer new discoveries):
${known || "- (empty)"}

Return a JSON object with EXACTLY this shape:
{
  "trends": [
    {
      "trend_name": string,
      "slug": string (kebab-case),
      "summary": string (one sharp line),
      "detailed_summary": string (2-4 sentences),
      "category": string (e.g. "Fashion", "Aesthetic", "Meme", "Music", "Food", "Wellness"),
      "emotional_tone": string,
      "audience": string,
      "lifecycle_stage": one of "emerging" | "accelerating" | "peaking" | "saturated" | "declining" | "resurfacing",
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
  "field_notes": string (2-3 sentences on the cross-channel pattern in this batch — what the culture is collectively reaching for)
}
Every enum value must match EXACTLY — no other words, no capitalization changes.`;
}

export interface PulseResult {
  run: PulseRun;
  trends: HarmonizedTrend[];
  fieldNotes: string;
}

export async function runPulse(
  opts: { count?: number; focus?: string } = {}
): Promise<PulseResult> {
  const count = Math.min(Math.max(opts.count ?? 8, 3), 14);
  const focus =
    opts.focus?.trim() ||
    "top social media trends and fashion trends harmonizing with the culture";
  const existing = await getTrends();

  let discovered: PulseTrendResult[];
  let fieldNotes: string;
  let mode: "live" | "mock" = "live";

  try {
    const result = await generateStructured({
      system: DISCOVERY_SYSTEM,
      prompt: discoveryPrompt(count, focus, existing),
      schema: pulseDiscoverySchema,
      maxTokens: 16000,
    });
    discovered = result.trends;
    fieldNotes = result.field_notes;
  } catch (err) {
    console.error("[pulse] live discovery failed, using mock:", err);
    mode = "mock";
    const mock = mockDiscovery(existing, count);
    discovered = mock.trends;
    fieldNotes = mock.fieldNotes;
  }

  const runId = `pulse-${Date.now()}`;
  let created = 0;
  let updated = 0;

  for (const d of discovered) {
    const slug = (d.slug || slugify(d.trend_name)).toLowerCase();
    const now = new Date().toISOString();
    const trend: Trend = {
      id: `trend-${slug}`,
      name: d.trend_name,
      slug,
      one_line_summary: d.summary,
      detailed_summary: d.detailed_summary,
      category: d.category,
      emotional_tone: d.emotional_tone,
      audience: d.audience,
      lifecycle_stage: d.lifecycle_stage,
      virality_type: d.virality_type,
      wavescore: computeWaveScore(d),
      momentum_score: d.momentum_score,
      sentiment_score: d.sentiment_score,
      brand_safety_score: d.brand_safety_score,
      saturation_score: d.saturation_score,
      commercial_relevance_score: d.commercial_relevance_score,
      participation_difficulty: d.participation_difficulty,
      risk_level: d.risk_level,
      why_spreading: d.why_spreading,
      who_should_join: d.who_should_join,
      who_should_avoid: d.who_should_avoid,
      best_platforms: d.best_platforms,
      creative_angles: d.creative_angles,
      sample_hooks: d.sample_hooks,
      origin: "pulse",
      created_at: now,
      updated_at: now,
    };
    const res = await upsertTrendBySlug(trend);
    if (res.created) created += 1;
    else updated += 1;
  }

  const run: PulseRun = {
    id: runId,
    ran_at: new Date().toISOString(),
    mode,
    trends_discovered: created,
    trends_updated: updated,
    focus,
    notes: fieldNotes,
  };
  await recordPulseRun(run);

  // Snapshot the whole field (not just this batch) so deltas cover every tile.
  // One appended observation row per trend per run — the raw material the
  // forecast log resolves against. Never updated in place.
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
    // Pulse discovery is model-attested: no raw source items are fetched, so
    // there is honestly nothing to count. Becomes real when ingestion lands.
    source_count: 0,
    captured_at: run.ran_at,
  }));
  await recordSnapshots(snapshots);

  // Output-boundary hooks — the scoring pipeline above is untouched.
  // Emission: every freshly "rising" trend becomes a falsifiable peak_within
  // claim (live runs only). Resolution: settle any claims that have come due.
  // Neither may ever sink a pulse run.
  try {
    await emitForecastsForRun(run, harmonizedAll);
  } catch (err) {
    console.error("[pulse] forecast emission failed:", err);
  }
  try {
    await resolveDueForecasts();
  } catch (err) {
    console.error("[pulse] forecast resolution failed:", err);
  }

  return { run, trends: await getHarmonizedTrends(), fieldNotes };
}

/** Every trend enriched with harmony, tier, and direction — sorted by harmony. */
export async function getHarmonizedTrends(): Promise<HarmonizedTrend[]> {
  const [trends, deltas] = await Promise.all([getTrends(), getTrendDeltas()]);
  return trends
    .map((t) => harmonize(t, deltas.get(t.id)?.harmony ?? 0))
    .sort((a, b) => b.harmony - a.harmony);
}

export async function getPulseState() {
  const [trends, runs] = await Promise.all([
    getHarmonizedTrends(),
    getPulseRuns(),
  ]);
  return { trends, runs, lastRun: runs[0] ?? null };
}

// ---------------------------------------------------------------------------
// Mock discovery — no API key (or a failed call). Drifts existing trend scores
// on a believable random walk so the loop, deltas, and tiers all stay alive.
// ---------------------------------------------------------------------------

function mockDiscovery(
  existing: Trend[],
  count: number
): { trends: PulseTrendResult[]; fieldNotes: string } {
  const picked = [...existing]
    .sort((a, b) => b.momentum_score - a.momentum_score)
    .slice(0, count);
  const trends = picked.map((t) => {
    const drift = () => Math.round((Math.random() - 0.42) * 12);
    return {
      trend_name: t.name,
      slug: t.slug,
      summary: t.one_line_summary,
      detailed_summary: t.detailed_summary,
      category: t.category,
      emotional_tone: t.emotional_tone,
      audience: t.audience,
      lifecycle_stage: t.lifecycle_stage,
      virality_type: t.virality_type,
      momentum_score: clampScore(t.momentum_score + drift()),
      sentiment_score: clampScore(t.sentiment_score + drift()),
      brand_safety_score: t.brand_safety_score,
      saturation_score: clampScore(t.saturation_score + Math.abs(drift()) / 2),
      commercial_relevance_score: t.commercial_relevance_score,
      participation_difficulty: t.participation_difficulty,
      risk_level: t.risk_level,
      why_spreading: t.why_spreading,
      who_should_join: t.who_should_join,
      who_should_avoid: t.who_should_avoid,
      best_platforms: t.best_platforms,
      creative_angles: t.creative_angles ?? [],
      sample_hooks: t.sample_hooks ?? [],
    } satisfies PulseTrendResult;
  });
  return {
    trends,
    fieldNotes:
      "Mock pulse: scores drifted on a random walk. Set ANTHROPIC_API_KEY for live cultural discovery.",
  };
}

function clampScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
