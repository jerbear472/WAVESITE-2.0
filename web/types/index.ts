export interface Trend {
  id: string;
  title: string;
  category: string;
  viralityScore: number;
  qualityScore: number;
  validationCount: number;
  createdAt: string;
  description?: string;
  evidence?: string[];
  predictedPeak?: string;
}