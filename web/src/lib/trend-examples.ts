import type { Trend, TrendEvidence } from "@/types";
import { getEvidenceForTrend } from "@/lib/data";

// ---------------------------------------------------------------------------
// Real examples behind a trend — the "prove it" layer.
// Two pools, both actual posts with links:
//   live     — TikTok videos fetched right now for this trend's phrase
//              (tikwm mirror, same unofficial-but-priced-in contract as the
//              terms adapter; a failure just means no live pool today).
//   receipts — stored trend_evidence rows captured by scans/pipeline runs.
// AI-suggested hooks are NOT examples and never appear here.
// ---------------------------------------------------------------------------

export interface TrendExample {
  url: string;
  title: string;
  platform: string;
  author: string | null;
  /** Preformatted human number, e.g. "1.2M plays" — real, not estimated. */
  engagement: string | null;
  /** YYYY-MM-DD when known. */
  postedAt: string | null;
  live: boolean;
}

const SEARCH_API = "https://www.tikwm.com/api/feed/search";

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Editorial qualifiers in parentheses hurt search recall — strip them. */
function searchPhrase(name: string): string {
  return name.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function liveTikTokExamples(name: string, max = 6): Promise<TrendExample[]> {
  try {
    const params = new URLSearchParams({
      keywords: searchPhrase(name),
      count: "12",
    });
    const res = await fetch(`${SEARCH_API}?${params}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as any;
    const videos: any[] = body?.data?.videos ?? [];
    return videos
      .filter((v) => v?.video_id && v?.author?.unique_id)
      .sort((a, b) => Number(b.play_count ?? 0) - Number(a.play_count ?? 0))
      .slice(0, max)
      .map((v) => ({
        url: `https://www.tiktok.com/@${v.author.unique_id}/video/${v.video_id}`,
        title: String(v.title ?? "").trim() || "(untitled post)",
        platform: "TikTok",
        author: `@${v.author.unique_id}`,
        engagement:
          Number(v.play_count) > 0
            ? `${compact.format(Number(v.play_count))} plays`
            : null,
        postedAt:
          Number(v.create_time) > 0
            ? new Date(Number(v.create_time) * 1000).toISOString().slice(0, 10)
            : null,
        live: true,
      }));
  } catch {
    return []; // priced-in failure — receipts still render
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function formatEvidenceEngagement(
  metrics: Record<string, unknown> | null
): string | null {
  if (!metrics) return null;
  const views = Number(metrics["views"] ?? 0);
  if (views > 0) return `${compact.format(views)} views`;
  const score = Number(metrics["score"] ?? 0);
  if (score > 0) return `${compact.format(score)} upvotes`;
  const likes = Number(metrics["likes"] ?? 0);
  if (likes > 0) return `${compact.format(likes)} likes`;
  return null;
}

function receiptExample(e: TrendEvidence): TrendExample {
  return {
    url: e.source_url,
    title: (e.excerpt ?? "").trim() || e.source_url.replace(/^https?:\/\//, ""),
    platform: e.platform || "web",
    author: e.author_handle,
    engagement: formatEvidenceEngagement(e.engagement_metrics),
    postedAt: e.captured_at ? e.captured_at.slice(0, 10) : null,
    live: false,
  };
}

export async function getTrendExamples(
  trend: Pick<Trend, "id" | "name">
): Promise<{ live: TrendExample[]; receipts: TrendExample[] }> {
  const [live, evidence] = await Promise.all([
    liveTikTokExamples(trend.name),
    getEvidenceForTrend(trend.id, 30).catch(() => [] as TrendEvidence[]),
  ]);
  const liveUrls = new Set(live.map((x) => x.url));
  const receipts = evidence
    .filter((e) => e.source_url && !liveUrls.has(e.source_url))
    .slice(0, 6)
    .map(receiptExample);
  return { live, receipts };
}
