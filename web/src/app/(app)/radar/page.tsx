import type { Metadata } from "next";
import { TrendingUp, Smile, ShieldCheck, Flame } from "lucide-react";
import { getDashboardStats, getTrends, getFilterOptions } from "@/lib/data";
import { getPulseState } from "@/lib/pulse";
import { isAIConfigured } from "@/lib/ai/provider";
import { StatCard } from "@/components/StatCard";
import { HarmonyBoard } from "@/components/HarmonyBoard";
import { RadarTabs } from "@/components/RadarTabs";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Radar — WaveSight",
  description:
    "The whole culture market on one screen: what's harmonizing right now, every trend's trajectory, and where each one is spreading.",
};

export default async function RadarPage() {
  const [pulse, stats, trends, options] = await Promise.all([
    getPulseState(),
    getDashboardStats(),
    getTrends(),
    getFilterOptions(),
  ]);
  const live = isAIConfigured();
  const lastRun = pulse.lastRun;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-3xl">Radar</h1>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                live ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              )}
            >
              <span
                className={cn(
                  "live-dot size-1.5 rounded-full",
                  live ? "bg-success" : "bg-warning"
                )}
              />
              {live ? "Live · Claude" : "Mock mode"}
            </span>
          </div>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            The whole culture market on one screen. The pulse runs on a
            schedule — no button to press.
            {lastRun
              ? ` Last pulse ${new Date(lastRun.ran_at).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}.`
              : " No pulse recorded yet — the field is loaded from the library."}
          </p>
        </div>
      </header>

      {/* Market aggregate — the glance layer */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Rising Waves"
          value={stats.risingWaves}
          hint="Emerging & accelerating"
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="Positive Sentiment"
          value={stats.positiveSentiment}
          hint="Sentiment ≥ 78"
          icon={Smile}
          tone="success"
        />
        <StatCard
          label="Brand-Safe Opportunities"
          value={stats.brandSafe}
          hint="Safe & low risk"
          icon={ShieldCheck}
          tone="violet"
        />
        <StatCard
          label="Backlash Forming"
          value={stats.backlashForming}
          hint="Watch closely"
          icon={Flame}
          tone="danger"
        />
      </section>

      {lastRun?.notes ? (
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
            Field notes — what the culture is reaching for
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">
            {lastRun.notes}
          </p>
        </div>
      ) : null}

      {/* Top of the pulse — highest harmony right now */}
      <section>
        <h2 className="mb-4 font-display text-xl">Top of the pulse</h2>
        <HarmonyBoard trends={pulse.trends} limit={6} />
      </section>

      {/* The deep layers */}
      <RadarTabs
        trends={trends}
        categories={options.categories}
        platforms={options.platforms}
        harmonized={pulse.trends}
      />
    </div>
  );
}
