// WaveSight trend submission notification messages

export interface TrendNotificationData {
  xpAmount: number;
  audienceSize: string;
  validationNote?: string;
}

export function getTrendSubmissionMessage(data: TrendNotificationData): string {
  return `Trend submitted! You earned ${data.xpAmount} XP • Potential Audience: ${data.audienceSize}`;
}

export function getTrendValidationMessage(isApproved: boolean, xpAmount: number): string {
  if (isApproved) {
    return `Trend validated! +${xpAmount} XP earned`;
  } else {
    return `Validation complete. Keep spotting trends!`;
}

export function getAudienceSize(data?: {
  wave_score?: number;
  trendVelocity?: string;
  trendSize?: string;
  views_count?: number;
}): string {
  // First, try to use trendSize if available (most direct indicator)
  if (data?.trendSize) {
    const sizeMap: Record<string, string> = {
      'global': '10M+',
      'mega': '1M-10M',
      'viral': '100K-1M',
      'niche': '10K-100K',
      'micro': '1K-10K'
    };
    if (sizeMap[data.trendSize]) return sizeMap[data.trendSize];
  }
  
  // Then check actual view counts if available
  if (data?.views_count) {
    if (data.views_count >= 10000000) return '10M+';
    if (data.views_count >= 1000000) return '1M-10M';
    if (data.views_count >= 100000) return '100K-1M';
    if (data.views_count >= 50000) return '50K-100K';
    if (data.views_count >= 10000) return '10K-50K';
    if (data.views_count >= 5000) return '5K-10K';
    return '1K-5K';
  }
  
  // Use wave_score as a fallback
  if (data?.wave_score) {
    if (data.wave_score >= 90) return '10M+';
    if (data.wave_score >= 80) return '1M-10M';
    if (data.wave_score >= 70) return '100K-1M';
    if (data.wave_score >= 60) return '50K-100K';
    if (data.wave_score >= 50) return '10K-50K';
    if (data.wave_score >= 40) return '5K-10K';
    return '1K-5K';
  }
  
  // Finally, use velocity as a rough indicator
  if (data?.trendVelocity) {
    const velocityMap: Record<string, string> = {
      'viral': '100K-1M',
      'picking_up': '10K-100K',
      'just_starting': '1K-10K',
      'saturated': '50K-100K',
      'declining': '10K-50K'
    };
    if (velocityMap[data.trendVelocity]) return velocityMap[data.trendVelocity];
  }
  
  // Default fallback
  return '1K-10K';
}

export const WAVESIGHT_MESSAGES = {
  SUBMISSION_TITLE: 'Trend Successfully Submitted! 🎉',
  VALIDATION_NOTE: '💡 XP will be confirmed after community validation.',
  STREAK_BONUS: '🔥 Streak bonus applied!',
  QUALITY_BONUS: '⭐ Quality bonus earned!',
  FIRST_TREND: '🎊 Welcome to WaveSight! First trend submitted!',
};