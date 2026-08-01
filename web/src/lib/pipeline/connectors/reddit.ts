import type { RawItem } from "@/lib/pipeline/types";

// Reddit connector — app-only OAuth (client_credentials). Fetches individual
// posts with author, timestamp, and engagement BEFORE any scoring. Collection
// only; no model calls, no filtering beyond the query itself.

const UA = "web:wavesight:v0.1 (by /u/JackalopeCanyon)";

export function isRedditConfigured(): boolean {
  return Boolean(
    process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET
  );
}

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
async function redditGet(path: string): Promise<any> {
  const token = await getToken();
  const res = await fetch(`https://oauth.reddit.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`Reddit ${path} failed: ${res.status}`);
  return res.json();
}

function toItem(
  post: any,
  corpus: RawItem["corpus"],
  query: string,
  capturedAt: string
): RawItem | null {
  if (!post?.id || !post?.created_utc) return null;
  return {
    id: `rd-${post.id}`,
    source: "reddit",
    platform: "Reddit",
    corpus,
    query,
    source_url: `https://www.reddit.com${post.permalink ?? ""}`,
    author_handle: post.author ?? null,
    author_id: post.author_fullname ?? null,
    container: post.subreddit ?? null,
    posted_at: new Date(post.created_utc * 1000).toISOString(),
    captured_at: capturedAt,
    title: post.title ?? null,
    text: post.selftext ? String(post.selftext).slice(0, 4000) : null,
    engagement: {
      score: post.score ?? 0,
      comments: post.num_comments ?? 0,
      upvote_ratio: post.upvote_ratio ?? 0,
    },
    // Subreddit size at capture time — the reddit input to the saturation
    // metric (share of items flowing through very large venues).
    author_meta: { container_subscribers: post.subreddit_subscribers ?? 0 },
    media_refs: post.url_overridden_by_dest
      ? { url: post.url_overridden_by_dest }
      : null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Search posts matching a trend term, newest and top of the window. */
export async function searchRedditItems(
  term: string,
  capturedAt: string,
  limit = 60
): Promise<RawItem[]> {
  const q = encodeURIComponent(term);
  const [newest, top] = await Promise.all([
    redditGet(`/search?q=${q}&sort=new&t=month&limit=${Math.min(limit, 100)}`),
    redditGet(`/search?q=${q}&sort=top&t=month&limit=${Math.min(limit, 100)}`),
  ]);
  const posts = [
    ...(newest?.data?.children ?? []),
    ...(top?.data?.children ?? []),
  ].map((c) => c.data);
  const items = posts
    .map((p) => toItem(p, "trend", term, capturedAt))
    .filter((i): i is RawItem => i !== null);
  // The two listings overlap; last write wins is fine, ids are stable.
  return [...new Map(items.map((i) => [i.id, i])).values()];
}

/**
 * Baseline sample: r/all newest — content with NO trend filtering. This is
 * the control corpus every lift number is expressed against.
 */
export async function sampleRedditBaseline(
  capturedAt: string,
  limit = 100
): Promise<RawItem[]> {
  const [allNew, popularHot] = await Promise.all([
    redditGet(`/r/all/new?limit=${Math.min(limit, 100)}`),
    redditGet(`/r/popular/hot?limit=${Math.min(limit, 100)}`),
  ]);
  const posts = [
    ...(allNew?.data?.children ?? []),
    ...(popularHot?.data?.children ?? []),
  ].map((c) => c.data);
  const items = posts
    .map((p) => toItem(p, "baseline", "", capturedAt))
    .filter((i): i is RawItem => i !== null);
  return [...new Map(items.map((i) => [i.id, i])).values()];
}
