/**
 * SUSTAINABLE EARNINGS CONFIGURATION - THE ONLY SOURCE OF TRUTH
 * 
 * Based on sustainable revenue model:
 * - 40% of revenue goes to users maximum
 * - $150k/mo revenue target = $60k/mo for users
 * - 10,000 active users = $6/user average
 * 
 * This configuration ensures profitability while providing
 * meaningful earnings for users as a side hustle.
 */

export const SUSTAINABLE_EARNINGS = {
  // Base rates - deliberately low to ensure sustainability
  base: {
    trendSubmission: 0.25,  // Base payment per trend
    validationVote: 0.02,   // Payment per validation
    approvalBonus: 0.10,    // Bonus when trend gets approved
  },

  // Quality bonuses - small but achievable
  qualityBonuses: {
    withScreenshot: 0.05,      // Has screenshot
    completeData: 0.05,        // Has title + description (30+ chars)
    highQuality: 0.05,         // Quality score > 80
    demographics: 0.03,        // Has demographic data
    multiPlatform: 0.03,       // Multiple platforms
    creatorInfo: 0.02,         // Has creator details
    richHashtags: 0.02,        // 3+ hashtags
  },

  // Performance bonuses - rare but motivating
  performanceBonuses: {
    trending: 0.25,         // 100k+ views
    viral: 0.50,           // 1M+ views (replaces trending)
    firstSpotter: 0.50,    // First to spot a trend that goes viral
    highEngagement: 0.10,  // >10% engagement rate
    financeCategory: 0.10, // Finance/crypto trends (valuable to hedge funds)
  },

  // Tier system - clear progression path
  tiers: {
    master: {
      name: 'Master',
      multiplier: 3.0,
      dailyCap: 30.00,
      perTrendCap: 2.25,
      percentage: '1%',
      monthlyRange: { min: 500, max: 900 },
      color: '#FFD700',  // Gold
      emoji: '👑',
    },
    elite: {
      name: 'Elite',
      multiplier: 2.0,
      dailyCap: 20.00,
      perTrendCap: 1.50,
      percentage: '5%',
      monthlyRange: { min: 300, max: 500 },
      color: '#C0C0C0',  // Silver
      emoji: '⭐',
    },
    verified: {
      name: 'Verified',
      multiplier: 1.5,
      dailyCap: 15.00,
      perTrendCap: 1.13,
      percentage: '15%',
      monthlyRange: { min: 150, max: 300 },
      color: '#CD7F32',  // Bronze
      emoji: '✅',
    },
    learning: {
      name: 'Learning',
      multiplier: 1.0,
      dailyCap: 10.00,
      perTrendCap: 0.75,
      percentage: '60%',
      monthlyRange: { min: 50, max: 150 },
      color: '#4CAF50',  // Green
      emoji: '📚',
    },
    restricted: {
      name: 'Restricted',
      multiplier: 0.5,
      dailyCap: 5.00,
      perTrendCap: 0.50,
      percentage: '19%',
      monthlyRange: { min: 20, max: 50 },
      color: '#F44336',  // Red
      emoji: '⚠️',
    },
  },

  // Tier requirements - achievable progression
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
      // Applied when approval rate < 30% OR quality score < 30%
      maxApprovalRate: 0.30,
      maxQualityScore: 0.30,
      description: 'Low quality submissions',
    },
  },

  // Validation settings
  validation: {
    votesToApprove: 3,      // Votes needed for approval
    votesToReject: 3,       // Votes needed for rejection
    maxVotingHours: 72,     // Max time for voting
    selfVoteAllowed: true,  // Users can vote on own trends
  },

  // Payment settings
  payment: {
    minCashout: 10.00,      // Minimum cashout amount
    methods: [
      { id: 'venmo', name: 'Venmo', min: 10, fee: 0 },
      { id: 'paypal', name: 'PayPal', min: 10, fee: 0.30 },
      { id: 'bank', name: 'Bank Transfer', min: 25, fee: 0 },
      { id: 'crypto', name: 'Cryptocurrency', min: 50, fee: 2.00 },
    ],
  },

  // Achievement bonuses (one-time)
  achievements: {
    firstTrend: 1.00,         // First trend submitted
    tenthTrend: 2.00,         // 10th trend submitted
    hundredthTrend: 10.00,    // 100th trend submitted
    firstViral: 5.00,         // First viral trend
    streakWeek: 2.00,         // 7-day streak
    streakMonth: 10.00,       // 30-day streak
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
}

/**
 * Calculate earnings for a trend submission
 * This matches the database calculation exactly
 */
