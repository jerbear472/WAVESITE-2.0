import type { RawItem } from "@/lib/pipeline/types";

// Deduplication — pure functions, deterministic for a given corpus.
// Near-duplicate text detection collapses reposts and quote-chains so they
// cannot inflate volume; author dedup makes unique_authors count accounts,
// not posts. Everything downstream (velocity, lift, concentration) runs on
// the deduplicated set.

/** Normalize text for comparison: case, urls, punctuation, whitespace. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Word 3-shingles of a normalized text. */
function shingles(norm: string): Set<string> {
  const words = norm.split(" ").filter(Boolean);
  if (words.length < 3) return new Set(words.length ? [words.join(" ")] : []);
  const out = new Set<string>();
  for (let i = 0; i <= words.length - 3; i++) {
    out.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const s of small) if (large.has(s)) inter++;
  return inter / (a.size + b.size - inter);
}

export const NEAR_DUP_JACCARD = 0.85;

function comparableText(item: RawItem): string {
  return normalizeText(`${item.title ?? ""} ${item.text ?? ""}`);
}

function engagementWeight(item: RawItem): number {
  const e = item.engagement ?? {};
  return (
    (e["views"] ?? 0) + (e["score"] ?? 0) * 50 + (e["likes"] ?? 0) * 10 +
    (e["comments"] ?? 0) * 20
  );
}

/**
 * Collapse near-duplicate items. Two items are near-duplicates when their
 * normalized text is identical, or (for texts of 3+ words) word-3-shingle
 * Jaccard >= 0.85. The highest-engagement item of each cluster is kept as
 * canonical. O(n²) on shingle sets — fine for per-trend windows (hundreds).
 */
export function dedupeItems(items: RawItem[]): {
  canonical: RawItem[];
  /** canonical id -> ids it absorbed (excluding itself). */
  absorbed: Map<string, string[]>;
} {
  // Highest engagement first, so cluster seeds are the canonical survivors.
  const sorted = [...items].sort(
    (a, b) => engagementWeight(b) - engagementWeight(a)
  );
  const norms = new Map(sorted.map((i) => [i.id, comparableText(i)]));
  const shings = new Map(sorted.map((i) => [i.id, shingles(norms.get(i.id)!)]));

  const canonical: RawItem[] = [];
  const absorbed = new Map<string, string[]>();

  for (const item of sorted) {
    const norm = norms.get(item.id)!;
    const shing = shings.get(item.id)!;
    let home: RawItem | null = null;
    for (const c of canonical) {
      const cNorm = norms.get(c.id)!;
      if (norm.length > 0 && norm === cNorm) {
        home = c;
        break;
      }
      if (
        shing.size >= 1 &&
        norm.split(" ").length >= 3 &&
        jaccard(shing, shings.get(c.id)!) >= NEAR_DUP_JACCARD
      ) {
        home = c;
        break;
      }
    }
    if (home) {
      absorbed.get(home.id)!.push(item.id);
    } else {
      canonical.push(item);
      absorbed.set(item.id, []);
    }
  }
  return { canonical, absorbed };
}

/** Stable author key: platform-scoped id when present, else handle. */
export function authorKey(item: RawItem): string | null {
  if (item.author_id) return `${item.source}:${item.author_id}`;
  if (item.author_handle) return `${item.source}:${item.author_handle.toLowerCase()}`;
  return null;
}

/** Distinct authors across a set of items (unknown authors excluded). */
export function uniqueAuthors(items: RawItem[]): number {
  const keys = new Set<string>();
  for (const i of items) {
    const k = authorKey(i);
    if (k) keys.add(k);
  }
  return keys.size;
}

/**
 * Top-3 authors' share of items, 0-1. High = one or two accounts are
 * manufacturing the appearance of a trend.
 */
export function topAuthorConcentration(items: RawItem[]): number {
  if (items.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const i of items) {
    const k = authorKey(i) ?? `anon:${i.id}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const top = [...counts.values()].sort((a, b) => b - a).slice(0, 3);
  return top.reduce((s, c) => s + c, 0) / items.length;
}
