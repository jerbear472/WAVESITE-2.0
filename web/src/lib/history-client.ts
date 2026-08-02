import type { TrendHistory } from "@/lib/pipeline/backfill";

// Client-side access to the bulk 12-month history endpoint. Every card on a
// page shares ONE fetch via this module-level promise; `force` re-fetches
// after a backfill deepens a trend's corpus.

let historyPromise: Promise<Map<string, TrendHistory>> | null = null;

export function fetchHistories(
  force = false
): Promise<Map<string, TrendHistory>> {
  if (!historyPromise || force) {
    historyPromise = fetch("/api/trends/history")
      .then((r) => (r.ok ? r.json() : { histories: [] }))
      .then(
        (d: { histories?: TrendHistory[] }) =>
          new Map((d.histories ?? []).map((h) => [h.slug, h]))
      )
      .catch(() => new Map());
  }
  return historyPromise;
}

/** Direction read off the measured monthly series: recent two buckets vs the
 *  three before them. Pure arithmetic — this is the number the card claims. */
export function trajectoryDirection(history: TrendHistory): {
  label: "Rising" | "Fading" | "Steady";
  deltaPct: number;
} | null {
  const buckets = history.months.filter((m) => m.volume > 0 || m.engagement > 0);
  if (buckets.length < 3) return null;
  const recent = history.months.slice(-2);
  const prior = history.months.slice(-5, -2);
  const mean = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const recentMean = mean(recent.map((m) => m.engagement));
  const priorMean = mean(prior.map((m) => m.engagement));
  if (priorMean === 0 && recentMean === 0) return null;
  const deltaPct =
    priorMean === 0
      ? 100
      : Math.round(((recentMean - priorMean) / priorMean) * 100);
  const label = deltaPct >= 15 ? "Rising" : deltaPct <= -15 ? "Fading" : "Steady";
  return { label, deltaPct };
}
