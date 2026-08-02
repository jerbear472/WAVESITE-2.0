import { enabledAdapters, ADAPTERS } from "@/lib/terms/adapters";
import { computeComposite, type SourceSignal } from "@/lib/terms/cascade";
import { extractFrontierPhrases, newSpendMeter } from "@/lib/terms/frontier";
import { scoreTermSource } from "@/lib/terms/normalize";
import {
  addCandidates,
  applyStatusTransitions,
  retireStaleCandidates,
  seedFromTrendLibrary,
} from "@/lib/terms/registry";
import {
  addQuotaSpent,
  getFirstFiredDates,
  getActiveTerms,
  getObservationCounts,
  getObservationSeries,
  getObservedTermIds,
  getQuotaSpent,
  insertIngestRun,
  upsertComposites,
  upsertObservations,
  upsertScores,
} from "@/lib/terms/store";
import { getConfig, getItemsInWindow } from "@/lib/pipeline/store";
import {
  DEFAULT_SCORING_CONFIG,
  SOURCE_IDS,
  type CompositeRow,
  type ObservationRow,
  type ScoreRow,
  type SourceAdapter,
  type SourceId,
  type TermRow,
  type TermScoringConfig,
} from "@/lib/terms/types";

// The daily term ingestion run. Design invariants:
//   - Idempotent: observations/scores/composites key on (term, source, date);
//     re-running a date refreshes rows in place, never double-counts.
//   - No hard dependencies: every adapter runs inside its own try; a run
//     with three of five sources still completes and still scores, with
//     breadth over available sources and the missing ones recorded.
//   - Quota is spent through the ledger with a hard stop BEFORE the platform
//     cap, and the spend is pre-recorded so a crash can't lose it.
//   - Measurements, not content: adapters return counts + a provenance link;
//     context texts for frontier extraction live and die in this function.

const EXCERPT_MAX = 200;
/** Consecutive failures before an adapter is declared down for the run — no
 *  point burning 100 timeouts to learn the API changed. The threshold is
 *  lower before any success (source clearly down) than mid-run (transient
 *  blips deserve a little patience; a platform-side quota 429 does not). */
const ABORT_AFTER_CONSECUTIVE_FAILURES = 3;
const ABORT_AFTER_MIDRUN_FAILURES = 5;
/** Wikipedia is the only source with real history; new terms get this much
 *  backfill to seed baselines, capped per run to bound latency. */
const BACKFILL_DAYS = 120;
const BACKFILL_TERMS_PER_RUN = 25;
/** The unofficial Google Trends path is slow (1.5s/term) and fragile; cap
 *  how many terms it visits so it can never eat the 300s function budget. */
const GTRENDS_MAX_TERMS = Number(process.env.TERMS_GTRENDS_MAX || 60);
/** tiktok (tikwm mirror) is the same shape, and a term whose name isn't a
 *  real hashtag costs up to 2 lookups (~3s with throttle). Adapters run
 *  sequentially, so this shares the 300s budget with the gtrends pass —
 *  hence the lower default. */
const TIKTOK_MAX_TERMS = Number(process.env.TERMS_TIKTOK_MAX || 40);

const TERM_CAPS: Partial<Record<SourceId, number>> = {
  google_trends: GTRENDS_MAX_TERMS,
  tiktok: TIKTOK_MAX_TERMS,
};

interface SourceRunStats {
  status: "ok" | "failed" | "disabled" | "budget_exhausted";
  reason?: string;
  terms_queried: number;
  terms_skipped: number;
  /** Terms skipped because a same-day run already observed them (no spend). */
  terms_cached?: number;
  observations: number;
  failures: number;
  first_error?: string;
  latency_ms: number;
  quota_units: number;
}

export interface TermRunReport {
  run_id: string;
  obs_date: string;
  terms_active: number;
  sources: Record<string, SourceRunStats>;
  sources_missing: SourceId[];
  scored: number;
  composites: number;
  cascade_counts: Record<string, number>;
  candidates_added: number;
  candidates_retired: string[];
  promoted: string[];
  ai_spend: ReturnType<typeof newSpendMeter>;
  notes: string[];
}

