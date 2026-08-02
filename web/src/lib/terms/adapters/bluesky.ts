import type { AdapterFetchResult, SourceAdapter, TermRow } from "@/lib/terms/types";

// bluesky — AT Protocol search. The earliest language signal in the cascade:
// phrases show up here before search interest or video volume exists.
//
// The public AppView (public.api.bsky.app) began returning 403 for
// unauthenticated searchPosts in mid-2026, so this adapter now prefers an
// app-password session against the PDS (searchPosts is service-proxied to the
// AppView). Create an app password at bsky.app → Settings → App Passwords and
// set BLUESKY_IDENTIFIER (handle or email) + BLUESKY_APP_PASSWORD. Without
// creds we still try the public endpoint in case access is restored.

const PUBLIC_API = "https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts";
const PDS = "https://bsky.social";

/** We count by paging search results within the UTC day. Three pages of 100
 *  bounds the work per term; hitting the cap returns an approximate count,
 *  which the z-score against the term's own history absorbs. */
const MAX_PAGES = 3;
const PAGE_LIMIT = 100;

function hasCreds(): boolean {
  return Boolean(
    process.env.BLUESKY_IDENTIFIER && process.env.BLUESKY_APP_PASSWORD
  );
}

// Access tokens last ~2h; refresh a little early. Cached per server process —
// one createSession per run, not per term.
let session: { accessJwt: string; expiresAt: number } | null = null;

async function getAccessJwt(): Promise<string> {
  if (session && Date.now() < session.expiresAt) return session.accessJwt;
  const res = await fetch(`${PDS}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: process.env.BLUESKY_IDENTIFIER,
      password: process.env.BLUESKY_APP_PASSWORD,
    }),
  });
  if (!res.ok) {
    session = null;
    throw new Error(`bluesky createSession failed: ${res.status}`);
  }
  const data = (await res.json()) as { accessJwt?: string };
  if (!data.accessJwt) throw new Error("bluesky createSession: no accessJwt");
  session = { accessJwt: data.accessJwt, expiresAt: Date.now() + 90 * 60_000 };
  return session.accessJwt;
}

async function searchPage(params: URLSearchParams): Promise<Response> {
  if (!hasCreds()) return fetch(`${PUBLIC_API}?${params}`);
  const jwt = await getAccessJwt();
  const res = await fetch(`${PDS}/xrpc/app.bsky.feed.searchPosts?${params}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (res.status === 401) {
    // Expired/revoked token: one fresh session, one retry.
    session = null;
    const fresh = await getAccessJwt();
    return fetch(`${PDS}/xrpc/app.bsky.feed.searchPosts?${params}`, {
      headers: { Authorization: `Bearer ${fresh}` },
    });
  }
  return res;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const blueskyAdapter: SourceAdapter = {
  source: "bluesky",
  displayName: "Bluesky",
  enabled: () => process.env.BLUESKY_ENABLED !== "false",
  disabledReason: () =>
    process.env.BLUESKY_ENABLED === "false" ? "BLUESKY_ENABLED=false" : null,
  // Authed PDS limits are generous (3000/5min documented for the AppView);
  // 350ms keeps a full registry pass around 3 req/s.
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
      const res = await searchPage(params);
      if (!res.ok) {
        throw new Error(
          `bluesky search failed: ${res.status}${
            res.status === 403 && !hasCreds()
              ? " (public search is gated — set BLUESKY_IDENTIFIER + BLUESKY_APP_PASSWORD)"
              : ""
          }`
        );
      }
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
