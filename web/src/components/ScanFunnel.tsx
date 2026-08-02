"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { FunnelSnapshot } from "@/lib/terms/funnel";

// The scan funnel — real measurement-layer counts narrowing toward the
// user's fit-ranked hits. Widths use a log scale (6,000 collected items and
// 3 confirmed trends must both be visible) and animate in stage by stage.
// Zero stages are labeled as "baselines building", never faked.

const ACCENT = "#38d8f0";

interface Stage {
  key: string;
  label: string;
  count: number;
  hint?: string;
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
      count: snapshot.signals_collected,
    },
    {
      key: "measured",
      label: "Term measurements",
      count: snapshot.term_measurements,
      hint: sourceChips(snapshot),
    },
    {
      key: "tracked",
      label: "Terms tracked",
      count: snapshot.terms_tracked,
    },
    {
      key: "accelerating",
      label: "Accelerating vs own baseline",
      count: snapshot.accelerating,
      hint: building ? "baselines building" : undefined,
    },
    {
      key: "cross",
      label: "Confirmed on 2+ sources",
      count: snapshot.cross_source,
      hint: building ? "needs multi-day persistence" : undefined,
    },
    {
      key: "fit",
      label: scanning ? "Fit to your brief…" : "Fit to your brief",
      count: hits,
      accent: true,
    },
  ];

  const max = Math.max(...stages.map((s) => s.count), 1);
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
      <div className="mt-2 space-y-1">
        {stages.map((s, i) => {
          const shown = i < visible;
          return (
            <div key={s.key} className="flex items-center gap-3">
              <div className="w-1/2 min-w-0 sm:w-2/5">
                <div
                  className={cn(
                    "flex h-7 items-center justify-end rounded-r-md pr-2 transition-all duration-500 ease-out",
                    s.accent ? "" : "bg-white/10"
                  )}
                  style={{
                    width: shown ? `${width(s.count)}%` : "0%",
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
                      s.accent ? "text-[#06222a]" : "text-white"
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
                {s.hint ? (
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-panel-muted/70">
                    {s.hint}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
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
