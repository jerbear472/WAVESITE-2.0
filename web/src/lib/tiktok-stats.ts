// Shared unsigned access to per-hashtag lifetime stats (tikwm mirror).
// Used by the terms tiktok adapter (daily view deltas) and by deep-scan
// (grounding creator adoption at trend birth). Same contract everywhere:
// unofficial, will break occasionally, every failure is priced in.

const API = "https://www.tikwm.com/api/challenge/info";

export interface HashtagStats {
  /** Lifetime video views on the hashtag. */
  views: number;
  /** Lifetime distinct creators who posted on it. */
  users: number;
  desc: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** null = the hashtag doesn't exist (data, not an outage). Throws on real
 *  failures so callers can distinguish "no tag" from "source down". */
export async function fetchHashtagStats(
  hashtag: string,
  timeoutMs = 8000
): Promise<HashtagStats | null> {
  const res = await fetch(`${API}?challenge_name=${encodeURIComponent(hashtag)}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`tikwm challenge info failed: ${res.status}`);
  const body = (await res.json()) as any;
  if (body?.code === -1) return null;
  if (body?.code !== 0 || !body?.data) {
    throw new Error(`tikwm error code ${body?.code}: ${String(body?.msg).slice(0, 120)}`);
  }
  return {
    views: Number(body.data.view_count ?? 0),
    users: Number(body.data.user_count ?? 0),
    desc: typeof body.data.desc === "string" ? body.data.desc : "",
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
