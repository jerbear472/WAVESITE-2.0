import type { Trend } from "../types/index.ts";

export interface DecisionHistory {
  months: Array<{
    volume: number;
    engagement: number;
    sentiment: number | null;
  }>;
  total_items: number;
  coverage_months: number;
  labeled_items: number;
  confidence: "low" | "medium" | "high";
}

export interface TrendDecision {
  action: "Act" | "Watch" | "Avoid";
  window: string;
  change: string;
  confidence: "unverified" | "low" | "medium" | "high";
  evidence: string;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function measuredChange(history?: DecisionHistory | null): string | null {
  if (!history || history.coverage_months < 2) return null;
  const recent = history.months.slice(-2);
  const prior = history.months.slice(-5, -2);
  const recentEngagement = mean(recent.map((m) => m.engagement));
  const priorEngagement = mean(prior.map((m) => m.engagement));
  if (priorEngagement === 0 && recentEngagement === 0) return null;
  const delta =
    priorEngagement === 0
      ? 100
      : Math.round(((recentEngagement - priorEngagement) / priorEngagement) * 100);
  if (delta >= 15) return `Engagement rising ${delta}%`;
  if (delta <= -15) return `Engagement falling ${Math.abs(delta)}%`;
  return "Engagement holding steady";
}

function sentimentChange(history?: DecisionHistory | null): string | null {
  if (!history || history.labeled_items < 2) return null;
  const values = history.months
    .map((month) => month.sentiment)
    .filter((value): value is number => value !== null);
  if (values.length < 2) return null;
  const delta = Math.round((values.at(-1)! - values.at(-2)!) * 100);
  if (delta >= 15) return `Sentiment improving ${delta} pts`;
  if (delta <= -15) return `Sentiment weakening ${Math.abs(delta)} pts`;
  return null;
}

export function decideTrend(
  trend: Pick<
    Trend,
    "lifecycle_stage" | "risk_level" | "saturation_score" | "momentum_score"
  >,
  history?: DecisionHistory | null
): TrendDecision {
  const closing = trend.lifecycle_stage === "peaking";
  const exhausted =
    trend.lifecycle_stage === "saturated" ||
    trend.lifecycle_stage === "declining" ||
    trend.saturation_score >= 78;
  const unsafe = trend.risk_level === "high";
  const actionable =
    ["emerging", "accelerating", "resurfacing"].includes(trend.lifecycle_stage) &&
    trend.saturation_score < 70 &&
    !unsafe;

  const action: TrendDecision["action"] = exhausted
    ? "Avoid"
    : actionable
      ? "Act"
      : "Watch";
  const window = exhausted
    ? trend.lifecycle_stage === "declining"
      ? "Opportunity has passed"
      : "Crowded window"
    : closing
      ? "Window closing"
      : trend.lifecycle_stage === "resurfacing"
        ? "Second-wave window"
        : trend.lifecycle_stage === "accelerating"
          ? "Active participation window"
          : trend.lifecycle_stage === "emerging"
            ? "Early window"
            : "Wait for confirmation";

  const change =
    sentimentChange(history) ??
    measuredChange(history) ??
    (history
      ? "History still developing"
      : `${trend.lifecycle_stage} · momentum ${trend.momentum_score}`);
  const confidence = history?.confidence ?? "unverified";
  const evidence = history
    ? `${history.total_items} posts · ${history.coverage_months} mo · ${history.labeled_items} labeled`
    : "No measured history yet";

  return { action, window, change, confidence, evidence };
}
