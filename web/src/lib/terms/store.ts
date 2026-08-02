import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type {
  CompositeRow,
  ObservationRow,
  ScoreRow,
  SourceId,
  TermRow,
  TermStatus,
} from "@/lib/terms/types";

// Storage boundary for the term signals layer. Like the measured pipeline,
// there is no in-memory fallback: baselines that evaporate on restart cannot
// back a "scored against its own history" guarantee.

function client(): SupabaseClient {
  const c = getSupabaseAdminClient();
  if (!c) {
    throw new Error(
      "Term signals layer requires Supabase (SUPABASE_SERVICE_ROLE_KEY). "
      + "There is deliberately no in-memory fallback for measurement series."
    );
  }
  return c;
}

/** PostgREST caps responses at ~1000 rows; series reads must page. */
const PAGE = 1000;

async function fetchAllPages<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  label: string,
  maxRows = 100_000
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < maxRows; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(`${label}: ${error.message}`);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

// --- terms ------------------------------------------------------------------

/** Insert terms that don't exist yet; existing term_ids are untouched so
 *  status transitions are never clobbered by re-seeding. Returns how many
 *  rows were actually new. */
export async function insertTermsIfNew(rows: Partial<TermRow>[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { error, count } = await client()
    .from("terms")
    .upsert(rows, { onConflict: "term_id", ignoreDuplicates: true, count: "exact" });
  if (error) throw new Error(`terms insert: ${error.message}`);
  return count ?? 0;
}

export async function getActiveTerms(): Promise<TermRow[]> {
  const rows = await fetchAllPages<TermRow>(
    (from, to) =>
      client()
        .from("terms")
        .select("*")
        .in("status", ["candidate", "tracked", "promoted"])
        .order("term_id")
        .range(from, to),
    "terms read"
  );
  return rows.map((r) => ({ ...r, variants: r.variants ?? [] }));
}

export async function getAllTermKeys(): Promise<Set<string>> {
  const rows = await fetchAllPages<{ canonical: string; variants: string[] }>(
    (from, to) =>
      client().from("terms").select("canonical, variants").order("canonical").range(from, to),
    "terms keys read"
  );
  const keys = new Set<string>();
  for (const r of rows) {
    keys.add(r.canonical.toLowerCase());
    for (const v of r.variants ?? []) keys.add(String(v).toLowerCase());
  }
  return keys;
}

export async function setTermStatus(
  termId: string,
  status: TermStatus,
  event: "promoted" | "retired" | "reactivated",
  detail: Record<string, unknown>
): Promise<void> {
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "retired") patch.retired_at = new Date().toISOString();
  const { error } = await client().from("terms").update(patch).eq("term_id", termId);
  if (error) throw new Error(`terms status update: ${error.message}`);
  await insertTermEvent(termId, event, detail);
}

/** Cache a resolved Wikipedia article title on the term so resolution runs
 *  once, not daily. Only positive resolutions are persisted — a term with no
 *  article today may earn one later, and that appearance is itself signal. */
export async function updateTermWikiTitle(
  termId: string,
  wikiTitle: string
): Promise<void> {
  const { error } = await client()
    .from("terms")
    .update({ wiki_title: wikiTitle, updated_at: new Date().toISOString() })
    .eq("term_id", termId);
  if (error) throw new Error(`terms wiki_title update: ${error.message}`);
}

export async function insertTermEvent(
  termId: string,
  event: "created" | "promoted" | "retired" | "reactivated",
  detail: Record<string, unknown>
): Promise<void> {
  const { error } = await client().from("term_events").insert({
    id: `te-${termId}-${event}-${Date.now().toString(36)}`,
    term_id: termId,
    event,
    detail,
  });
  if (error) throw new Error(`term_events insert: ${error.message}`);
}

// --- observations -----------------------------------------------------------

/** Upsert by deterministic id — re-running a date refreshes counts in place,
 *  never double-counts. */
export async function upsertObservations(rows: ObservationRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await client()
    .from("term_observations")
    .upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`term_observations upsert: ${error.message}`);
}

/** Full observation series for a set of terms on one source since a date.
 *  Returned as a map keyed by term_id, each series date-ascending. */
