/**
 * UNIFIED EARNINGS CONFIGURATION
 * Single source of truth for all earnings calculations
 * Matches the database earnings_config table
 */

export const UNIFIED_EARNINGS = {
  // Base earnings
  base: {
    trendSubmission: 1.00,
    validationVote: 0.10,
    approvalBonus: 0.50,
  },

  // Quality bonuses (added to submission)
  qualityBonuses: {
    screenshotIncluded: 0.15,
    completeInfo: 0.10, // title + description
    demographicsData: 0.10,
    multiplePlatforms: 0.10,
    creatorInfo: 0.05,
    richHashtags: 0.05, // 3+ hashtags
    captionProvided: 0.05,
  },

  // Performance bonuses
  performanceBonuses: {
    highViews: { threshold: 100000, bonus: 0.25 },
    viralContent: { threshold: 1000000, bonus: 0.50 },
    highEngagement: { threshold: 0.10, bonus: 0.20 }, // >10% engagement rate
    highWaveScore: { threshold: 70, bonus: 0.20 },
    financeTrend: 0.10, // for finance/crypto trends
  },

  // Tier multipliers
  tierMultipliers: {
    elite: 1.5,
    verified: 1.0,
    learning: 0.7,
    restricted: 0.3,
  },

  // Tier requirements
  tierRequirements: {
    elite: {
      minTrends: 50,
      minApprovalRate: 0.85,
      minQualityScore: 0.85,
    },
    verified: {
      minTrends: 10,
      minApprovalRate: 0.70,
      minQualityScore: 0.70,
    },
    learning: {
      minTrends: 0,
      minApprovalRate: 0,
      minQualityScore: 0,
    },
    restricted: {
      // Applied when approval rate < 30% or quality score < 30%
      maxApprovalRate: 0.30,
      maxQualityScore: 0.30,
    },
  },

  // Caps
  caps: {
    maxPerSubmission: 3.00,
    dailyMax: 50.00,
    minCashout: 10.00,
  },

  // Payment methods
  paymentMethods: [
    { id: 'venmo', name: 'Venmo', minAmount: 10, fee: 0 },
    { id: 'paypal', name: 'PayPal', minAmount: 10, fee: 0.30 },
    { id: 'bank_transfer', name: 'Bank Transfer', minAmount: 25, fee: 0 },
    { id: 'crypto', name: 'Cryptocurrency', minAmount: 50, fee: 2.00 },
  ],
};

// Type definitions
export interface TrendData {
  id?: string;
  title?: string;
  description?: string;
  screenshot_url?: string;
  demographics_data?: any;
  platform?: string[];
  creator_info?: any;
  hashtags?: string[];
  caption?: string;
  metadata?: {
    view_count?: number;
    engagement_rate?: number;
  };
  wave_score?: number;
  category?: string;
}

export interface UserProfile {
  user_id: string;
  performance_tier: 'elite' | 'verified' | 'learning' | 'restricted';
  quality_score: number;
  approval_rate: number;
  trends_submitted: number;
  trends_approved: number;
  current_balance: number;
  total_earned: number;
}

