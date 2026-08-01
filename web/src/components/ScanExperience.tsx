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
import type { MarketSignal, Trend } from "@/types";
import type { ScanProfile } from "@/lib/fit";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendCard } from "@/components/TrendCard";
import { MarketSignalsPanel } from "@/components/MarketSignalsPanel";
import { ScanIntake } from "@/components/ScanIntake";
import { getLastScan, saveScan } from "@/lib/scan-store";
import { cn } from "@/lib/utils";

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
  const [markets, setMarkets] = useState<{
    signals: MarketSignal[];
    notes: string;
    venues: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialProfile, setInitialProfile] = useState<ScanProfile | null>(null);

  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const last = getLastScan();
    if (last) setInitialProfile(last.profile);
  }, []);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [statuses]);

  async function runScan(p: ScanProfile) {
    setProfile(p);
    setPhase("scanning");
    setStatuses([]);
    setHits([]);
    setProgress(0);
    setScanned(0);
    setExploratory(false);
    setFieldNotes(null);
    setMarkets(null);
    setError(null);

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
            case "status":
            case "narrow":
              setStatuses((s) => [
                ...s,
                { message: ev.message, phase: ev.phase ?? "narrow" },
              ]);
              if (typeof ev.progress === "number") setProgress(ev.progress);
              if (typeof ev.scanned === "number") {
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
            case "markets":
              setMarkets({
                signals: ev.signals ?? [],
                notes: ev.notes ?? "",
                venues: ev.venues ?? [],
              });
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
                    : "Researching the live web, appraising fit to your brief, and checking prediction markets."}
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
              {hits.map((h) => (
                <TrendCard
                  key={h.trend.id}
                  trend={h.trend}
                  fit={h.fit}
                  reason={h.reasons[0]}
                />
              ))}
            </div>
            {markets ? (
              <MarketSignalsPanel
                signals={markets.signals}
                notes={markets.notes}
                venues={markets.venues}
              />
            ) : null}
          </>
        )
      ) : null}
    </div>
  );
}

function ResultsHeader({
  count,
  scanned,
  exploratory,
  onTune,
}: {
  count: number;
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
            signals across platforms — ranked by fit to your brief.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={onTune}>
            <SlidersHorizontal className="size-4" /> Tune &amp; re-scan
          </Button>
          <Link
            href="/board"
            className={buttonVariants({ variant: "ghost" })}
          >
            <LayoutDashboard className="size-4" /> Your Board
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
