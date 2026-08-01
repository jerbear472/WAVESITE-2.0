"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, History, Radio } from "lucide-react";
import type { PulseHistory } from "@/lib/data";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Pulse Timeline — harmony over time, one line per trend. This is the chart
// that tells the story the 3D field can't: you can SEE a spike form, crest,
// and collapse. Click a point (or drag the scrubber) to rewind the whole
// console — field, tiles, matrix — to that pulse.
// ---------------------------------------------------------------------------

const LINE_COLORS = [
  "#3478f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

const MAX_LINES = 8;

export interface Mover {
  name: string;
  slug: string;
  delta: number;
}

export function PulseTimeline({
  history,
  selectedRunId,
  onSelectRun,
}: {
  history: PulseHistory;
  selectedRunId: string | null;
  onSelectRun: (runId: string | null) => void;
}) {
  const { runs, series } = history;
  const shown = series.slice(0, MAX_LINES);

  const chartData = useMemo(() => {
    return runs.map((run, idx) => {
      const row: Record<string, number | string> = {
        idx,
        runId: run.id,
        label: formatRunTime(run.ran_at),
      };
      for (const s of shown) {
        const pt = s.points.find((p) => p.run_id === run.id);
        if (pt) row[s.trend.id] = pt.harmony;
      }
      return row;
    });
  }, [runs, shown]);

  const selectedIdx = selectedRunId
    ? runs.findIndex((r) => r.id === selectedRunId)
    : runs.length - 1;
  const isLive = !selectedRunId || selectedIdx === runs.length - 1;

  const movers = useMemo(
    () => computeMovers(history, isLive ? runs.length - 1 : selectedIdx),
    [history, runs.length, selectedIdx, isLive]
  );

  if (runs.length < 2) return null;

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
            Harmony over time — every pulse, every trend
          </p>
        </div>
        {!isLive ? (
          <button
            onClick={() => onSelectRun(null)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/15"
          >
            <Radio className="size-3" /> Back to now
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Click a point or drag the scrubber to rewind the field
          </span>
        )}
      </div>

      <div className="h-[300px] px-2 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 6, right: 18, bottom: 4, left: -14 }}
            onClick={(state) => {
              const idx =
                typeof state?.activeTooltipIndex === "number"
                  ? state.activeTooltipIndex
                  : null;
              if (idx === null) return;
              onSelectRun(idx === runs.length - 1 ? null : runs[idx].id);
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#8a94a6" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e9f0" }}
              minTickGap={28}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#8a94a6" }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #e5e9f0",
                fontSize: 12,
                boxShadow: "0 4px 16px rgba(16,24,40,0.08)",
              }}
              labelFormatter={(label) => `Pulse — ${label}`}
              formatter={(value) => (value === undefined ? "" : `${value}%`)}
            />
            {selectedIdx >= 0 && !isLive ? (
              <ReferenceLine
                x={chartData[selectedIdx]?.label as string}
                stroke="#3478f6"
                strokeDasharray="4 3"
              />
            ) : null}
            {shown.map((s, i) => (
              <Line
                key={s.trend.id}
                type="monotone"
                dataKey={s.trend.id}
                name={s.trend.name}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-5 pb-3 pt-1">
        {shown.map((s, i) => (
          <span
            key={s.trend.id}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              className="h-0.5 w-4 rounded-full"
              style={{ background: LINE_COLORS[i % LINE_COLORS.length] }}
            />
            {s.trend.name}
          </span>
        ))}
      </div>

      {/* Scrubber */}
      <div className="border-t border-border px-5 py-3.5">
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={runs.length - 1}
            step={1}
            value={selectedIdx < 0 ? runs.length - 1 : selectedIdx}
            onChange={(e) => {
              const idx = Number(e.target.value);
              onSelectRun(idx === runs.length - 1 ? null : runs[idx].id);
            }}
            className="h-1.5 flex-1 cursor-pointer accent-primary"
            aria-label="Rewind to an earlier pulse"
          />
          <span
            className={cn(
              "w-44 shrink-0 text-right font-mono text-xs tnum",
              isLive ? "text-success" : "text-primary"
            )}
          >
            {isLive
              ? "NOW"
              : formatRunTime(runs[selectedIdx]?.ran_at ?? "", true)}
          </span>
        </div>
      </div>

      {/* Movers at the selected moment */}
      {movers.risers.length || movers.fallers.length ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
            {isLive ? "Moving now" : "Moving then"}
          </span>
          {movers.risers.map((m) => (
            <MoverChip key={m.slug} mover={m} up />
          ))}
          {movers.fallers.map((m) => (
            <MoverChip key={m.slug} mover={m} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function MoverChip({ mover, up = false }: { mover: Mover; up?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-semibold",
        up ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
      )}
    >
      {up ? (
        <ArrowUpRight className="size-3" />
      ) : (
        <ArrowDownRight className="size-3" />
      )}
      {mover.name} {up ? "+" : ""}
      {mover.delta}
    </span>
  );
}

/** Biggest harmony moves between run[idx-1] and run[idx]. */
function computeMovers(
  history: PulseHistory,
  idx: number
): { risers: Mover[]; fallers: Mover[] } {
  const { runs, series } = history;
  if (idx <= 0 || idx >= runs.length) return { risers: [], fallers: [] };
  const cur = runs[idx].id;
  const prev = runs[idx - 1].id;
  const deltas: Mover[] = [];
  for (const s of series) {
    const a = s.points.find((p) => p.run_id === prev)?.harmony;
    const b = s.points.find((p) => p.run_id === cur)?.harmony;
    if (a === undefined || b === undefined || a === b) continue;
    deltas.push({ name: s.trend.name, slug: s.trend.slug, delta: b - a });
  }
  deltas.sort((a, b) => b.delta - a.delta);
  return {
    risers: deltas.filter((d) => d.delta > 0).slice(0, 3),
    fallers: deltas.filter((d) => d.delta < 0).slice(-3).reverse().slice(0, 3),
  };
}

function formatRunTime(iso: string, withDate = false): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const date = d.toLocaleDateString([], { month: "short", day: "numeric" });
  return withDate ? `${date} · ${time}` : `${date} ${time}`;
}
