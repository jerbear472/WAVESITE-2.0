import { updateTermWikiTitle } from "@/lib/terms/store";
import type { AdapterFetchResult, SourceAdapter, TermRow } from "@/lib/terms/types";

// wikipedia_pageviews — Wikimedia REST pageviews API. Fully open, no key,
// daily granularity, deep history. This is the mainstream-saturation signal
// and the ONLY source with real backfill, so it seeds baselines.
//
// Title resolution: term phrases rarely match article titles verbatim
// ("quiet luxury workspace" -> article "Quiet luxury"), so we resolve once
// through Wikipedia's opensearch, guard against fuzzy mismatches, and cache
// the hit on the term row (terms.wiki_title). Misses are re-tried next run —
// a term GAINING an article is itself part of the mainstream signal.

const API = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article";
const SEARCH = "https://en.wikipedia.org/w/api.php";
const UA = "WaveSight/2.0 (trend measurement; jeremyuys@gmail.com)";

/** Per-process negative cache so a no-article term costs one lookup per run,
 *  not one per backfill window. */
const resolved = new Map<string, string | null>();

function words(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(Boolean)
  );
}

/** Accept a resolved title only when it's genuinely the same subject: exact
 *  (case-insensitive) match, or one side's words are a subset of the
 *  other's. Rejects opensearch's loose neighbors ("Deltarune Tree" ->
 *  "Deltarune The Beginning") that would silently measure the wrong page. */
export function titleMatchesTerm(term: string, title: string): boolean {
  const t = words(term);
  const w = words(title);
  if (t.size === 0 || w.size === 0) return false;
  const subset = (a: Set<string>, b: Set<string>) =>
    [...a].every((x) => b.has(x));
  return subset(w, t) || subset(t, w);
}

async function opensearch(query: string): Promise<string | null> {
  const url = `${SEARCH}?action=opensearch&search=${encodeURIComponent(query)}&limit=1&format=json`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`wikipedia opensearch failed: ${res.status}`);
  const data = (await res.json()) as [string, string[]];
  return data?.[1]?.[0] ?? null;
}

async function resolveArticle(term: TermRow): Promise<string | null> {
  if (term.wiki_title) return term.wiki_title;
  if (resolved.has(term.term_id)) return resolved.get(term.term_id)!;
  let article: string | null = null;
  try {
    const candidate = await opensearch(term.canonical);
    if (candidate && titleMatchesTerm(term.canonical, candidate)) {
      article = candidate;
      // Best-effort cache; a failed write just means we resolve again later.
      await updateTermWikiTitle(term.term_id, candidate).catch(() => {});
    }
  } catch {
    // Resolution failure = no data this run, not an adapter failure.
  }
  resolved.set(term.term_id, article);
  return article;
}

function pathFor(article: string): string {
  return encodeURIComponent(article.replace(/\s+/g, "_"));
}

function ymd(date: string): string {
  return date.replaceAll("-", "");
}

interface PageviewItem {
  timestamp: string; // YYYYMMDD00
  views: number;
}

async function fetchRange(
  article: string,
  fromDate: string,
  toDate: string
): Promise<PageviewItem[] | null> {
  const url = `${API}/en.wikipedia/all-access/user/${pathFor(article)}/daily/${ymd(fromDate)}/${ymd(toDate)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Api-User-Agent": UA },
  });
  // 404 = no pageview data (article missing or too new). "No data", not an
  // error — early-lifecycle terms usually have no Wikipedia page yet.
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
  // fast enough to cover the whole registry (resolution adds one search).
  rateLimit: { minIntervalMs: 100 },

  async countForDate(term: TermRow, date: string): Promise<AdapterFetchResult> {
    const article = await resolveArticle(term);
    if (!article) return { raw_count: null };
    const items = await fetchRange(article, date, date);
    if (items === null) return { raw_count: null };
    const views = items.find((i) => i.timestamp.startsWith(ymd(date)))?.views;
    if (views === undefined) return { raw_count: null };
    return {
      raw_count: views,
      meta: { link: `https://en.wikipedia.org/wiki/${pathFor(article)}` },
    };
  },

  async backfill(term: TermRow, fromDate: string, toDate: string) {
    const article = await resolveArticle(term);
    if (!article) return [];
    const items = await fetchRange(article, fromDate, toDate);
    if (items === null) return [];
    return items.map((i) => ({
      date: `${i.timestamp.slice(0, 4)}-${i.timestamp.slice(4, 6)}-${i.timestamp.slice(6, 8)}`,
      raw_count: i.views,
    }));
  },
};
