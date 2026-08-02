import type { AdapterFetchResult, SourceAdapter, TermRow } from "@/lib/terms/types";

// bluesky — AT Protocol public AppView search. Open, free, no commercial
// gate, no key. The earliest language signal in the cascade: phrases show up
// here before search interest or video volume exists.
// Docs: app.bsky.feed.searchPosts on the public AppView.

const API = "https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts";

/** We count by paging search results within the UTC day. Three pages of 100
 *  bounds the work per term; hitting the cap returns an approximate count,
 *  which the z-score against the term's own history absorbs. */
const MAX_PAGES = 3;
const PAGE_LIMIT = 100;

/* eslint-disable @typescript-eslint/no-explicit-any */
export const blueskyAdapter: SourceAdapter = {
  source: "bluesky",
  displayName: "Bluesky",
  enabled: () => process.env.BLUESKY_ENABLED !== "false",
  disabledReason: () =>
    process.env.BLUESKY_ENABLED === "false" ? "BLUESKY_ENABLED=false" : null,
  // Public AppView is unauthenticated; 3000/5min per IP documented. 350ms
  // keeps a full registry pass around 3 req/s.
  rateLimit: { minIntervalMs: 350 },

  async countForDate(term: TermRow, date: string): Promise<AdapterFetchResult> {
    const since = `${date}T00:00:00Z`;
    const until = new Date(Date.parse(since) + 86_400_000).toISOString();
    let cursor: string | undefined;
    let count = 0;
    let firstLink: string | undefined;
    const contexts: string[] = [];

    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({
        q: term.canonical,
        since,
        until,
        limit: String(PAGE_LIMIT),
        sort: "latest",
      });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`${API}?${params}`);
      if (!res.ok) throw new Error(`bluesky search failed: ${res.status}`);
      const data = (await res.json()) as { posts?: any[]; cursor?: string };
      const posts = data.posts ?? [];
      count += posts.length;

      for (const p of posts.slice(0, 10)) {
        const text = p?.record?.text;
        if (typeof text === "string" && text.length > 10) {
          // Transient frontier context — never persisted.
          contexts.push(text.slice(0, 140));
        }
      }
      if (!firstLink && posts[0]?.uri && posts[0]?.author?.handle) {
        const rkey = String(posts[0].uri).split("/").pop();
        firstLink = `https://bsky.app/profile/${posts[0].author.handle}/post/${rkey}`;
      }
      cursor = data.cursor;
      if (!cursor || posts.length < PAGE_LIMIT) {
        return {
          raw_count: count,
          approximate: false,
          meta: firstLink ? { link: firstLink } : null,
          context_texts: contexts,
        };
      }
    }
    // Paged out: the true count is >= what we saw.
    return {
      raw_count: count,
      approximate: true,
      meta: firstLink ? { link: firstLink } : null,
      context_texts: contexts,
    };
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */
