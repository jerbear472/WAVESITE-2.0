/**
 * UNIFIED EARNINGS CONFIGURATION
 * Single source of truth for all earnings calculations
 * 
 * Formula: $0.25 × tier_multiplier × session_streak × daily_streak
 */

export const UNIFIED_EARNINGS = {
  // Base rates
  base: {
    trendSubmission: 0.25,  // Base payment per trend
    validationVote: 0.10,   // Payment per validation
    approvalBonus: 0.50,    // Bonus when trend gets approved
  },

  // Tier multipliers
  tierMultipliers: {
    master: 3.0,      // Master tier: 3x
    elite: 2.0,       // Elite tier: 2x
    verified: 1.5,    // Verified tier: 1.5x
    learning: 1.0,    // Learning tier: 1x (base)
    restricted: 0.5,  // Restricted tier: 0.5x
  },

  // Session streak multipliers (rapid submissions within 5 minutes)
  sessionStreakMultipliers: {
    1: 1.0,   // First submission
    2: 1.2,   // 2nd submission within 5 min
    3: 1.5,   // 3rd submission within 5 min
    4: 2.0,   // 4th submission within 5 min
    5: 2.5,   // 5+ submissions within 5 min (max)
  },

  // Daily streak multipliers (consecutive days with submissions)
  dailyStreakMultipliers: [
    { minDays: 30, multiplier: 2.5 },  // 30+ days: 2.5x
    { minDays: 14, multiplier: 2.0 },  // 14-29 days: 2x
    { minDays: 7, multiplier: 1.5 },   // 7-13 days: 1.5x
    { minDays: 2, multiplier: 1.2 },   // 2-6 days: 1.2x
    { minDays: 0, multiplier: 1.0 },   // 0-1 days: 1x
  ],

  // System limits
  limits: {
    maxSingleSubmission: 5.00,  // Max per submission (after all multipliers)
    maxDailyEarnings: 50.00,     // Max daily earnings
    minCashoutAmount: 10.00,     // Minimum cashout (FIXED: Changed from 5.00 to match payment methods)
    sessionWindowMinutes: 5,     // Minutes to maintain session streak
  },

  // Tier requirements
  tierRequirements: {
    master: {
      trendsSubmitted: 100,
      approvalRate: 0.80,
      qualityScore: 0.80,
      description: 'Top 1% of trend spotters',
    },
    elite: {
      trendsSubmitted: 50,
      approvalRate: 0.70,
      qualityScore: 0.70,
      description: 'Top 5% of trend spotters',
    },
    verified: {
      trendsSubmitted: 10,
      approvalRate: 0.60,
      qualityScore: 0.60,
      description: 'Proven trend spotter',
    },
    learning: {
      trendsSubmitted: 0,
      approvalRate: 0,
      qualityScore: 0,
      description: 'New trend spotter',
    },
    restricted: {
      maxApprovalRate: 0.30,
      maxQualityScore: 0.30,
      description: 'Low quality submissions',
    },
  },
} as const;

// Type definitions
export type Tier = keyof typeof UNIFIED_EARNINGS.tierMultipliers;

export interface UserProfile {
  user_id: string;
  performance_tier: Tier;
  current_balance: number;
  total_earned: number;
  today_earned?: number;
  trends_submitted: number;
  approval_rate: number;
  quality_score: number;
  current_streak?: number;  // Daily streak
  session_streak?: number;  // Current session position
  last_submission_at?: string;
}

export interface EarningsCalculation {
  base: number;
  tierMultiplier: number;
  sessionMultiplier: number;
  dailyMultiplier: number;
  total: number;
  breakdown: string[];
}

/**
 * Get session streak multiplier
 */
export function getSessionStreakMultiplier(position: number): number {
  if (position >= 5) return 2.5;
  const multiplier = UNIFIED_EARNINGS.sessionStreakMultipliers[position as keyof typeof UNIFIED_EARNINGS.sessionStreakMultipliers];
  return multiplier || 1.0;
}

/**
 * Get daily streak multiplier
 */
export function getDailyStreakMultiplier(days: number): number {
  for (const streak of UNIFIED_EARNINGS.dailyStreakMultipliers) {
    if (days >= streak.minDays) {
      return streak.multiplier;
    }
  }
  return 1.0;
}

/**
 * Calculate if submission is within session window
 */
export function isWithinSessionWindow(lastSubmissionAt?: string): boolean {
  if (!lastSubmissionAt) return false;
  
  const lastSubmission = new Date(lastSubmissionAt);
  const now = new Date();
  const minutesSinceLast = (now.getTime() - lastSubmission.getTime()) / (1000 * 60);
  
  return minutesSinceLast <= UNIFIED_EARNINGS.limits.sessionWindowMinutes;
}

/**
 * Calculate trend submission earnings with dual streaks
 */
