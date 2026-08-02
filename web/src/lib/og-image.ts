// og:image harvester — real imagery for scan-discovered trends, taken from
// the pages Claude actually cited. No API keys, one bounded fetch per URL,
// first usable image wins. Failure always degrades to "no image" (the
// TrendVisual waveform), never to a stock photo.

const FETCH_TIMEOUT_MS = 4500;
const MAX_HTML_BYTES = 250_000;
const MAX_URLS_TRIED = 4;

const META_PATTERNS = [
  /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
  /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
];

function usable(imageUrl: string, pageUrl: string): string | null {
  try {
    const resolved = new URL(imageUrl, pageUrl);
    if (resolved.protocol !== "https:") return null;
    if (/\.svg(\?|$)/i.test(resolved.pathname)) return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

async function ogImageFrom(pageUrl: string): Promise<string | null> {
  const res = await fetch(pageUrl, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; WaveSightBot/1.0; +https://wavesight.vercel.app)",
      accept: "text/html",
    },
    redirect: "follow",
  });
  if (!res.ok) return null;
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("html")) return null;

  // Meta tags live in <head>; a bounded read is enough and caps the cost.
  const reader = res.body?.getReader();
  if (!reader) return null;
  let html = "";
  const decoder = new TextDecoder();
  while (html.length < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
    if (html.includes("</head>")) break;
  }
  reader.cancel().catch(() => {});

  for (const pattern of META_PATTERNS) {
    const m = html.match(pattern);
    if (m?.[1]) {
      const url = usable(m[1], pageUrl);
      if (url) return url;
    }
  }
  return null;
}

/** First usable og:image across the given source URLs, or null. */
export async function harvestOgImage(
  urls: string[]
): Promise<string | null> {
  for (const url of urls.slice(0, MAX_URLS_TRIED)) {
    try {
      const image = await ogImageFrom(url);
      if (image) return image;
    } catch {
      // timeouts, blocks, bad TLS — try the next citation
    }
  }
  return null;
}
