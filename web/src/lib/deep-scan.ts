import type Anthropic from "@anthropic-ai/sdk";
import type { Trend } from "@/types";
import type { ScanProfile } from "@/lib/fit";
import {
  MODEL,
  extractJson,
  getClient,
} from "@/lib/ai/provider";
import {
  deepScanSchema,
  type DeepScanTrendResult,
} from "@/lib/ai/schemas";
import { computeWaveScore } from "@/lib/wavescore";
import { rescoreTrend } from "@/lib/measured-scores";
import { hashtagCandidates } from "@/lib/terms/hashtag";
import { fetchHashtagStats } from "@/lib/tiktok-stats";
import { getTrends, recordEvidence, upsertTrendBySlug } from "@/lib/data";
import type { TrendEvidence } from "@/types";

// ---------------------------------------------------------------------------
// Deep scan — a real appraisal of the live internet, not a library lookup.
// Claude runs multi-angle web searches (server-side web_search/web_fetch),
// returns only the trends that genuinely earn a spot (variable count), each
// grounded in real source links.
// ---------------------------------------------------------------------------

export type ScanEmit = (event: Record<string, unknown>) => void;

const DEEP_SCAN_SYSTEM = `You are the deep-scan engine of WaveSight, a cultural-intelligence terminal used by marketers and creators. You research the LIVE internet with web search before saying anything.

Rules of the appraisal:
- Search widely before concluding: platform-native angles (TikTok/Reddit/X/Instagram chatter), press and trade coverage, and trend trackers. Vary your queries; do not stop at the first page of one search.
- Be balanced and honest. Surface headwinds, backlash, and saturation — not just hype. If a trend is fading, say so and score it accordingly.
- Build a broad candidate set, then return 5-8 independently evidenced trends that genuinely earn a spot for THIS brief. If fewer survive verification, return fewer and explain the evidence gap in field_notes. Never pad with guesses.
- A result must be a specific, nameable content opportunity: a format, behavior, aesthetic, phrase, product behavior, sound, or recurring conversation. Broad subjects such as "camping", "hiking", "outdoors", "wellness", or "travel" are search territory, not valid trend names.
- Prefer evidence that shows people actually participating, copying, discussing, or searching for the behavior. A generic forecast/listicle that merely mentions a category is weak evidence and cannot carry a result by itself.
- Make the output immediately usable by a creator. The summary must say what is happening now; creative_angles and sample_hooks must describe concrete posts they could make this week.
- Every trend must cite 2-5 REAL sources you actually found via search — exact URLs from the results. Never invent or approximate a URL.
- fit_score is an honest 0-100 read of how well the trend serves the user's specific brief, and fit_reasons must reference the brief, not generic praise.

Scoring guidance (all 0-100 integers): momentum_score = energy gained right now; sentiment_score = how positively culture feels (78+ = genuinely loved); brand_safety_score; saturation_score (high = worn out); commercial_relevance_score. Be discriminating — most trends should NOT score above 85 on sentiment or momentum.

best_platforms must use these names where applicable: TikTok, Instagram, YouTube, X, Reddit, Pinterest, Threads, Twitch, Discord.`;

/**
 * Compact digest of what WaveSight already measures and tracks, injected into
 * the scan prompt. Two jobs: (1) hand Claude measured, non-guessed leads to
 * verify with fresh searches, and (2) show the known library so re-discovered
 * trends reuse their slug and everything else skews genuinely NEW.
 * Failure-safe: measurement tables need Supabase; without it we degrade to
 * the in-memory library list only.
 */
