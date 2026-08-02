"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ExternalLink,
  History,
  Loader2,
  TrendingUp,
} from "lucide-react";
import type { HistoryMarker, TrendHistory } from "@/lib/pipeline/backfill";
import { Card } from "@/components/ui/card";

// The historical arc for one trend's detail page: 12 months of measured
// volume + engagement, with the crests and valleys pinned to the real posts
// that made them. The markers are the trust layer — every notable point on
// the line links to a checkable artifact with true dates and numbers.

const BLUE = "#3478F6";
const AMBER = "#b77900";

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function monthLabel(period: string, withYear = false) {
  const d = new Date(`${period}-01T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

/** "1.2M views · 34K likes" / "4.3K upvotes · 210 comments" */
function engagementLabel(marker: HistoryMarker): string | null {
  const e = marker.evidence?.engagement;
  if (!e) return null;
  const parts: string[] = [];
  if (e.views) parts.push(`${compact.format(e.views)} views`);
  if (e.score) parts.push(`${compact.format(e.score)} upvotes`);
  if (e.likes) parts.push(`${compact.format(e.likes)} likes`);
  if (e.comments) parts.push(`${compact.format(e.comments)} comments`);
  return parts.slice(0, 2).join(" · ") || null;
}

function sourceLabel(marker: HistoryMarker): string {
  const ev = marker.evidence;
  if (!ev) return "";
  if (ev.source === "reddit") {
    return ev.container ? `r/${ev.container.replace(/^r\//, "")}` : "Reddit";
  }
  return "YouTube";
}

export function TrendHistoryChart({ slug }: { slug: string }) {
  const [history, setHistory] = useState<TrendHistory | null | undefined>(
    undefined // undefined = loading, null = no data yet
  );
  const [gathering, setGathering] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/trends/history?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : { histories: [] }))
      .then((d: { histories?: TrendHistory[] }) =>
        setHistory(d.histories?.[0] ?? null)
      )
      .catch(() => setHistory(null));
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
      if (res.ok) load();
    } finally {
      setGathering(false);
    }
  }, [slug, load]);

  if (history === undefined) {
    return (
      <Card className="p-7">
        <p className="eyebrow text-faint">Historical arc</p>
        <div className="mt-4 h-56 animate-pulse rounded-xl bg-surface-2" />
      </Card>
    );
  }

  if (history === null || history.total_items === 0) {
    return (
      <Card className="p-7">
        <p className="eyebrow text-faint">Historical arc</p>
        <h2 className="mt-1 text-[15px] font-semibold">
          12-month volume &amp; engagement
        </h2>
        <div className="mt-5 flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-center">
          <p className="max-w-[40ch] text-sm text-muted-foreground">
            No measured history yet. The look-back bot can scour the last 12
            months of Reddit and YouTube for this trend&apos;s real posts.
          </p>
          <button
            onClick={gather}
            disabled={gathering}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-primary-strong hover:border-border-strong disabled:opacity-60"
          >
            {gathering ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Scouring the last
                12 months…
              </>
            ) : (
              <>
                <History className="size-3.5" /> Gather 12-month history
              </>
            )}
          </button>
        </div>
      </Card>
    );
  }

  const markers = history.markers ?? [];
  const markersWithEvidence = markers.filter((m) => m.evidence);
  // Stable footnote numbering: chart dots and evidence cards share it.
  const noteIndex = new Map(markersWithEvidence.map((m, i) => [m.period, i + 1]));

  return (
    <Card className="p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-faint">Historical arc</p>
          <h2 className="mt-1 text-[15px] font-semibold">
            12-month volume &amp; engagement
          </h2>
        </div>
        <button
          onClick={gather}
          disabled={gathering}
          title="Scour 12 months of posts for this trend"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground hover:text-primary-strong disabled:opacity-60"
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
      </div>

      <div className="mt-5 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={history.months}
            margin={{ top: 18, right: 12, bottom: 0, left: 12 }}
          >
            <defs>
              <linearGradient id={`arc-${slug}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BLUE} stopOpacity={0.28} />
                <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="period"
              tickFormatter={(p: string) => monthLabel(p)}
              tick={{ fontSize: 11, fill: "#8a94a6" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide domain={[0, "auto"]} />
            <Tooltip
              cursor={{ stroke: "#d8dee9", strokeDasharray: "3 3" }}
              content={({ payload }) => {
                const p = payload?.[0]?.payload;
                if (!p) return null;
                return (
                  <div className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] shadow-sm">
                    <span className="font-medium">
                      {monthLabel(p.period, true)}
                    </span>
                    : {p.volume} posts · engagement {p.engagement}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="engagement"
              stroke={BLUE}
              strokeWidth={1.6}
              fill={`url(#arc-${slug})`}
              isAnimationActive={false}
            />
            {markers.map((m) => {
              const n = noteIndex.get(m.period);
              const color = m.kind === "peak" ? BLUE : AMBER;
              return (
                <ReferenceDot
                  key={`${m.kind}-${m.period}`}
                  x={m.period}
                  y={m.engagement}
                  r={4}
                  fill={m.kind === "peak" ? color : "#fff"}
                  stroke={color}
                  strokeWidth={1.5}
                  label={
                    n
                      ? {
                          value: String(n),
                          position: "top",
                          fill: color,
                          fontSize: 10,
                          fontWeight: 700,
                        }
                      : undefined
                  }
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-xs text-faint">
        {history.total_items} real posts, deduplicated, bucketed by true
        publish month. Engagement is log-scaled so one viral post reads as a
        strong month, not the only month.
      </p>

      {markersWithEvidence.length ? (
        <div className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
          {markersWithEvidence.map((m) => {
            const ev = m.evidence!;
            const n = noteIndex.get(m.period);
            const peak = m.kind === "peak";
            const engagement = engagementLabel(m);
            return (
              <a
                key={`${m.kind}-${m.period}`}
                href={ev.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group/ev rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-strong"
              >
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em]">
                  <span
                    className="inline-flex size-4 items-center justify-center rounded-full text-[10px] text-white"
                    style={{ background: peak ? BLUE : AMBER }}
                  >
                    {n}
                  </span>
                  <span style={{ color: peak ? BLUE : AMBER }}>
                    {peak ? (
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="size-3" /> Peak —{" "}
                        {monthLabel(m.period, true)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <ArrowDownRight className="size-3" /> Trough —{" "}
                        {monthLabel(m.period, true)}
                      </span>
                    )}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover/ev:text-primary-strong">
                  {ev.title ?? "Untitled post"}
                </p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="font-medium">{sourceLabel(m)}</span>
                  {engagement ? <span>· {engagement}</span> : null}
                  <span>
                    · {m.volume} post{m.volume === 1 ? "" : "s"} that month
                  </span>
                  <ExternalLink className="size-3 text-faint" />
                </p>
              </a>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}
