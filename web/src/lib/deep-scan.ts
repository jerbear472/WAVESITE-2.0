import type Anthropic from "@anthropic-ai/sdk";
import type { MarketSignal, Trend } from "@/types";
import type { ScanProfile } from "@/lib/fit";
import {
  MODEL,
  extractJson,
  generateStructured,
  getClient,
} from "@/lib/ai/provider";
import {
  deepScanSchema,
  marketAnalysisSchema,
  type DeepScanTrendResult,
} from "@/lib/ai/schemas";
import { fetchAllMarkets, filterRelevantMarkets } from "@/lib/markets";
import { computeWaveScore } from "@/lib/wavescore";
import { getTrends, recordEvidence, upsertTrendBySlug } from "@/lib/data";
import type { TrendEvidence } from "@/types";

// ---------------------------------------------------------------------------
// Deep scan — a real appraisal of the live internet, not a library lookup.
// Claude runs multi-angle web searches (server-side web_search/web_fetch),
// returns only the trends that genuinely earn a spot (variable count), each
// grounded in real source links, then a second pass matches live Kalshi and
// Polymarket markets against the field and reads sentiment vs. odds.
// ---------------------------------------------------------------------------

export type ScanEmit = (event: Record<string, unknown>) => void;

const DEEP_SCAN_SYSTEM = `You are the deep-scan engine of WaveSight, a cultural-intelligence terminal used by marketers and creators. You research the LIVE internet with web search before saying anything.

Rules of the appraisal:
- Search widely before concluding: platform-native angles (TikTok/Reddit/X/Instagram chatter), press and trade coverage, and trend trackers. Vary your queries; do not stop at the first page of one search.
- Be balanced and honest. Surface headwinds, backlash, and saturation — not just hype. If a trend is fading, say so and score it accordingly.
- Return ONLY trends that genuinely earn a spot for THIS brief. That may be 3, it may be 10. Never pad to a fixed number.
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
Search the web from multiple angles (the niche itself, each priority platform, adjacent culture/fashion/press coverage, and at least one contrarian "is X over?" style query). Chase what the searches surface, not just what you already know — the point of a NEW scan is what changed since the last one. Then deliver your appraisal.

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
      max_tokens: 32000,
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

const MARKET_SYSTEM = `You are the prediction-market analyst of WaveSight. You compare public sentiment across the internet (from a just-completed deep trend scan) against live market-implied odds on Kalshi and Polymarket, to surface where sentiment and money disagree.

Rules:
- Only include markets with a genuine connection to the scanned cultural field or the user's niche. It is fine to return zero signals if nothing relates.
- implied_probability is the market's number (given to you). sentiment_probability is YOUR honest read of what public sentiment implies for the same question, grounded in the scan evidence.
- edge: "sentiment_ahead" when sentiment suggests the market underprices YES, "market_ahead" when the market is pricing in something sentiment hasn't caught up to, "aligned" when they agree within ~5 points.
- rationale must cite the sentiment evidence in one or two sentences. This informs bets — be honest, never promotional.`;

async function analyzeMarkets(
  profile: ScanProfile,
  trends: DeepScanTrendResult[],
  fieldNotes: string,
  emit: ScanEmit
): Promise<{ signals: MarketSignal[]; notes: string; venues: string[] }> {
  emit({
    type: "status",
    phase: "markets",
    message: "Pulling live markets from Kalshi & Polymarket…",
    progress: 88,
  });

  const { markets, venuesReached } = await fetchAllMarkets();
  if (!markets.length) {
    return {
      signals: [],
      notes: "Prediction market venues were unreachable — no odds to compare.",
      venues: venuesReached,
    };
  }

  const keywords = [
    profile.niche,
    profile.focus ?? "",
    ...trends.map((t) => `${t.trend_name} ${t.category}`),
  ];
  const relevant = filterRelevantMarkets(markets, keywords);

  emit({
    type: "status",
    phase: "markets",
    message: `Comparing sentiment vs odds across ${relevant.length} live markets…`,
    progress: 93,
  });

  const marketList = relevant
    .map(
      (m) =>
        `- [${m.venue}] "${m.title}" | yes=${m.impliedProbability}% | 24h vol≈$${Math.round(m.volume24h).toLocaleString()} | ${m.url}`
    )
    .join("\n");
  const trendList = trends
    .map(
      (t) =>
        `- ${t.trend_name} (slug: ${t.slug}, ${t.lifecycle_stage}, momentum ${t.momentum_score}, sentiment ${t.sentiment_score}): ${t.summary}`
    )
    .join("\n");

  const result = await generateStructured({
    system: MARKET_SYSTEM,
    prompt: `User niche: ${profile.niche}. Field notes from the scan: ${fieldNotes}

Scanned trends (public sentiment evidence):
${trendList}

Live markets (use the exact url and implied probability given):
${marketList}

Return JSON: { "signals": [{ "trend_slug": string|null (a slug from above or null), "venue": "kalshi"|"polymarket", "market_title": string, "url": string (exact url from the list), "implied_probability": int 0-100 (exact number from the list), "sentiment_probability": int 0-100, "edge": "sentiment_ahead"|"market_ahead"|"aligned", "rationale": string }], "market_notes": string (1-2 sentences on the overall sentiment-vs-money picture) }
Include at most 8 signals, ranked by how interesting the divergence is.`,
    schema: marketAnalysisSchema,
    maxTokens: 4000,
  });

  return {
    signals: result.signals,
    notes: result.market_notes,
    venues: venuesReached,
  };
}

/**
 * Full deep-scan pipeline. Emits the same NDJSON event vocabulary the scan UI
 * already speaks (status / narrow / hit / done) plus `markets` and `notes`.
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

  // Prediction market pass — runs concurrently with library persistence.
  // Failure here never sinks the scan results.
  const marketsPromise: Promise<{
    signals: MarketSignal[];
    notes: string;
    venues: string[];
  }> = analyzeMarkets(profile, trends, fieldNotes, emit).catch((err) => {
    console.error("[deep-scan] market analysis failed:", err);
    return {
      signals: [],
      notes: "Market analysis failed this run — trend results are unaffected.",
      venues: [],
    };
  });

  // Fold discoveries into the library so the dashboard/pulse field sees them.
  // Output-boundary hook: each trend's cited sources are retained as
  // append-only trend_evidence, so every score stays traceable to the items
  // that produced it ("says who"). Capped at EVIDENCE_CAP per trend per scan.
  // Scan discoveries arrive with measured history + a real hero image —
  // reddit-only backfill (cheap); failures never sink the scan.
  const { runTrendBackfill } = await import("@/lib/pipeline/backfill");
  const persistOne = async ({ d, trend }: (typeof ranked)[number]) => {
    try {
      await upsertTrendBySlug(trend);
    } catch (err) {
      console.error("[deep-scan] trend upsert failed:", err);
      return; // evidence + backfill need the trend row
    }
    try {
      await recordEvidence(evidenceFromSources(trend.id, d));
    } catch (err) {
      console.error("[deep-scan] evidence capture failed:", err);
    }
    try {
      await runTrendBackfill(trend.slug, { includeYouTube: false, trend });
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

  emit({ type: "markets", ...(await marketsPromise) });

  emit({
    type: "done",
    total: ranked.length,
    scanned: progress.signals,
    exploratory: false,
  });
}
