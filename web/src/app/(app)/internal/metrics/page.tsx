import {
  getDistributionsForRun,
  getLatestMetricsRun,
  getMetricsForRun,
} from "@/lib/pipeline/store";
import { getTrends } from "@/lib/data";
import type { MetricName } from "@/lib/pipeline/types";
import { METRIC_NAMES } from "@/lib/pipeline/types";

// Internal instrumentation — the distribution of every metric after each
// measured run. If score compression returns, it shows up here as shrinking
// sd / single-bucket pileups, in data rather than in a screenshot.

export const dynamic = "force-dynamic";

export default async function MetricsInternalPage() {
  let runId: string | null = null;
  let error: string | null = null;
  try {
    runId = await getLatestMetricsRun();
  } catch (err) {
    error = err instanceof Error ? err.message : "pipeline store unavailable";
  }

  if (error) {
    return (
      <Shell>
        <p className="text-sm text-danger">{error}</p>
      </Shell>
    );
  }
  if (!runId) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">
          No measured runs yet. POST /api/pipeline/run to execute one.
        </p>
      </Shell>
    );
  }

  const [dists, rows, trends] = await Promise.all([
    getDistributionsForRun(runId),
    getMetricsForRun(runId),
    getTrends(),
  ]);
  const nameById = new Map(trends.map((t) => [t.id, t.name]));
  const distByMetric = new Map(dists.map((d) => [d.metric, d.stats]));
  const provisional = rows.some((r) => r.provisional);

  const stateCounts: Record<string, number> = {};
  for (const r of rows) {
    if (r.state) stateCounts[r.state] = (stateCounts[r.state] ?? 0) + 1;
  }

  return (
    <Shell>
      <p className="text-sm text-muted-foreground">
        Run <span className="font-mono">{runId}</span> · {rows.length} trends ·
        states: {Object.entries(stateCounts).map(([s, c]) => `${s} ${c}`).join(" / ") || "—"}
        {provisional ? (
          <span className="ml-2 rounded bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
            PROVISIONAL — under 30 days of history, within-run reference
          </span>
        ) : null}
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">metric (percentile)</th>
              <th className="px-3 py-2">n</th>
              <th className="px-3 py-2">min</th>
              <th className="px-3 py-2">median</th>
              <th className="px-3 py-2">max</th>
              <th className="px-3 py-2">sd</th>
              <th className="px-3 py-2">buckets 0-100</th>
            </tr>
          </thead>
          <tbody>
            {METRIC_NAMES.map((m) => {
              const s = distByMetric.get(m);
              if (!s) return null;
              const peak = Math.max(...s.buckets, 1);
              return (
                <tr key={m} className="border-b border-border/60">
                  <td className="px-3 py-2 font-mono">{m}</td>
                  <td className="px-3 py-2">{s.n}</td>
                  <td className="px-3 py-2">{s.min}</td>
                  <td className="px-3 py-2">{s.median}</td>
                  <td className="px-3 py-2">{s.max}</td>
                  <td className="px-3 py-2">{s.sd}</td>
                  <td className="px-3 py-2">
                    <div className="flex h-6 items-end gap-0.5">
                      {s.buckets.map((b, i) => (
                        <div
                          key={i}
                          title={`${i * 10}-${i * 10 + 9}: ${b}`}
                          className="w-3 rounded-sm bg-primary/70"
                          style={{ height: `${(b / peak) * 100}%`, minHeight: b ? 3 : 1 }}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 font-display text-lg">Per-trend metrics</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">trend</th>
              <th className="px-3 py-2">state</th>
              {METRIC_NAMES.map((m) => (
                <th key={m} className="px-3 py-2" title="percentile (raw)">
                  {m.replace("_", " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...rows]
              .sort(
                (a, b) => (b.percentiles.velocity ?? 0) - (a.percentiles.velocity ?? 0)
              )
              .map((r) => (
                <tr key={r.trend_id} className="border-b border-border/60">
                  <td className="max-w-44 truncate px-3 py-2">
                    {nameById.get(r.trend_id) ?? r.trend_id}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.state}</td>
                  {METRIC_NAMES.map((m) => (
                    <MetricCell key={m} pct={r.percentiles[m]} raw={r.raw[m]} />
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Each cell: percentile, with the raw measured value beneath it. Raw
        values are never discarded — the 95th percentile has to stay
        explainable as “400 posts, not 40,000”.
      </p>
    </Shell>
  );
}

function MetricCell({ pct, raw }: { pct?: number; raw: number | null }) {
  if (pct === undefined || raw === null) {
    return <td className="px-3 py-2 text-faint">—</td>;
  }
  return (
    <td className="px-3 py-2">
      <span className="font-mono font-semibold">{Math.round(pct)}</span>
      <span className="block font-mono text-[10px] text-muted-foreground">
        {raw}
      </span>
    </td>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-3xl">Pipeline instrumentation</h1>
      <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
        Distribution of every measured metric per run. Percentile scores are
        ranked against the trailing 90 days across all trends — spread is
        guaranteed by construction, and this page is where we verify it stays
        that way.
      </p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
