"use client";

import { useEffect, useState } from "react";
import type { Trend } from "@/types";
import type { TrendHistory } from "@/lib/pipeline/backfill";
import { fetchHistories } from "@/lib/history-client";
import { decideTrend } from "@/lib/trend-decision";

const ACTION_STYLE = {
  Act: "bg-success/10 text-success",
  Watch: "bg-warning/10 text-warning",
  Avoid: "bg-danger/10 text-danger",
} as const;

export function TrendDecisionStrip({ trend }: { trend: Trend }) {
  const [history, setHistory] = useState<TrendHistory | null>(null);

  useEffect(() => {
    let current = true;
    fetchHistories().then((histories) => {
      if (current) setHistory(histories.get(trend.slug) ?? null);
    });
    return () => {
      current = false;
    };
  }, [trend.slug]);

  const decision = decideTrend(trend, history);

  return (
    <div className="mx-5 mt-4 rounded-lg border border-border bg-surface-1/70 px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${ACTION_STYLE[decision.action]}`}
        >
          {decision.action}
        </span>
        <span className="text-xs font-semibold text-foreground">
          {decision.window}
        </span>
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-faint">
          {decision.confidence} confidence
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px]">
        <span className="font-medium text-muted-foreground">{decision.change}</span>
        <span className="text-faint">{decision.evidence}</span>
      </div>
    </div>
  );
}