async function buildMeasuredDigest(): Promise<string> {
  const parts: string[] = [];
  try {
    const trends = await getTrends();
    const known = trends
      .slice(0, 30)
      .map(
        (t) =>
          `- ${t.name} (slug: ${t.slug}, ${t.lifecycle_stage}, momentum ${t.momentum_score})`
      )
      .join("\n");
    if (known) {
      parts.push(
        `Already in the WaveSight library — if one of these genuinely earns a spot for THIS brief, return it with the SAME slug and refreshed scores; otherwise strongly prefer trends NOT on this list:\n${known}`
      );
    }
  } catch {
    // library unavailable — proceed without it
  }
  try {
    const { getLatestComposites } = await import("@/lib/terms/store");
    const { getActiveTerms } = await import("@/lib/terms/store");
    const sinceDate = new Date(Date.now() - 3 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const [composites, terms] = await Promise.all([
      getLatestComposites(sinceDate),
      getActiveTerms(),
    ]);
    const nameById = new Map(terms.map((t) => [t.term_id, t.canonical]));
    const accelerating = [...composites.values()]
      .filter((c) => c.breadth >= 1 && c.cascade_state !== "dormant")
      .sort((a, b) => b.composite_score - a.composite_score)
      .slice(0, 15)
      .map((c) => {
        const name = nameById.get(c.term_id);
        return name
          ? `- "${name}" — ${c.cascade_state}, firing on ${c.sources_flagged.join(" + ")} (breadth ${c.breadth})`
          : null;
      })
      .filter(Boolean)
      .join("\n");
    if (accelerating) {
      parts.push(
        `WaveSight's measurement layer (real daily counts from Bluesky, Reddit, Google Trends, YouTube, Wikipedia) shows these terms accelerating RIGHT NOW. These are measured leads, not guesses — verify the promising ones with fresh searches and include any that fit the brief:\n${accelerating}`
      );
    }
  } catch {
    // measurement layer unavailable (no Supabase) — the scan still works
  }
  return parts.length ? `\n${parts.join("\n\n")}\n` : "";
}

function deepScanPrompt(profile: ScanProfile, measuredDigest: string) {
  return `Today is ${new Date().toDateString()}. Run a deep trend appraisal of the live internet for this brief:

- Who: ${profile.userType}
- Niche: ${profile.niche}
- Goal: ${profile.goal}
- Platforms they care about: ${profile.platforms.join(", ") || "any"}
- Audience: ${profile.audience || "not specified"}
- Risk appetite: ${profile.appetite}
${profile.focus ? `- Extra focus: ${profile.focus}` : ""}
${measuredDigest}
Search the web from multiple angles (the niche itself, each priority platform, adjacent culture/fashion/press coverage, and at least one contrarian "is X over?" style query). Run explicit recency queries for the last 7-30 days and discovery queries such as "rising", "breakout", and "people are starting to". Chase what the searches surface, not just what you already know — the point of a NEW scan is what changed since the last one.

First form a candidate list, then discard anything that is merely a broad topic, a perennial activity, an unsupported prediction, or a renamed version of another result. Return 5-8 distinct opportunities only when each has at least two independent sources and a concrete creator action. Rank for this user's stated platforms and goal, not for general popularity.

After your research, respond with a SINGLE valid JSON object and nothing else — no prose before or after it, no markdown fences:
{
  "trends": [
    {
      "trend_name": string,
      "slug": string (kebab-case),
      "summary": string (one sharp line),
      "detailed_summary": string (2-4 sentences, grounded in what you found),
      "category": string,
      "emotional_tone": string,
      "audience": string,
      "lifecycle_stage": "emerging" | "accelerating" | "peaking" | "saturated" | "declining" | "resurfacing",
      "virality_type": "meme" | "aesthetic" | "challenge" | "phrase" | "product_behavior" | "sound" | "format" | "backlash" | "recommendation_loop" | "identity_signal" | "other",
      "momentum_score": int 0-100,
      "sentiment_score": int 0-100,
      "brand_safety_score": int 0-100,
      "saturation_score": int 0-100,
      "commercial_relevance_score": int 0-100,
      "participation_difficulty": "easy" | "medium" | "hard",
      "risk_level": "low" | "medium" | "high",
      "why_spreading": string,
      "who_should_join": string,
      "who_should_avoid": string,
      "best_platforms": [string, ...],
      "creative_angles": [2-3 strings],
      "sample_hooks": [2-3 strings],
      "sources": [{ "title": string, "url": string (a REAL url from your searches), "outlet": string }, ... 2-5 items],
      "fit_score": int 0-100,
      "fit_reasons": [1-3 short strings tied to the brief]
    }
  ],
  "field_notes": string (2-3 sentences: the cross-channel pattern, including what is cooling off)
}
Every enum value must match EXACTLY.`;
}

interface StreamProgress {
  searches: number;
  signals: number;
}

/**
 * Run the web-search research pass, streaming real progress (actual queries,
 * actual result counts) through emit. Handles pause_turn continuations.
 */
async function runResearch(
  profile: ScanProfile,
  measuredDigest: string,
  emit: ScanEmit
): Promise<{ trends: DeepScanTrendResult[]; fieldNotes: string; progress: StreamProgress }> {
  const client = getClient();
  const progress = { searches: 0, signals: 0 };

  const tools = [
    { type: "web_search_20260209", name: "web_search", max_uses: 12 },
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: 6 },
  ] as unknown as Anthropic.Messages.ToolUnion[];

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: deepScanPrompt(profile, measuredDigest) },
  ];

  let finalText = "";
  for (let turn = 0; turn < 8; turn++) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: DEEP_SCAN_SYSTEM,
      tools,
      messages,
    } as unknown as Anthropic.MessageCreateParamsStreaming);

    // Track server tool-use blocks so we can surface the actual query/url.
    const pendingInputs = new Map<
      number,
      { name: string; json: string; initial?: Record<string, unknown> }
    >();

    for await (const event of stream) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const ev = event as any;
      if (ev.type === "content_block_start") {
        const block = ev.content_block;
        if (block?.type === "server_tool_use") {
          pendingInputs.set(ev.index, {
            name: block.name,
            json: "",
            initial: block.input,
          });
        } else if (block?.type === "web_search_tool_result") {
          // Each result block = one completed search. Counting here is robust
          // regardless of how the tool input was streamed.
          progress.searches += 1;
          const results = Array.isArray(block.content) ? block.content.length : 0;
          progress.signals += results;
          emit({
            type: "status",
            phase: "scan",
            message: `Search ${progress.searches}: read ${results} live results — ${progress.signals} signals so far…`,
            progress: Math.min(8 + progress.searches * 5, 68),
            scanned: progress.signals,
          });
        }
      } else if (
        ev.type === "content_block_delta" &&
        ev.delta?.type === "input_json_delta"
      ) {
        const pending = pendingInputs.get(ev.index);
        if (pending) pending.json += ev.delta.partial_json;
      } else if (ev.type === "content_block_stop") {
        const pending = pendingInputs.get(ev.index);
        if (pending) {
          pendingInputs.delete(ev.index);
          const input = safeParse(pending.json) ?? pending.initial ?? {};
          const query = (input as Record<string, unknown>).query;
          const url = (input as Record<string, unknown>).url;
          if (pending.name === "web_search" && typeof query === "string") {
            emit({
              type: "status",
              phase: "scan",
              message: `Searching the live web: “${query}”`,
              progress: Math.min(6 + progress.searches * 5, 66),
              scanned: progress.signals,
            });
          } else if (pending.name === "web_fetch" && typeof url === "string") {
            emit({
              type: "status",
              phase: "scan",
              message: `Reading source: ${hostOf(url)}`,
              progress: Math.min(8 + progress.searches * 5, 68),
              scanned: progress.signals,
            });
          }
        }
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }

    const response = await stream.finalMessage();
    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    finalText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    break;
  }

  const parsed = deepScanSchema.parse(extractJson(finalText));
  return { trends: parsed.trends, fieldNotes: parsed.field_notes, progress };
}

