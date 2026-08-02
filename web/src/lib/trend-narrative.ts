import type { Forecast, Trend } from "../types/index.ts";
import type { TrendHistory } from "./pipeline/backfill.ts";
import { decideTrend } from "./trend-decision.ts";

export interface TrendNarrative {
  decision: ReturnType<typeof decideTrend>;
  whyNow: string;
  propagation: Array<{ source: string; firstSeen: string; items: number }>;
  sentiment: Array<{
    label: "positive" | "neutral" | "negative" | "ironic";
    count: number;
    percent: number;
  }>;
  forecast: {
    claim: string;
    window: string;
    confidence: number;
    status: Forecast["status"];
    invalidation: string;
  } | null;
}

const SOURCE_NAME: Record<string, string> = {
  reddit: "Reddit",
  youtube: "YouTube",
};

function forecastReadout(forecast: Forecast): TrendNarrative["forecast"] {
  const end = new Date(forecast.resolves_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  if (forecast.claim_type === "peak_within") {
    return {
      claim: `A measurable peak occurs within ${forecast.horizon_days} days of the call.`,
      window: `Resolves after peak confirmation on ${end}`,
      confidence: Math.round(forecast.confidence * 100),
      status: forecast.status,
      invalidation:
        "Invalidated if no confirmed peak occurs inside the claim window; voided if observation coverage becomes too sparse to judge.",
    };
  }
  if (forecast.claim_type === "sustains_above") {
    return {
      claim: `Cultural harmony remains at or above ${forecast.target_value} for ${forecast.horizon_days} days.`,
      window: `Resolves ${end}`,
      confidence: Math.round(forecast.confidence * 100),
      status: forecast.status,
      invalidation: `Invalidated by any measured day below ${forecast.target_value}; voided if the observation record develops material gaps.`,
    };
  }
  return {
    claim: `Cultural harmony falls below ${forecast.target_value} within ${forecast.horizon_days} days.`,
    window: `Resolves ${end}`,
    confidence: Math.round(forecast.confidence * 100),
    status: forecast.status,
    invalidation: `Invalidated if harmony remains at or above ${forecast.target_value} through the full window; voided if coverage becomes insufficient.`,
  };
}

export function buildTrendNarrative(
  trend: Trend,
  history: TrendHistory | null,
  forecasts: Forecast[]
): TrendNarrative {
  const decision = decideTrend(trend, history);
  const propagation = history
    ? Object.entries(history.source_first_seen)
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
        .map(([source, firstSeen]) => ({
          source: SOURCE_NAME[source] ?? source,
          firstSeen,
          items: history.source_counts[source as keyof typeof history.source_counts] ?? 0,
        }))
        .sort((a, b) => a.firstSeen.localeCompare(b.firstSeen))
    : [];
  const totalLabels = history?.labeled_items ?? 0;
  const sentiment = (["positive", "neutral", "negative", "ironic"] as const).map(
    (label) => {
      const count = history?.sentiment_counts[label] ?? 0;
      return {
        label,
        count,
        percent: totalLabels ? Math.round((count / totalLabels) * 100) : 0,
      };
    }
  );
  const sourceStory = propagation.length
    ? `${propagation.map((source) => source.source).join(" → ")} is the observed source sequence.`
    : "Cross-platform propagation is not verified yet.";
  const whyNow = `${decision.change}. ${decision.window}. ${sourceStory}`;
  const active =
    forecasts.find((forecast) => forecast.status === "pending") ?? forecasts[0];

  return {
    decision,
    whyNow,
    propagation,
    sentiment,
    forecast: active ? forecastReadout(active) : null,
  };
}