export async function getObservationSeries(
  termIds: string[],
  source: SourceId,
  sinceDate: string
): Promise<Map<string, { date: string; raw_count: number }[]>> {
  const out = new Map<string, { date: string; raw_count: number }[]>();
  if (termIds.length === 0) return out;
  // .in() with hundreds of ids stays well under URL limits at this scale;
  // chunk anyway so growth never hits it.
  for (let i = 0; i < termIds.length; i += 100) {
    const chunk = termIds.slice(i, i + 100);
    const rows = await fetchAllPages<{ term_id: string; obs_date: string; raw_count: number }>(
      (from, to) =>
        client()
          .from("term_observations")
          .select("term_id, obs_date, raw_count")
          .eq("source", source)
          .in("term_id", chunk)
          .gte("obs_date", sinceDate)
          .order("id")
          .range(from, to),
      "term_observations read"
    );
    for (const r of rows) {
      const list = out.get(r.term_id) ?? [];
      list.push({ date: r.obs_date, raw_count: Number(r.raw_count) });
      out.set(r.term_id, list);
    }
  }
  for (const list of out.values()) list.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

/** Per-term observation counts for one source — used to decide who still
 *  needs a baseline backfill. */
export async function getObservationCounts(
  source: SourceId
): Promise<Map<string, number>> {
  const rows = await fetchAllPages<{ term_id: string }>(
    (from, to) =>
      client()
        .from("term_observations")
        .select("term_id")
        .eq("source", source)
        .order("id")
        .range(from, to),
    "term_observations count read"
  );
  const out = new Map<string, number>();
  for (const r of rows) out.set(r.term_id, (out.get(r.term_id) ?? 0) + 1);
  return out;
}

// --- scores -----------------------------------------------------------------

export async function upsertScores(rows: ScoreRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await client()
    .from("term_scores")
    .upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`term_scores upsert: ${error.message}`);
}

/** Earliest persistently-flagged date per (term, source) — the cascade's
 *  "when did each source first fire" input. Persistent rows are sparse, so
 *  reading them all and reducing client-side stays cheap. */
export async function getFirstFiredDates(): Promise<
  Map<string, Partial<Record<SourceId, string>>>
> {
  const rows = await fetchAllPages<{ term_id: string; source: SourceId; score_date: string }>(
    (from, to) =>
      client()
        .from("term_scores")
        .select("term_id, source, score_date")
        .eq("persistent", true)
        .order("id")
        .range(from, to),
    "term_scores first-fired read"
  );
  const out = new Map<string, Partial<Record<SourceId, string>>>();
  for (const r of rows) {
    const rec = out.get(r.term_id) ?? {};
    if (!rec[r.source] || r.score_date < rec[r.source]!) rec[r.source] = r.score_date;
    out.set(r.term_id, rec);
  }
  return out;
}

/** True for terms that have EVER had a persistent flag on any source —
 *  candidates without one for 21 days are retired. */
export async function getEverFlaggedTermIds(): Promise<Set<string>> {
  const rows = await fetchAllPages<{ term_id: string }>(
    (from, to) =>
      client()
        .from("term_scores")
        .select("term_id")
        .eq("persistent", true)
        .order("id")
        .range(from, to),
    "term_scores flagged read"
  );
  return new Set(rows.map((r) => r.term_id));
}

// --- composites -------------------------------------------------------------

export async function upsertComposites(rows: CompositeRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await client()
    .from("term_composites")
    .upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`term_composites upsert: ${error.message}`);
}

export async function getCompositesForDate(date: string): Promise<CompositeRow[]> {
  const rows = await fetchAllPages<CompositeRow>(
    (from, to) =>
      client()
        .from("term_composites")
        .select("*")
        .eq("score_date", date)
        .order("composite_score", { ascending: false })
        .range(from, to),
    "term_composites read"
  );
  return rows;
}

// --- runs & quota -----------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function insertIngestRun(row: Record<string, any>): Promise<void> {
  const { error } = await client().from("ingest_runs").insert(row);
  if (error) throw new Error(`ingest_runs insert: ${error.message}`);
}

export async function getLatestIngestRuns(limit = 14): Promise<any[]> {
  const { data, error } = await client()
    .from("ingest_runs")
    .select("*")
    .order("obs_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`ingest_runs read: ${error.message}`);
  return data ?? [];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getQuotaSpent(source: SourceId, date: string): Promise<number> {
  const { data, error } = await client()
    .from("quota_ledger")
    .select("units_spent")
    .eq("source", source)
    .eq("quota_date", date)
    .maybeSingle();
  if (error) throw new Error(`quota_ledger read: ${error.message}`);
  return Number(data?.units_spent ?? 0);
}

/** Read-modify-write is fine here: one daily process owns the ledger. If a
 *  second concurrent writer ever appears, move this to an RPC increment. */
export async function addQuotaSpent(
  source: SourceId,
  date: string,
  units: number
): Promise<void> {
  const current = await getQuotaSpent(source, date);
  const { error } = await client().from("quota_ledger").upsert(
    {
      id: `${source}|${date}`,
      source,
      quota_date: date,
      units_spent: current + units,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) throw new Error(`quota_ledger upsert: ${error.message}`);
}
