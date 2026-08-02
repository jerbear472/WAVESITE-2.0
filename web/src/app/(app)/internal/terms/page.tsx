import {
  getCompositesForDate,
  getActiveTerms,
  getLatestIngestRuns,
} from "@/lib/terms/store";
import type { ZDistribution } from "@/lib/terms/run";
import { SOURCE_IDS } from "@/lib/terms/types";

// Internal instrumentation for the term signals layer. After each run:
// per-source terms queried / quota / latency / failures, the z-score
// distribution per source, and the count of terms in each cascade state.
// Compression or collapse in these distributions is how we find out the
// pipeline broke — in data, not in a screenshot.

export const dynamic = "force-dynamic";

const CASCADE_ORDER = [
  "embryonic",
  "emerging",
  "breaking",
  "mainstream",
  "decaying",
  "dormant",
] as const;

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function TermsInternalPage() {
  let runs: any[] = [];
  let error: string | null = null;
  try {
    runs = await getLatestIngestRuns(14);
  } catch (err) {
    error = err instanceof Error ? err.message : "terms store unavailable";
  }

  if (error) {
    return (
      <Shell>
        <p className="text-sm text-danger">{error}</p>
      </Shell>
    );
  }
  if (runs.length === 0) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">
          No ingestion runs yet. POST /api/terms/run to execute one.
        </p>
      </Shell>
    );
  }

  const run = runs[0];
  const [composites, terms] = await Promise.all([
    getCompositesForDate(run.obs_date),
    getActiveTerms(),
  ]);
  const nameById = new Map(terms.map((t) => [t.term_id, t.canonical]));
  const cascade: Record<string, number> = run.cascade_counts ?? {};
  const zDists: Record<string, ZDistribution | null> = run.z_distributions ?? {};
  const spend = run.ai_spend ?? {};

  return (
    <Shell>
      <p className="text-sm text-muted-foreground">
        Run <span className="font-mono">{run.run_id}</span> · day {run.obs_date} ·{" "}
        {run.terms_active} active terms · +{run.candidates_added} candidates ·{" "}
        {run.candidates_retired} retired · AI spend $
        {Number(spend.est_usd ?? 0).toFixed(2)} / ${Number(spend.ceiling_usd ?? 0).toFixed(2)}
        {spend.exceeded ? (
          <span className="ml-2 rounded bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
            AI SPEND CEILING EXCEEDED
          </span>
        ) : null}
      </p>

      <p className="mt-3 text-sm">
        Cascade states:{" "}
        {CASCADE_ORDER.map((s) => (
          <span key={s} className="mr-3 font-mono text-xs">
            {s} <span className="font-semibold">{cascade[s] ?? 0}</span>
          </span>
        ))}
      </p>

      <h2 className="mt-8 font-display text-lg">Sources</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">source</th>
              <th className="px-3 py-2">status</th>
              <th className="px-3 py-2">queried</th>
              <th className="px-3 py-2">observations</th>
              <th className="px-3 py-2">failures</th>
              <th className="px-3 py-2">quota units</th>
              <th className="px-3 py-2">latency</th>
              <th className="px-3 py-2">z: n / mean / sd / max</th>
            </tr>
          </thead>
          <tbody>
            {SOURCE_IDS.map((s) => {
              const st = (run.sources ?? {})[s];
              const z = zDists[s];
              if (!st) return null;
              return (
                <tr key={s} className="border-b border-border/60">
                  <td className="px-3 py-2 font-mono">{s}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        st.status === "ok"
                          ? "text-success"
                          : st.status === "disabled"
                            ? "text-muted-foreground"
                            : "text-danger"
                      }
                    >
                      {st.status}
                    </span>
                    {st.reason ? (
                      <span className="block max-w-56 truncate text-xs text-muted-foreground" title={st.reason}>
                        {st.reason}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{st.terms_queried}</td>
                  <td className="px-3 py-2">{st.observations}</td>
                  <td className="px-3 py-2">{st.failures}</td>
                  <td className="px-3 py-2">{st.quota_units || "—"}</td>
                  <td className="px-3 py-2">{Math.round((st.latency_ms ?? 0) / 1000)}s</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {z ? `${z.n} / ${z.mean} / ${z.sd} / ${z.max}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 font-display text-lg">Top composites — {run.obs_date}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Cascade state, not raw score, is the primary output: a moderate score
        at emerging outranks a high score at mainstream.
      </p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">term</th>
              <th className="px-3 py-2">cascade</th>
              <th className="px-3 py-2">breadth</th>
              <th className="px-3 py-2">composite</th>
              <th className="px-3 py-2">lead (days)</th>
              <th className="px-3 py-2">flagged on</th>
              <th className="px-3 py-2">missing</th>
            </tr>
          </thead>
          <tbody>
            {composites.slice(0, 40).map((c) => (
              <tr key={c.id} className="border-b border-border/60">
                <td className="max-w-52 truncate px-3 py-2">
                  {nameById.get(c.term_id) ?? c.term_id}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{c.cascade_state}</td>
                <td className="px-3 py-2">{c.breadth}</td>
                <td className="px-3 py-2 font-mono">{c.composite_score}</td>
                <td className="px-3 py-2">{c.lead_estimate_days ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {(c.sources_flagged ?? []).join(", ") || "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                  {(c.sources_missing ?? []).join(", ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 font-display text-lg">Recent runs</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">day</th>
              <th className="px-3 py-2">sources ok</th>
              <th className="px-3 py-2">+candidates</th>
              <th className="px-3 py-2">retired</th>
              <th className="px-3 py-2">AI $</th>
              <th className="px-3 py-2">notes</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const ok = Object.values(r.sources ?? {}).filter(
                (s: any) => s.status === "ok"
              ).length;
              return (
                <tr key={r.run_id} className="border-b border-border/60">
                  <td className="px-3 py-2 font-mono text-xs">{r.obs_date}</td>
                  <td className="px-3 py-2">{ok}/{SOURCE_IDS.length}</td>
                  <td className="px-3 py-2">{r.candidates_added}</td>
                  <td className="px-3 py-2">{r.candidates_retired}</td>
                  <td className="px-3 py-2">{Number(r.ai_spend?.est_usd ?? 0).toFixed(2)}</td>
                  <td className="max-w-72 truncate px-3 py-2 text-xs text-muted-foreground" title={r.notes ?? ""}>
                    {r.notes ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-3xl">Term signals instrumentation</h1>
      <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
        Per-source ingestion health, z-score distributions, and cascade state
        counts for the daily term run. Each term is scored against its own
        trailing baseline per source; breadth across independent sources is
        what makes a signal a trend.
      </p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
