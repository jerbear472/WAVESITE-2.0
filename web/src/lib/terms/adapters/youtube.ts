import type { AdapterFetchResult, SourceAdapter, TermRow } from "@/lib/terms/types";

// youtube — official Data API v3. HARD CONSTRAINT: 10,000 quota units/day,
// and one search.list call costs 100 units. Searches are budgeted
// deliberately: this adapter declares its unit costs, the scheduler tracks
// spend in quota_ledger and hard-stops before the cap.
//
// We deliberately do NOT hydrate with videos.list here: for counting
// mentions we only need the search response, which already carries titles
// (used transiently for frontier context). Batched videos.list (50 ids at 1
// unit) is the right tool when engagement detail is needed — the measured
// pipeline already does that; duplicating it would double quota burn.

const API = "https://www.googleapis.com/youtube/v3/search";

/** Units this adapter may spend per UTC day. Deliberately half the platform
 *  cap so the existing measured pipeline keeps room to run the same day. */
export const YOUTUBE_DAILY_UNIT_BUDGET = Number(
  process.env.TERMS_YOUTUBE_UNIT_BUDGET || 5000
);
export const SEARCH_UNIT_COST = 100;

/* eslint-disable @typescript-eslint/no-explicit-any */
export const youtubeAdapter: SourceAdapter = {
  source: "youtube",
  displayName: "YouTube",
  enabled: () =>
    process.env.YOUTUBE_ENABLED !== "false" && Boolean(process.env.YOUTUBE_API_KEY),
  disabledReason: () => {
    if (process.env.YOUTUBE_ENABLED === "false") return "YOUTUBE_ENABLED=false";
    if (!process.env.YOUTUBE_API_KEY) return "YOUTUBE_API_KEY not set";
    return null;
  },
  rateLimit: {
    minIntervalMs: 200,
    dailyUnits: YOUTUBE_DAILY_UNIT_BUDGET,
    unitsPerQuery: SEARCH_UNIT_COST,
  },

  async countForDate(term: TermRow, date: string): Promise<AdapterFetchResult> {
    const after = `${date}T00:00:00Z`;
    const before = new Date(Date.parse(after) + 86_400_000).toISOString();
    const params = new URLSearchParams({
      key: process.env.YOUTUBE_API_KEY!,
      part: "snippet",
      q: term.canonical,
      type: "video",
      order: "date",
      maxResults: "50",
      publishedAfter: after,
      publishedBefore: before,
    });
    const res = await fetch(`${API}?${params}`);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`youtube search failed: ${res.status} ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as any;
    const items = data.items ?? [];
    // totalResults is YouTube's own estimate and known to be loose; when the
    // page isn't full, the item count is the better number. Either way the
    // term is only ever compared to its own history, so consistent bias
    // cancels out of the z-score.
    const total = Number(data.pageInfo?.totalResults ?? items.length);
    const exact = items.length < 50;
    const first = items[0];
    return {
      raw_count: exact ? items.length : Math.min(total, 100_000),
      approximate: !exact,
      meta: first?.id?.videoId
        ? { link: `https://www.youtube.com/watch?v=${first.id.videoId}` }
        : null,
      // Titles only, transient, for frontier extraction — never persisted.
      context_texts: items
        .map((i: any) => i?.snippet?.title)
        .filter((t: unknown): t is string => typeof t === "string")
        .slice(0, 25),
      units: SEARCH_UNIT_COST,
    };
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */
