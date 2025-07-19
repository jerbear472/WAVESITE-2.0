export type TrendCategory = 
  | 'visual_style'
  | 'audio_music'
  | 'creator_technique'
  | 'meme_format'
  | 'product_brand'
  | 'behavior_pattern';

export interface TrendSubmission {
  category: TrendCategory;
  description: string;
  virality_prediction: number;
  evidence: string[];
  screenshot_url?: string;
  timestamp?: Date;
  userId?: string;
}