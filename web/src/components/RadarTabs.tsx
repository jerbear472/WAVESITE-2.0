"use client";

import { useState } from "react";
import type { Trend } from "@/types";
import type { HarmonizedTrend } from "@/lib/harmony";
import { WavesExplorer } from "@/components/WavesExplorer";
import { TimelineBoard } from "@/components/TimelineBoard";
import { ChannelMatrix } from "@/components/ChannelMatrix";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "library", label: "Library" },
  { key: "timeline", label: "Timeline" },
  { key: "channels", label: "Channels" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function RadarTabs({
  trends,
  categories,
  platforms,
  harmonized,
}: {
  trends: Trend[];
  categories: string[];
  platforms: string[];
  harmonized: HarmonizedTrend[];
}) {
  const [tab, setTab] = useState<TabKey>("library");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 sm:w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-none",
              tab === t.key
                ? "bg-primary-tint text-primary-strong"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "library" ? (
        <WavesExplorer
          trends={trends}
          categories={categories}
          platforms={platforms}
        />
      ) : null}

      {tab === "timeline" ? <TimelineBoard /> : null}

      {tab === "channels" ? (
        <section className="panel px-5 py-5">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-panel-muted">
            Cross-channel pattern
          </p>
          <p className="mb-4 text-sm text-panel-muted">
            Trends lighting up 3+ channels are moving culture-wide, not
            app-deep.
          </p>
          <ChannelMatrix trends={harmonized} />
        </section>
      ) : null}
    </div>
  );
}
