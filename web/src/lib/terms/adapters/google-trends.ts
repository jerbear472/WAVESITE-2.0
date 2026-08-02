import type { AdapterFetchResult, SourceAdapter, TermRow } from "@/lib/terms/types";

// google_trends — search interest, the bridge between early language and
// mass attention in the cascade.
//
// UNOFFICIAL ACCESS. There is no public Google Trends API; this speaks the
// same widget endpoints the trends.google.com frontend uses. It WILL break
// from time to time — that is expected and priced in: every failure here is
// treated as a normal skipped-source day (the run continues, breadth is
// computed over the sources that did report). Never let this adapter block
// anything. No third-party dependency; two raw fetches.

const EXPLORE = "https://trends.google.com/trends/api/explore";
const WIDGET = "https://trends.google.com/trends/api/widgetdata/multiline";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

let cachedCookie: string | null = null;

async function getCookie(): Promise<string> {
  if (cachedCookie) return cachedCookie;
  const res = await fetch("https://trends.google.com/", {
    headers: { "User-Agent": UA },
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie") ?? "";
  const nid = setCookie.match(/NID=[^;]+/)?.[0];
  cachedCookie = nid ?? "";
  return cachedCookie;
}

/** Google prefixes JSON bodies with `)]}'` (or `)]}',`) as an XSSI guard. */
function stripPrefix(text: string): string {
  return text.replace(/^\)\]\}'\,?/, "").trim();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function interestSeries(
  keyword: string
): Promise<{ date: string; value: number }[]> {
  const cookie = await getCookie();
  const exploreReq = {
    comparisonItem: [{ keyword, geo: "", time: "today 3-m" }],
    category: 0,
    property: "",
  };
  const exploreUrl = `${EXPLORE}?hl=en-US&tz=0&req=${encodeURIComponent(JSON.stringify(exploreReq))}`;
  const exploreRes = await fetch(exploreUrl, {
    headers: { "User-Agent": UA, Cookie: cookie },
  });
  if (!exploreRes.ok) {
    cachedCookie = null; // stale cookie is the most common failure — reset
    throw new Error(`trends explore failed: ${exploreRes.status}`);
  }
  const explore = JSON.parse(stripPrefix(await exploreRes.text()));
  const widget = (explore?.widgets ?? []).find(
    (w: any) => w.id === "TIMESERIES"
  );
  if (!widget?.token || !widget?.request) {
    throw new Error("trends explore returned no TIMESERIES widget");
  }

  const widgetUrl = `${WIDGET}?hl=en-US&tz=0&req=${encodeURIComponent(JSON.stringify(widget.request))}&token=${widget.token}`;
  const widgetRes = await fetch(widgetUrl, {
    headers: { "User-Agent": UA, Cookie: cookie },
  });
  if (!widgetRes.ok) throw new Error(`trends widget failed: ${widgetRes.status}`);
  const series = JSON.parse(stripPrefix(await widgetRes.text()));
  const points = series?.default?.timelineData ?? [];
  return points.map((p: any) => ({
    date: new Date(Number(p.time) * 1000).toISOString().slice(0, 10),
    value: Number(p.value?.[0] ?? 0),
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const googleTrendsAdapter: SourceAdapter = {
  source: "google_trends",
  displayName: "Google Trends",
  enabled: () => process.env.GOOGLE_TRENDS_ENABLED !== "false",
  disabledReason: () =>
    process.env.GOOGLE_TRENDS_ENABLED === "false"
      ? "GOOGLE_TRENDS_ENABLED=false"
      : null,
  // Unofficial endpoint: go slow enough to look like a browser, not a scan.
  rateLimit: { minIntervalMs: 1500 },

  async countForDate(term: TermRow, date: string): Promise<AdapterFetchResult> {
    const series = await interestSeries(term.canonical);
    const point = series.find((p) => p.date === date);
    if (!point) return { raw_count: null };
    // Interest is Google's own 0-100 index over the window. It is already
    // relative, but z-scoring it against the term's own trailing values still
    // detects acceleration correctly.
    return {
      raw_count: point.value,
      meta: {
        link: `https://trends.google.com/trends/explore?q=${encodeURIComponent(term.canonical)}`,
      },
    };
  },
};
