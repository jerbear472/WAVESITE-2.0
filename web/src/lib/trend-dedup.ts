// Near-duplicate detection for trend identities. Slug-only conflict lets the
// same cultural phenomenon re-enter the library under a lightly reworded name
// ("netflix-documentary-format" / "netflix-documentary-chair-sit" /
// "netflix-documentary-meme" were three rows). Before any insert, the writer
// asks this module whether an existing trend is the same thing and, if so,
// adopts that identity instead of minting a new slug.
//
// Token-set similarity, deliberately simple: lowercase, split on non-
// alphanumerics, drop stopwords, light plural stem. A pair matches when the
// sets share >= 2 tokens AND either Jaccard >= 0.55 (mostly the same words)
// or containment >= 2/3 (one name is a subset-plus-flavor of the other).
// Thresholds are pinned by tests against real duplicate families from the
// library; err on the conservative side — a missed dup is a mergeable
// annoyance, a false merge silently destroys a distinct trend.
//
// Pure functions only: no I/O, no "@/" imports, testable under `node --test`
// (see tests/trend-dedup.test.ts).

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "at", "as", "for",
  "with", "is", "are", "was", "be", "my", "me", "we", "us", "our", "your",
  "you", "i", "it", "its", "this", "that", "had", "has", "have",
]);

/** Normalized token set for a trend, built from any of its naming fields. */
export function trendTokens(
  ...parts: (string | null | undefined)[]
): Set<string> {
  const out = new Set<string>();
  for (const part of parts) {
    if (!part) continue;
    for (let tok of part.toLowerCase().split(/[^a-z0-9]+/)) {
      if (!tok || STOPWORDS.has(tok)) continue;
      // Light plural stem: "skits"/"skit", "transitions"/"transition".
      if (tok.length > 3 && tok.endsWith("s") && !tok.endsWith("ss")) {
        tok = tok.slice(0, -1);
      }
      out.add(tok);
    }
  }
  return out;
}

export function isNearDuplicate(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  let overlap = 0;
  for (const t of a) if (b.has(t)) overlap++;
  if (overlap < 2) return false;
  const jaccard = overlap / (a.size + b.size - overlap);
  const containment = overlap / Math.min(a.size, b.size);
  return jaccard >= 0.55 || containment >= 2 / 3;
}

/** First trend in `pool` that is the same phenomenon as `candidate` — an
 *  exact slug match, or a near-duplicate by name/slug tokens. Null if the
 *  candidate is genuinely new. */
export function findDuplicateTrend<T extends { name: string; slug: string }>(
  candidate: { name: string; slug: string },
  pool: T[]
): T | null {
  const exact = pool.find((t) => t.slug === candidate.slug);
  if (exact) return exact;
  const tokens = trendTokens(candidate.name, candidate.slug);
  for (const t of pool) {
    if (isNearDuplicate(tokens, trendTokens(t.name, t.slug))) return t;
  }
  return null;
}
