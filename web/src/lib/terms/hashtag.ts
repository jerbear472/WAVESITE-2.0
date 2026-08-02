// Pure hashtag derivation for the tiktok adapter. Import-free so tests can
// exercise it under node --test without "@/" alias resolution.
//
// Editorial trend names mostly do NOT exist as hashtags verbatim:
// "Car Detailing & Cleaning ASMR (Satisfying Before/After)" is a library
// name; the hashtag culture actually uses is #cardetailingasmr. Verified
// live 2026-08-02: full normalized names returned "no hashtag" while the
// short atoms carried 27M-27B views. Two mitigations here: parentheticals
// are stripped (they're editorial qualifiers, never part of a hashtag), and
// the adapter walks the term's variants as fallback candidates — so a
// hashtag-shaped variant added by the frontier or an admin steers
// measurement to the real tag.

/** "Car Detailing & Cleaning ASMR (Satisfying Before/After)" ->
 *  "cardetailingcleaningasmr" — TikTok hashtag names are bare alphanumerics.
 *  Phrases that normalize to nothing can't be measured on this source. */
export function toHashtag(phrase: string): string {
  return phrase
    .replace(/\([^)]*\)/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Ordered, deduped candidate hashtags for a term: canonical first, then
 *  variants. Capped hard — every candidate is a network lookup inside a
 *  shared 300s cron budget, so misses must stay cheap. */
export function hashtagCandidates(
  canonical: string,
  variants: string[],
  max = 2
): string[] {
  const out: string[] = [];
  for (const phrase of [canonical, ...variants]) {
    const h = toHashtag(phrase);
    if (h && !out.includes(h)) out.push(h);
    if (out.length >= max) break;
  }
  return out;
}
