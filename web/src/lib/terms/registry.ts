import { getTrends } from "@/lib/data";
import {
  getAllTermKeys,
  getEverFlaggedTermIds,
  insertTermEvent,
  insertTermsIfNew,
  setTermStatus,
} from "@/lib/terms/store";
import type { TermRow } from "@/lib/terms/types";

// Term registry — the spine. Two paths in: seeding from the existing trend
// library, and frontier candidates from batched phrase extraction. One path
// out: candidates that show no acceleration within 21 days are retired, and
// every retirement is logged so the frontier can't silently balloon.

export const CANDIDATE_TTL_DAYS = 21;

export function slugifyTerm(phrase: string): string {
  return phrase
    .toLowerCase()
    .trim()
    .replace(/['".,!?()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Cheap deterministic variant expansion (case/plural). Model-based variant
 *  clustering is permitted (step 7) but not needed until collisions appear. */
function surfaceVariants(canonical: string): string[] {
  const base = canonical.toLowerCase();
  const variants = new Set<string>([base]);
  if (base.endsWith("s")) variants.add(base.slice(0, -1));
  else variants.add(`${base}s`);
  variants.delete(canonical);
  return [...variants];
}

/** Seed the registry from the existing trend library. Idempotent: existing
 *  term_ids are never touched, so re-seeding can't clobber a status. */
export async function seedFromTrendLibrary(): Promise<number> {
  const trends = await getTrends();
  const rows = trends
    .filter((t) => t.name && t.name.trim().length > 1)
    .map((t) => ({
      term_id: `term-${slugifyTerm(t.name)}`,
      canonical: t.name.trim(),
      variants: surfaceVariants(t.name.trim()),
      category: t.category ?? null,
      status: "tracked" as const,
      source_of_discovery: "trend_library",
      trend_id: t.id,
    }));
  // Dedupe by term_id (two trends can slug-collide; first wins).
  const unique = [...new Map(rows.map((r) => [r.term_id, r])).values()];
  return insertTermsIfNew(unique);
}

/** Add frontier candidates discovered on a source. Phrases already present
 *  as a canonical or variant are dropped before insert. */
export async function addCandidates(
  phrases: { phrase: string; category?: string }[],
  discoveredOn: string
): Promise<number> {
  if (phrases.length === 0) return 0;
  const existing = await getAllTermKeys();
  const fresh = phrases.filter(
    (p) =>
      p.phrase.trim().length > 2 &&
      !existing.has(p.phrase.trim().toLowerCase()) &&
      slugifyTerm(p.phrase).length > 2
  );
  const rows = fresh.map((p) => ({
    term_id: `term-${slugifyTerm(p.phrase)}`,
    canonical: p.phrase.trim(),
    variants: surfaceVariants(p.phrase.trim()),
    category: p.category ?? null,
    status: "candidate" as const,
    source_of_discovery: discoveredOn,
  }));
  const unique = [...new Map(rows.map((r) => [r.term_id, r])).values()];
  const added = await insertTermsIfNew(unique);
  for (const r of unique.slice(0, added)) {
    await insertTermEvent(r.term_id, "created", { via: "frontier", source: discoveredOn });
  }
  return added;
}

/** Retire candidates older than 21 days that never earned a persistent flag
 *  on any source. Logged per term — silent frontier growth is how a term
 *  registry rots. */
export async function retireStaleCandidates(
  activeTerms: TermRow[],
  today: string
): Promise<string[]> {
  const everFlagged = await getEverFlaggedTermIds();
  const cutoff = Date.parse(`${today}T00:00:00Z`) - CANDIDATE_TTL_DAYS * 86_400_000;
  const stale = activeTerms.filter(
    (t) =>
      t.status === "candidate" &&
      !everFlagged.has(t.term_id) &&
      Date.parse(t.first_seen_at) < cutoff
  );
  for (const t of stale) {
    await setTermStatus(t.term_id, "retired", "retired", {
      reason: `no acceleration within ${CANDIDATE_TTL_DAYS} days`,
      first_seen_at: t.first_seen_at,
    });
  }
  return stale.map((t) => t.term_id);
}

/** Status transitions driven by today's scores:
 *  candidate -> tracked on first persistent flag (it moved, keep measuring);
 *  tracked   -> promoted when breadth >= 2 (accelerating on multiple
 *               independent sources — the layer's actual product). */
export async function applyStatusTransitions(
  activeTerms: TermRow[],
  persistentToday: Set<string>,
  breadthByTerm: Map<string, number>
): Promise<{ promoted: string[]; upgraded: string[] }> {
  const promoted: string[] = [];
  const upgraded: string[] = [];
  for (const t of activeTerms) {
    if (t.status === "candidate" && persistentToday.has(t.term_id)) {
      await setTermStatus(t.term_id, "tracked", "promoted", {
        from: "candidate",
        to: "tracked",
        reason: "first persistent flag",
      });
      upgraded.push(t.term_id);
    }
    const breadth = breadthByTerm.get(t.term_id) ?? 0;
    if ((t.status === "tracked" || t.status === "candidate") && breadth >= 2) {
      await setTermStatus(t.term_id, "promoted", "promoted", {
        to: "promoted",
        breadth,
        reason: "accelerating on multiple independent sources",
      });
      promoted.push(t.term_id);
    }
  }
  return { promoted, upgraded };
}
