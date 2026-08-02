import type { AdapterFetchResult, SourceAdapter, TermRow } from "@/lib/terms/types";

// reddit — official API, app-only OAuth, 100 queries/minute free tier.
//
// IMPORTANT — LICENSING: Reddit's free API tier is NON-COMMERCIAL ONLY.
// This adapter must be disabled (REDDIT_ENABLED=false) or moved to a paid
// data agreement BEFORE the product charges money. The system is designed so
// removing Reddit degrades it (one fewer early source; breadth computed over
// the rest) rather than breaking it.
//
// Token handling mirrors the measured pipeline's connector; kept separate so
// this layer's throttling and counting semantics stay self-contained.

const UA = "web:wavesight:v0.1 (by /u/JackalopeCanyon)";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }
  const auth = Buffer.from(
    `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Reddit token failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const redditAdapter: SourceAdapter = {
  source: "reddit",
  displayName: "Reddit",
  enabled: () =>
    process.env.REDDIT_ENABLED !== "false" &&
    Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET),
  disabledReason: () => {
    if (process.env.REDDIT_ENABLED === "false") return "REDDIT_ENABLED=false";
    if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
      return "REDDIT_CLIENT_ID/SECRET not set";
    }
    return null;
  },
  // Free tier allows 100 QPM; 650ms keeps a full pass near 90 QPM with
  // headroom for the token refresh.
  rateLimit: { minIntervalMs: 650 },

  async countForDate(term: TermRow, date: string): Promise<AdapterFetchResult> {
    const token = await getToken();
    const q = encodeURIComponent(`"${term.canonical}"`);
    // t=week then filter to the exact UTC day: sort=new pages backward from
    // now, so a single 100-post page covers the day unless the term is hot —
    // in which case the count is a bounded approximation.
    const res = await fetch(
      `https://oauth.reddit.com/search?q=${q}&sort=new&t=week&limit=100`,
      { headers: { Authorization: `Bearer ${token}`, "User-Agent": UA } }
    );
    if (!res.ok) throw new Error(`reddit search failed: ${res.status}`);
    const data = (await res.json()) as any;
    const posts = (data?.data?.children ?? []).map((c: any) => c.data);

    const dayStart = Date.parse(`${date}T00:00:00Z`) / 1000;
    const dayEnd = dayStart + 86_400;
    const inDay = posts.filter(
      (p: any) => p?.created_utc >= dayStart && p.created_utc < dayEnd
    );
    // If the page is full AND its oldest post is newer than the day start,
    // posts from that day scrolled off the page — count is a floor.
    const oldest = posts.length
      ? Math.min(...posts.map((p: any) => p.created_utc ?? Infinity))
      : 0;
    const approximate = posts.length >= 100 && oldest > dayStart;

    const first = inDay[0];
    return {
      raw_count: inDay.length,
      approximate,
      meta: first?.permalink
        ? { link: `https://www.reddit.com${first.permalink}` }
        : null,
      // Titles only, transient, for frontier extraction — never persisted.
      context_texts: inDay
        .map((p: any) => p?.title)
        .filter((t: unknown): t is string => typeof t === "string")
        .slice(0, 25),
    };
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */
