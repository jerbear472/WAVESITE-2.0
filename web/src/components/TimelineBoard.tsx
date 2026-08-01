"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, ChevronUp, Loader2, TrendingUp } from "lucide-react";
import type { TimelineResponse, TrendTimeline } from "@/lib/pipeline/timeline";
import { cn } from "@/lib/utils";

// The Movers board — every trend as a wave over real time. Volume is measured
// (deduplicated items per day by true posted_at), sentiment colors the days,
// forecast calls are pinned to the axis they'll be judged on.

const WINDOW_OPTIONS = [14, 30, 60];

const STATE_STYLE: Record<string, { label: string; className: string }> = {
  in_sync: { label: "In sync", className: "bg-success/10 text-success" },
  rising: { label: "Rising", className: "bg-primary/10 text-primary-strong" },
  warming: { label: "Warming", className: "bg-warning/10 text-warning" },
  fading: { label: "Fading", className: "bg-muted text-muted-foreground" },
};

export function TimelineBoard() {
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [windowDays, setWindowDays] = useState(30);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showQuiet, setShowQuiet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (w: number) => {
    setError(null);
    try {
      const res = await fetch(`/api/timeline?window=${w}`);
      if (!res.ok) throw new Error(`timeline failed (${res.status})`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load timeline");
    }
  }, []);

  useEffect(() => {
    load(windowDays);
  }, [load, windowDays]);

  if (error) {
    return (
      <p className="rounded-md border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">
        {error}
      </p>
    );
  }
  if (!data) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" /> Loading the timeline…
      </div>
    );
  }

  const provisional = data.movers.some((m) => m.provisional);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="size-4" />
          {data.movers.length} trends with organic signal · window
          <div className="flex overflow-hidden rounded-lg border border-border-strong">
            {WINDOW_OPTIONS.map((w) => (
              <button
                key={w}
                onClick={() => setWindowDays(w)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium",
                  w === windowDays
                    ? "bg-primary text-white"
                    : "bg-card hover:bg-surface-2"
                )}
              >
                {w}d
              </button>
            ))}
          </div>
        </div>
        {provisional ? (
          <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-warning">
            Provisional — reference history still accruing
          </span>
        ) : null}
      </div>

      {data.movers.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
          No measured signal yet. Run the pipeline (POST /api/pipeline/run) to
          collect items — the timeline draws itself from real posts.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.movers.map((m) => (
            <MoverCard
              key={m.trend.id}
              mover={m}
              expanded={expanded === m.trend.id}
              onToggle={() =>
                setExpanded(expanded === m.trend.id ? null : m.trend.id)
              }
            />
          ))}
        </div>
      )}

      {data.quiet.length > 0 ? (
        <section className="rounded-xl border border-border bg-card">
          <button
            onClick={() => setShowQuiet(!showQuiet)}
            className="flex w-full items-center justify-between px-5 py-3.5 text-left"
          >
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
              No organic signal in window · {data.quiet.length} trends
            </span>
            {showQuiet ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </button>
          {showQuiet ? (
            <div className="border-t border-border px-5 py-4">
              <p className="mb-3 text-xs text-muted-foreground">
                Nothing on Reddit or YouTube matched these names in the last{" "}
                {windowDays} days. They may be misnamed (merge them onto the
                name culture actually uses) or they may not exist.
              </p>
              <div className="flex flex-wrap gap-2">
                {data.quiet.map((q) => (
                  <Link
                    key={q.id}
                    href={`/trends/${q.slug}`}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-border-strong hover:text-foreground"
                  >
                    {q.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function MoverCard({
  mover,
  expanded,
  onToggle,
}: {
  mover: TrendTimeline;
  expanded: boolean;
  onToggle: () => void;
}) {
  const state = mover.state ? STATE_STYLE[mover.state] : null;
  const chartData = useMemo(
    () =>
      mover.days.map((d) => ({
        ...d,
        label: d.date.slice(5).replace("-", "/"),
      })),
    [mover.days]
  );

  // Forecast markers that land inside the visible window.
  const markers = useMemo(() => {
    const first = mover.days[0]?.date;
    const last = mover.days[mover.days.length - 1]?.date;
    return mover.forecasts
      .filter((f) => {
        const day = f.resolves_at.slice(0, 10);
        return first && last && day >= first && day <= last;
      })
      .map((f) => ({
        ...f,
        label: f.resolves_at.slice(5, 10).replace("-", "/"),
      }));
  }, [mover.forecasts, mover.days]);

  const pendingCall = mover.forecasts.find((f) => f.status === "pending");

  return (
    <div className="rounded-xl border border-border bg-card transition-colors hover:border-border-strong">
      <button onClick={onToggle} className="w-full px-5 pb-1 pt-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
              {mover.trend.category}
            </p>
            <h3 className="mt-0.5 truncate font-display text-lg leading-tight">
              {mover.trend.name}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {mover.velocity_pct !== null ? (
              <span
                className="font-mono text-sm font-semibold tnum"
                title="velocity percentile"
              >
                v{Math.round(mover.velocity_pct)}
              </span>
            ) : null}
            {state ? (
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  state.className
                )}
              >
                {state.label}
              </span>
            ) : null}
          </div>
        </div>

        <div className={cn("mt-2", expanded ? "h-44" : "h-16")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id={`vol-${mover.trend.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3478F6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3478F6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              {expanded ? (
                <>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    width={24}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${value ?? 0} posts`, "volume"]}
                    labelFormatter={(l) => `day ${l}`}
                  />
                </>
              ) : null}
              {markers.map((f) => (
                <ReferenceLine
                  key={f.forecast_id}
                  x={f.label}
                  stroke={
                    f.status === "hit"
                      ? "#159a78"
                      : f.status === "miss"
                        ? "#d33d55"
                        : "#b77900"
                  }
                  strokeDasharray="4 3"
                  label={
                    expanded
                      ? {
                          value:
                            f.status === "pending"
                              ? "peak by"
                              : `peak ${f.status}`,
                          fontSize: 10,
                          position: "top",
                        }
                      : undefined
                  }
                />
              ))}
              <Area
                type="monotone"
                dataKey="volume"
                stroke="#3478F6"
                strokeWidth={1.6}
                fill={`url(#vol-${mover.trend.id})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sentiment strip: one cell per day, colored by the day's net label. */}
        <div className="mt-1 flex gap-px" title="daily sentiment of labeled posts">
          {mover.days.map((d) => (
            <div
              key={d.date}
              className="h-1.5 flex-1 rounded-sm"
              style={{ background: sentimentColor(d.sentiment) }}
            />
          ))}
        </div>
      </button>

      <div className="flex items-center justify-between px-5 py-3">
        <p className="text-xs text-muted-foreground">
          {mover.totals.volume} posts · {mover.totals.unique_authors} authors
          {mover.totals.sentiment_net !== null
            ? ` · sentiment ${mover.totals.sentiment_net > 0 ? "+" : ""}${mover.totals.sentiment_net}`
            : ""}
          {pendingCall
            ? ` · call: peak by ${pendingCall.resolves_at.slice(0, 10)}`
            : ""}
        </p>
        <Link
          href={`/trends/${mover.trend.slug}`}
          className="text-xs font-medium text-primary-strong hover:underline"
        >
          Open →
        </Link>
      </div>
    </div>
  );
}

function sentimentColor(net: number | null): string {
  if (net === null) return "var(--color-muted, #e8ebf0)";
  if (net > 0.3) return "#34d399";
  if (net > 0) return "#a7f3d0";
  if (net > -0.3) return "#fbbf24";
  return "#f87171";
}
