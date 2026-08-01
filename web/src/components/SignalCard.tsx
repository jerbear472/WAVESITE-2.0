import { ExternalLink } from "lucide-react";
import type { Signal } from "@/types";
import { Badge } from "@/components/ui/badge";

const SOURCE_LABELS: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  reddit: "Reddit",
  instagram: "Instagram",
  article: "Article",
  manual: "Manual",
  google_trends: "Google Trends",
  other: "Other",
};

function topEngagement(s: Signal): string | null {
  const e = s.platform_engagement_json;
  if (!e) return null;
  const entries = Object.entries(e).filter(
    ([, v]) => typeof v === "number"
  ) as [string, number][];
  if (!entries.length) return null;
  const [key, val] = entries.sort((a, b) => b[1] - a[1])[0];
  return `${formatNum(val)} ${key}`;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function SignalCard({ signal }: { signal: Signal }) {
  const engagement = topEngagement(signal);
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge variant="outline">
          {SOURCE_LABELS[signal.source] ?? signal.source}
        </Badge>
        <div className="flex items-center gap-2 text-xs text-faint">
          {engagement ? <span className="font-mono">{engagement}</span> : null}
          {signal.url ? (
            <a
              href={signal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary-strong"
              aria-label="Open source"
            >
              <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </div>
      </div>
      {signal.title ? (
        <p className="text-sm font-medium leading-snug text-foreground">
          {signal.title}
        </p>
      ) : null}
      {signal.text ? (
        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
          {signal.text}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
        {signal.creator_name ? <span>{signal.creator_name}</span> : null}
        {signal.detected_emotions.length ? (
          <span>· {signal.detected_emotions.slice(0, 3).join(", ")}</span>
        ) : null}
      </div>
    </div>
  );
}