function yesterdayUtc(): string {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const statusRank: Record<TermRow["status"], number> = {
  promoted: 0,
  tracked: 1,
  candidate: 2,
  retired: 3,
};

/** Deterministic daily rotation within each status group. Promoted/tracked
 *  terms still outrank candidates, but within a group the starting point
 *  advances with the date — so a budget that only covers 50 of 110 terms
 *  covers a DIFFERENT 50 tomorrow instead of the same head-of-list forever. */
function rotateWithinStatus(terms: TermRow[], obsDate: string): TermRow[] {
  const day = Math.floor(Date.parse(`${obsDate}T00:00:00Z`) / 86_400_000);
  const out: TermRow[] = [];
  for (const status of Object.keys(statusRank) as TermRow["status"][]) {
    const group = terms.filter((t) => t.status === status);
    if (group.length === 0) continue;
    const offset = day % group.length;
    out.push(...group.slice(offset), ...group.slice(0, offset));
  }
  return out;
}

export async function runTermIngestion(
  opts: { date?: string } = {}
): Promise<TermRunReport> {
  const obsDate = opts.date ?? yesterdayUtc();
  const runId = `terms-${obsDate}-${Date.now().toString(36)}`;
  const startedAt = new Date().toISOString();
  const notes: string[] = [];

  const cfg: TermScoringConfig = {
    ...DEFAULT_SCORING_CONFIG,
    ...((await getConfig<Partial<TermScoringConfig>>("term_scoring").catch(
      () => null
    )) ?? {}),
  };

  const seeded = await seedFromTrendLibrary();
  if (seeded > 0) notes.push(`seeded ${seeded} terms from trend library`);

  const terms = (await getActiveTerms()).sort(
    (a, b) => statusRank[a.status] - statusRank[b.status]
  );

  // --- 1. COLLECT — each adapter isolated, throttled, budgeted -------------
  const sourceStats: Record<string, SourceRunStats> = {};
  const contextsBySource = new Map<SourceId, string[]>();
  const active = enabledAdapters();

  for (const adapter of ADAPTERS) {
    if (!active.includes(adapter)) {
      sourceStats[adapter.source] = {
        status: "disabled",
        reason: adapter.disabledReason() ?? "disabled",
        terms_queried: 0,
        terms_skipped: terms.length,
        observations: 0,
        failures: 0,
        latency_ms: 0,
        quota_units: 0,
      };
      continue;
    }
    const cap = TERM_CAPS[adapter.source];
    const budgeted = (adapter.rateLimit.dailyUnits ?? 0) > 0;
    let list = terms;
    let cached = 0;
    if (cap || budgeted) {
      // Scarce adapters (unit budget or per-run cap) can't visit every term
      // every day. Two rules make the scarcity fair instead of starving the
      // tail of the list forever: (1) skip terms a same-day run already
      // observed, so reruns extend coverage instead of re-buying it, and
      // (2) rotate the order by date, so the covered slice moves daily.
      try {
        const observed = await getObservedTermIds(adapter.source, obsDate);
        cached = terms.filter((t) => observed.has(t.term_id)).length;
        list = terms.filter((t) => !observed.has(t.term_id));
      } catch {
        // Read failure just means no skip optimization this run.
      }
      list = rotateWithinStatus(list, obsDate);
      if (cap) list = list.slice(0, cap);
    }
    const stats = await collectFromAdapter(
      adapter,
      list,
      obsDate,
      contextsBySource
    );
    if (cached > 0) stats.terms_cached = cached;
    sourceStats[adapter.source] = stats;
  }

  // --- 2. BACKFILL — wikipedia seeds baselines for history-poor terms ------
  if (sourceStats.wikipedia?.status === "ok" && wikipediaOf()) {
    try {
      const backfilled = await backfillWikipedia(obsDate);
      if (backfilled > 0) notes.push(`wikipedia backfill: ${backfilled} terms`);
    } catch (err) {
      notes.push(`wikipedia backfill failed: ${msg(err)}`);
    }
  }

  // --- 3. SCORE — every (term, source) against its own baseline ------------
  const sinceDate = new Date(
    Date.parse(`${obsDate}T00:00:00Z`) - (cfg.percentile_days + 5) * 86_400_000
  )
    .toISOString()
    .slice(0, 10);

  const scoreRows: ScoreRow[] = [];
  const todayBySource = new Map<SourceId, Map<string, ScoreRow>>();
  const zBySource: Record<string, number[]> = {};

  for (const source of SOURCE_IDS) {
    if (sourceStats[source]?.observations === undefined) continue;
    const series = await getObservationSeries(
      terms.map((t) => t.term_id),
      source,
      sinceDate
    );
    const byTerm = new Map<string, ScoreRow>();
    for (const term of terms) {
      const s = series.get(term.term_id) ?? [];
      if (!s.some((p) => p.date === obsDate)) continue; // no obs today
      const day = scoreTermSource(s, obsDate, cfg, cfg.volume_floor[source]);
      const row: ScoreRow = {
        id: `${term.term_id}|${source}|${obsDate}`,
        term_id: term.term_id,
        source,
        score_date: obsDate,
        raw_count: day.raw_count,
        baseline_mean: day.baseline_mean,
        baseline_sd: day.baseline_sd,
        baseline_n: day.baseline_n,
        z_score: day.z_score,
        percentile: day.percentile,
        suppressed: day.suppressed,
        flagged: day.flagged,
        persistent: day.persistent,
      };
      scoreRows.push(row);
      byTerm.set(term.term_id, row);
      if (day.z_score !== null) {
        (zBySource[source] ??= []).push(day.z_score);
      }
    }
    todayBySource.set(source, byTerm);
  }
  await upsertScores(scoreRows);

  // --- 4. COMPOSITE + CASCADE ----------------------------------------------
  const firstFired = await getFirstFiredDates();
  const missing = SOURCE_IDS.filter(
    (s) => sourceStats[s]?.status !== "ok"
  );

  const compositeRows: CompositeRow[] = [];
  const cascadeCounts: Record<string, number> = {};
  const breadthByTerm = new Map<string, number>();
  const persistentToday = new Set<string>();

  for (const term of terms) {
    const fired = firstFired.get(term.term_id) ?? {};
    const signals: SourceSignal[] = SOURCE_IDS.map((source) => {
      const today = todayBySource.get(source)?.get(term.term_id);
      if (today?.persistent) persistentToday.add(term.term_id);
      return {
        source,
        available: Boolean(today),
        flagged: Boolean(today?.persistent),
        z_score: today?.z_score ?? null,
        first_fired: fired[source] ?? null,
      };
    });
    if (signals.every((s) => !s.available) && Object.keys(fired).length === 0) {
      continue; // nothing measured, nothing ever fired — no row
    }
    const c = computeComposite(signals);
    breadthByTerm.set(term.term_id, c.breadth);
    cascadeCounts[c.cascade_state] = (cascadeCounts[c.cascade_state] ?? 0) + 1;
    compositeRows.push({
      id: `${term.term_id}|${obsDate}`,
      term_id: term.term_id,
      score_date: obsDate,
      breadth: c.breadth,
      composite_score: c.composite_score,
      cascade_state: c.cascade_state,
      lead_estimate_days: c.lead_estimate_days,
      sources_available: c.sources_available,
      sources_flagged: c.sources_flagged,
      sources_missing: missing,
      first_fired: fired,
    });
  }
  await upsertComposites(compositeRows);

  // --- 5. REGISTRY MAINTENANCE — transitions + logged retirement -----------
  const { promoted } = await applyStatusTransitions(
    terms,
    persistentToday,
    breadthByTerm
  );
  const retired = await retireStaleCandidates(terms, obsDate);

  // --- 6. FRONTIER — one batched AI call per source, metered ---------------
  // Term-query context runs dry when tracked terms don't match real language
  // (day one: a registry seeded from editorial names). The measured
  // pipeline's sweep corpus — hot/rising titles with NO term filter — is
  // already stored, so borrowing yesterday's titles as context adds zero new
  // content storage and breaks the bootstrap deadlock.
  await supplementContextsFromSweep(contextsBySource, obsDate, notes);
  const meter = newSpendMeter();
  let candidatesAdded = 0;
  const tracked = terms.filter((t) => t.status !== "candidate");
  for (const [source, texts] of contextsBySource) {
    const phrases = await extractFrontierPhrases(source, texts, tracked, meter);
    if (phrases.length > 0) {
      candidatesAdded += await addCandidates(phrases, source);
    }
  }
  if (meter.exceeded) {
    console.error(
      `[terms/run] ALERT: AI spend $${meter.est_usd} exceeded ceiling $${meter.ceiling_usd}`
    );
    notes.push(`AI SPEND CEILING EXCEEDED: $${meter.est_usd} >= $${meter.ceiling_usd}`);
  }

  // --- 7. INSTRUMENT -------------------------------------------------------
  const zDistributions = Object.fromEntries(
    Object.entries(zBySource).map(([s, zs]) => [s, distStats(zs)])
  );

  const report: TermRunReport = {
    run_id: runId,
    obs_date: obsDate,
    terms_active: terms.length,
    sources: sourceStats,
    sources_missing: missing,
    scored: scoreRows.length,
    composites: compositeRows.length,
    cascade_counts: cascadeCounts,
    candidates_added: candidatesAdded,
    candidates_retired: retired,
    promoted,
    ai_spend: meter,
    notes,
  };

  await insertIngestRun({
    run_id: runId,
    obs_date: obsDate,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    sources: sourceStats,
    ai_spend: meter,
    cascade_counts: cascadeCounts,
    z_distributions: zDistributions,
    terms_active: terms.length,
    candidates_added: candidatesAdded,
    candidates_retired: retired.length,
    notes: notes.join(" | ") || null,
  });

  return report;
}

// --- helpers ----------------------------------------------------------------

async function collectFromAdapter(
  adapter: SourceAdapter,
  terms: TermRow[],
  obsDate: string,
  contextsBySource: Map<SourceId, string[]>
): Promise<SourceRunStats> {
  const stats: SourceRunStats = {
    status: "ok",
    terms_queried: 0,
    terms_skipped: 0,
    observations: 0,
    failures: 0,
    latency_ms: 0,
    quota_units: 0,
  };
  const started = Date.now();
  const capturedAt = new Date().toISOString();
  const observations: ObservationRow[] = [];
  const contexts: string[] = [];
  let consecutiveFailures = 0;

  const unitCost = adapter.rateLimit.unitsPerQuery ?? 0;
  const budget = adapter.rateLimit.dailyUnits ?? Infinity;
  let spent =
    unitCost > 0 ? await getQuotaSpent(adapter.source, obsDate) : 0;

  for (const term of terms) {
    // Hard stop BEFORE the cap: skip, don't trim, once budget is gone.
    if (unitCost > 0 && spent + unitCost > budget) {
      stats.status = "budget_exhausted";
      stats.reason = `quota budget ${budget} units reached`;
      stats.terms_skipped = terms.length - stats.terms_queried;
      break;
    }
    if (unitCost > 0) {
      // Pre-record spend so a crash mid-call can't leak past the cap.
      await addQuotaSpent(adapter.source, obsDate, unitCost);
      spent += unitCost;
      stats.quota_units += unitCost;
    }
    try {
      const result = await adapter.countForDate(term, obsDate);
      stats.terms_queried++;
      consecutiveFailures = 0;
      if (result.context_texts) contexts.push(...result.context_texts);
      if (result.raw_count !== null) {
        observations.push({
          id: `${term.term_id}|${adapter.source}|${obsDate}`,
          term_id: term.term_id,
          source: adapter.source,
          obs_date: obsDate,
          raw_count: result.raw_count,
          approximate: result.approximate ?? false,
          meta: result.meta
            ? {
                ...result.meta,
                excerpt: result.meta.excerpt?.slice(0, EXCERPT_MAX),
              }
            : null,
          captured_at: capturedAt,
        });
      }
    } catch (err) {
      stats.failures++;
      consecutiveFailures++;
      if (!stats.first_error) stats.first_error = msg(err);
      const sourceDown =
        consecutiveFailures >= ABORT_AFTER_CONSECUTIVE_FAILURES &&
        stats.terms_queried === 0;
      const sourceDied = consecutiveFailures >= ABORT_AFTER_MIDRUN_FAILURES;
      if (sourceDown || sourceDied) {
        // The source is down (or died mid-run), not the terms. Stop before
        // more quota units are pre-charged against doomed calls.
        stats.status = "failed";
        stats.reason = stats.first_error;
        stats.terms_skipped =
          terms.length - stats.terms_queried - stats.failures;
        break;
      }
    }
    await sleep(adapter.rateLimit.minIntervalMs);
  }

  try {
    await upsertObservations(observations);
    stats.observations = observations.length;
  } catch (err) {
    stats.status = "failed";
    stats.reason = `persist: ${msg(err)}`;
  }
  if (contexts.length > 0) contextsBySource.set(adapter.source, contexts);
  stats.latency_ms = Date.now() - started;
  if (stats.status === "failed") {
    console.error(`[terms/run] adapter ${adapter.source} failed: ${stats.reason}`);
  }
  return stats;
}

/** Top up thin per-source frontier context with titles from the measured
 *  pipeline's sweep corpus (last 2 days). Read-only reuse of rows that
 *  already exist; sources outside the sweep (bluesky etc.) are untouched. */
async function supplementContextsFromSweep(
  contextsBySource: Map<SourceId, string[]>,
  obsDate: string,
  notes: string[]
): Promise<void> {
  const MIN_CONTEXTS = 10;
  const MAX_BORROWED = 80;
  const needy: SourceId[] = (["reddit", "youtube"] as SourceId[]).filter(
    (s) => (contextsBySource.get(s)?.length ?? 0) < MIN_CONTEXTS
  );
  if (needy.length === 0) return;
  try {
    const from = new Date(Date.parse(`${obsDate}T00:00:00Z`) - 86_400_000)
      .toISOString();
    const to = new Date(Date.parse(`${obsDate}T00:00:00Z`) + 86_400_000)
      .toISOString();
    const sweep = await getItemsInWindow("sweep", from, to);
    for (const source of needy) {
      const titles = sweep
        .filter((i) => i.source === source && typeof i.title === "string")
        .map((i) => (i.title as string).slice(0, 140))
        .slice(0, MAX_BORROWED);
      if (titles.length === 0) continue;
      const existing = contextsBySource.get(source) ?? [];
      contextsBySource.set(source, [...existing, ...titles]);
      notes.push(`frontier: borrowed ${titles.length} sweep titles for ${source}`);
    }
  } catch (err) {
    notes.push(`frontier sweep borrow failed: ${msg(err)}`);
  }
}

function wikipediaOf() {
  return ADAPTERS.find((a) => a.source === "wikipedia" && a.backfill);
}

async function backfillWikipedia(obsDate: string): Promise<number> {
  const adapter = wikipediaOf();
  if (!adapter?.backfill) return 0;
  const counts = await getObservationCounts("wikipedia");
  // Re-read terms: today's collection pass just wrote freshly resolved
  // wiki_titles, and those terms — the ones with a real article — are the
  // only ones a backfill can actually fill. They go first; unresolved terms
  // use any remaining slots to attempt resolution.
  const fresh = await getActiveTerms();
  const needy = fresh
    .filter((t) => (counts.get(t.term_id) ?? 0) < 40)
    .sort((a, b) => Number(Boolean(b.wiki_title)) - Number(Boolean(a.wiki_title)))
    .slice(0, BACKFILL_TERMS_PER_RUN);
  const from = new Date(
    Date.parse(`${obsDate}T00:00:00Z`) - BACKFILL_DAYS * 86_400_000
  )
    .toISOString()
    .slice(0, 10);

  let filled = 0;
  for (const term of needy) {
    try {
      const days = await adapter.backfill(term, from, obsDate);
      if (days.length === 0) continue;
      const capturedAt = new Date().toISOString();
      await upsertObservations(
        days.map((d) => ({
          id: `${term.term_id}|wikipedia|${d.date}`,
          term_id: term.term_id,
          source: "wikipedia" as const,
          obs_date: d.date,
          raw_count: d.raw_count,
          approximate: false,
          meta: null,
          captured_at: capturedAt,
        }))
      );
      filled++;
    } catch (err) {
      console.error(`[terms/run] backfill ${term.term_id} failed: ${msg(err)}`);
    }
    await sleep(adapter.rateLimit.minIntervalMs);
  }
  return filled;
}

export interface ZDistribution {
  n: number;
  min: number;
  max: number;
  mean: number;
  sd: number;
  p50: number;
}

/** Distribution shape of a source's z-scores. Compression or collapse here
 *  is how we find out the pipeline broke — a healthy day has spread; a
 *  single-value pileup means an adapter started returning constants. */
export function distStats(values: number[]): ZDistribution | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const sd = Math.sqrt(sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  return {
    n,
    min: round2(sorted[0]),
    max: round2(sorted[n - 1]),
    mean: round2(mean),
    sd: round2(sd),
    p50: round2(sorted[Math.floor(n / 2)]),
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
