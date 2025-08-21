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

export function getAudienceSize(waveScore?: number): string {
  if (!waveScore) return '1K-10K';
  
  if (waveScore >= 90) return '10M+';
  if (waveScore >= 80) return '1M-10M';
  if (waveScore >= 70) return '100K-1M';
  if (waveScore >= 60) return '50K-100K';
  if (waveScore >= 50) return '10K-50K';
  if (waveScore >= 40) return '5K-10K';
  return '1K-5K';
}

export const WAVESIGHT_MESSAGES = {
  SUBMISSION_TITLE: 'Trend Successfully Submitted! 🎉',
  VALIDATION_NOTE: '💡 XP will be confirmed after community validation.',
  STREAK_BONUS: '🔥 Streak bonus applied!',
  QUALITY_BONUS: '⭐ Quality bonus earned!',
  FIRST_TREND: '🎊 Welcome to WaveSight! First trend submitted!',
};