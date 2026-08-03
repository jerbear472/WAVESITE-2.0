"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Radar,
  Loader2,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  LayoutDashboard,
  Target,
} from "lucide-react";
import type { Trend } from "@/types";
import type { ScanProfile } from "@/lib/fit";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendCard } from "@/components/TrendCard";
import { ScanIntake } from "@/components/ScanIntake";
import { ScanFunnel } from "@/components/ScanFunnel";
import type { FunnelSnapshot } from "@/lib/terms/funnel";
import { getLastScan, saveScan } from "@/lib/scan-store";
import { cn } from "@/lib/utils";
import {
  classifyScanHit,
  SCAN_CLASSIFICATION_LABEL,
} from "@/lib/scan-classification";

interface Hit {
  trend: Trend;
  fit: number;
  reasons: string[];
}

type Phase = "intake" | "scanning" | "results";

const ACCENT = "#38d8f0";

interface StatusLine {
  message: string;
  phase: string;
}

export function ScanExperience() {
  const [phase, setPhase] = useState<Phase>("intake");
  const [profile, setProfile] = useState<ScanProfile | null>(null);
  const [statuses, setStatuses] = useState<StatusLine[]>([]);
  const [progress, setProgress] = useState(0);
  const [scanned, setScanned] = useState(0);
  const [hits, setHits] = useState<Hit[]>([]);
  const [exploratory, setExploratory] = useState(false);
  const [fieldNotes, setFieldNotes] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [funnel, setFunnel] = useState<FunnelSnapshot | null>(null);
  const [initialProfile, setInitialProfile] = useState<ScanProfile | null>(null);
  // Trend ids from the previous saved scan — null until a scan starts, and
  // stays null when there was no previous scan (first run marks nothing NEW).
  const [previousFits, setPreviousFits] = useState<Map<string, number> | null>(null);

  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const last = getLastScan();
    if (last) setInitialProfile(last.profile);
  }, []);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [statuses]);

  async function runScan(p: ScanProfile) {
    const last = getLastScan();
    setPreviousFits(
      last ? new Map(last.hits.map((h) => [h.trendId, h.fit])) : null
    );
    setProfile(p);
    setPhase("scanning");
    setStatuses([]);
    setHits([]);
    setProgress(0);
    setScanned(0);
    setExploratory(false);
    setFieldNotes(null);
    setError(null);
    setFunnel(null);

    const collected: Hit[] = [];
    let finalScanned = 0;

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: p }),
      });
      if (!res.ok || !res.body) throw new Error("Scan failed to start.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          switch (ev.type) {
            case "funnel":
              setFunnel(ev.funnel ?? null);
              break;
            case "status":
            case "narrow":
              setStatuses((s) => [
                ...s,
                { message: ev.message, phase: ev.phase ?? "narrow" },
              ]);
              if (typeof ev.progress === "number") setProgress(ev.progress);
              // This counter is scoped to the current live research pass. The
              // much larger stored-corpus count belongs only in the funnel.
              if (typeof ev.scanned === "number" && ev.scanned > finalScanned) {
                setScanned(ev.scanned);
                finalScanned = ev.scanned;
              }
              if (ev.type === "narrow") setExploratory(Boolean(ev.exploratory));
              break;
            case "hit": {
              const hit: Hit = {
                trend: ev.trend,
                fit: ev.fit,
                reasons: ev.reasons ?? [],
              };
              collected.push(hit);
              setHits((h) => [...h, hit]);
              if (typeof ev.progress === "number") setProgress(ev.progress);
              break;
            }
            case "notes":
              setFieldNotes(ev.fieldNotes || null);
              break;
            case "done":
              setProgress(100);
              setPhase("results");
              saveScan({
                profile: p,
                hits: collected.map((h) => ({
                  trendId: h.trend.id,
                  fit: h.fit,
                  reasons: h.reasons,
                })),
                scanned: finalScanned,
                at: new Date().toISOString(),
              });
              break;
            case "error":
              throw new Error(ev.message || "Scan failed.");
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed.");
      setPhase("scanning");
    }
  }

  if (phase === "intake") {
    return <ScanIntake initial={initialProfile} onSubmit={runScan} />;
  }

  return (
    <div className="space-y-6">
      {/* Live scan console */}
      {phase === "scanning" ? (
        <div className="panel overflow-hidden p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                {error ? (
                  <AlertCircle className="size-5 text-danger" />
                ) : (
                  <Radar className="size-5 animate-pulse" style={{ color: ACCENT }} />
                )}
              </span>
              <div>
                <h2 className="font-display text-lg text-white">
                  {error ? "Scan interrupted" : "Scanning culture…"}
                </h2>
                <p className="text-sm text-panel-muted">
                  {error
                    ? error
                    : "Researching the live web and appraising each opportunity against your brief."}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p
                className="font-mono text-2xl font-semibold tabular-nums"
                style={{ color: ACCENT }}
              >
                {scanned.toLocaleString()}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-panel-muted">
                signals scanned
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="panel-track mt-5 h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: ACCENT }}
            />
          </div>

          {/* The funnel — real counts from the measurement layer */}
          {funnel ? (
            <ScanFunnel snapshot={funnel} hits={hits.length} scanning />
          ) : null}

          {/* Console */}
          <div className="panel-2 mt-4 max-h-44 space-y-1.5 overflow-y-auto rounded-lg p-3 font-mono text-xs">
            {statuses.map((s, i) => {
              const isLast = i === statuses.length - 1;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2",
                    isLast && !error ? "text-white" : "text-panel-muted"
                  )}
                >
                  {isLast && !error ? (
                    <Loader2
                      className="size-3 shrink-0 animate-spin"
                      style={{ color: ACCENT }}
                    />
                  ) : (
                    <CheckCircle2
                      className="size-3 shrink-0"
                      style={{ color: "#4ade80" }}
                    />
                  )}
                  <span>{s.message}</span>
                </div>
              );
            })}
            <div ref={consoleEndRef} />
          </div>

          {error ? (
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => profile && runScan(profile)}
            >
              Retry scan
            </Button>
          ) : null}
        </div>
      ) : (
        <ResultsHeader
          count={hits.length}
          newCount={
            previousFits
              ? hits.filter((h) => !previousFits.has(h.trend.id)).length
              : null
          }
          scanned={scanned}
          exploratory={exploratory}
          onTune={() => setPhase("intake")}
        />
      )}

      {/* Live results */}
      {hits.length > 0 ? (
        phase === "scanning" ? (
          <div className="space-y-2">
            {hits.map((h, i) => (
              <div
                key={h.trend.id}
                className="panel-2 flex items-center gap-3 rounded-lg px-4 py-3"
                style={{ animation: "ws-pop .25s ease" }}
              >
                <Target className="size-4 shrink-0" style={{ color: ACCENT }} />
                <span
                  className="font-mono text-sm font-semibold"
                  style={{ color: ACCENT }}
                >
                  {h.fit}%
                </span>
                <span className="truncate font-medium text-white">
                  {h.trend.name}
                </span>
                {previousFits && !previousFits.has(h.trend.id) ? (
                  <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    New to your scan
                  </span>
                ) : null}
                <span className="hidden truncate text-sm text-panel-muted sm:inline">
                  · {h.reasons[0]}
                </span>
                <span className="ml-auto font-mono text-xs text-panel-muted">
                  #{i + 1}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <>
            {fieldNotes ? (
              <Card>
                <CardContent className="p-5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
                    Field notes
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {fieldNotes}
                  </p>
                </CardContent>
              </Card>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {hits.map((h) => {
                const classification = classifyScanHit({
                  lifecycle: h.trend.lifecycle_stage,
                  fit: h.fit,
                  previousFit: previousFits?.get(h.trend.id),
                  hadPreviousScan: previousFits !== null,
                });
                return (
                  <div key={h.trend.id} className="relative">
                    <span
                      className="absolute -top-2 left-4 z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm"
                      style={{ background: ACCENT, color: "#04252b" }}
                    >
                      {SCAN_CLASSIFICATION_LABEL[classification]}
                    </span>
                    <TrendCard
                      trend={h.trend}
                      fit={h.fit}
                      reason={h.reasons[0]}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )
      ) : null}
    </div>
  );
}

function ResultsHeader({
  count,
  newCount,
  scanned,
  exploratory,
  onTune,
}: {
  count: number;
  /** Trends not present in the previous saved scan; null = no previous scan. */
  newCount: number | null;
  scanned: number;
  exploratory: boolean;
  onTune: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="success">
              <CheckCircle2 className="size-3" /> Scan complete
            </Badge>
            {newCount !== null ? (
              <Badge variant="primary">
                {newCount === 0
                  ? "No new trends vs last scan"
                  : `${newCount} new since last scan`}
              </Badge>
            ) : null}
            {exploratory ? (
              <Badge variant="warning">Loose matches</Badge>
            ) : null}
          </div>
          <h2 className="mt-2 font-display text-2xl">
            {count} trend{count === 1 ? "" : "s"} worth your time
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Narrowed from{" "}
            <span className="font-mono text-foreground">
              {scanned.toLocaleString()}
            </span>{" "}
            signals across platforms — ranked by fit to your brief. These
            results now live on{" "}
            <Link href="/board" className="text-primary-strong underline underline-offset-2">
              Your Board
            </Link>
            , and anything new here is already queued for daily measurement.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={onTune}>
            <SlidersHorizontal className="size-4" /> Tune &amp; re-scan
          </Button>
          <Link
            href="/board"
            className={buttonVariants({ variant: "primary" })}
          >
            <LayoutDashboard className="size-4" /> View Your Board
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
