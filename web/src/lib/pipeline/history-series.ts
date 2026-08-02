import { dedupeItems } from "./dedup.ts";
import type { ItemAnnotation, RawItem, SentimentLabel } from "./types.ts";

export interface MeasuredHistoryBucket {
  period: string;
  volume: number;
  engagement: number;
  sentiment: number | null;
  labeled_items: number;
}

export function rawEngagement(item: RawItem): number {
  const e = item.engagement ?? {};
  return (
    (e.views ?? 0) + (e.score ?? 0) * 50 + (e.likes ?? 0) * 10 +
    (e.comments ?? 0) * 20
  );
}

function sentimentNet(labels: SentimentLabel[]): number | null {
  if (labels.length === 0) return null;
  let score = 0;
  for (const label of labels) {
    if (label === "positive") score += 1;
    else if (label === "negative") score -= 1;
    else if (label === "ironic") score -= 0.25;
  }
  return Math.round((score / labels.length) * 100) / 100;
}

export function aggregateHistory(
  items: RawItem[],
  annotations: Map<string, Pick<ItemAnnotation, "sentiment">>,
  periods: string[]
) {
  const { canonical } = dedupeItems(items);
  const allowed = new Set(periods);
  const buckets = new Map<
    string,
    { volume: number; engagement: number; labels: SentimentLabel[] }
  >();
  const topByPeriod = new Map<string, RawItem>();
  const sourceCounts: Partial<Record<RawItem["source"], number>> = {};
  for (const item of canonical) {
    const period = item.posted_at.slice(0, 7);
    if (!allowed.has(period)) continue;
    const b = buckets.get(period) ?? { volume: 0, engagement: 0, labels: [] };
    b.volume += 1;
    b.engagement += Math.log10(1 + rawEngagement(item));
    const label = annotations.get(item.id)?.sentiment;
    if (label) b.labels.push(label);
    buckets.set(period, b);
    sourceCounts[item.source] = (sourceCounts[item.source] ?? 0) + 1;
    const top = topByPeriod.get(period);
    if (!top || rawEngagement(item) > rawEngagement(top)) topByPeriod.set(period, item);
  }
  const months: MeasuredHistoryBucket[] = periods.map((period) => {
    const b = buckets.get(period);
    return {
      period,
      volume: b?.volume ?? 0,
      engagement: Math.round((b?.engagement ?? 0) * 10) / 10,
      sentiment: sentimentNet(b?.labels ?? []),
      labeled_items: b?.labels.length ?? 0,
    };
  });
  const totalItems = months.reduce((n, m) => n + m.volume, 0);
  const labeledItems = months.reduce((n, m) => n + m.labeled_items, 0);
  const coverageMonths = months.filter((m) => m.volume > 0).length;
  const labelCoverage = totalItems ? labeledItems / totalItems : 0;
  const confidence =
    totalItems >= 20 && coverageMonths >= 4 && Object.keys(sourceCounts).length >= 2 && labelCoverage >= 0.5
      ? "high" as const
      : totalItems >= 8 && coverageMonths >= 2
        ? "medium" as const
        : "low" as const;
  return {
    months,
    total_items: totalItems,
    labeled_items: labeledItems,
    coverage_months: coverageMonths,
    source_counts: sourceCounts,
    confidence,
    topByPeriod,
  };
}