function safeParse(json: string): Record<string, unknown> | null {
  if (!json.trim()) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Keep the highest-engagement items per trend per capture. Deep-scan sources
 * carry no engagement metrics yet, so order-of-citation stands in until a
 * connector provides real numbers — the cap and the sort seam are here.
 */
const EVIDENCE_CAP = 20;

function evidenceFromSources(
  trendId: string,
  d: DeepScanTrendResult
): TrendEvidence[] {
  const now = new Date().toISOString();
  return (d.sources ?? []).slice(0, EVIDENCE_CAP).map((s) => ({
    // Deterministic per (trend, url): re-scanning the same source is a no-op.
    id: `ev-${trendId}-${urlHash(s.url)}`,
    trend_id: trendId,
    run_id: null, // captured by a deep scan, outside any pulse run
    source_url: s.url,
    platform: s.outlet || hostOf(s.url),
    author_handle: null,
    captured_at: now,
    excerpt: s.title ?? null,
    engagement_metrics: null,
  }));
}

function urlHash(url: string): string {
  let h = 5381;
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) + h + url.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toTrend(d: DeepScanTrendResult): Trend {
  const slug = (d.slug || slugify(d.trend_name)).toLowerCase();
  const now = new Date().toISOString();
  return {
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
    sources: d.sources,
    origin: "scan",
    created_at: now,
    updated_at: now,
  };
}

/**
 * Full deep-scan pipeline. Emits the same NDJSON event vocabulary the scan UI
 * already speaks (status / narrow / hit / notes / done).
 */
export async function runDeepScan(profile: ScanProfile, emit: ScanEmit) {
  emit({
    type: "status",
    phase: "connect",
    message: "Booting deep scan — live web research, not a canned library…",
    progress: 3,
    scanned: 0,
  });

  const measuredDigest = await buildMeasuredDigest();
  if (measuredDigest) {
    emit({
      type: "status",
      phase: "connect",
      message: "Loaded measured intelligence — library state + accelerating terms…",
      progress: 5,
      scanned: 0,
    });
  }

  const { trends, fieldNotes, progress } = await runResearch(
    profile,
    measuredDigest,
    emit
  );

  emit({
    type: "status",
    phase: "analyze",
    message: `Appraisal complete — ${progress.searches} searches, ${progress.signals} live signals read.`,
    progress: 72,
    scanned: progress.signals,
  });

  // Results are already known — surface them now. Persistence and market
  // analysis run afterwards/concurrently so the user never waits on
  // bookkeeping for hits that are already scored.
  const ranked = trends
    .map((d) => ({ d, trend: toTrend(d) }))
    .sort((a, b) => b.d.fit_score - a.d.fit_score);
  const youtubeHistorySlugs = new Set(
    ranked.slice(0, 4).map(({ trend }) => trend.slug)
  );

  emit({
    type: "narrow",
    message: `${ranked.length} trend${ranked.length === 1 ? "" : "s"} earned a spot for your brief — sourced and scored.`,
    exploratory: false,
    total: ranked.length,
    scanned: progress.signals,
  });

  ranked.forEach(({ d, trend }, i) => {
    emit({
      type: "hit",
      index: i,
      trend,
      fit: d.fit_score,
      reasons: d.fit_reasons,
      progress: 74 + Math.round(((i + 1) / ranked.length) * 12),
    });
  });

  emit({ type: "notes", fieldNotes });

  // The user's requested work is complete once sourced, ranked trends and
  // field notes are available. Do not hold the results screen hostage to
  // optional database enrichment, corpus backfills, or market APIs.
  emit({
    type: "done",
    total: ranked.length,
    scanned: progress.signals,
    exploratory: false,
  });

  // Fold discoveries into the library so the dashboard/pulse field sees them.
  // Output-boundary hook: each trend's cited sources are retained as
  // append-only trend_evidence, so every score stays traceable to the items
  // that produced it ("says who"). Capped at EVIDENCE_CAP per trend per scan.
  // Scan discoveries arrive with measured history + a real hero image —
  // reddit-only backfill (cheap); failures never sink the scan.
  try {
    const { runTrendBackfill } = await import("@/lib/pipeline/backfill");
    const { harvestOgImage } = await import("@/lib/og-image");
    const persistOne = async ({ d, trend }: (typeof ranked)[number]) => {
    // Real imagery from the pages Claude actually cited — never stock. The
    // corpus backfill below may upgrade it to actual post media later.
    if (!trend.hero_image_url && d.sources?.length) {
      try {
        trend.hero_image_url = await harvestOgImage(
          d.sources.map((s) => s.url)
        );
      } catch {
        // no image is honest; the waveform card takes over
      }
    }
    // Ground creator adoption in real TikTok numbers at birth: distinct
    // creators on the trend's hashtag replaces the model's guess as a
    // WaveScore input, so freshly scanned trends stop sharing one default.
    try {
      for (const tag of hashtagCandidates(trend.name, [])) {
        const stats = await fetchHashtagStats(tag);
        if (stats && stats.users > 0) {
          Object.assign(
            trend,
            rescoreTrend(trend, { uniqueAuthors: stats.users })
          );
          break;
        }
      }
    } catch {
      // mirror down — model scores stand until the next measured sync
    }
    // The upsert may resolve this trend to an existing near-duplicate row
    // (different id/slug) — evidence and backfill must target the row that
    // actually survived, not the identity the model minted.
    let saved: Trend;
    try {
      saved = (await upsertTrendBySlug(trend)).trend;
    } catch (err) {
      console.error("[deep-scan] trend upsert failed:", err);
      return; // evidence + backfill need the trend row
    }
    try {
      await recordEvidence(evidenceFromSources(saved.id, d));
    } catch (err) {
      console.error("[deep-scan] evidence capture failed:", err);
    }
    try {
      await runTrendBackfill(saved.slug, {
        // YouTube search is quota-expensive (~400 units per 12-month history),
        // so automatically deepen only the strongest four scan results.
        includeYouTube: youtubeHistorySlugs.has(trend.slug),
        trend: saved,
      });
    } catch (err) {
      console.error("[deep-scan] auto-backfill failed:", err);
    }
    };
    // Small worker pool: parallel enough to cut minutes off the tail, small
    // enough to stay inside Reddit's app-only rate limits.
    const queue = [...ranked];
    await Promise.all(
      Array.from({ length: Math.min(3, queue.length) }, async () => {
        for (let job = queue.shift(); job; job = queue.shift()) {
          await persistOne(job);
        }
      })
    );
  } catch (err) {
    // Results were already delivered. Enrichment is best-effort and must
    // never turn a successful scan into an error or trigger a fallback scan.
    console.error("[deep-scan] post-result enrichment failed:", err);
  }
}
