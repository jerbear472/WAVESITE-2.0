export interface DailyTrendReward {
  baseXP: number;
  onTimeMultiplier: number;
  uniqueBonus: number;
  streakMultiplier: number;
  maxDailyXP: number;
}

export const DAILY_TREND_REWARDS: DailyTrendReward = {
  baseXP: 500, // Base XP for spotting a trend
  onTimeMultiplier: 2, // 2x multiplier if submitted within 2 minutes
  uniqueBonus: 250, // Extra XP for unique/novel trends
  streakMultiplier: 1.5, // Additional multiplier for consecutive days
  maxDailyXP: 2000 // Maximum XP from daily trend spotting
};

export function calculateDailyTrendXP(
  isOnTime: boolean,
  isUnique: boolean,
  streakDays: number
): number {
  let totalXP = DAILY_TREND_REWARDS.baseXP;

  // Apply on-time multiplier
  if (isOnTime) {
    totalXP *= DAILY_TREND_REWARDS.onTimeMultiplier;
  }

  // Add unique bonus
  if (isUnique) {
    totalXP += DAILY_TREND_REWARDS.uniqueBonus;
  }

  // Apply streak multiplier (capped at 7 days)
  if (streakDays > 0) {
    const streakBonus = Math.min(streakDays, 7) * 0.1; // 10% per day, max 70%
    totalXP *= (1 + streakBonus);
  }

  // Cap at maximum daily XP
  return Math.min(Math.round(totalXP), DAILY_TREND_REWARDS.maxDailyXP);
}

export function getStreakTier(streakDays: number): {
  tier: string;
  emoji: string;
  nextMilestone: number;
} {
  if (streakDays >= 30) {
    return { tier: 'Legendary', emoji: '💎', nextMilestone: 0 };
  } else if (streakDays >= 14) {
    return { tier: 'Expert', emoji: '🏆', nextMilestone: 30 };
  } else if (streakDays >= 7) {
    return { tier: 'Dedicated', emoji: '⭐', nextMilestone: 14 };
  } else if (streakDays >= 3) {
    return { tier: 'Rising', emoji: '🔥', nextMilestone: 7 };
  } else {
    return { tier: 'Starter', emoji: '✨', nextMilestone: 3 };
  }
}