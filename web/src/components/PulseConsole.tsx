"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { heroImageForTrend } from "@/lib/trend-images";
import {
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  Minus,
  Radio,
  RefreshCw,
} from "lucide-react";
import type { PulseRun } from "@/types";
import type { HarmonizedTrend } from "@/lib/harmony";
import { HARMONY_TIERS, harmonyTier, type HarmonyTier } from "@/lib/harmony";
import type { PulseHistory } from "@/lib/data";
import { ChannelMatrix } from "@/components/ChannelMatrix";
import { PulseTimeline } from "@/components/PulseTimeline";
import { cn } from "@/lib/utils";

const CultureField = dynamic(() => import("@/components/three/CultureField"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-panel-muted">
      Rendering the culture field…
    </div>
  ),
});

const LOOP_OPTIONS = [
  { label: "Loop off", value: 0 },
  { label: "Every 2 min", value: 2 * 60_000 },
  { label: "Every 10 min", value: 10 * 60_000 },
  { label: "Every 30 min", value: 30 * 60_000 },
];

interface PulseState {
  trends: HarmonizedTrend[];
  runs: PulseRun[];
  lastRun: PulseRun | null;
  live: boolean;
}

export function PulseConsole() {
  const [state, setState] = useState<PulseState | null>(null);
  const [history, setHistory] = useState<PulseHistory | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [loopMs, setLoopMs] = useState(0);
  const [hovered, setHovered] = useState<HarmonizedTrend | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);

  const load = useCallback(async () => {
    const [stateRes, historyRes] = await Promise.all([
      fetch("/api/pulse"),
      fetch("/api/pulse/history"),
    ]);
    if (stateRes.ok) setState(await stateRes.json());
    if (historyRes.ok) setHistory(await historyRes.json());
  }, []);

  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Pulse failed (${res.status})`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pulse run failed");
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!loopMs) return;
    const id = setInterval(run, loopMs);
    return () => clearInterval(id);
  }, [loopMs, run]);

  // Time travel: when a past run is selected, every surface on this page —
  // the field, the tiles, the matrix — re-renders the world as it was at that
  // pulse, using the snapshot scores instead of the live ones.
  const liveTrends = useMemo(() => state?.trends ?? [], [state]);
  const selectedRun = useMemo(
    () =>
      selectedRunId && history
        ? (history.runs.find((r) => r.id === selectedRunId) ?? null)
        : null,
    [selectedRunId, history]
  );
  const trends = useMemo(() => {
    if (!selectedRun || !history) return liveTrends;
    const runIdx = history.runs.findIndex((r) => r.id === selectedRun.id);
    const rewound: HarmonizedTrend[] = [];
    for (const t of liveTrends) {
      const points = history.series.find((s) => s.trend.id === t.id)?.points;
      const pt = points?.find((p) => p.run_id === selectedRun.id);
      if (!pt) continue; // Trend didn't exist yet at that pulse.
      const prevRunId = runIdx > 0 ? history.runs[runIdx - 1].id : null;
      const prev = prevRunId
        ? points?.find((p) => p.run_id === prevRunId)
        : undefined;
      rewound.push({
        ...t,
        harmony: pt.harmony,
        momentum_score: pt.momentum_score,
        sentiment_score: pt.sentiment_score,
        wavescore: pt.wavescore,
        tier: harmonyTier(pt.harmony).tier,
        delta: prev ? pt.harmony - prev.harmony : 0,
      });
    }
    return rewound.sort((a, b) => b.harmony - a.harmony);
  }, [selectedRun, history, liveTrends]);

  const tierCount = (tier: HarmonyTier) =>
    trends.filter((t) => t.tier === tier).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-3xl">Culture Pulse</h1>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                state?.live
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning"
              )}
            >
              <span
                className={cn(
                  "live-dot size-1.5 rounded-full",
                  state?.live ? "bg-success" : "bg-warning"
                )}
              />
              {state?.live ? "Live · Claude" : "Mock mode"}
            </span>
          </div>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            The discovery loop scans social media and fashion culture, scores
            what it finds, and maps how deeply each trend is harmonizing.
            {state?.lastRun
              ? ` Last pulse ${new Date(state.lastRun.ran_at).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}.`
              : state && state.trends.length > 0
                ? " Field loaded from the library — no pulse recorded yet."
                : state
                  ? " No pulse yet this session."
                  : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={loopMs}
            onChange={(e) => setLoopMs(Number(e.target.value))}
            className="h-10 rounded-[10px] border border-border-strong bg-card px-3 text-sm shadow-sm"
          >
            {LOOP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={run}
            disabled={running}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-strong disabled:opacity-50"
          >
            {running ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Radio className="size-4" />
            )}
            {running ? "Scanning culture…" : "Run pulse"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {/* 3D field */}
      <div className="panel relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b panel-divide px-5 py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-panel-muted">
            {selectedRun ? (
              <span className="text-warning">
                Rewound to{" "}
                {new Date(selectedRun.ran_at).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                — the field as it was then
              </span>
            ) : (
              <>
                The Culture Field — quadrant = sentiment × momentum, height =
                harmony, spread = WaveScore
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {(Object.keys(HARMONY_TIERS) as HarmonyTier[]).map((tier) => {
              const spec = HARMONY_TIERS[tier];
              return (
                <span
                  key={tier}
                  className="inline-flex items-center gap-1.5 text-xs text-panel-muted"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{
                      background: spec.bright,
                      boxShadow:
                        tier === "in_sync" ? `0 0 6px ${spec.glow}` : undefined,
                    }}
                  />
                  {spec.label} · {tierCount(tier)}
                </span>
              );
            })}
          </div>
        </div>
        <div className="h-[62vh] min-h-[520px] max-h-[880px]">
          {trends.length ? (
            <CultureField trends={trends} onHover={setHovered} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-panel-muted">
              Loading the field…
            </div>
          )}
        </div>
        {hovered ? (
          <div className="pointer-events-none absolute bottom-4 left-4 max-w-sm rounded-lg border panel-divide bg-black/70 px-4 py-3 backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.12em] text-panel-muted">
              {hovered.category} · {HARMONY_TIERS[hovered.tier].label}
            </p>
            <p className="font-display text-lg text-white">{hovered.name}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-panel-muted">
              {hovered.one_line_summary}
            </p>
          </div>
        ) : null}
      </div>

      {/* Timeline — scrub back through every pulse */}
      {history ? (
        <PulseTimeline
          history={history}
          selectedRunId={selectedRunId}
          onSelectRun={setSelectedRunId}
        />
      ) : null}

      {/* Field notes */}
      {state?.lastRun?.notes ? (
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
            Field notes — what the culture is reaching for
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">
            {state.lastRun.notes}
          </p>
        </div>
      ) : null}

      {/* Harmony tiles */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">
            Harmony board
            {selectedRun ? (
              <span className="ml-2 text-sm font-normal text-warning">
                as of{" "}
                {new Date(selectedRun.ran_at).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            ) : null}
          </h2>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trends.slice(0, 12).map((t) => (
            <HarmonyTile key={t.id} trend={t} />
          ))}
        </div>
      </section>

      {/* Cross-channel matrix */}
      <section className="panel px-5 py-5">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-panel-muted">
          Cross-channel pattern
        </p>
        <p className="mb-4 text-sm text-panel-muted">
          Trends lighting up 3+ channels are moving culture-wide, not app-deep.
        </p>
        <ChannelMatrix trends={trends} />
      </section>
    </div>
  );
}

function HarmonyTile({ trend }: { trend: HarmonizedTrend }) {
  const spec = HARMONY_TIERS[trend.tier];
  const inSync = trend.tier === "in_sync";
  return (
    <Link
      href={`/trends/${trend.slug}`}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5",
        inSync
          ? "harmony-glow border-transparent"
          : "border-border hover:border-border-strong"
      )}
      style={{ borderTopColor: spec.color, borderTopWidth: 3 }}
    >
      <div className="relative h-28 overflow-hidden bg-surface-2">
        <Image
          src={heroImageForTrend(trend)}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="p-5 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
            {trend.category}
          </p>
          <h3 className="mt-1 truncate font-display text-lg leading-tight group-hover:text-primary-strong">
            {trend.name}
          </h3>
        </div>
        <Delta value={trend.delta} />
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <span
            className="font-mono text-3xl font-semibold tnum"
            style={{ color: spec.color }}
          >
            {trend.harmony}
            <span className="text-base font-normal">%</span>
          </span>
          <span className="ml-2 text-xs text-muted-foreground">in sync</span>
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{ background: `${spec.color}1a`, color: spec.color }}
        >
          {spec.label}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${trend.harmony}%`,
            background: inSync
              ? `linear-gradient(90deg, ${spec.color}, ${spec.glow})`
              : spec.color,
          }}
        />
      </div>
      </div>
    </Link>
  );
}

function Delta({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-xs font-semibold text-success">
        <ArrowUpRight className="size-3.5" /> +{value}
      </span>
    );
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-xs font-semibold text-danger">
        <ArrowDownRight className="size-3.5" /> {value}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-xs text-faint">
      <Minus className="size-3.5" />
    </span>
  );
}
