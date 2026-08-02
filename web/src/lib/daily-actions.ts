import type { Trend } from "@/types";
import { getTrends } from "@/lib/data";
import type { CompositeRow, TermRow } from "@/lib/terms/types";
import { buildTrendHistories, type TrendHistory } from "@/lib/pipeline/backfill";
import { decideTrend } from "@/lib/trend-decision";

// ---------------------------------------------------------------------------
// "Do this now" — the first thing a user sees. Exactly three calls computed
// from measured state, each with its receipt spelled out:
//   Join  — the best measured rising trend worth posting on today
//   Watch — the strongest term firing that isn't a trend yet
//   Skip  — the crowded thing not worth new effort
// No LLM in the loop: these are arithmetic over composites and lifecycle
// stages, so the advice is exactly as good as the measurement — and says so.
// ---------------------------------------------------------------------------

export interface DailyAction {
  verb: "Join" | "Watch" | "Skip";
  headline: string;
  /** One sentence of why, containing the measured receipt. */
  detail: string;
  href: string;
  cta: string;
  briefHref?: string;
  window: string;
  change: string;
  confidence: "unverified" | "low" | "medium" | "high";
  evidence: string;
}

const JOIN_STAGES = new Set(["emerging", "accelerating", "resurfacing"]);

async function measuredState(): Promise<{
  composites: Map<string, CompositeRow>;
  terms: TermRow[];
}> {
  try {
    const { getActiveTerms, getLatestComposites } = await import(
      "@/lib/terms/store"
    );
    const sinceDate = new Date(Date.now() - 5 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const [composites, terms] = await Promise.all([
      getLatestComposites(sinceDate),
      getActiveTerms(),
    ]);
    return { composites, terms };
  } catch {
    // Mock mode / store down — actions fall back to lifecycle stages only.
    return { composites: new Map(), terms: [] };
  }
}

function sourcesLabel(c: CompositeRow): string {
  const names: Record<string, string> = {
    bluesky: "Bluesky",
    reddit: "Reddit",
    google_trends: "Google search",
    tiktok: "TikTok",
    youtube: "YouTube",
    wikipedia: "Wikipedia",
  };
  return c.sources_flagged.map((s) => names[s] ?? s).join(" + ");
}

export async function buildDailyActions(): Promise<DailyAction[]> {
  const [trends, { composites, terms }, histories] = await Promise.all([
    getTrends(),
    measuredState(),
    buildTrendHistories(12).catch(() => [] as TrendHistory[]),
  ]);
  const actions: DailyAction[] = [];
  const historyBySlug = new Map(histories.map((history) => [history.slug, history]));
  const decisionFor = (trend: Trend) =>
    decideTrend(trend, historyBySlug.get(trend.slug));

  // Composite for a trend, via its linked term.
  const byTrendId = new Map<string, CompositeRow>();
  for (const t of terms) {
    if (!t.trend_id) continue;
    const c = composites.get(t.term_id);
    if (c) byTrendId.set(t.trend_id, c);
  }

  // --- Join: measured breadth first, then momentum -------------------------
  const joinPool = trends
    .filter((t) => JOIN_STAGES.has(t.lifecycle_stage))
    .sort((a, b) => {
      const ba = byTrendId.get(a.id)?.breadth ?? 0;
      const bb = byTrendId.get(b.id)?.breadth ?? 0;
      if (bb !== ba) return bb - ba;
      return b.momentum_score - a.momentum_score;
    });
  const join = joinPool.find((trend) => decisionFor(trend).action === "Act");
  if (join) {
    const c = byTrendId.get(join.id);
    const decision = decisionFor(join);
    actions.push({
      verb: "Join",
      headline: `Post on “${join.name}” this week`,
      detail: c && c.breadth >= 1
        ? `Firing on ${sourcesLabel(c)} at once (breadth ${c.breadth}) and still ${join.lifecycle_stage} — saturation ${join.saturation_score}% means room to lead.`
        : `${cap(join.lifecycle_stage)} at momentum ${join.momentum_score} with saturation ${join.saturation_score}% — early enough to matter.`,
      href: `/trends/${join.slug}`,
      cta: "See the evidence",
      briefHref: `/brief?trend=${join.slug}`,
      window: decision.window,
      change: decision.change,
      confidence: decision.confidence,
      evidence: decision.evidence,
    });
  }

  // --- Watch: strongest firing term that isn't a trend yet -----------------
  const termById = new Map(terms.map((t) => [t.term_id, t]));
  const watchRow = [...composites.values()]
    .filter((c) => {
      const t = termById.get(c.term_id);
      return c.breadth >= 1 && t && !t.trend_id && t.status !== "retired";
    })
    .sort((a, b) => b.composite_score - a.composite_score)[0];
  const watchTerm = watchRow ? termById.get(watchRow.term_id) : undefined;
  if (watchRow && watchTerm) {
    actions.push({
      verb: "Watch",
      headline: `Keep an eye on “${watchTerm.canonical}”`,
      detail: `Accelerating on ${sourcesLabel(watchRow)} but not yet a trend — if a second platform fires it gets promoted, and early movers win that window.`,
      href: "/signals",
      cta: "Open Signals",
      window: watchRow.breadth >= 2 ? "Confirmation forming" : "Early signal",
      change: `${cap(watchRow.cascade_state)} on ${watchRow.breadth} source${watchRow.breadth === 1 ? "" : "s"}`,
      confidence: watchRow.breadth >= 2 ? "medium" : "low",
      evidence: `${watchRow.sources_flagged.length} source${watchRow.sources_flagged.length === 1 ? "" : "s"} firing`,
    });
  } else {
    const fresh = trends
      .filter((t) => t.created_at)
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0];
    if (fresh && fresh.slug !== join?.slug) {
      const decision = decisionFor(fresh);
      actions.push({
        verb: "Watch",
        headline: `New on the board: “${fresh.name}”`,
        detail: `Just entered the library as ${fresh.lifecycle_stage} — watch whether measurement confirms it before committing effort.`,
        href: `/trends/${fresh.slug}`,
        cta: "See the trend",
        window: decision.window,
        change: decision.change,
        confidence: decision.confidence,
        evidence: decision.evidence,
      });
    }
  }

  // --- Skip: the crowded room ----------------------------------------------
  const skip = trends
    .filter(
      (t) =>
        t.lifecycle_stage === "declining" ||
        (t.lifecycle_stage === "saturated" && t.saturation_score >= 60)
    )
    .sort((a, b) => b.saturation_score - a.saturation_score)[0];
  if (skip) {
    const decision = decisionFor(skip);
    actions.push({
      verb: "Skip",
      headline: `Don't start on “${skip.name}”`,
      detail: `${cap(skip.lifecycle_stage)} at saturation ${skip.saturation_score}% — the room is already full; put that effort into the join above.`,
      href: `/trends/${skip.slug}`,
      cta: "See why",
      window: decision.window,
      change: decision.change,
      confidence: decision.confidence,
      evidence: decision.evidence,
    });
  }

  return actions;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
