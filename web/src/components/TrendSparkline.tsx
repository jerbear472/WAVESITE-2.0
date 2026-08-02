"use client";

import { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { History, Loader2 } from "lucide-react";
import type { TrendHistory } from "@/lib/pipeline/backfill";
import { fetchHistories } from "@/lib/history-client";

// 12-month engagement sparkline for a trend card with a photo header (cards
// without one render the full TrendTrajectory instead). Shares the bulk
// /api/trends/history fetch via lib/history-client.

export function TrendSparkline({ slug }: { slug: string }) {
  const [history, setHistory] = useState<TrendHistory | null | undefined>(
    undefined // undefined = loading, null = no data
  );
  const [gathering, setGathering] = useState(false);

  const load = useCallback((force = false) => {
    fetchHistories(force).then((map) => setHistory(map.get(slug) ?? null));
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const gather = useCallback(async () => {
    setGathering(true);
    try {
      const res = await fetch("/api/trends/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (res.ok) load(true);
      else setHistory(null);
    } finally {
      setGathering(false);
    }
  }, [slug, load]);

  if (history === undefined) {
    return <div className="h-11" />;
  }

  if (history === null || history.total_items === 0) {
    return (
      <div className="flex h-11 items-center px-5">
        <button
          onClick={(e) => {
            e.preventDefault();
            gather();
          }}
          disabled={gathering}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-strong hover:underline disabled:opacity-60"
        >
          {gathering ? (
            <>
              <Loader2 className="size-3 animate-spin" /> Scouring the last 12
              months…
            </>
          ) : (
            <>
              <History className="size-3" /> Gather 12-month history
            </>
          )}
        </button>
      </div>
    );
  }

  const peak = Math.max(...history.months.map((m) => m.engagement), 1);
  const monthsWithData = history.months.filter((m) => m.volume > 0).length;
  return (
    <div
      className="group/spark relative h-11 px-4"
      title="12 months — engagement per month"
    >
      {/* The look-back bot, always reachable: deepens thin histories with
          the full Reddit + YouTube pass. */}
      <button
        onClick={(e) => {
          e.preventDefault();
          gather();
        }}
        disabled={gathering}
        title="Scour 12 months of posts for this trend"
        className={
          "absolute right-2 top-0 z-10 inline-flex items-center gap-1 rounded-full border border-border bg-card/90 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground backdrop-blur-sm transition-opacity hover:text-primary-strong " +
          (monthsWithData <= 2 && !gathering
            ? "opacity-90"
            : "opacity-0 group-hover/spark:opacity-90")
        }
      >
        {gathering ? (
          <>
            <Loader2 className="size-3 animate-spin" /> scouring…
          </>
        ) : (
          <>
            <History className="size-3" /> look back
          </>
        )}
      </button>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={history.months}
          margin={{ top: 6, right: 0, bottom: 2, left: 0 }}
        >
          <defs>
            <linearGradient id={`hist-${slug}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3478F6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3478F6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={false}
            content={({ payload }) => {
              const p = payload?.[0]?.payload;
              if (!p) return null;
              return (
                <div className="rounded-md border border-border bg-card px-2 py-1 text-[11px] shadow-sm">
                  {p.period}: {p.volume} posts · engagement {p.engagement}
                  {peak > 0 && p.engagement === peak ? " · peak" : ""}
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="engagement"
            stroke="#3478F6"
            strokeWidth={1.4}
            fill={`url(#hist-${slug})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
