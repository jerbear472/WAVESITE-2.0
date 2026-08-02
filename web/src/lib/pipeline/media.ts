import type { RawItem } from "@/lib/pipeline/types";

// Real trend imagery — pick the best actual media from a trend's corpus
// items. Only hosts whitelisted in next.config.ts qualify; anything else
// would break next/image at render time.

const ALLOWED_IMAGE_HOSTS = new Set([
  "i.ytimg.com",
  "i.redd.it",
  "preview.redd.it",
]);

function usableImageUrl(item: RawItem): string | null {
  const refs = item.media_refs ?? {};
  for (const url of [refs["thumbnail"], refs["url"]]) {
    if (!url) continue;
    try {
      const u = new URL(url);
      if (u.protocol !== "https:") continue;
      if (!ALLOWED_IMAGE_HOSTS.has(u.hostname)) continue;
      // Reddit link posts can point at pages; require an image-ish path
      // except for the youtube thumb host, which is always an image.
      if (
        u.hostname !== "i.ytimg.com" &&
        !/\.(jpe?g|png|webp|gif)$/i.test(u.pathname)
      ) {
        continue;
      }
      return url;
    } catch {
      continue;
    }
  }
  return null;
}

function engagementOf(item: RawItem): number {
  const e = item.engagement ?? {};
  return (
    (e["views"] ?? 0) + (e["score"] ?? 0) * 50 + (e["likes"] ?? 0) * 10 +
    (e["comments"] ?? 0) * 20
  );
}

/** The highest-engagement item with renderable media, or null. */
export function bestImageFor(items: RawItem[]): string | null {
  let best: { url: string; weight: number } | null = null;
  for (const item of items) {
    const url = usableImageUrl(item);
    if (!url) continue;
    const weight = engagementOf(item);
    if (!best || weight > best.weight) best = { url, weight };
  }
  return best?.url ?? null;
}
