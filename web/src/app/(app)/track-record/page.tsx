"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
import type { Forecast } from "@/types";
import type { CalibrationReport } from "@/lib/forecasts";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Track record — the published, falsifiable history of every flag the system
// raised. Credibility rule: every number shows its sample size, and any
// metric under the minimum sample renders "Not enough data" instead of a
// statistic. A calibration chart that lies early is worse than no chart.
// ---------------------------------------------------------------------------

interface ForecastRow extends Forecast {
  trend_name: string;
  trend_slug: string | null;
}

interface Payload {
  calibration: CalibrationReport;
  forecasts: ForecastRow[];
}

const WINDOWS = [30, 90, 180, 365];

const STATUS_STYLE: Record<Forecast["status"], string> = {
  pending: "bg-muted text-muted-foreground",
  hit: "bg-success/10 text-success",
  miss: "bg-danger/10 text-danger",
  void: "bg-warning/10 text-warning",
};

const CLAIM_LABEL: Record<Forecast["claim_type"], string> = {
  peak_within: "Peaks within",
  sustains_above: "Sustains above",
  fades_below: "Fades below",
};

export default function TrackRecordPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [windowDays, setWindowDays] = useState(90);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (w: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forecasts?window=${w}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(windowDays);
  }, [load, windowDays]);

  const cal = data?.calibration;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Track record</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Every &ldquo;rising&rdquo; flag becomes a falsifiable forecast with
            a deadline, resolved against observed history and scored. Nothing
            here is curated — voids and misses are part of the record.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="h-10 rounded-[10px] border border-border-strong bg-card px-3 text-sm shadow-sm"
          >
            {WINDOWS.map((w) => (
              <option key={w} value={w}>
                Last {w} days
              </option>
            ))}
          </select>
          <button
            onClick={() => load(windowDays)}
            className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-border-strong bg-card px-3 text-sm shadow-sm hover:bg-muted"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Headline metrics — each gated on its own sample size. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Hit rate"
          gated={cal?.hit_rate}
          format={(v) => `${Math.round(v * 100)}%`}
          caption="hits ÷ (hits + misses); voids excluded"
        />
        <Metric
          label="Brier score"
          gated={cal?.brier}
          format={(v) => v.toFixed(3)}
          caption="0 = perfectly calibrated, lower is better"
        />
        <Metric
          label="Median lead time"
          gated={cal?.median_lead_days}
          format={(v) => `${Math.round(v)} days`}
          caption="rising flag → observed peak, hit forecasts only"
        />
        <Metric
          label="Void rate"
          gated={cal?.void_rate}
          format={(v) => `${Math.round(v * 100)}%`}
          caption="high = the scanner itself is unstable"
        />
      </div>

      {/* Calibration by confidence decile */}
      <section className="panel px-5 py-5">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-panel-muted">
          Calibration by stated confidence
        </p>
        <p className="mb-4 text-sm text-panel-muted">
          A calibrated forecaster hits ~70% of its 70%-confidence claims.
          Deciles under n={cal?.min_sample ?? 10} show no rate.
        </p>
        <div className="space-y-1.5">
          {(cal?.deciles ?? []).map((d) => (
            <div key={d.decile} className="flex items-center gap-3 text-xs">
              <span className="w-16 shrink-0 font-mono text-panel-muted">
                {d.label}
              </span>
              <div className="h-4 flex-1 overflow-hidden rounded bg-white/5">
                {d.hit_rate !== null ? (
                  <div
                    className="h-full rounded bg-primary/80"
                    style={{ width: `${d.hit_rate * 100}%` }}
                  />
                ) : null}
              </div>
              <span className="w-28 shrink-0 text-right font-mono text-panel-muted">
                {d.hit_rate !== null
                  ? `${Math.round(d.hit_rate * 100)}% hit`
                  : d.n > 0
                    ? "not enough data"
                    : "—"}
                {" · "}n={d.n}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* The forecast log itself */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl">Forecast log</h2>
          <p className="text-xs text-muted-foreground">
            {cal ? (
              <>
                {cal.n_pending} pending · {cal.n_resolved} resolved in window
              </>
            ) : null}
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.1em] text-faint">
                <th className="px-4 py-2.5 font-medium">Trend</th>
                <th className="px-4 py-2.5 font-medium">Claim</th>
                <th className="px-4 py-2.5 font-medium">Confidence</th>
                <th className="px-4 py-2.5 font-medium">Made</th>
                <th className="px-4 py-2.5 font-medium">Resolves</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {(data?.forecasts ?? []).map((f) => (
                <tr key={f.forecast_id} className="border-b border-border/60">
                  <td className="px-4 py-2.5">
                    {f.trend_slug ? (
                      <Link
                        href={`/trends/${f.trend_slug}`}
                        className="font-medium hover:text-primary-strong"
                      >
                        {f.trend_name}
                      </Link>
                    ) : (
                      f.trend_name
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {CLAIM_LABEL[f.claim_type]}{" "}
                    {f.claim_type === "peak_within"
                      ? `${f.horizon_days}d`
                      : f.target_value}
                  </td>
                  <td className="px-4 py-2.5 font-mono tnum">
                    {Math.round(f.confidence * 100)}%
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {shortDate(f.created_at)}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {shortDate(f.resolves_at)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase",
                        STATUS_STYLE[f.status]
                      )}
                    >
                      {f.status}
                    </span>
                  </td>
                  <td className="max-w-64 truncate px-4 py-2.5 text-xs text-muted-foreground">
                    {f.resolution_note ?? "—"}
                  </td>
                </tr>
              ))}
              {data && data.forecasts.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No forecasts yet. Claims are emitted automatically when the
                    pulse loop flags a trend as rising.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  gated,
  format,
  caption,
}: {
  label: string;
  gated?: { value: number | null; n: number };
  format: (v: number) => string;
  caption: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
        {label}
      </p>
      {gated && gated.value !== null ? (
        <p className="mt-1 font-mono text-3xl font-semibold tnum">
          {format(gated.value)}
        </p>
      ) : (
        <p className="mt-1 text-lg font-medium text-muted-foreground">
          Not enough data
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        n={gated?.n ?? 0} · {caption}
      </p>
    </div>
  );
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}
