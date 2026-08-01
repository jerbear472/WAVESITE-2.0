// Dedup tests. Reposts and quote-chains inflate volume; one prolific account
// can manufacture a trend. Both silently corrupt every downstream metric,
// so the collapse rules are pinned here.
//   npm test → node --experimental-strip-types --test tests/*.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authorKey,
  dedupeItems,
  normalizeText,
  topAuthorConcentration,
  uniqueAuthors,
} from "../src/lib/pipeline/dedup.ts";
import type { RawItem } from "../src/lib/pipeline/types.ts";

let seq = 0;
function item(overrides: Partial<RawItem>): RawItem {
  seq++;
  return {
    id: `t-${seq}`,
    source: "reddit",
    platform: "Reddit",
    corpus: "trend",
    query: "test",
    source_url: `https://example.com/${seq}`,
    author_handle: `author${seq}`,
    author_id: null,
    container: null,
    posted_at: "2026-08-01T00:00:00.000Z",
    captured_at: "2026-08-01T00:00:00.000Z",
    title: null,
    text: null,
    engagement: null,
    author_meta: null,
    media_refs: null,
    ...overrides,
  };
}

// --- normalizeText ----------------------------------------------------------

test("normalize strips urls, punctuation, case, entities, whitespace", () => {
  assert.equal(
    normalizeText("Check THIS!! https://x.co/abc — it's   &amp; wild"),
    "check this it s wild"
  );
});

// --- near-duplicate collapse ------------------------------------------------

test("identical normalized text collapses regardless of case/punctuation", () => {
  const a = item({ title: "Barn Jacket Renaissance is here!" });
  const b = item({ title: "barn jacket renaissance IS HERE" });
  const { canonical } = dedupeItems([a, b]);
  assert.equal(canonical.length, 1);
});

test("quote-chain: long text with a short prefix added still collapses", () => {
  const base =
    "the barn jacket renaissance has fully arrived this fall with waxed cotton " +
    "silhouettes taking over every feed and thrift stores selling out of chore coats";
  const a = item({ text: base });
  const b = item({ text: `So true! ${base}` });
  const { canonical, absorbed } = dedupeItems([a, b]);
  assert.equal(canonical.length, 1);
  assert.equal(absorbed.get(canonical[0].id)!.length, 1);
});

test("distinct posts about the same topic do NOT collapse", () => {
  const a = item({
    text: "barn jackets are the best purchase I made this year, wearing mine daily",
  });
  const b = item({
    text: "why is every influencer suddenly pushing barn jackets on my feed, exhausting",
  });
  const { canonical } = dedupeItems([a, b]);
  assert.equal(canonical.length, 2);
});

test("highest-engagement item survives as canonical", () => {
  const small = item({ title: "same exact repost text", engagement: { score: 2 } });
  const big = item({ title: "Same EXACT repost text!", engagement: { score: 900 } });
  const { canonical } = dedupeItems([small, big]);
  assert.equal(canonical.length, 1);
  assert.equal(canonical[0].id, big.id);
});

test("short texts collapse only on exact normalized match", () => {
  const a = item({ title: "barn jacket" });
  const b = item({ title: "barn jackets" }); // 2 words, not identical -> distinct
  const { canonical } = dedupeItems([a, b]);
  assert.equal(canonical.length, 2);
});

test("empty-text items never collapse with each other", () => {
  const a = item({ title: null, text: null });
  const b = item({ title: null, text: null });
  const { canonical } = dedupeItems([a, b]);
  assert.equal(canonical.length, 2);
});

// --- author dedup -----------------------------------------------------------

test("authorKey prefers platform-scoped id, falls back to handle", () => {
  assert.equal(
    authorKey(item({ author_id: "t2_abc", author_handle: "Somebody" })),
    "reddit:t2_abc"
  );
  assert.equal(
    authorKey(item({ author_id: null, author_handle: "SomeBody" })),
    "reddit:somebody"
  );
  assert.equal(authorKey(item({ author_id: null, author_handle: null })), null);
});

test("N posts from one account count once toward unique_authors", () => {
  const items = [
    item({ author_handle: "Poster", text: "post one about the thing" }),
    item({ author_handle: "poster", text: "post two totally different words" }),
    item({ author_handle: "POSTER", text: "post three yet another take here" }),
    item({ author_handle: "other", text: "an unrelated person appears" }),
  ];
  assert.equal(uniqueAuthors(items), 2);
});

test("same handle on different platforms counts as different authors", () => {
  const items = [
    item({ author_handle: "stylist", source: "reddit" }),
    item({ author_handle: "stylist", source: "youtube", platform: "YouTube" }),
  ];
  assert.equal(uniqueAuthors(items), 2);
});

// --- concentration ----------------------------------------------------------

test("one account manufacturing a trend -> concentration 1", () => {
  const items = [1, 2, 3, 4, 5].map((i) =>
    item({ author_handle: "astroturfer", text: `unique post number ${i} words` })
  );
  assert.equal(topAuthorConcentration(items), 1);
});

test("evenly spread authors -> low concentration", () => {
  const items = Array.from({ length: 10 }, (_, i) =>
    item({ author_handle: `person${i}` })
  );
  assert.equal(topAuthorConcentration(items), 0.3); // top 3 of 10 equal authors
});

test("empty set -> 0 concentration", () => {
  assert.equal(topAuthorConcentration([]), 0);
});
