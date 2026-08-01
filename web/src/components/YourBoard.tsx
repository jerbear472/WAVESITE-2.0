"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radar, SlidersHorizontal, Clock } from "lucide-react";
import type { Trend } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { TrendCard } from "@/components/TrendCard";
import { getLastScan, type SavedScan } from "@/lib/scan-store";
import { formatDate } from "@/lib/utils";

export function YourBoard({ trends }: { trends: Trend[] }) {
  const [scan, setScan] = useState<SavedScan | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const refresh = () => setScan(getLastScan());
    refresh();
    window.addEventListener("wavesight:scan-changed", refresh);
    return () => window.removeEventListener("wavesight:scan-changed", refresh);
  }, []);

  if (!mounted) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="shimmer h-5 w-40 rounded bg-surface-2" />
        </CardContent>
      </Card>
    );
  }

  // First run / no scan yet → invite a scan instead of dumping the library.
  if (!scan || scan.hits.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-4 px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Radar className="size-7 text-primary-strong" />
          </span>
          <div>
            <h3 className="font-display text-xl">
              Run your first scan
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
              WaveSight watches the whole internet. Tell us who you are and what
              you want, and we&apos;ll surface only the trends worth your time —
              no firehose, no noise.
            </p>
          </div>
          <Link
            href="/scan"
            className={buttonVariants({ variant: "primary", size: "lg" })}
          >
            <Radar className="size-4" /> Run a Live Scan
          </Link>
        </CardContent>
      </Card>
    );
  }

  const byId = new Map(trends.map((t) => [t.id, t]));
  const board = scan.hits
    .map((h) => ({ hit: h, trend: byId.get(h.trendId) }))
    .filter((x): x is { hit: (typeof scan.hits)[number]; trend: Trend } =>
      Boolean(x.trend)
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Your Waves</h2>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-3.5" />
            {board.length} matches from{" "}
            <span className="font-mono text-foreground">
              {scan.scanned.toLocaleString()}
            </span>{" "}
            signals · {formatDate(scan.at)}
          </p>
        </div>
        <Link
          href="/scan"
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          <SlidersHorizontal className="size-3.5" /> Re-scan
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {board.map(({ hit, trend }) => (
          <TrendCard
            key={trend.id}
            trend={trend}
            fit={hit.fit}
            reason={hit.reasons[0]}
          />
        ))}
      </div>
    </div>
  );
}
