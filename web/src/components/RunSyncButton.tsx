"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// One button, the whole loop: triggers the measured sync (term cascade →
// library refresh → promotions → snapshot → forecasts) and reports what it
// did, inline. The same job the 14:00 UTC cron runs — here on demand.

interface SyncReport {
  terms_measured: number;
  firing: number;
  refreshed: number;
  promoted_new: number;
  snapshotted: number;
  forecast_emitted: number;
  forecast_resolved: number;
  forecasts_open: number;
}

/** A quiet run is still a run — say what was measured and why nothing moved,
 *  not just a row of zeros that reads as "broken". */
function describe(r: SyncReport): string {
  const happened: string[] = [];
  if (r.refreshed)
    happened.push(`${r.refreshed} trend${r.refreshed === 1 ? "" : "s"} refreshed`);
  if (r.promoted_new)
    happened.push(`${r.promoted_new} new trend${r.promoted_new === 1 ? "" : "s"} promoted`);
  if (r.forecast_emitted) happened.push(`${r.forecast_emitted} forecasts opened`);
  if (r.forecast_resolved) happened.push(`${r.forecast_resolved} resolved`);

  const snapshot = `snapshot of ${r.snapshotted} trends saved`;

  if (happened.length > 0) {
    return `Sync complete — ${happened.join(", ")}; ${snapshot}.`;
  }
  if (r.terms_measured > 0 && r.firing === 0) {
    return `Measured ${r.terms_measured} terms — all quiet today. Acceleration flags unlock as baselines fill (about a week of daily data); ${snapshot}; ${r.forecasts_open} forecasts still open.`;
  }
  if (r.terms_measured > 0) {
    return `Measured ${r.terms_measured} terms (${r.firing} firing) — no lifecycle changes since the last run; ${snapshot}; ${r.forecasts_open} forecasts still open.`;
  }
  return `No fresh measurements yet — the daily ingestion runs at 12:00 UTC; ${snapshot}.`;
}

export function RunSyncButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/trends/sync", { method: "POST" });
      const data: SyncReport & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "sync failed");
      setResult(describe(data));
      router.refresh();
    } catch (err) {
      setResult(
        `Sync failed: ${err instanceof Error ? err.message : "unknown error"}`
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" variant="secondary" onClick={run} disabled={running}>
        {running ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        {running ? "Measuring…" : "Run sync now"}
      </Button>
      {result ? (
        <span className="text-xs text-muted-foreground">{result}</span>
      ) : null}
    </div>
  );
}
