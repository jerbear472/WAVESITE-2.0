import type { LifecycleStage, RiskLevel } from "@/types";
import type { BadgeProps } from "@/components/ui/badge";
import { sentimentBucket } from "@/lib/scores";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

export function lifecycleBadge(stage: LifecycleStage): {
  label: string;
  variant: BadgeVariant;
} {
  switch (stage) {
    case "emerging":
      return { label: "Emerging", variant: "primary" };
    case "accelerating":
      return { label: "Accelerating", variant: "success" };
    case "peaking":
      return { label: "Peaking", variant: "warning" };
    case "saturated":
      return { label: "Saturated", variant: "danger" };
    case "declining":
      return { label: "Declining", variant: "danger" };
    case "resurfacing":
      return { label: "Resurfacing", variant: "violet" };
  }
}

export function riskBadge(risk: RiskLevel): {
  label: string;
  variant: BadgeVariant;
} {
  switch (risk) {
    case "low":
      return { label: "Low risk", variant: "success" };
    case "medium":
      return { label: "Medium risk", variant: "warning" };
    case "high":
      return { label: "High risk", variant: "danger" };
  }
}

export function sentimentBadge(score: number): {
  label: string;
  variant: BadgeVariant;
} {
  const bucket = sentimentBucket(score);
  if (bucket === "positive")
    return { label: `Positive ${score}`, variant: "success" };
  if (bucket === "mixed") return { label: `Mixed ${score}`, variant: "warning" };
  return { label: `Cautious ${score}`, variant: "danger" };
}

/** Color for a 0-100 score on light card surfaces. */
export function scoreColor(score: number): string {
  if (score >= 80) return "#159a78"; // green
  if (score >= 65) return "#3478f6"; // blue
  if (score >= 50) return "#b77900"; // amber
  return "#d64d57"; // red
}

/** Brighter variant for dark navy panels and the 3D field. */
export function scoreColorDark(score: number): string {
  if (score >= 80) return "#34d399";
  if (score >= 65) return "#7cc0ff";
  if (score >= 50) return "#fbbf24";
  return "#f87171";
}

export const VIRALITY_LABELS: Record<string, string> = {
  meme: "Meme",
  aesthetic: "Aesthetic",
  challenge: "Challenge",
  phrase: "Phrase",
  product_behavior: "Product behavior",
  sound: "Sound",
  format: "Format",
  backlash: "Backlash",
  recommendation_loop: "Recommendation loop",
  identity_signal: "Identity signal",
  other: "Other",
};

export function difficultyLabel(d: string): string {
  return d.charAt(0).toUpperCase() + d.slice(1);
}
