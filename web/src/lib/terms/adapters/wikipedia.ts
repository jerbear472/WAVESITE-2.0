import type { AdapterFetchResult, SourceAdapter, TermRow } from "@/lib/terms/types";

// wikipedia_pageviews — Wikimedia REST pageviews API. Fully open, no key,
// daily granularity, deep history. This is the mainstream-saturation signal
// and the ONLY source with real backfill, so it seeds baselines.
// Docs: https://wikimedia.org/api/rest_v1/ (per-article pageviews).

const API = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article";
const UA = "WaveSight/2.0 (trend measurement; jeremyuys@gmail.com)";

function articleFor(term: TermRow): string {
  const title = term.wiki_title ?? term.canonical;
  // Wikipedia titles: spaces to underscores, first letter capitalized.
  const normalized = title.trim().replace(/\s+/g, "_");
  return encodeURIComponent(
    normalized.charAt(0).toUpperCase() + normalized.slice(1)
  );
}

function ymd(date: string): string {
  return date.replaceAll("-", "");
}

interface PageviewItem {
  timestamp: string; // YYYYMMDD00
  views: number;
}

async function fetchRange(
  term: TermRow,
  fromDate: string,
  toDate: string
): Promise<PageviewItem[] | null> {
  const article = articleFor(term);
  const url = `${API}/en.wikipedia/all-access/user/${article}/daily/${ymd(fromDate)}/${ymd(toDate)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Api-User-Agent": UA },
  });
  // 404 = no article / no data for this term. That's "no data", not zero and
  // not an error — plenty of early-lifecycle terms have no Wikipedia page
  // yet. Their page APPEARING is itself part of the mainstream signal.
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`wikipedia pageviews failed: ${res.status}`);
  const data = (await res.json()) as { items?: PageviewItem[] };
  return data.items ?? [];
}

export const wikipediaAdapter: SourceAdapter = {
  source: "wikipedia",
  displayName: "Wikipedia pageviews",
  enabled: () => process.env.WIKIPEDIA_ENABLED !== "false",
  disabledReason: () =>
    process.env.WIKIPEDIA_ENABLED === "false" ? "WIKIPEDIA_ENABLED=false" : null,
  // Wikimedia asks for <=100 req/s; 100ms keeps us far under while staying
  // fast enough to cover the whole registry.
  rateLimit: { minIntervalMs: 100 },

  async countForDate(term: TermRow, date: string): Promise<AdapterFetchResult> {
    const items = await fetchRange(term, date, date);
    if (items === null) return { raw_count: null };
    const views = items.find((i) => i.timestamp.startsWith(ymd(date)))?.views;
    if (views === undefined) return { raw_count: null };
    return {
      raw_count: views,
      meta: {
        link: `https://en.wikipedia.org/wiki/${articleFor(term)}`,
      },
    };
  },

  async backfill(term: TermRow, fromDate: string, toDate: string) {
    const items = await fetchRange(term, fromDate, toDate);
    if (items === null) return [];
    return items.map((i) => ({
      date: `${i.timestamp.slice(0, 4)}-${i.timestamp.slice(4, 6)}-${i.timestamp.slice(6, 8)}`,
      raw_count: i.views,
    }));
  },
};