export function calculateTrendEarnings(
  trend: TrendData,
  userProfile: UserProfile
): {
  base: number;
  qualityBonuses: number;
  performanceBonuses: number;
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
  
  // Quality bonuses
  let qualityBonuses = 0;
  
  if (trend.screenshot_url) {
    qualityBonuses += SUSTAINABLE_EARNINGS.qualityBonuses.withScreenshot;
    breakdown.push(`Screenshot bonus: $${SUSTAINABLE_EARNINGS.qualityBonuses.withScreenshot.toFixed(2)}`);
  }
  
  if (trend.title && trend.description && trend.description.length >= 30) {
    qualityBonuses += SUSTAINABLE_EARNINGS.qualityBonuses.completeData;
    breakdown.push(`Complete data bonus: $${SUSTAINABLE_EARNINGS.qualityBonuses.completeData.toFixed(2)}`);
  }
  
  if (trend.quality_score && trend.quality_score > 80) {
    qualityBonuses += SUSTAINABLE_EARNINGS.qualityBonuses.highQuality;
    breakdown.push(`High quality bonus: $${SUSTAINABLE_EARNINGS.qualityBonuses.highQuality.toFixed(2)}`);
  }
  
  if (trend.demographics_data) {
    qualityBonuses += SUSTAINABLE_EARNINGS.qualityBonuses.demographics;
    breakdown.push(`Demographics bonus: $${SUSTAINABLE_EARNINGS.qualityBonuses.demographics.toFixed(2)}`);
  }
  
  if (trend.platform && trend.platform.length > 1) {
    qualityBonuses += SUSTAINABLE_EARNINGS.qualityBonuses.multiPlatform;
    breakdown.push(`Multi-platform bonus: $${SUSTAINABLE_EARNINGS.qualityBonuses.multiPlatform.toFixed(2)}`);
  }
  
  if (trend.creator_info) {
    qualityBonuses += SUSTAINABLE_EARNINGS.qualityBonuses.creatorInfo;
    breakdown.push(`Creator info bonus: $${SUSTAINABLE_EARNINGS.qualityBonuses.creatorInfo.toFixed(2)}`);
  }
  
  if (trend.hashtags && trend.hashtags.length >= 3) {
    qualityBonuses += SUSTAINABLE_EARNINGS.qualityBonuses.richHashtags;
    breakdown.push(`Rich hashtags bonus: $${SUSTAINABLE_EARNINGS.qualityBonuses.richHashtags.toFixed(2)}`);
  }
  
  // Performance bonuses
  let performanceBonuses = 0;
  const viewCount = trend.metadata?.view_count || 0;
  
  if (viewCount >= 1000000) {
    performanceBonuses += SUSTAINABLE_EARNINGS.performanceBonuses.viral;
    breakdown.push(`Viral content bonus: $${SUSTAINABLE_EARNINGS.performanceBonuses.viral.toFixed(2)}`);
  } else if (viewCount >= 100000) {
    performanceBonuses += SUSTAINABLE_EARNINGS.performanceBonuses.trending;
    breakdown.push(`Trending bonus: $${SUSTAINABLE_EARNINGS.performanceBonuses.trending.toFixed(2)}`);
  }
  
  const engagementRate = trend.metadata?.engagement_rate || 0;
  if (engagementRate > 0.10) {
    performanceBonuses += SUSTAINABLE_EARNINGS.performanceBonuses.highEngagement;
    breakdown.push(`High engagement bonus: $${SUSTAINABLE_EARNINGS.performanceBonuses.highEngagement.toFixed(2)}`);
  }
  
  if (trend.category && ['finance', 'crypto', 'stocks'].includes(trend.category.toLowerCase())) {
    performanceBonuses += SUSTAINABLE_EARNINGS.performanceBonuses.financeCategory;
    breakdown.push(`Finance category bonus: $${SUSTAINABLE_EARNINGS.performanceBonuses.financeCategory.toFixed(2)}`);
  }
  
  // Apply tier multiplier
  const tierMultiplier = tier.multiplier;
  if (tierMultiplier !== 1.0) {
    breakdown.push(`${tier.name} tier multiplier: ${tierMultiplier}x`);
  }
  
  // Calculate total
  const total = (base + qualityBonuses + performanceBonuses) * tierMultiplier;
  
  // Apply per-trend cap
  const capped = Math.min(total, tier.perTrendCap);
  if (total > capped) {
    breakdown.push(`Capped at ${tier.name} limit: $${tier.perTrendCap.toFixed(2)}`);
  }
  
  return {
    base,
    qualityBonuses,
    performanceBonuses,
    tierMultiplier,
    total,
    capped,
    breakdown,
  };
}

/**
 * Calculate validation earnings
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

// Export as default for clean imports
export default SUSTAINABLE_EARNINGS;