export function calculateTrendEarnings(
  userProfile: UserProfile,
  forceNewSession: boolean = false
): EarningsCalculation {
  const breakdown: string[] = [];
  
  // Base amount
  const base = UNIFIED_EARNINGS.base.trendSubmission;
  breakdown.push(`Base submission: $${base.toFixed(2)}`);
  
  // Tier multiplier
  const tierMultiplier = UNIFIED_EARNINGS.tierMultipliers[userProfile.performance_tier];
  if (tierMultiplier !== 1.0) {
    breakdown.push(`${userProfile.performance_tier} tier: ${tierMultiplier}x`);
  }
  
  // Session streak multiplier
  let sessionPosition = 1;
  if (!forceNewSession && isWithinSessionWindow(userProfile.last_submission_at)) {
    sessionPosition = Math.min((userProfile.session_streak || 0) + 1, 5);
  }
  const sessionMultiplier = getSessionStreakMultiplier(sessionPosition);
  if (sessionMultiplier > 1.0) {
    breakdown.push(`Session #${sessionPosition}: ${sessionMultiplier}x`);
  }
  
  // Daily streak multiplier
  const dailyStreak = userProfile.current_streak || 0;
  const dailyMultiplier = getDailyStreakMultiplier(dailyStreak);
  if (dailyMultiplier > 1.0) {
    breakdown.push(`${dailyStreak}-day streak: ${dailyMultiplier}x`);
  }
  
  // Calculate total
  const total = Math.round(base * tierMultiplier * sessionMultiplier * dailyMultiplier * 100) / 100;
  
  // Apply cap if needed
  const capped = Math.min(total, UNIFIED_EARNINGS.limits.maxSingleSubmission);
  if (total > capped) {
    breakdown.push(`Capped at max: $${UNIFIED_EARNINGS.limits.maxSingleSubmission.toFixed(2)}`);
  }
  
  return {
    base,
    tierMultiplier,
    sessionMultiplier,
    dailyMultiplier,
    total: capped,
    breakdown,
  };
}

/**
 * Calculate validation earnings
 */
export function calculateValidationEarnings(userTier: Tier): number {
  const base = UNIFIED_EARNINGS.base.validationVote;
  const multiplier = UNIFIED_EARNINGS.tierMultipliers[userTier];
  return Math.round(base * multiplier * 100) / 100;
}

/**
 * Calculate approval bonus
 */
export function calculateApprovalBonus(userTier: Tier): number {
  const base = UNIFIED_EARNINGS.base.approvalBonus;
  const multiplier = UNIFIED_EARNINGS.tierMultipliers[userTier];
  return Math.round(base * multiplier * 100) / 100;
}

/**
 * Determine user tier based on performance
 */
export function calculateUserTier(profile: {
  trends_submitted: number;
  approval_rate: number;
  quality_score: number;
}): Tier {
  // Check for restricted status first
  const restricted = UNIFIED_EARNINGS.tierRequirements.restricted;
  if (
    profile.approval_rate < restricted.maxApprovalRate ||
    profile.quality_score < restricted.maxQualityScore
  ) {
    return 'restricted';
  }
  
  // Check tier progression
  const { master, elite, verified } = UNIFIED_EARNINGS.tierRequirements;
  
  if (
    profile.trends_submitted >= master.trendsSubmitted &&
    profile.approval_rate >= master.approvalRate &&
    profile.quality_score >= master.qualityScore
  ) {
    return 'master';
  }
  
  if (
    profile.trends_submitted >= elite.trendsSubmitted &&
    profile.approval_rate >= elite.approvalRate &&
    profile.quality_score >= elite.qualityScore
  ) {
    return 'elite';
  }
  
  if (
    profile.trends_submitted >= verified.trendsSubmitted &&
    profile.approval_rate >= verified.approvalRate &&
    profile.quality_score >= verified.qualityScore
  ) {
    return 'verified';
  }
  
  return 'learning';
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Check if user can cash out
 */
export function canCashOut(balance: number): boolean {
  return balance >= UNIFIED_EARNINGS.limits.minCashoutAmount;
}

/**
 * Get earning examples for display
 */
export function getEarningExamples(): string[] {
  return [
    `Learning tier, first trend: ${formatCurrency(0.25)}`,
    `Learning tier, 3rd rapid + 7-day streak: ${formatCurrency(0.25 * 1.0 * 1.5 * 1.5)}`, // $0.56
    `Verified tier, 5th rapid + 7-day streak: ${formatCurrency(0.25 * 1.5 * 2.5 * 1.5)}`, // $1.41
    `Elite tier, 5th rapid + 30-day streak: ${formatCurrency(0.25 * 2.0 * 2.5 * 2.5)}`, // $3.13
    `Master tier, 5th rapid + 30-day streak: ${formatCurrency(0.25 * 3.0 * 2.5 * 2.5)}`, // $4.69
  ];
}

// Export as default for compatibility
export default UNIFIED_EARNINGS;