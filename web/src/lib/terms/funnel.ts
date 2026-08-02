import { getSupabaseAdminClient } from "@/lib/supabase";
import type { SourceId } from "@/lib/terms/types";

// Real numbers for the scan funnel — every figure is a row count from the
// measurement layer, never an invented counter. The funnel narrates the
// actual architecture: collected signals -> per-term daily measurements ->
// tracked terms -> accelerating vs own baseline -> confirmed on 2+ sources.
// Early on the bottom stages are honestly zero (baselines still building);
// the UI labels that instead of faking motion.

export interface FunnelSnapshot {
  as_of: string | null; // latest scored day, if any
  signals_collected: number; // raw_items corpus rows (measured pipeline)
  term_measurements: number; // term_observations rows (counts, all sources)
  terms_tracked: number; // active registry terms
  accelerating: number; // term_scores flagged on the latest day
  persistent: number; // persistent (3-of-5) on the latest day
  cross_source: number; // composites with breadth >= 2 on the latest day
  observations_by_source: Partial<Record<SourceId, number>>; // latest day
}

async function countRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any
): Promise<number> {
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Null when Supabase isn't configured — the scan simply omits the funnel. */
export async function getFunnelSnapshot(): Promise<FunnelSnapshot | null> {
  const c = getSupabaseAdminClient();
  if (!c) return null;

  const head = { count: "exact" as const, head: true };

  const { data: latest, error: latestErr } = await c
    .from("term_scores")
    .select("score_date")
    .order("score_date", { ascending: false })
    .limit(1);
  if (latestErr) throw new Error(latestErr.message);
  const asOf = latest?.[0]?.score_date ?? null;

  const [signals, measurements, terms] = await Promise.all([
    countRows(c.from("raw_items").select("id", head)),
    countRows(c.from("term_observations").select("id", head)),
    countRows(
      c.from("terms").select("term_id", head).in("status", [
        "candidate",
        "tracked",
        "promoted",
      ])
    ),
  ]);

  let accelerating = 0;
  let persistent = 0;
  let crossSource = 0;
  const bySource: Partial<Record<SourceId, number>> = {};

  if (asOf) {
    [accelerating, persistent, crossSource] = await Promise.all([
      countRows(
        c.from("term_scores").select("id", head).eq("score_date", asOf).eq("flagged", true)
      ),
      countRows(
        c.from("term_scores").select("id", head).eq("score_date", asOf).eq("persistent", true)
      ),
      countRows(
        c.from("term_composites").select("id", head).eq("score_date", asOf).gte("breadth", 2)
      ),
    ]);

    const { data: obs, error: obsErr } = await c
      .from("term_observations")
      .select("source")
      .eq("obs_date", asOf)
      .limit(2000);
    if (obsErr) throw new Error(obsErr.message);
    for (const row of obs ?? []) {
      const s = row.source as SourceId;
      bySource[s] = (bySource[s] ?? 0) + 1;
    }
  }

  return {
    as_of: asOf,
    signals_collected: signals,
    term_measurements: measurements,
    terms_tracked: terms,
    accelerating,
    persistent,
    cross_source: crossSource,
    observations_by_source: bySource,
  };
}
