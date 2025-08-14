/**
 * EARNINGS CONFIGURATION - Mobile App
 * Synchronized with web and backend
 * 
 * Formula: $0.25 × tier_multiplier × session_streak × daily_streak
 * 
 * Two types of streaks:
 * 1. Session Streak: Rapid submissions within 5 minutes
 * 2. Daily Streak: Consecutive days with submissions
 */

export const EARNINGS_CONFIG = {
  // Base earning rates (in USD)
  BASE_RATES: {
    TREND_SUBMISSION: 0.25,  // Base payment per trend
    VALIDATION_VOTE: 0.10,   // Payment per validation
    APPROVAL_BONUS: 0.50,    // Bonus when trend gets approved
  },

  // Tier multipliers
  TIER_MULTIPLIERS: {
    master: 3.0,      // Master tier: 3x
    elite: 2.0,       // Elite tier: 2x
    verified: 1.5,    // Verified tier: 1.5x
    learning: 1.0,    // Learning tier: 1x (base)
    restricted: 0.5,  // Restricted tier: 0.5x
  },

  // Session streak multipliers (rapid submissions within 5 minutes)
  SESSION_STREAK_MULTIPLIERS: {
    1: 1.0,   // First submission
    2: 1.2,   // 2nd submission within 5 min
    3: 1.5,   // 3rd submission within 5 min
    4: 2.0,   // 4th submission within 5 min
    5: 2.5,   // 5+ submissions within 5 min (max)
  },

  // Daily streak multipliers (consecutive days with submissions)
  DAILY_STREAK_MULTIPLIERS: [
    { minDays: 30, multiplier: 2.5 },  // 30+ days: 2.5x
    { minDays: 14, multiplier: 2.0 },  // 14-29 days: 2x
    { minDays: 7, multiplier: 1.5 },   // 7-13 days: 1.5x
    { minDays: 2, multiplier: 1.2 },   // 2-6 days: 1.2x
    { minDays: 0, multiplier: 1.0 },   // 0-1 days: 1x
  ],

  // System limits
  LIMITS: {
    MAX_SINGLE_SUBMISSION: 3.00,
    MAX_DAILY_EARNINGS: 50.00,
    MIN_CASHOUT_AMOUNT: 5.00,
  },
} as const;

// Type definitions
export type UserTier = keyof typeof EARNINGS_CONFIG.TIER_MULTIPLIERS;

export interface EarningsCalculation {
  baseAmount: number;
  tierMultiplier: number;
  sessionStreakMultiplier: number;
  dailyStreakMultiplier: number;
  finalAmount: number;
  description: string;
}

/**
 * Get session streak multiplier (rapid submissions)
 */
export function getSessionStreakMultiplier(sessionPosition: number): number {
  if (sessionPosition >= 5) return 2.5;
  return EARNINGS_CONFIG.SESSION_STREAK_MULTIPLIERS[sessionPosition as keyof typeof EARNINGS_CONFIG.SESSION_STREAK_MULTIPLIERS] || 1.0;
}

/**
 * Get daily streak multiplier (consecutive days)
 */
export function getDailyStreakMultiplier(streakDays: number): number {
  for (const streak of EARNINGS_CONFIG.DAILY_STREAK_MULTIPLIERS) {
    if (streakDays >= streak.minDays) {
      return streak.multiplier;
    }
  }
  return 1.0;
}

/**
 * Calculate trend submission earnings with dual streaks
 */
export function calculateTrendEarnings(
  userTier: UserTier = 'learning',
  sessionPosition: number = 1,
  dailyStreak: number = 0
): EarningsCalculation {
  const baseAmount = EARNINGS_CONFIG.BASE_RATES.TREND_SUBMISSION;
  const tierMultiplier = EARNINGS_CONFIG.TIER_MULTIPLIERS[userTier] || 1.0;
  const sessionStreakMultiplier = getSessionStreakMultiplier(sessionPosition);
  const dailyStreakMultiplier = getDailyStreakMultiplier(dailyStreak);
  
  const finalAmount = Math.round(
    baseAmount * tierMultiplier * sessionStreakMultiplier * dailyStreakMultiplier * 100
  ) / 100;
  
  const tierEmojis: Record<UserTier, string> = {
    master: '👑',
    elite: '🏆',
    verified: '✅',
    learning: '📚',
    restricted: '⚠️',
  };
  
  let description = `$${baseAmount.toFixed(2)} base`;
  
  if (tierMultiplier !== 1.0) {
    description += ` × ${tierEmojis[userTier]} ${userTier} (${tierMultiplier}x)`;
  }
  
  if (sessionStreakMultiplier > 1.0) {
    description += ` × 🔥 #${sessionPosition} in session (${sessionStreakMultiplier}x)`;
  }
  
  if (dailyStreakMultiplier > 1.0) {
    description += ` × 📅 ${dailyStreak} days (${dailyStreakMultiplier}x)`;
  }
  
  description += ` = $${finalAmount.toFixed(2)}`;
  
  return {
    baseAmount,
    tierMultiplier,
    sessionStreakMultiplier,
    dailyStreakMultiplier,
    finalAmount,
    description,
  };
}

/**
 * Calculate validation earnings
 */
export function calculateValidationEarnings(
  userTier: UserTier = 'learning'
): number {
  const baseAmount = EARNINGS_CONFIG.BASE_RATES.VALIDATION_VOTE;
  const tierMultiplier = EARNINGS_CONFIG.TIER_MULTIPLIERS[userTier] || 1.0;
  
  return Math.round(baseAmount * tierMultiplier * 100) / 100;
}

/**
 * Calculate approval bonus
 */
export function calculateApprovalBonus(
  userTier: UserTier = 'learning'
): number {
  const baseAmount = EARNINGS_CONFIG.BASE_RATES.APPROVAL_BONUS;
  const tierMultiplier = EARNINGS_CONFIG.TIER_MULTIPLIERS[userTier] || 1.0;
  
  return Math.round(baseAmount * tierMultiplier * 100) / 100;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Get earning potential examples
 */
export function getEarningExamples(): string[] {
  return [
    `Learning tier, first trend: ${formatCurrency(calculateTrendEarnings('learning', 1, 0).finalAmount)}`,
    `Learning tier, 3rd rapid + 7-day streak: ${formatCurrency(calculateTrendEarnings('learning', 3, 7).finalAmount)}`,
    `Verified tier, 5th rapid + 7-day streak: ${formatCurrency(calculateTrendEarnings('verified', 5, 7).finalAmount)}`,
    `Elite tier, 5th rapid + 30-day streak: ${formatCurrency(calculateTrendEarnings('elite', 5, 30).finalAmount)}`,
    `Master tier, 5th rapid + 30-day streak: ${formatCurrency(calculateTrendEarnings('master', 5, 30).finalAmount)}`,
  ];
}