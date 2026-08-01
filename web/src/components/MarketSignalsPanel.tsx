import { ExternalLink, TrendingDown, TrendingUp, Scale } from "lucide-react";
import type { MarketSignal } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const EDGE_META: Record<
  MarketSignal["edge"],
  { label: string; variant: "success" | "warning" | "default"; Icon: typeof Scale }
> = {
  sentiment_ahead: {
    label: "Sentiment ahead of market",
    variant: "success",
    Icon: TrendingUp,
  },
  market_ahead: {
    label: "Market ahead of sentiment",
    variant: "warning",
    Icon: TrendingDown,
  },
  aligned: { label: "Aligned", variant: "default", Icon: Scale },
};

export function MarketSignalsPanel({
  signals,
  notes,
  venues,
}: {
  signals: MarketSignal[];
  notes: string;
  venues: string[];
}) {
  if (!signals.length && !notes) return null;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg">
              Prediction market signals
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Public sentiment from the scan vs. live odds
              {venues.length ? ` on ${venues.join(" & ")}` : ""} — where the
              crowd and the money disagree.
            </p>
          </div>
        </div>

        {signals.length ? (
          <div className="mt-4 space-y-3">
            {signals.map((s, i) => {
              const meta = EDGE_META[s.edge];
              return (
                <div
                  key={`${s.url}-${i}`}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={meta.variant}>
                      <meta.Icon className="size-3" /> {meta.label}
                    </Badge>
                    <span className="text-[11px] font-medium uppercase tracking-wide text-faint">
                      {s.venue}
                    </span>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary-strong"
                    >
                      View market <ExternalLink className="size-3" />
                    </a>
                  </div>
                  <p className="mt-2 font-medium text-foreground">
                    {s.market_title}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-mono text-sm tabular-nums">
                    <span className="text-muted-foreground">
                      Market:{" "}
                      <span className="text-foreground">
                        {s.implied_probability}%
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      Sentiment read:{" "}
                      <span className="text-foreground">
                        {s.sentiment_probability}%
                      </span>
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.rationale}
                  </p>
                </div>
              );
            })}
          </div>
        ) : null}

        {notes ? (
          <p className="mt-4 text-sm italic text-muted-foreground">{notes}</p>
        ) : null}

        <p className="mt-3 text-[11px] text-faint">
          Informational only — sentiment reads are model estimates, not
          financial advice.
        </p>
      </CardContent>
    </Card>
  );
}
