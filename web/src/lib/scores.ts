// Tiny, dependency-free score helpers safe to import from client components.

export type SentimentBucket = "positive" | "mixed" | "cautious";

export function sentimentBucket(score: number): SentimentBucket {
  if (score >= 78) return "positive";
  if (score >= 65) return "mixed";
  return "cautious";
}
