import { format } from "date-fns";
import { Activity, Radar, TrendingDown, Waves } from "lucide-react";
import type { Forecast, Trend } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getForecasts } from "@/lib/data";
import { getDailySeries } from "@/lib/observations";
import { detectPeak, type PeakResult } from "@/lib/forecast-engine";
import { slugifyTerm } from "@/lib/terms/registry";
import type { CompositeRow } from "@/lib/terms/types";
import { lifecycleBadge } from "@/lib/trend-format";

// ---------------------------------------------------------------------------
// Lifecycle position — where this trend sits on the wave, and how we know.
// Three evidence layers, best-available-first:
//   * the measured cascade (which platforms are firing today, from the term
//     signals layer) — arithmetic over real counts;
//   * peak detection over the trend's own daily harmony history (the same
//     pinned rule the forecast track record resolves against);
//   * the open falsifiable claims the system currently holds about it.
// Server component: all reads happen here, every layer degrades gracefully.
// ---------------------------------------------------------------------------

/** Marker coordinates per stage on the 400×120 wave (resurfacing sits on the
 *  dotted second rise). Tuned to the curve paths below. */
const STAGE_POS: Record<Trend["lifecycle_stage"], { x: number; y: number }> = {
  emerging: { x: 70, y: 87 },
  accelerating: { x: 132, y: 50 },
  peaking: { x: 200, y: 22 },
  saturated: { x: 258, y: 44 },
  declining: { x: 326, y: 86 },
  resurfacing: { x: 366, y: 66 },
};

const STAGE_TICKS: { stage: Trend["lifecycle_stage"]; label: string; x: number }[] = [
  { stage: "emerging", label: "Emerging", x: 70 },
  { stage: "accelerating", label: "Accelerating", x: 132 },
  { stage: "peaking", label: "Peaking", x: 200 },
  { stage: "saturated", label: "Saturated", x: 258 },
  { stage: "declining", label: "Declining", x: 326 },
];

const SOURCE_LABELS: Record<string, string> = {
  bluesky: "Bluesky",
  reddit: "Reddit",
  google_trends: "Google Trends",
  youtube: "YouTube",
  wikipedia: "Wikipedia",
};

async function latestCompositeFor(trend: Trend): Promise<CompositeRow | null> {
  try {
    const { getActiveTerms, getLatestComposites } = await import(
      "@/lib/terms/store"
    );
    const sinceDate = new Date(Date.now() - 5 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const [terms, composites] = await Promise.all([
      getActiveTerms(),
      getLatestComposites(sinceDate),
    ]);
    const term =
      terms.find((t) => t.trend_id === trend.id) ??
      terms.find((t) => t.term_id === `term-${slugifyTerm(trend.name)}`);
    return term ? (composites.get(term.term_id) ?? null) : null;
  } catch {
    // Measurement layer needs Supabase; without it the editorial stage stands.
    return null;
  }
}

async function openClaimsFor(trendId: string): Promise<Forecast[]> {
  try {
    const pending = await getForecasts({ status: "pending" });
    return pending.filter((f) => f.trend_id === trendId);
  } catch {
    return [];
  }
}

function claimSentence(f: Forecast): string {
  const due = format(new Date(f.resolves_at), "MMM d");
  const pct = Math.round(f.confidence * 100);
  if (f.claim_type === "peak_within")
    return `Peaks within ${f.horizon_days}d (${pct}% conf, resolves ${due})`;
  if (f.claim_type === "sustains_above")
    return `Holds harmony ≥ ${f.target_value} for ${f.horizon_days}d (${pct}% conf, resolves ${due})`;
  return `Fades below ${f.target_value} within ${f.horizon_days}d (${pct}% conf, resolves ${due})`;
}

function peakSentence(peak: PeakResult): string {
  if (!peak.peak_date) return "No peak yet in measured history.";
  const d = format(new Date(`${peak.peak_date}T00:00:00Z`), "MMM d");
  if (peak.confirmed)
    return `Peaked ${d} at harmony ${peak.peak_value} — confirmed by the 14-day drop rule.`;
  return `Candidate peak ${d} at harmony ${peak.peak_value} — awaiting 14-day confirmation.`;
}

export async function LifecyclePosition({ trend }: { trend: Trend }) {
  const [daily, composite, claims] = await Promise.all([
    getDailySeries(trend.id, { untilIso: new Date().toISOString() }).catch(
      () => []
    ),
    latestCompositeFor(trend),
    openClaimsFor(trend.id),
  ]);
  const peak = detectPeak(daily);
  const badge = lifecycleBadge(trend.lifecycle_stage);
  const pos = STAGE_POS[trend.lifecycle_stage];
  const measured = composite && composite.cascade_state !== "dormant";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <Waves className="size-[18px] text-primary" /> Lifecycle position
          <span className="font-normal text-muted-foreground">
            — {badge.label.toLowerCase()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* The wave */}
        <svg
          viewBox="0 0 400 132"
          className="w-full"
          role="img"
          aria-label={`Lifecycle curve with ${trend.name} at the ${trend.lifecycle_stage} stage`}
        >
          {/* main arc */}
          <path
            d="M10,100 C90,96 140,22 200,22 C260,22 310,96 352,100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border"
          />
          {/* resurfacing — the dotted second rise */}
          <path
            d="M340,100 C356,98 372,82 388,62"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="3 4"
            className="text-border"
          />
          {/* stage ticks */}
          {STAGE_TICKS.map((t) => (
            <text
              key={t.stage}
              x={t.x}
              y={122}
              textAnchor="middle"
              className={
                t.stage === trend.lifecycle_stage
                  ? "fill-current text-foreground"
                  : "fill-current text-faint"
              }
              style={{ fontSize: 9, fontWeight: t.stage === trend.lifecycle_stage ? 600 : 400 }}
            >
              {t.label}
            </text>
          ))}
          {/* marker */}
          <circle
            cx={pos.x}
            cy={pos.y}
            r="9"
            className="fill-current text-primary"
            opacity="0.15"
          />
          <circle cx={pos.x} cy={pos.y} r="4.5" className="fill-current text-primary" />
        </svg>

        {/* Evidence rows */}
        <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
          <Fact
            icon={Radar}
            label="Measured cascade"
            value={
              measured
                ? `${composite.cascade_state} — firing on ${
                    composite.sources_flagged
                      .map((s) => SOURCE_LABELS[s] ?? s)
                      .join(" + ") || "no source today"
                  } (${composite.breadth} of 5 platforms)${
                    composite.lead_estimate_days !== null
                      ? ` · earliest source led by ~${composite.lead_estimate_days}d`
                      : ""
                  }`
                : composite
                  ? "Cascade quiet — nothing persistently firing right now."
                  : "Not yet measured — stage is an editorial read until the daily measurement run picks this trend up."
            }
          />
          <Fact icon={Activity} label="Peak status" value={peakSentence(peak)} />
          <Fact
            icon={TrendingDown}
            label="Open forecasts"
            value={
              claims.length
                ? claims.map(claimSentence).join(" · ")
                : "No open claims — the next daily run emits one when this trend flags rising, in-sync, or past peak."
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Radar;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="eyebrow flex items-center gap-1.5 text-faint">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground">{value}</p>
    </div>
  );
}
