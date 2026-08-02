import type { Metadata } from "next";
import { Radio } from "lucide-react";
import { getTrends } from "@/lib/data";
import { slugifyTerm } from "@/lib/terms/registry";
import { Card } from "@/components/ui/card";
import { SignalsDesk, type SignalRowData } from "@/components/SignalsDesk";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signals — WaveSight",
  description:
    "The discovery frontier: every term the measurement layer is watching, which platforms are firing, and the queue of candidates waiting for a human call.",
};

// The Signals Desk — the measurement layer's frontier, made touchable.
// Everything the daily crons discover flows through here BEFORE it becomes a
// library trend: frontier candidates wait for acceleration (or your call),
// tracked terms accumulate baselines, firing terms show exactly which
// platforms lit up. Track, dismiss, or promote — the loop listens.

interface DeskData {
  rows: SignalRowData[];
  lastIngest: { date: string; sourcesOk: number; sourcesTotal: number } | null;
}

async function loadDesk(): Promise<DeskData | null> {
  try {
    const [{ getActiveTerms, getLatestComposites, getLatestIngestRuns }, trends] =
      await Promise.all([import("@/lib/terms/store"), getTrends()]);
    const sinceDate = new Date(Date.now() - 7 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const [terms, composites, runs] = await Promise.all([
      getActiveTerms(),
      getLatestComposites(sinceDate),
      getLatestIngestRuns(1).catch(() => []),
    ]);

    const trendById = new Map(trends.map((t) => [t.id, t]));
    const trendByTermSlug = new Map(
      trends.map((t) => [`term-${slugifyTerm(t.name)}`, t])
    );

    const rows: SignalRowData[] = terms.map((term) => {
      const c = composites.get(term.term_id);
      const trend =
        (term.trend_id ? trendById.get(term.trend_id) : undefined) ??
        trendByTermSlug.get(term.term_id);
      return {
        term_id: term.term_id,
        canonical: term.canonical,
        status: term.status,
        category: term.category,
        source_of_discovery: term.source_of_discovery,
        first_seen_at: term.first_seen_at,
        cascade_state: c?.cascade_state ?? null,
        breadth: c?.breadth ?? 0,
        composite_score: c?.composite_score ?? 0,
        sources_flagged: c?.sources_flagged ?? [],
        sources_available: c?.sources_available ?? [],
        lead_estimate_days: c?.lead_estimate_days ?? null,
        trend_slug: trend?.slug ?? null,
      };
    });

    const run = runs[0] ?? null;
    const sources = run?.sources ?? {};
    const sourceStats = Object.values(
      sources as Record<string, { status?: string }>
    );
    return {
      rows,
      lastIngest: run
        ? {
            date: String(run.obs_date ?? ""),
            sourcesOk: sourceStats.filter((s) => s.status === "ok").length,
            sourcesTotal: sourceStats.length,
          }
        : null,
    };
  } catch {
    // Term layer needs Supabase; without it the desk explains itself below.
    return null;
  }
}

export default async function SignalsPage() {
  const desk = await loadDesk();

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2.5">
          <h1 className="font-display text-3xl">Signals</h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-tint px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-strong">
            <Radio className="size-3" /> Discovery frontier
          </span>
        </div>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Every term the measurement layer watches across Bluesky, Reddit,
          Google&nbsp;Trends, YouTube, and Wikipedia — before it becomes a
          trend. Firing means real counts accelerating against the term&apos;s
          own baseline. You make the calls the machine can&apos;t: track it,
          dismiss it, or promote it to the library now.
        </p>
      </header>

      {desk ? (
        <SignalsDesk rows={desk.rows} lastIngest={desk.lastIngest} />
      ) : (
        <Card className="flex items-center justify-center border-dashed">
          <div className="max-w-md px-6 py-16 text-center text-muted-foreground">
            The Signals Desk reads the measurement tables, which need Supabase
            configured (<span className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</span>).
            Once connected, the daily ingestion run fills this page with the
            live term frontier.
          </div>
        </Card>
      )}
    </div>
  );
}
