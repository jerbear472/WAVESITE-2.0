import type { Profile, Signal, Trend } from "@/types";
import { computeWaveScore } from "@/lib/wavescore";
import {
  analyzeSignalSchema,
  clusterTrendSchema,
  creativeBriefSchema,
  scoreTrendSchema,
  type AnalyzeSignalResult,
  type ClusterTrendResult,
  type CreativeBriefResult,
  type ScoreTrendResult,
} from "@/lib/ai/schemas";
import {
  AINotConfiguredError,
  generateStructured,
  isAIConfigured,
} from "@/lib/ai/provider";

// Each function calls Claude when configured and validates with Zod; on any
// failure (no key, parse error, API error) it falls back to a deterministic
// mock so the product is always demonstrable.

export interface SignalAnalysisInput {
  text: string;
  title?: string | null;
  url?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function analyzeSignal(
  input: SignalAnalysisInput
): Promise<AnalyzeSignalResult & { _mock: boolean }> {
  const system =
    "You are WaveSight's cultural-signal analyst. You extract structured intelligence from a single social/media signal (a post, video, article, or caption). Identify the cultural phrases, named entities, and emotional reactions; judge consumer sentiment; and explain why this might matter as an emerging trend.";
  const prompt = buildAnalyzePrompt(input);

  if (isAIConfigured()) {
    try {
      const result = await generateStructured({
        system,
        prompt,
        schema: analyzeSignalSchema,
      });
      return { ...result, _mock: false };
    } catch (err) {
      if (!(err instanceof AINotConfiguredError)) {
        console.error("analyzeSignal AI error, falling back to mock:", err);
      }
    }
  }
  return { ...mockAnalyzeSignal(input), _mock: true };
}

export async function clusterSignalsIntoTrend(
  signals: Signal[]
): Promise<ClusterTrendResult & { _mock: boolean }> {
  const system =
    "You are WaveSight's trend-clustering engine. Given several related signals, synthesize them into a single named cultural trend with a summary, category, emotional tone, target audience, lifecycle stage, virality type, why it's spreading, who should join, and who should avoid it.";
  const prompt =
    "Cluster these signals into one trend:\n\n" +
    signals
      .map(
        (s, i) =>
          `Signal ${i + 1} [${s.source}] ${s.title ?? ""}\n${s.text ?? ""}\nphrases: ${s.detected_phrases.join(", ")}`
      )
      .join("\n\n");

  if (isAIConfigured()) {
    try {
      const result = await generateStructured({
        system,
        prompt,
        schema: clusterTrendSchema,
      });
      return { ...result, _mock: false };
    } catch (err) {
      if (!(err instanceof AINotConfiguredError)) {
        console.error("clusterSignalsIntoTrend AI error, mock fallback:", err);
      }
    }
  }
  return { ...mockClusterTrend(signals), _mock: true };
}

export async function scoreTrend(
  trend: Partial<Trend>,
  signals: Signal[] = []
): Promise<ScoreTrendResult & { _mock: boolean }> {
  const system =
    "You are WaveSight's trend-scoring engine. Score a trend on momentum, sentiment, brand safety, saturation, and commercial relevance (0-100 each), then derive participation difficulty and risk level. Compute the final WaveScore using WaveSight's weighting.";
  const prompt =
    `Score this trend:\nName: ${trend.name}\nSummary: ${trend.one_line_summary ?? trend.detailed_summary ?? ""}\nCategory: ${trend.category}\nAudience: ${trend.audience}\nLifecycle: ${trend.lifecycle_stage}\n` +
    `Signals: ${signals.length}`;

  if (isAIConfigured()) {
    try {
      const result = await generateStructured({
        system,
        prompt,
        schema: scoreTrendSchema,
      });
      return { ...result, _mock: false };
    } catch (err) {
      if (!(err instanceof AINotConfiguredError)) {
        console.error("scoreTrend AI error, mock fallback:", err);
      }
    }
  }
  return { ...mockScoreTrend(trend, signals), _mock: true };
}

export interface BriefRequest {
  trend: Trend;
  userType: Profile["user_type"];
  niche?: string;
  goal?: string;
  tone?: string;
}

export async function generateCreativeBrief(
  req: BriefRequest
): Promise<CreativeBriefResult & { _mock: boolean }> {
  const system = `You are WaveSight's trend execution coach. The user picked ONE specific trend; your job is to teach them exactly how to hop on THAT trend — a portal to going viral with it.

Hard rules:
- Everything must be anchored to this trend's real mechanics: its actual format, sound, joke structure, or visual grammar. Do NOT invent a different campaign concept, do NOT drift into generic content advice.
- trend_mechanics: explain what the trend actually IS as a repeatable format ("the video opens on X, then Y happens, the payoff is Z").
- steps: the how-to-hop-in checklist, from prep to posting, executable TOMORROW with a phone.
- storyboard: a shot-by-shot vertical-video plan following the trend's native structure. on_screen_text is the literal overlay text. Timestamps should sum to a platform-native runtime (usually 8-30s).
- Adapt the trend to the user's niche INSIDE the trend's format — the niche is the twist, the format is sacred.
- Be culturally fluent and specific; never generic.`;

  const t = req.trend;
  const prompt = `THE TREND (this is the assignment — teach them to join THIS):
Name: ${t.name}
Summary: ${t.one_line_summary}
Detail: ${t.detailed_summary}
Virality type: ${t.virality_type} · Lifecycle: ${t.lifecycle_stage} · Participation difficulty: ${t.participation_difficulty}
Why it's spreading: ${t.why_spreading}
Best platforms: ${t.best_platforms.join(", ")}
Known hooks in the wild: ${(t.sample_hooks ?? []).join(" | ") || "(none recorded)"}
Creative angles: ${(t.creative_angles ?? []).join(" | ") || "(none recorded)"}
${t.sources?.length ? `Real examples/sources:\n${t.sources.map((s) => `- ${s.title} (${s.url})`).join("\n")}` : ""}

THE USER (adapt the trend to them, inside its format):
They are a: ${req.userType}
Niche/brand/audience: ${req.niche ?? "(unspecified)"}
Goal: ${req.goal ?? "awareness"}
Tone: ${req.tone ?? "premium"}

Return a JSON object with EXACTLY this shape:
{
  "recommendation": string (2-3 sentences: the play, in their niche, inside this trend's format),
  "why_it_fits": string,
  "trend_mechanics": string (what the trend IS as a repeatable format),
  "creative_strategy": string,
  "steps": [{ "title": string (imperative, short), "detail": string (1-2 sentences) }] (4-6 steps, prep -> shoot -> post),
  "storyboard": [{ "timestamp": string like "0-2s", "shot": string (what the camera sees), "on_screen_text": string, "direction": string (camera/edit note) }] (3-6 frames),
  "sound": string (the exact sound/audio approach for this trend),
  "hashtags": [string, ...] (3-6, no # prefix),
  "hooks": [string, ...] (5),
  "post_formats": [string, ...] (3),
  "do_this": [string, ...] (3-4),
  "avoid_this": [string, ...] (3-4),
  "risk_notes": string,
  "best_platform": string,
  "suggested_caption": string
}`;

  if (isAIConfigured()) {
    try {
      const result = await generateStructured({
        system,
        prompt,
        schema: creativeBriefSchema,
        maxTokens: 4000,
      });
      return { ...result, _mock: false };
    } catch (err) {
      if (!(err instanceof AINotConfiguredError)) {
        console.error("generateCreativeBrief AI error, mock fallback:", err);
      }
    }
  }
  return { ...mockCreativeBrief(req), _mock: true };
}

// ---------------------------------------------------------------------------
// Deterministic mock generators — used when no API key is present. They produce
// believable, trend-aware output so the UI is fully functional offline.
// ---------------------------------------------------------------------------

function buildAnalyzePrompt(input: SignalAnalysisInput): string {
  return `Analyze this signal.\nSource: ${input.source ?? "unknown"}\nTitle: ${input.title ?? ""}\nURL: ${input.url ?? ""}\nText: ${input.text}`;
}

function mockAnalyzeSignal(input: SignalAnalysisInput): AnalyzeSignalResult {
  const text = `${input.title ?? ""} ${input.text}`.toLowerCase();
  const phrases = extractPhrases(input.text);
  const entities = extractCapitalized(`${input.title ?? ""} ${input.text}`);
  const positive = /love|calm|cozy|soft|beautiful|aesthetic|worth|enough|relief/.test(
    text
  );
  const ironic = /lol|cringe|mid|delulu|💀|ironic|joke/.test(text);
  const negative = /hate|backlash|scam|cheap|ugly|overrated|tired of/.test(text);

  const sentiment = negative
    ? "negative"
    : ironic
      ? "ironic"
      : positive
        ? "positive"
        : "mixed";
  const sentiment_score = negative ? 48 : ironic ? 62 : positive ? 84 : 70;

  return {
    detected_phrases: phrases,
    detected_entities: entities.slice(0, 6),
    detected_emotions: positive
      ? ["aspiration", "calm", "delight"]
      : negative
        ? ["skepticism", "frustration"]
        : ["curiosity", "interest"],
    possible_trend_names: phrases.slice(0, 2).map(titleCase),
    sentiment,
    sentiment_score,
    audience: guessAudience(text),
    category: guessCategory(text),
    risk_notes:
      negative || ironic
        ? "Tone is skeptical/ironic — brands should participate carefully and avoid looking like they're chasing clout."
        : "Low apparent risk. Tone is positive and broadly brand-safe.",
    why_this_might_matter:
      "This signal shows early audience resonance around a repeatable format/phrase, which is often a precursor to a spreading trend.",
  };
}

function mockClusterTrend(signals: Signal[]): ClusterTrendResult {
  const allPhrases = signals.flatMap((s) => s.detected_phrases);
  const fallbackTitle = signals.find((s) => s.title)?.title;
  const name = titleCase(
    allPhrases[0] ?? fallbackTitle ?? "Emerging Cultural Moment"
  );
  return {
    trend_name: name,
    summary: `A cluster of ${signals.length} signals pointing at "${name}" — an emerging behavior gaining early traction.`,
    detailed_summary: `Across ${signals.length} signals, audiences are converging on a shared format and language. Momentum is early but accelerating.`,
    category: guessCategory(signals.map((s) => s.text ?? "").join(" ")),
    emotional_tone: "aspirational, playful",
    audience: "Gen Z and younger millennials on short-form video",
    lifecycle_stage: "emerging",
    virality_type: "format",
    why_spreading:
      "It's easy to remix, emotionally resonant, and gives creators a clear template to participate.",
    who_should_join:
      "Creators and brands who can add a genuine, on-tone take without looking like they're chasing it.",
    who_should_avoid:
      "Brands with no authentic connection to the theme, or whose voice clashes with the tone.",
    best_platforms: ["TikTok", "Instagram", "YouTube"],
  };
}

function mockScoreTrend(
  trend: Partial<Trend>,
  signals: Signal[]
): ScoreTrendResult {
  const engagement = signals.reduce((acc, s) => {
    const e = s.platform_engagement_json ?? {};
    const v = Number(e["views"] ?? e["plays"] ?? e["upvotes"] ?? 0);
    return acc + v;
  }, 0);

  const momentum_score = clamp(
    trend.momentum_score ?? 60 + Math.min(35, Math.round(engagement / 200_000))
  );
  const sentiment_score = clamp(trend.sentiment_score ?? 76);
  const brand_safety_score = clamp(trend.brand_safety_score ?? 82);
  const saturation_score = clamp(trend.saturation_score ?? 40);
  const commercial_relevance_score = clamp(
    trend.commercial_relevance_score ?? 75
  );

  const wavescore = computeWaveScore({
    momentum_score,
    sentiment_score,
    commercial_relevance_score,
    saturation_score,
  });

  return {
    wavescore,
    momentum_score,
    sentiment_score,
    brand_safety_score,
    saturation_score,
    commercial_relevance_score,
    participation_difficulty:
      saturation_score > 60 ? "hard" : saturation_score > 40 ? "medium" : "easy",
    risk_level:
      brand_safety_score < 70 ? "high" : brand_safety_score < 85 ? "medium" : "low",
  };
}

function mockCreativeBrief(req: BriefRequest): CreativeBriefResult {
  const { trend, userType, niche, tone = "premium" } = req;
  const who = niche ? `${niche} (${userType})` : userType;
  return {
    recommendation: `${trend.name} is a strong fit for ${who}. Lead with ${tone} execution and let the trend's native format carry the message.`,
    why_it_fits: `${trend.name} rewards ${tone} taste over budget, and its audience (${trend.audience}) overlaps with yours. ${trend.why_spreading}`,
    trend_mechanics: `${trend.name} is a ${trend.virality_type} format: ${trend.one_line_summary} The repeatable structure is what carries it — participants keep the format intact and swap in their own subject.`,
    steps: [
      {
        title: "Study 5 native examples",
        detail: `Scroll ${trend.best_platforms[0] ?? "TikTok"} for ${trend.name} posts and note the shared structure: opening beat, pacing, and payoff.`,
      },
      {
        title: "Pick your niche twist",
        detail: `Choose the one angle only ${who} can own — the format stays, your subject swaps in.`,
      },
      {
        title: "Shoot it native",
        detail: "Phone, vertical, natural light. Match the trend's pacing beat-for-beat before adding polish.",
      },
      {
        title: "Post at peak hours",
        detail: `Publish on ${trend.best_platforms[0] ?? "TikTok"} in the evening for your audience's timezone, with the trend's tags.`,
      },
    ],
    storyboard: [
      {
        timestamp: "0-2s",
        shot: "Tight opening on the subject, mid-action — no intro.",
        on_screen_text: (trend.sample_hooks && trend.sample_hooks[0]) ?? `POV: ${trend.name}`,
        direction: "Hard cut in, text overlay on from frame one.",
      },
      {
        timestamp: "2-8s",
        shot: "The format's core beat, played straight in your niche.",
        on_screen_text: "",
        direction: "Match the trend's native pacing; no explaining.",
      },
      {
        timestamp: "8-15s",
        shot: "The payoff/reveal the format promises.",
        on_screen_text: "Wait for it…",
        direction: "Hold one beat longer than feels natural, then cut to black.",
      },
    ],
    sound: `Use the sound currently attached to top ${trend.name} posts — sounds carry distribution on ${trend.best_platforms[0] ?? "TikTok"}.`,
    hashtags: [trend.slug.replace(/-/g, ""), "fyp", "trending"],
    creative_strategy: `Adopt the trend's format authentically, then add one distinctive angle only you can own. Don't explain the trend — participate in it. Keep production ${tone} and let restraint do the talking.`,
    hooks:
      trend.sample_hooks && trend.sample_hooks.length >= 3
        ? trend.sample_hooks.slice(0, 5)
        : [
            `The ${trend.name.toLowerCase()} take nobody's done yet.`,
            `POV: you found the ${trend.name.toLowerCase()} version for ${niche ?? "your people"}.`,
            `Here's how ${niche ?? "we"} do ${trend.name.toLowerCase()}.`,
            `Three rules for ${trend.name.toLowerCase()} that actually land.`,
            `Stop scrolling — this is ${trend.name.toLowerCase()}, done right.`,
          ],
    post_formats: [
      "Short-form video (15-30s) using the trend's native sound/format",
      "Carousel breaking the idea into 3-5 frames",
      "Behind-the-scenes or before/after showing the transformation",
    ],
    do_this: [
      "Match the trend's tone exactly before adding your spin",
      "Use the native format and pacing of the platform",
      `Keep it ${tone}; show, don't tell`,
    ],
    avoid_this: [
      "Over-explaining or hard-selling inside the trend",
      "Joining late with a generic, off-tone version",
      trend.who_should_avoid,
    ],
    risk_notes: `Risk level: ${trend.risk_level}. ${trend.who_should_avoid}`,
    best_platform: trend.best_platforms[0] ?? "TikTok",
    suggested_caption: `${(trend.sample_hooks && trend.sample_hooks[0]) ?? trend.name} ✨ #${trend.slug.replace(/-/g, "")}`,
  };
}

// --- small text heuristics ---

function extractPhrases(text: string): string[] {
  const quoted = Array.from(text.matchAll(/"([^"]{6,60})"/g)).map((m) => m[1]);
  if (quoted.length) return quoted.slice(0, 4);
  const sentences = text
    .split(/[.?!\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8 && s.length < 60);
  return sentences.slice(0, 3);
}

function extractCapitalized(text: string): string[] {
  const matches = Array.from(text.matchAll(/\b([A-Z][a-zA-Z0-9]{2,})\b/g)).map(
    (m) => m[1]
  );
  return Array.from(new Set(matches));
}

function guessCategory(text: string): string {
  if (/desk|workspace|office|productivity|system/.test(text))
    return "Productivity / Work";
  if (/skin|wellness|reset|self-care|routine/.test(text))
    return "Wellness / Lifestyle";
  if (/fashion|outfit|haul|luxury|style/.test(text))
    return "Fashion / Consumer Behavior";
  if (/song|music|sound|track/.test(text)) return "Music / Culture";
  return "Culture / Lifestyle";
}

function guessAudience(text: string): string {
  if (/wellness|skin|reset/.test(text)) return "women 22-35, wellness audiences";
  if (/desk|work|productivity/.test(text))
    return "young professionals, WFH creators";
  return "Gen Z and younger millennials";
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .slice(0, 60);
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}