/**
 * Calculate total earnings for a trend submission
 * This should match the database function calculate_trend_earnings()
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
  breakdown: string[];
} {
  const breakdown: string[] = [];
  
  // Base amount
  let base = UNIFIED_EARNINGS.base.trendSubmission;
  breakdown.push(`Base submission: $${base.toFixed(2)}`);
  
  // Quality bonuses
  let qualityBonuses = 0;
  
  if (trend.screenshot_url) {
    qualityBonuses += UNIFIED_EARNINGS.qualityBonuses.screenshotIncluded;
    breakdown.push(`Screenshot bonus: $${UNIFIED_EARNINGS.qualityBonuses.screenshotIncluded.toFixed(2)}`);
  }
  
  if (trend.title && trend.description) {
    qualityBonuses += UNIFIED_EARNINGS.qualityBonuses.completeInfo;
    breakdown.push(`Complete info bonus: $${UNIFIED_EARNINGS.qualityBonuses.completeInfo.toFixed(2)}`);
  }
  
  if (trend.demographics_data) {
    qualityBonuses += UNIFIED_EARNINGS.qualityBonuses.demographicsData;
    breakdown.push(`Demographics bonus: $${UNIFIED_EARNINGS.qualityBonuses.demographicsData.toFixed(2)}`);
  }
  
  if (trend.platform && trend.platform.length > 1) {
    qualityBonuses += UNIFIED_EARNINGS.qualityBonuses.multiplePlatforms;
    breakdown.push(`Multi-platform bonus: $${UNIFIED_EARNINGS.qualityBonuses.multiplePlatforms.toFixed(2)}`);
  }
  
  if (trend.creator_info) {
    qualityBonuses += UNIFIED_EARNINGS.qualityBonuses.creatorInfo;
    breakdown.push(`Creator info bonus: $${UNIFIED_EARNINGS.qualityBonuses.creatorInfo.toFixed(2)}`);
  }
  
  if (trend.hashtags && trend.hashtags.length >= 3) {
    qualityBonuses += UNIFIED_EARNINGS.qualityBonuses.richHashtags;
    breakdown.push(`Rich hashtags bonus: $${UNIFIED_EARNINGS.qualityBonuses.richHashtags.toFixed(2)}`);
  }
  
  if (trend.caption) {
    qualityBonuses += UNIFIED_EARNINGS.qualityBonuses.captionProvided;
    breakdown.push(`Caption bonus: $${UNIFIED_EARNINGS.qualityBonuses.captionProvided.toFixed(2)}`);
  }
  
  // Performance bonuses
  let performanceBonuses = 0;
  
  const viewCount = trend.metadata?.view_count || 0;
  if (viewCount >= UNIFIED_EARNINGS.performanceBonuses.viralContent.threshold) {
    performanceBonuses += UNIFIED_EARNINGS.performanceBonuses.viralContent.bonus;
    breakdown.push(`Viral content bonus: $${UNIFIED_EARNINGS.performanceBonuses.viralContent.bonus.toFixed(2)}`);
  } else if (viewCount >= UNIFIED_EARNINGS.performanceBonuses.highViews.threshold) {
    performanceBonuses += UNIFIED_EARNINGS.performanceBonuses.highViews.bonus;
    breakdown.push(`High views bonus: $${UNIFIED_EARNINGS.performanceBonuses.highViews.bonus.toFixed(2)}`);
  }
  
  const engagementRate = trend.metadata?.engagement_rate || 0;
  if (engagementRate >= UNIFIED_EARNINGS.performanceBonuses.highEngagement.threshold) {
    performanceBonuses += UNIFIED_EARNINGS.performanceBonuses.highEngagement.bonus;
    breakdown.push(`High engagement bonus: $${UNIFIED_EARNINGS.performanceBonuses.highEngagement.bonus.toFixed(2)}`);
  }
  
  if (trend.wave_score && trend.wave_score >= UNIFIED_EARNINGS.performanceBonuses.highWaveScore.threshold) {
    performanceBonuses += UNIFIED_EARNINGS.performanceBonuses.highWaveScore.bonus;
    breakdown.push(`High wave score bonus: $${UNIFIED_EARNINGS.performanceBonuses.highWaveScore.bonus.toFixed(2)}`);
  }
  
  if (trend.category && ['finance', 'crypto', 'stocks'].includes(trend.category.toLowerCase())) {
    performanceBonuses += UNIFIED_EARNINGS.performanceBonuses.financeTrend;
    breakdown.push(`Finance trend bonus: $${UNIFIED_EARNINGS.performanceBonuses.financeTrend.toFixed(2)}`);
  }
  
  // Apply tier multiplier
  const tierMultiplier = UNIFIED_EARNINGS.tierMultipliers[userProfile.performance_tier] || 1.0;
  if (tierMultiplier !== 1.0) {
    breakdown.push(`${userProfile.performance_tier} tier multiplier: ${tierMultiplier}x`);
  }
  
  // Calculate total
  let total = (base + qualityBonuses + performanceBonuses) * tierMultiplier;
  
  // Apply cap
  if (total > UNIFIED_EARNINGS.caps.maxPerSubmission) {
    total = UNIFIED_EARNINGS.caps.maxPerSubmission;
    breakdown.push(`Capped at max: $${UNIFIED_EARNINGS.caps.maxPerSubmission.toFixed(2)}`);
  }
  
  return {
    base,
    qualityBonuses,
    performanceBonuses,
    tierMultiplier,
    total,
    breakdown,
  };
}

/**
 * Determine user tier based on performance
 */
export function calculateUserTier(profile: {
  trends_submitted: number;
  approval_rate: number;
  quality_score: number;
}): 'elite' | 'verified' | 'learning' | 'restricted' {
  // New users start in learning
  if (profile.trends_submitted < 5) {
    return 'learning';
  }
  
  // Check for restricted status
  if (
    profile.approval_rate < UNIFIED_EARNINGS.tierRequirements.restricted.maxApprovalRate ||
    profile.quality_score < UNIFIED_EARNINGS.tierRequirements.restricted.maxQualityScore
  ) {
    return 'restricted';
  }
  
  // Check for elite status
  const elite = UNIFIED_EARNINGS.tierRequirements.elite;
  if (
    profile.trends_submitted >= elite.minTrends &&
    profile.approval_rate >= elite.minApprovalRate &&
    profile.quality_score >= elite.minQualityScore
  ) {
    return 'elite';
  }
  
  // Check for verified status
  const verified = UNIFIED_EARNINGS.tierRequirements.verified;
  if (
    profile.trends_submitted >= verified.minTrends &&
    profile.approval_rate >= verified.minApprovalRate &&
    profile.quality_score >= verified.minQualityScore
  ) {
    return 'verified';
  }
  
  return 'learning';
}

/**
 * Format earnings for display
 */
export function formatEarnings(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get tier color for UI
 */
export function getTierColor(tier: string): string {
  switch (tier) {
    case 'elite':
      return '#FFD700'; // Gold
    case 'verified':
      return '#4CAF50'; // Green
    case 'learning':
      return '#2196F3'; // Blue
    case 'restricted':
      return '#F44336'; // Red
    default:
      return '#9E9E9E'; // Grey
  }
}

/**
 * Get tier badge emoji
 */
export function getTierEmoji(tier: string): string {
  switch (tier) {
    case 'elite':
      return '👑';
    case 'verified':
      return '✅';
    case 'learning':
      return '📚';
    case 'restricted':
      return '⚠️';
    default:
      return '👤';
  }
}

export default UNIFIED_EARNINGS;