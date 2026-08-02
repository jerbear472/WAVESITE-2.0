import { Activity, ArrowRight, ShieldCheck, Target } from "lucide-react";
import type { TrendNarrative } from "@/lib/trend-narrative";
import { Card } from "@/components/ui/card";

const ACTION_STYLE = {
  Act: "bg-success-tint text-success",
  Watch: "bg-warning-tint text-warning",
  Avoid: "bg-danger-tint text-danger",
} as const;

export function TrendIntelligenceBrief({
  narrative,
}: {
  narrative: TrendNarrative;
}) {
  const { decision } = narrative;
  return (
    <Card className="mt-10 overflow-hidden">
      <div className="grid lg:grid-cols-[1.2fr_1fr]">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${ACTION_STYLE[decision.action]}`}
            >
              {decision.action}
            </span>
            <span className="text-sm font-semibold">{decision.window}</span>
            <span className="text-xs text-faint">
              {decision.confidence} evidence confidence
            </span>
          </div>
          <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-foreground">
            {narrative.whyNow}
          </p>
          <p className="mt-2 text-xs text-faint">{decision.evidence}</p>

          <div className="mt-6">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
              <Activity className="size-3.5" /> Observed propagation
            </p>
            {narrative.propagation.length ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {narrative.propagation.map((source, index) => (
                  <div key={source.source} className="flex items-center gap-2">
                    {index > 0 ? <ArrowRight className="size-3.5 text-faint" /> : null}
                    <span className="rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-xs">
                      <strong>{source.source}</strong>
                      <span className="ml-1.5 text-faint">
                        {source.items} posts · {source.firstSeen.slice(0, 10)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                More than one measured source is required before WaveSight claims a propagation path.
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-border bg-surface-2/35 p-6 sm:p-8 lg:border-l lg:border-t-0">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
            <ShieldCheck className="size-3.5" /> Measured sentiment mix
          </p>
          <div className="mt-4 space-y-2.5">
            {narrative.sentiment.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs">
                  <span className="capitalize text-muted-foreground">{item.label}</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {item.percent}% <span className="font-sans font-normal text-faint">({item.count})</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
              <Target className="size-3.5" /> Forecast on the record
            </p>
            {narrative.forecast ? (
              <div className="mt-2.5 text-sm">
                <p className="font-semibold text-foreground">{narrative.forecast.claim}</p>
                <p className="mt-1 text-muted-foreground">
                  {narrative.forecast.window} · {narrative.forecast.confidence}% forecast confidence
                </p>
                <p className="mt-2 text-xs leading-relaxed text-faint">
                  {narrative.forecast.invalidation}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No falsifiable forecast is open yet. WaveSight waits for a measured rising, in-sync, or fading state before making one.
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
