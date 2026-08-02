"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { FunnelSnapshot } from "@/lib/terms/funnel";

// The scan funnel — real measurement-layer counts narrowing toward the
// user's fit-ranked hits. Stages are ordered strictly wide -> narrow so the
// shape itself tells the story, and each stage carries one plain-language
// line of what it means. Zero stages render hollow with the reason spelled
// out — never a faked bar — and a closing line says where today's picks
// actually come from while baselines mature.

const ACCENT = "#38d8f0";

interface Stage {
  key: string;
  label: string;
  sub?: string;
  count: number;
  empty?: string; // reason shown when count is 0
  accent?: boolean;
}

export function ScanFunnel({
  snapshot,
  hits,
  scanning,
}: {
  snapshot: FunnelSnapshot;
  hits: number;
  scanning: boolean;
}) {
  // Stagger the stages in so the funnel reads as data arriving, not a chart
  // that was always there.
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    if (visible >= 6) return;
    const t = setTimeout(() => setVisible((v) => v + 1), 160);
    return () => clearTimeout(t);
  }, [visible]);

  const building = snapshot.accelerating === 0 && snapshot.persistent === 0;

  const stages: Stage[] = [
    {
      key: "collected",
      label: "Signals collected",
      sub: "raw posts swept from Reddit & YouTube",
      count: snapshot.signals_collected,
    },
    {
      key: "tracked",
      label: "Terms on the watchlist",
      sub: "phrases the measurement layer checks daily",
      count: snapshot.terms_tracked,
    },
    {
      key: "measured",
      label: "Measured today",
      sub: sourceChips(snapshot) ?? "no source reported counts today",
      count: snapshot.terms_measured_today,
      empty: "sources quiet today",
    },
    {
      key: "accelerating",
      label: "Accelerating",
      sub: "rising vs their own 60-day baseline",
      count: snapshot.accelerating,
      empty: building ? "baselines still building" : "none today",
    },
    {
      key: "cross",
      label: "Confirmed on 2+ sources",
      sub: "the same phrase firing across platforms",
      count: snapshot.cross_source,
      empty: building ? "needs multi-day persistence" : "none yet",
    },
  ];

  const max = Math.max(...stages.map((s) => s.count), hits, 1);
  const width = (n: number) => {
    // Log scale, floored so zero stages still render a visible stub.
    if (n <= 0) return 8;
    return 18 + (Math.log10(n + 1) / Math.log10(max + 1)) * 82;
  };

  return (
    <div className="mt-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-panel-muted">
        The funnel — live measurements{snapshot.as_of ? ` · day ${snapshot.as_of}` : ""}
      </p>
      <div className="mt-2 space-y-1.5">
        {stages.map((s, i) => (
          <FunnelRow key={s.key} stage={s} width={width(s.count)} shown={i < visible} />
        ))}

        {/* Your picks sit apart: they come from live research, and the funnel
            above is what confirms them with measured data over time. */}
        <div className="my-2 border-t border-white/10" />
        <FunnelRow
          stage={{
            key: "fit",
            label: scanning ? "Fit to your brief…" : "Fit to your brief",
            sub: "picked by live web research, ranked for your goals",
            count: hits,
            accent: true,
          }}
          width={width(hits)}
          shown={visible >= 6}
        />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-panel-muted">
        {building
          ? "The bottom of the funnel is honestly empty: acceleration needs ~2 weeks of daily baselines before it can fire. Until then, picks come from live web research — the funnel exists to confirm them with measured data as history builds."
          : `${snapshot.accelerating} term${snapshot.accelerating === 1 ? "" : "s"} accelerating and ${snapshot.cross_source} confirmed cross-source — measured momentum is feeding these picks.`}
      </p>
    </div>
  );
}

function FunnelRow({
  stage: s,
  width,
  shown,
}: {
  stage: Stage;
  width: number;
  shown: boolean;
}) {
  const empty = s.count <= 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-1/2 min-w-0 sm:w-2/5">
        <div
          className={cn(
            "flex h-7 items-center justify-end rounded-r-md pr-2 transition-all duration-500 ease-out",
            s.accent
              ? ""
              : empty
                ? "border border-dashed border-white/20"
                : "bg-white/10"
          )}
          style={{
            width: shown ? `${width}%` : "0%",
            marginLeft: "auto",
            background: s.accent
              ? `linear-gradient(90deg, ${ACCENT}33, ${ACCENT})`
              : undefined,
            opacity: shown ? 1 : 0,
          }}
        >
          <span
            className={cn(
              "font-mono text-xs font-semibold tabular-nums",
              s.accent ? "text-[#06222a]" : empty ? "text-panel-muted" : "text-white"
            )}
          >
            {s.count.toLocaleString()}
          </span>
        </div>
      </div>
      <div
        className="min-w-0 flex-1 transition-opacity duration-500"
        style={{ opacity: shown ? 1 : 0 }}
      >
        <span
          className={cn(
            "text-xs",
            s.accent ? "font-medium text-white" : "text-panel-muted"
          )}
        >
          {s.label}
        </span>
        {empty && s.empty ? (
          <span className="ml-2 text-[10px] uppercase tracking-wide text-panel-muted/70">
            {s.empty}
          </span>
        ) : null}
        {s.sub ? (
          <p className="truncate text-[10px] leading-tight text-panel-muted/60">
            {s.sub}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function sourceChips(s: FunnelSnapshot): string | undefined {
  const parts = Object.entries(s.observations_by_source)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([src, n]) => `${src} ${n}`);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}
