import type { Trend, UserType } from "@/types";

// The intake form captures this. It's the "lens" that narrows the firehose down
// to the few trends worth a given user's time — so we never show them the whole
// internet, only what fits their brief.
export interface ScanProfile {
  userType: UserType;
  niche: string;
  goal: string;
  platforms: string[];
  audience?: string;
  appetite: "safe" | "balanced" | "bold";
  focus?: string;
}

export interface FitResult {
  fit: number;
  reasons: string[];
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "your", "that", "this", "from", "into", "are",
  "our", "you", "who", "want", "looking", "trend", "trends", "brand", "content",
]);

function tokenize(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
    )
  );
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * Score how well a trend fits a user's scan brief (0-100) and explain why.
 * Pure + dependency-free so it runs in the scan API and on the client.
 */
export function scoreFit(trend: Trend, profile: ScanProfile): FitResult {
  let score = 0;
  const reasons: string[] = [];

  // Platform overlap (0-30)
  if (profile.platforms.length) {
    const overlap = trend.best_platforms.filter((p) =>
      profile.platforms.some(
        (pp) =>
          p.toLowerCase().includes(pp.toLowerCase()) ||
          pp.toLowerCase().includes(p.toLowerCase())
      )
    );
    if (overlap.length) {
      score += Math.min(30, overlap.length * 16);
      reasons.push(`Lives on ${overlap.slice(0, 2).join(" & ")}`);
    }
  } else {
    score += 12;
  }

  // Niche / focus keyword match against the trend's text (0-30)
  const hay = `${trend.name} ${trend.category} ${trend.one_line_summary} ${trend.audience} ${trend.who_should_join} ${trend.detailed_summary} ${trend.emotional_tone}`.toLowerCase();
  const terms = tokenize(`${profile.niche} ${profile.focus ?? ""}`);
  const matched = terms.filter((t) => hay.includes(t));
  if (matched.length) {
    score += Math.min(30, matched.length * 11);
    reasons.push(`Matches your focus: ${matched.slice(0, 2).join(", ")}`);
  }

  // Audience overlap (0-15)
  if (profile.audience) {
    const aMatched = tokenize(profile.audience).filter((t) =>
      trend.audience.toLowerCase().includes(t)
    );
    if (aMatched.length) {
      score += 15;
      reasons.push("Reaches your audience");
    }
  }

  // Goal alignment (0-12)
  switch (profile.goal) {
    case "sales":
    case "awareness":
    case "campaign_idea":
      if (trend.commercial_relevance_score >= 78) {
        score += 12;
        reasons.push("High commercial relevance");
      }
      break;
    case "engagement":
    case "community_growth":
      if (trend.sentiment_score >= 80) {
        score += 12;
        reasons.push("Loved by audiences");
      }
      break;
    case "music_promotion":
      if (
        trend.category.toLowerCase().includes("music") ||
        trend.virality_type === "sound"
      ) {
        score += 14;
        reasons.push("A sound/music play");
      }
      break;
  }

  // Risk appetite (−10 to +15)
  if (profile.appetite === "safe") {
    if (trend.risk_level === "low" && trend.brand_safety_score >= 85) {
      score += 15;
      reasons.push("Low-risk & brand-safe");
    } else if (trend.risk_level === "high") {
      score -= 10;
    }
  } else if (profile.appetite === "bold") {
    if (trend.saturation_score <= 42 && trend.momentum_score >= 80) {
      score += 15;
      reasons.push("Early & fast-moving");
    } else {
      score += 4;
    }
  } else {
    score += 8;
  }

  // User-type nudges
  if (
    profile.userType === "artist" &&
    (trend.category.toLowerCase().includes("music") ||
      trend.virality_type === "sound" ||
      trend.virality_type === "format")
  ) {
    score += 8;
    reasons.push("Good for a sync moment");
  }
  if (
    (profile.userType === "brand" || profile.userType === "agency") &&
    trend.brand_safety_score >= 85
  ) {
    score += 6;
  }

  // A little base weight so genuinely strong trends still surface (0-15)
  score += Math.round(trend.wavescore * 0.15);

  if (!reasons.length) reasons.push("Solid all-round momentum");

  return { fit: clamp(score), reasons: reasons.slice(0, 3) };
}

export interface RankedHit {
  trend: Trend;
  fit: number;
  reasons: string[];
}

/**
 * Rank + narrow trends for a profile. Returns only the high-fit set (so we show
 * a focused board, never the whole library). Falls back to the top few as
 * "exploratory" matches if nothing clears the bar.
 */
export function rankAndNarrow(
  trends: Trend[],
  profile: ScanProfile,
  { threshold = 52, cap = 6 }: { threshold?: number; cap?: number } = {}
): { hits: RankedHit[]; exploratory: boolean } {
  const ranked = trends
    .map((trend) => ({ trend, ...scoreFit(trend, profile) }))
    .sort((a, b) => b.fit - a.fit);

  const strong = ranked.filter((r) => r.fit >= threshold).slice(0, cap);
  if (strong.length >= 2) return { hits: strong, exploratory: false };

  return { hits: ranked.slice(0, Math.min(3, ranked.length)), exploratory: true };
}
