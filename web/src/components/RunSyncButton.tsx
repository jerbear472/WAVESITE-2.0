"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// One button, the whole loop: triggers the measured sync (term cascade →
// library refresh → promotions → snapshot → forecasts) and reports what it
// did, inline. The same job the 14:00 UTC cron runs — here on demand.

interface SyncReport {
  refreshed: number;
  promoted_new: number;
  forecast_emitted: number;
  forecast_resolved: number;
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
      const bits = [
        `${data.refreshed} trend${data.refreshed === 1 ? "" : "s"} refreshed`,
        data.promoted_new
          ? `${data.promoted_new} new trend${data.promoted_new === 1 ? "" : "s"} promoted`
          : null,
        `${data.forecast_emitted} forecast${data.forecast_emitted === 1 ? "" : "s"} opened`,
        data.forecast_resolved
          ? `${data.forecast_resolved} resolved`
          : null,
      ].filter(Boolean);
      setResult(`Sync complete — ${bits.join(", ")}.`);
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
