"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Trash2, ArrowUpRight } from "lucide-react";
import type { Trend } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WaveScore } from "@/components/WaveScore";
import { lifecycleBadge, riskBadge, sentimentBadge } from "@/lib/trend-format";
import {
  getSaved,
  removeSaved,
  setNotes,
  type SavedEntry,
} from "@/lib/saved-trends";

export function SavedTrends({ trends }: { trends: Trend[] }) {
  const [entries, setEntries] = useState<SavedEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const refresh = () => setEntries(getSaved());
    refresh();
    window.addEventListener("wavesight:saved-changed", refresh);
    return () => window.removeEventListener("wavesight:saved-changed", refresh);
  }, []);

  const byId = new Map(trends.map((t) => [t.id, t]));
  const saved = entries
    .map((e) => ({ entry: e, trend: byId.get(e.trend_id) }))
    .filter((x): x is { entry: SavedEntry; trend: Trend } => Boolean(x.trend));

  if (!mounted) return <SavedSkeleton />;

  if (saved.length === 0) {
    return (
      <Card className="flex items-center justify-center border-dashed">
        <div className="max-w-sm px-6 py-16 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Bookmark className="size-6 text-primary-strong" />
          </span>
          <h3 className="mt-4 font-display text-lg">
            No saved trends yet
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Save trends from the feed or a trend page to build your watchlist and
            keep private notes.
          </p>
          <Link
            href="/radar"
            className={`mt-4 ${buttonVariants({ variant: "secondary", size: "sm" })}`}
          >
            Browse Today&apos;s Waves
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {saved.map(({ entry, trend }) => {
        const lifecycle = lifecycleBadge(trend.lifecycle_stage);
        const risk = riskBadge(trend.risk_level);
        const sentiment = sentimentBadge(trend.sentiment_score);
        return (
          <Card key={trend.id}>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row">
              <WaveScore score={trend.wavescore} size={64} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-primary-strong">
                      {trend.category}
                    </p>
                    <Link
                      href={`/trends/${trend.slug}`}
                      className="font-display text-lg hover:text-primary-strong"
                    >
                      {trend.name}
                    </Link>
                  </div>
                  <div className="flex gap-1">
                    <Link
                      href={`/trends/${trend.slug}`}
                      className={buttonVariants({ variant: "ghost", size: "icon" })}
                      aria-label="Open trend"
                    >
                      <ArrowUpRight className="size-4" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove"
                      onClick={() => removeSaved(trend.id)}
                    >
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {trend.one_line_summary}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant={lifecycle.variant}>{lifecycle.label}</Badge>
                  <Badge variant={sentiment.variant}>{sentiment.label}</Badge>
                  <Badge variant={risk.variant}>{risk.label}</Badge>
                </div>
                <Textarea
                  defaultValue={entry.notes}
                  placeholder="Add a private note — angle ideas, who's working on it, deadline…"
                  className="mt-3 min-h-[60px]"
                  onBlur={(e) => setNotes(trend.id, e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SavedSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((i) => (
        <Card key={i}>
          <CardContent className="space-y-3 p-5">
            <div className="shimmer h-5 w-1/3 rounded bg-surface-2" />
            <div className="shimmer h-4 w-2/3 rounded bg-surface-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
