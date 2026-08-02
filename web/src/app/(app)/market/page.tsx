import type { Metadata } from "next";
import Link from "next/link";
import {
  Archive,
  CheckCircle2,
  Flame,
  Radio,
  Target,
  TrendingUp,
} from "lucide-react";
import { getTrends, getFilterOptions } from "@/lib/data";
import { getPulseState } from "@/lib/pulse";
import { getCalibration } from "@/lib/forecasts";
import { provenanceForTrend } from "@/lib/provenance";
import { lifecycleBadge } from "@/lib/trend-format";
import { StatCard } from "@/components/StatCard";
import { HarmonyBoard } from "@/components/HarmonyBoard";
import { RadarTabs } from "@/components/RadarTabs";
import { buttonVariants } from "@/components/ui/button";
import type { LifecycleStage, Trend } from "@/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Market — WaveSight",
  description:
    "What the culture is doing, with receipts: every trend on the board carries its provenance — measured, web-scanned, or imported. Unverified suggestions wait on the shelf.",
};

// The Market — the trend library as a market board you can believe. Trust
// hierarchy is explicit: verified trends (measured / web-scanned / imported /
// corpus-matched) make the board; model-suggested trends without receipts
// live on a collapsed shelf until the measurement layer finds them.

async function firingCount(): Promise<number> {
  try {
    const { getLatestComposites } = await import("@/lib/terms/store");
    const sinceDate = new Date(Date.now() - 3 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const composites = await getLatestComposites(sinceDate);
    return [...composites.values()].filter((c) => c.sources_flagged.length > 0)
      .length;
  } catch {
    return 0;
  }
}

export default async function MarketPage() {
  const [pulse, trends, options, calibration, firing] = await Promise.all([
    getPulseState(),
    getTrends(),
    getFilterOptions(),
    getCalibration(90).catch(() => null),
    firingCount(),
  ]);
  const lastRun = pulse.lastRun;

  const verified = trends.filter((t) => provenanceForTrend(t).verified);
  const unverified = trends.filter((t) => !provenanceForTrend(t).verified);
  const harmonizedVerified = pulse.trends.filter(
    (t) => provenanceForTrend(t).verified
  );

  const hitRate =
    calibration?.hit_rate.value !== null && calibration?.hit_rate.value !== undefined
      ? `${Math.round(calibration.hit_rate.value * 100)}%`
      : "—";

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Market</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            What the culture is doing — every trend on the board carries its
            receipts. Upstream, the{" "}
            <Link href="/signals" className="text-primary-strong underline underline-offset-2">
              Signals desk
            </Link>{" "}
            shows what&apos;s about to arrive.
            {lastRun
              ? ` Last run ${new Date(lastRun.ran_at).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}.`
              : ""}
          </p>
        </div>
        <Link
          href="/signals"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          <Radio className="size-4" /> Signals Desk
        </Link>
      </header>

      {/* Glance layer — numbers the system can defend */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Trends with receipts"
          value={verified.length}
          hint="Measured, web-scanned, or imported"
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Terms firing now"
          value={firing}
          hint="Accelerating on real platforms"
          icon={Flame}
          tone="warning"
        />
        <StatCard
          label="Open forecasts"
          value={calibration?.n_pending ?? 0}
          hint="Falsifiable claims on the record"
          icon={Target}
          tone="primary"
        />
        <StatCard
          label="Forecast hit rate"
          value={hitRate}
          hint={
            calibration && calibration.n_scored < calibration.min_sample
              ? `Needs ${calibration.min_sample}+ resolved (${calibration.n_scored} so far)`
              : "Last 90 days, voids excluded"
          }
          icon={TrendingUp}
          tone="violet"
        />
      </section>

      {/* Stage distribution over the verified board */}
      <section className="flex flex-wrap items-center gap-2">
        {stageCounts(verified).map(({ stage, label, count }) => (
          <span
            key={stage}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm"
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono font-semibold tabular-nums">{count}</span>
          </span>
        ))}
      </section>

      {lastRun?.notes && !lastRun.notes.startsWith("Mock pulse") ? (
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
            Field notes — what the culture is reaching for
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">
            {lastRun.notes}
          </p>
        </div>
      ) : null}

      {/* Top of the board — highest WaveScores among verified trends */}
      <section>
        <h2 className="mb-4 font-display text-xl">
          Top of the board
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            — highest WaveScore right now
          </span>
        </h2>
        <HarmonyBoard trends={harmonizedVerified} limit={6} />
      </section>

      {/* The deep layers — verified only */}
      <RadarTabs
        trends={verified}
        categories={options.categories}
        platforms={options.platforms}
        harmonized={harmonizedVerified}
      />

      {/* The shelf — model suggestions waiting for the real world */}
      {unverified.length > 0 ? (
        <details className="group rounded-xl border border-dashed border-border bg-card/60">
          <summary className="flex cursor-pointer list-none items-center gap-2.5 px-5 py-4 text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
            <Archive className="size-4" />
            Unverified shelf — {unverified.length} model-suggested trend
            {unverified.length === 1 ? "" : "s"} awaiting real-world measurement
            <span className="ml-auto text-xs text-faint group-open:hidden">
              show
            </span>
            <span className="ml-auto hidden text-xs text-faint group-open:inline">
              hide
            </span>
          </summary>
          <div className="divide-y divide-border border-t border-border">
            {unverified.map((t) => (
              <Link
                key={t.id}
                href={`/trends/${t.slug}`}
                className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {t.name}
                  </p>
                  <p className="text-xs text-faint">
                    {t.category} · {t.lifecycle_stage} · Wave {t.wavescore}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  awaiting measurement
                </span>
              </Link>
            ))}
          </div>
          <p className="px-5 py-3 text-xs text-faint">
            These were suggested by the model and haven&apos;t been seen in the
            wild yet. Each graduates to the board automatically the moment the
            measurement layer or a web scan finds real evidence.
          </p>
        </details>
      ) : null}
    </div>
  );
}

const STAGE_ORDER: LifecycleStage[] = [
  "emerging",
  "accelerating",
  "peaking",
  "resurfacing",
  "saturated",
  "declining",
];

function stageCounts(trends: Trend[]) {
  return STAGE_ORDER.map((stage) => ({
    stage,
    label: lifecycleBadge(stage).label,
    count: trends.filter((t) => t.lifecycle_stage === stage).length,
  })).filter((s) => s.count > 0);
}
