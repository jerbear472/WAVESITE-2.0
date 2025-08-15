/**
 * SUSTAINABLE EARNINGS - SIMPLIFIED DUAL-STREAK SYSTEM
 * 
 * Formula: $0.25 × tier_multiplier × session_streak × daily_streak
 * 
 * This is the ONLY earnings configuration that should be used.
 * All complex bonuses have been removed for simplicity and consistency.
 */

export const SUSTAINABLE_EARNINGS = {
  // Base rates - MUST match database
  base: {
    trendSubmission: 0.25,  // Base payment per trend (PENDING until approved)
    validationVote: 0.02,   // Payment per validation (FIXED: was 0.10)
    approvalBonus: 0.50,    // Bonus when trend gets approved (2+ YES votes)
  },

  // Tier system with multipliers
  tiers: {
    master: {
      name: 'Master',
      multiplier: 3.0,
      dailyCap: 50.00,
      perTrendCap: 5.00,
      percentage: '1%',
      monthlyRange: { min: 500, max: 900 },
      color: '#FFD700',  // Gold
      emoji: '👑',
    },
    elite: {
      name: 'Elite', 
      multiplier: 2.0,
      dailyCap: 40.00,
      perTrendCap: 4.00,
      percentage: '5%',
      monthlyRange: { min: 300, max: 500 },
      color: '#C0C0C0',  // Silver
      emoji: '⭐',
    },
    verified: {
      name: 'Verified',
      multiplier: 1.5,
      dailyCap: 30.00,
      perTrendCap: 3.00,
      percentage: '15%',
      monthlyRange: { min: 150, max: 300 },
      color: '#CD7F32',  // Bronze
      emoji: '✅',
    },
    learning: {
      name: 'Learning',
      multiplier: 1.0,
      dailyCap: 20.00,
      perTrendCap: 2.00,
      percentage: '60%',
      monthlyRange: { min: 50, max: 150 },
      color: '#4CAF50',  // Green
      emoji: '📚',
    },
    restricted: {
      name: 'Restricted',
      multiplier: 0.5,
      dailyCap: 10.00,
      perTrendCap: 1.00,
      percentage: '19%',
      monthlyRange: { min: 20, max: 50 },
      color: '#F44336',  // Red
      emoji: '⚠️',
    },
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

  // Payment settings
  payment: {
    minCashout: 10.00,  // FIXED: Changed from 5.00 to match actual payment method minimums
    methods: [
      { id: 'venmo', name: 'Venmo', min: 10, fee: 0 },
      { id: 'paypal', name: 'PayPal', min: 10, fee: 0.30 },
      { id: 'bank', name: 'Bank Transfer', min: 25, fee: 0 },
      { id: 'crypto', name: 'Cryptocurrency', min: 50, fee: 2.00 },
    ],
  },

  // REMOVED: Quality bonuses - no longer used
  qualityBonuses: {},

  // REMOVED: Performance bonuses - no longer used  
  performanceBonuses: {},

  // REMOVED: Achievements - no longer used
  achievements: {},

  // Validation settings
  validation: {
    votesToApprove: 3,
    votesToReject: 3,
    maxVotingHours: 72,
    selfVoteAllowed: true,
  },
} as const;

// Type definitions
export type Tier = keyof typeof SUSTAINABLE_EARNINGS.tiers;
export type PaymentMethod = 'venmo' | 'paypal' | 'bank' | 'crypto';

export interface TrendData {
  id?: string;
  screenshot_url?: string;
  title?: string;
  description?: string;
  quality_score?: number;
  category?: string;
  demographics_data?: any;
  platform?: string[];
  creator_info?: any;
  hashtags?: string[];
  metadata?: {
    view_count?: number;
    engagement_rate?: number;
  };
  wave_score?: number;
}

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

/**
 * Get session streak multiplier
 */
export function getSessionStreakMultiplier(position: number): number {
  if (position >= 5) return 2.5;
  const multiplier = SUSTAINABLE_EARNINGS.sessionStreakMultipliers[position as keyof typeof SUSTAINABLE_EARNINGS.sessionStreakMultipliers];
  return multiplier || 1.0;
}

/**
 * Get daily streak multiplier
 */
export function getDailyStreakMultiplier(days: number): number {
  for (const streak of SUSTAINABLE_EARNINGS.dailyStreakMultipliers) {
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
  
  return minutesSinceLast <= 5; // 5 minute window
}

/**
 * SIMPLIFIED: Calculate earnings for a trend submission
 * Formula: $0.25 × tier × session_streak × daily_streak
 * 
 * NOTE: The old complex bonus system has been removed.
 * We only use tier and streak multipliers now.
 */
export function calculateTrendEarnings(
  trend: TrendData | null,  // Trend data not used in calculation anymore
  userProfile: UserProfile
): {
  base: number;
  qualityBonuses: number;  // Always 0 now
  performanceBonuses: number;  // Always 0 now
  tierMultiplier: number;
  total: number;
  capped: number;
  breakdown: string[];
} {
  const tier = SUSTAINABLE_EARNINGS.tiers[userProfile.performance_tier];
  const breakdown: string[] = [];
  
  // Base amount
  const base = SUSTAINABLE_EARNINGS.base.trendSubmission;
  breakdown.push(`Base submission: $${base.toFixed(2)}`);
  
  // Tier multiplier
  const tierMultiplier = tier.multiplier;
  if (tierMultiplier !== 1.0) {
    breakdown.push(`${tier.name} tier: ${tierMultiplier}x`);
  }
  
  // Session streak multiplier
  let sessionPosition = 1;
  if (isWithinSessionWindow(userProfile.last_submission_at)) {
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
  
  // Calculate total (no more quality/performance bonuses)
  const total = base * tierMultiplier * sessionMultiplier * dailyMultiplier;
  
  // Apply per-trend cap
  const capped = Math.min(total, tier.perTrendCap);
  if (total > capped) {
    breakdown.push(`Capped at ${tier.name} limit: $${tier.perTrendCap.toFixed(2)}`);
  }
  
  return {
    base,
    qualityBonuses: 0,  // No longer used
    performanceBonuses: 0,  // No longer used
    tierMultiplier,
    total,
    capped,
    breakdown,
  };
}

/**
 * Calculate validation earnings
 * Formula: $0.10 × tier_multiplier (no streak bonus for validations)
 */
export function calculateValidationEarnings(
  validationCount: number,
  userTier: Tier
): number {
  const base = SUSTAINABLE_EARNINGS.base.validationVote * validationCount;
  const multiplier = SUSTAINABLE_EARNINGS.tiers[userTier].multiplier;
  return Math.round(base * multiplier * 100) / 100;
}

/**
 * Calculate approval bonus
 * Formula: $0.50 × tier_multiplier
 */
export function calculateApprovalBonus(userTier: Tier): number {
  const base = SUSTAINABLE_EARNINGS.base.approvalBonus;
  const multiplier = SUSTAINABLE_EARNINGS.tiers[userTier].multiplier;
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
  const restricted = SUSTAINABLE_EARNINGS.tierRequirements.restricted;
  if (
    profile.approval_rate < restricted.maxApprovalRate ||
    profile.quality_score < restricted.maxQualityScore
  ) {
    return 'restricted';
  }
  
  // Check tier progression
  const { master, elite, verified } = SUSTAINABLE_EARNINGS.tierRequirements;
  
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
 * Check if user can cash out
 */
export function canCashOut(balance: number): boolean {
  return balance >= SUSTAINABLE_EARNINGS.payment.minCashout;
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
 * Get monthly earning potential for a tier
 */
export function getMonthlyPotential(tier: Tier): {
  minimum: number;
  average: number;
  maximum: number;
} {
  const tierConfig = SUSTAINABLE_EARNINGS.tiers[tier];
  return {
    minimum: tierConfig.monthlyRange.min,
    average: (tierConfig.monthlyRange.min + tierConfig.monthlyRange.max) / 2,
    maximum: tierConfig.monthlyRange.max,
  };
}

/**
 * Get progress to next tier
 */
export function getTierProgress(
  currentTier: Tier,
  stats: UserProfile
): {
  nextTier: Tier | null;
  progress: number;
  requirements: string[];
} {
  const tierOrder: Tier[] = ['restricted', 'learning', 'verified', 'elite', 'master'];
  const currentIndex = tierOrder.indexOf(currentTier);
  
  if (currentIndex === tierOrder.length - 1) {
    return { nextTier: null, progress: 100, requirements: [] };
  }
  
  const nextTier = tierOrder[currentIndex + 1];
  const reqs = SUSTAINABLE_EARNINGS.tierRequirements[nextTier];
  
  if (!reqs || !('trendsSubmitted' in reqs)) {
    return { nextTier: null, progress: 100, requirements: [] };
  }
  
  const requirements: string[] = [];
  let progress = 0;
  let requirementCount = 0;
  
  if ('trendsSubmitted' in reqs) {
    requirementCount++;
    const trendProgress = Math.min(stats.trends_submitted / reqs.trendsSubmitted, 1);
    progress += trendProgress;
    if (stats.trends_submitted < reqs.trendsSubmitted) {
      requirements.push(`Submit ${reqs.trendsSubmitted - stats.trends_submitted} more trends`);
    }
  }
  
  if ('approvalRate' in reqs) {
    requirementCount++;
    const approvalProgress = Math.min(stats.approval_rate / reqs.approvalRate, 1);
    progress += approvalProgress;
    if (stats.approval_rate < reqs.approvalRate) {
      requirements.push(`Reach ${(reqs.approvalRate * 100).toFixed(0)}% approval rate`);
    }
  }
  
  if ('qualityScore' in reqs) {
    requirementCount++;
    const qualityProgress = Math.min(stats.quality_score / reqs.qualityScore, 1);
    progress += qualityProgress;
    if (stats.quality_score < reqs.qualityScore) {
      requirements.push(`Reach ${(reqs.qualityScore * 100).toFixed(0)}% quality score`);
    }
  }
  
  return {
    nextTier,
    progress: Math.round((progress / requirementCount) * 100),
    requirements,
  };
}

// Export as default for compatibility
export default SUSTAINABLE_EARNINGS;