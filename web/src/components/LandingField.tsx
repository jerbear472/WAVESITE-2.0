"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { HarmonizedTrend } from "@/lib/harmony";
import { HARMONY_TIERS } from "@/lib/harmony";

const CultureField = dynamic(() => import("@/components/three/CultureField"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-panel-muted">
      Rendering the culture field…
    </div>
  ),
});

/**
 * The 3D field as the landing page's wow moment. Purely presentational —
 * the working surfaces inside the app are the tiles, timeline, and matrix.
 */
export function LandingField() {
  const [trends, setTrends] = useState<HarmonizedTrend[] | null>(null);
  const [hovered, setHovered] = useState<HarmonizedTrend | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pulse")
      .then((res) => (res.ok ? res.json() : null))
      .then((state) => {
        if (!cancelled && state?.trends?.length) setTrends(state.trends);
      })
      .catch(() => {
        // The field is decorative here — if it can't load, show nothing.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!trends) return null;

  return (
    <section className="mx-auto max-w-6xl border-t border-border px-6 py-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary-strong">
            The Culture Field
          </p>
          <h2 className="mt-2 font-display text-3xl tracking-tight">
            Culture, mapped in real time.
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Every trend we track, placed by sentiment and momentum — the ones
            glowing are in sync with the culture right now.
          </p>
        </div>
      </div>
      <div className="panel relative overflow-hidden">
        <div className="h-[52vh] min-h-[420px] max-h-[640px]">
          <CultureField trends={trends} onHover={setHovered} />
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
    </section>
  );
}
