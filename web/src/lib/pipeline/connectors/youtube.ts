import type { RawItem } from "@/lib/pipeline/types";

// YouTube connector — Data API v3. search.list finds videos for a term
// (100 quota units), then videos.list + channels.list batch-fetch real
// engagement and channel size (1 unit each). Collection only; no scoring.

const API = "https://www.googleapis.com/youtube/v3";

export function isYouTubeConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function ytGet(path: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({
    ...params,
    key: process.env.YOUTUBE_API_KEY ?? "",
  });
  const res = await fetch(`${API}/${path}?${qs}`);
  const data = await res.json();
  if (data.error) {
    throw new Error(`YouTube ${path}: ${data.error.code} ${data.error.message}`);
  }
  return data;
}

/** Batch-fetch statistics + snippet for video ids, and channel sizes. */
async function hydrateVideos(
  videoIds: string[],
  corpus: RawItem["corpus"],
  query: string,
  capturedAt: string
): Promise<RawItem[]> {
  if (videoIds.length === 0) return [];
  const items: RawItem[] = [];
  const channelIds = new Set<string>();
  const videos: any[] = [];

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const data = await ytGet("videos", {
      part: "snippet,statistics",
      id: batch.join(","),
      maxResults: "50",
    });
    for (const v of data.items ?? []) {
      videos.push(v);
      if (v.snippet?.channelId) channelIds.add(v.snippet.channelId);
    }
  }

  // Channel subscriber counts at capture time — the youtube input to the
  // saturation metric (publisher/big-account share).
  const channelSubs = new Map<string, number>();
  const chIds = [...channelIds];
  for (let i = 0; i < chIds.length; i += 50) {
    const data = await ytGet("channels", {
      part: "statistics",
      id: chIds.slice(i, i + 50).join(","),
      maxResults: "50",
    });
    for (const c of data.items ?? []) {
      channelSubs.set(c.id, Number(c.statistics?.subscriberCount ?? 0));
    }
  }

  for (const v of videos) {
    const s = v.snippet;
    const st = v.statistics ?? {};
    if (!v.id || !s?.publishedAt) continue;
    items.push({
      id: `yt-${v.id}`,
      source: "youtube",
      platform: "YouTube",
      corpus,
      query,
      source_url: `https://www.youtube.com/watch?v=${v.id}`,
      author_handle: s.channelTitle ?? null,
      author_id: s.channelId ?? null,
      container: s.channelId ?? null,
      posted_at: s.publishedAt,
      captured_at: capturedAt,
      title: s.title ?? null,
      text: s.description ? String(s.description).slice(0, 4000) : null,
      engagement: {
        views: Number(st.viewCount ?? 0),
        likes: Number(st.likeCount ?? 0),
        comments: Number(st.commentCount ?? 0),
      },
      author_meta: {
        subscriber_count: channelSubs.get(s.channelId) ?? 0,
      },
      media_refs: s.thumbnails?.high?.url ? { thumbnail: s.thumbnails.high.url } : null,
    });
  }
  return items;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Search recent videos for a trend term within the window. */
export async function searchYouTubeItems(
  term: string,
  publishedAfterIso: string,
  capturedAt: string,
  limit = 25
): Promise<RawItem[]> {
  const data = await ytGet("search", {
    part: "id",
    q: term,
    type: "video",
    order: "date",
    publishedAfter: publishedAfterIso,
    maxResults: String(Math.min(limit, 50)),
  });
  const ids = (data.items ?? [])
    .map((i: { id?: { videoId?: string } }) => i.id?.videoId)
    .filter(Boolean) as string[];
  return hydrateVideos(ids, "trend", term, capturedAt);
}

/**
 * Historical search inside a time window — the backfill bot's youtube leg.
 * order=viewCount inside [after, before) surfaces the window's biggest
 * videos. Each call costs ~100 quota units; callers budget accordingly.
 */
export async function searchYouTubeWindow(
  term: string,
  publishedAfterIso: string,
  publishedBeforeIso: string,
  capturedAt: string,
  limit = 25
): Promise<RawItem[]> {
  const data = await ytGet("search", {
    part: "id",
    q: term,
    type: "video",
    order: "viewCount",
    publishedAfter: publishedAfterIso,
    publishedBefore: publishedBeforeIso,
    maxResults: String(Math.min(limit, 50)),
  });
  const ids = (data.items ?? [])
    .map((i: { id?: { videoId?: string } }) => i.id?.videoId)
    .filter(Boolean) as string[];
  return hydrateVideos(ids, "trend", term, capturedAt);
}

/**
 * Sweep one trending category (mostPopular + videoCategoryId) — the
 * discovery firehose. Cheap: ~2 units per category.
 */
export async function sweepYouTubeCategory(
  categoryId: string,
  capturedAt: string
): Promise<RawItem[]> {
  const data = await ytGet("videos", {
    part: "id",
    chart: "mostPopular",
    regionCode: "US",
    videoCategoryId: categoryId,
    maxResults: "50",
  });
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const ids = (data.items ?? []).map((i: any) => i.id).filter(Boolean) as string[];
  return hydrateVideos(ids, "sweep", `yt-cat-${categoryId}`, capturedAt);
}

/**
 * Baseline sample: chart=mostPopular — what the platform is surfacing with NO
 * trend filtering. Cheap (1 unit per page).
 */
export async function sampleYouTubeBaseline(
  capturedAt: string,
  pages = 2
): Promise<RawItem[]> {
  const ids: string[] = [];
  let pageToken = "";
  for (let p = 0; p < pages; p++) {
    const data = await ytGet("videos", {
      part: "id",
      chart: "mostPopular",
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    ids.push(...(data.items ?? []).map((i: any) => i.id).filter(Boolean));
    pageToken = data.nextPageToken ?? "";
    if (!pageToken) break;
  }
  return hydrateVideos(ids, "baseline", "", capturedAt);
}
