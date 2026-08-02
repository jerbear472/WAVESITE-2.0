"use client";

import { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { History, Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { TrendHistory } from "@/lib/pipeline/backfill";
import { fetchHistories, trajectoryDirection } from "@/lib/history-client";

// ---------------------------------------------------------------------------
// TrendTrajectory — the card/hero visual when there is no real source media.
// Two states, both honest:
//   1. Measured history exists → the REAL 12-month engagement series with a
//      computed Rising/Fading/Steady chip. The chart IS the data.
//   2. No history yet → an explicit "not yet verified" state with the
//      backfill button. Nothing chart-shaped is drawn, so decoration can
//      never be mistaken for measurement.
// Replaces the old slug-hashed decorative waveform, which looked like data
// and wasn't.
// ---------------------------------------------------------------------------

const PALETTES = [
  { stroke: "#3478f6", bg: "#eaf2ff" }, // blue
  { stroke: "#35bdf2", bg: "#e6f7fe" }, // cyan
  { stroke: "#6d5bd0", bg: "#efedfb" }, // violet
  { stroke: "#159a78", bg: "#e7f5f1" }, // green
  { stroke: "#b77900", bg: "#fbf3e3" }, // amber
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const DIRECTION_STYLE = {
  Rising: { color: "#159a78", bg: "#e7f5f1", Icon: TrendingUp },
  Fading: { color: "#d64d57", bg: "#fdeef0", Icon: TrendingDown },
  Steady: { color: "#5b6472", bg: "#eef1f5", Icon: Minus },
} as const;

export function TrendTrajectory({
  slug,
  category,
  showLabel = true,
}: {
  slug: string;
  category?: string | null;
  showLabel?: boolean;
}) {
  const [history, setHistory] = useState<TrendHistory | null | undefined>(
    undefined
  );
  const [gathering, setGathering] = useState(false);

  const load = useCallback(
    (force = false) => {
      fetchHistories(force).then((map) => setHistory(map.get(slug) ?? null));
    },
    [slug]
  );

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
    } finally {
      setGathering(false);
    }
  }, [slug, load]);

  const p = PALETTES[hash(category || slug) % PALETTES.length];

  if (history === undefined) {
    return <div className="absolute inset-0" style={{ background: p.bg }} />;
  }

  // --- honest empty state ---------------------------------------------------
  if (history === null || history.total_items === 0) {
    return (
      <div
        className="absolute inset-0 flex flex-col items-start justify-end gap-1.5 p-4"
        style={{ background: p.bg }}
      >
        <p className="text-xs font-medium" style={{ color: p.stroke }}>
          No verified history yet
        </p>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            gather();
          }}
          disabled={gathering}
          className="inline-flex items-center gap-1.5 rounded-full border bg-white/70 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm disabled:opacity-60"
          style={{ borderColor: p.stroke, color: p.stroke }}
        >
          {gathering ? (
            <>
              <Loader2 className="size-3 animate-spin" /> Scouring 12 months of
              posts…
            </>
          ) : (
            <>
              <History className="size-3" /> Gather 12-month history
            </>
          )}
        </button>
        {showLabel && category ? (
          <span
            className="absolute right-3 top-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70"
            style={{ color: p.stroke }}
          >
            {category}
          </span>
        ) : null}
      </div>
    );
  }

  // --- the real series ------------------------------------------------------
  const direction = trajectoryDirection(history);
  const d = direction ? DIRECTION_STYLE[direction.label] : null;

  return (
    <div className="absolute inset-0" style={{ background: p.bg }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={history.months}
          margin={{ top: 26, right: 0, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={`traj-${slug}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={p.stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={p.stroke} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={false}
            content={({ payload }) => {
              const m = payload?.[0]?.payload;
              if (!m) return null;
              return (
                <div className="rounded-md border border-border bg-card px-2 py-1 text-[11px] shadow-sm">
                  {m.period}: {m.volume} posts · engagement {m.engagement}
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="engagement"
            stroke={p.stroke}
            strokeWidth={1.8}
            fill={`url(#traj-${slug})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {d && direction ? (
        <span
          className="absolute left-3 top-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
          style={{ color: d.color, background: d.bg }}
          title="Recent 2 months vs the 3 before — measured engagement, not an estimate"
        >
          <d.Icon className="size-3" />
          {direction.label}
          {direction.deltaPct !== 0
            ? ` ${direction.deltaPct > 0 ? "+" : ""}${direction.deltaPct}%`
            : ""}
        </span>
      ) : null}
      <span className="absolute right-3 top-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-black/35">
        12-mo measured · {history.total_items} posts
      </span>
    </div>
  );
}
