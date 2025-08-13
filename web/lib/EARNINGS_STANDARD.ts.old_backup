/**
 * EARNINGS STANDARD - Single Source of Truth
 * 
 * This file defines the canonical earning structure for the entire application.
 * ALL earning calculations across frontend, backend, and database MUST reference
 * these values to ensure consistency.
 * 
 * Last Updated: 2025-01-11
 * Version: 1.0.0
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export type SpotterTier = 'elite' | 'verified' | 'learning' | 'restricted';
export type EarningType = 'trend_submission' | 'trend_validation' | 'approval_bonus' | 'scroll_session' | 'challenge' | 'referral';
export type EarningStatus = 'pending' | 'approved' | 'paid' | 'cancelled';

export interface EarningCalculation {
  baseAmount: number;
  bonusAmount: number;
  tierMultiplier: number;
  streakMultiplier: number;
  finalAmount: number;
  appliedBonuses: string[];
  breakdown: EarningBreakdown;
}

export interface EarningBreakdown {
  base: number;
  qualityBonuses: Record<string, number>;
  performanceBonuses: Record<string, number>;
  multipliers: {
    tier: number;
    streak: number;
  };
  total: number;
  capped: boolean;
}

export interface TrendSubmissionData {
  // Required fields
  trendName: string;
  description: string;
  
  // Quality bonus fields
  screenshot_url?: string;
  ageRanges?: any[];
  subcultures?: any[];
  otherPlatforms?: any[];
  creator_handle?: string;
  hashtags?: string[];
  post_caption?: string;
  
  // Performance bonus fields
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  wave_score?: number;
  category?: string;
  tickers?: string[];
  isFinanceTrend?: boolean;
  
  // Platform data
  platform?: string;
}

// ============================================
// EARNING CONFIGURATION CONSTANTS
// ============================================

export const EARNINGS_STANDARD = {
  // Version for tracking changes
  VERSION: '1.0.0',
  
  // Base earning rates (in USD)
  BASE_RATES: {
    TREND_SUBMISSION: 1.00,      // Base payment for submitting a trend
    VALIDATION_VOTE: 0.10,        // Payment per validation vote
    APPROVAL_BONUS: 0.50,         // Bonus when trend gets approved (paid to spotter)
    SCROLL_SESSION: 0.00,         // Scroll sessions don't pay directly (only maintain streaks)
  },
  
  // Quality bonuses - applied when submitting trend
  QUALITY_BONUSES: {
    SCREENSHOT: 0.15,             // Includes screenshot/media
    COMPLETE_INFO: 0.10,          // Has both title and detailed description
    DEMOGRAPHICS: 0.10,           // Includes age range data
    SUBCULTURES: 0.10,            // Tags relevant subcultures
    MULTI_PLATFORM: 0.10,         // Seen on multiple platforms
    CREATOR_INFO: 0.05,           // Includes creator handle
    RICH_HASHTAGS: 0.05,          // Has 3+ relevant hashtags
    CAPTION_PROVIDED: 0.05,       // Includes original post caption
  },
  
  // Performance bonuses - based on trend metrics
  PERFORMANCE_BONUSES: {
    VIRAL_CONTENT: 0.50,          // 1M+ views
    HIGH_VIEWS: 0.25,             // 100k-999k views (not cumulative with VIRAL)
    HIGH_ENGAGEMENT: 0.20,        // >10% engagement rate (likes/views)
    HIGH_WAVE_SCORE: 0.20,        // Wave score > 70
    FINANCE_TREND: 0.10,          // Finance/crypto/stocks related
    TRENDING_CATEGORY: 0.10,      // In a currently trending category
  },
  
  // Spotter tier multipliers (applied to final amount)
  TIER_MULTIPLIERS: {
    elite: 1.5,                   // 50% bonus for elite spotters
    verified: 1.0,                // Standard rate for verified
    learning: 0.7,                // 30% reduction for learning
    restricted: 0.3,              // 70% reduction for restricted
  },
  
  // Streak multipliers (cumulative with tier multiplier)
  STREAK_MULTIPLIERS: {
    0: 1.0,                       // No streak
    1: 1.0,                       // First submission
    2: 1.2,                       // 20% bonus
    3: 1.5,                       // 50% bonus
    5: 2.0,                       // 2x multiplier
    10: 2.5,                      // 2.5x multiplier
    15: 3.0,                      // 3x multiplier (max)
  },
  
  // System limits and caps
  LIMITS: {
    MAX_SINGLE_SUBMISSION: 3.00,  // Maximum earning per submission
    MAX_DAILY_EARNINGS: 50.00,    // Maximum daily earnings
    MIN_CASHOUT_AMOUNT: 5.00,     // Minimum balance for cashout
    STREAK_WINDOW_MINUTES: 5,     // Minutes to maintain streak
  },
  
  // Validation requirements
  VALIDATION: {
    VOTES_TO_APPROVE: 2,          // Votes needed to approve trend
    VOTES_TO_REJECT: 2,           // Votes needed to reject trend
    MAX_VOTE_EARNINGS_DAILY: 10.00, // Max daily earnings from voting
  },
  
  // Processing settings
  PROCESSING: {
    CASHOUT_HOURS: '24-48',       // Time to process cashouts
    PAYMENT_METHODS: ['venmo', 'paypal', 'bank_transfer'],
  },
} as const;

// ============================================
// CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate earnings for a trend submission
 */
export function calculateTrendSubmissionEarnings(
  data: TrendSubmissionData,
  spotterTier: SpotterTier = 'learning',
  streakCount: number = 0
): EarningCalculation {
  const breakdown: EarningBreakdown = {
    base: EARNINGS_STANDARD.BASE_RATES.TREND_SUBMISSION,
    qualityBonuses: {},
    performanceBonuses: {},
    multipliers: {
      tier: EARNINGS_STANDARD.TIER_MULTIPLIERS[spotterTier],
      streak: getStreakMultiplier(streakCount),
    },
    total: 0,
    capped: false,
  };
  
  const appliedBonuses: string[] = [];
  
  // Apply quality bonuses
  if (data.screenshot_url) {
    breakdown.qualityBonuses.screenshot = EARNINGS_STANDARD.QUALITY_BONUSES.SCREENSHOT;
    appliedBonuses.push('📸 Screenshot');
  }
  
  if (data.trendName && data.description && data.description.length > 20) {
    breakdown.qualityBonuses.completeInfo = EARNINGS_STANDARD.QUALITY_BONUSES.COMPLETE_INFO;
    appliedBonuses.push('📝 Complete Info');
  }
  
  if (data.ageRanges && data.ageRanges.length > 0) {
    breakdown.qualityBonuses.demographics = EARNINGS_STANDARD.QUALITY_BONUSES.DEMOGRAPHICS;
    appliedBonuses.push('👥 Demographics');
  }
  
  if (data.subcultures && data.subcultures.length > 0) {
    breakdown.qualityBonuses.subcultures = EARNINGS_STANDARD.QUALITY_BONUSES.SUBCULTURES;
    appliedBonuses.push('🎭 Subcultures');
  }
  
  if (data.otherPlatforms && data.otherPlatforms.length > 0) {
    breakdown.qualityBonuses.multiPlatform = EARNINGS_STANDARD.QUALITY_BONUSES.MULTI_PLATFORM;
    appliedBonuses.push('🌐 Multi-Platform');
  }
  
  if (data.creator_handle) {
    breakdown.qualityBonuses.creatorInfo = EARNINGS_STANDARD.QUALITY_BONUSES.CREATOR_INFO;
    appliedBonuses.push('👤 Creator Info');
  }
  
  if (data.hashtags && data.hashtags.length >= 3) {
    breakdown.qualityBonuses.richHashtags = EARNINGS_STANDARD.QUALITY_BONUSES.RICH_HASHTAGS;
    appliedBonuses.push('#️⃣ Hashtags');
  }
  
  if (data.post_caption && data.post_caption.length > 10) {
    breakdown.qualityBonuses.caption = EARNINGS_STANDARD.QUALITY_BONUSES.CAPTION_PROVIDED;
    appliedBonuses.push('💬 Caption');
  }
  
  // Apply performance bonuses
  if (data.views_count) {
    if (data.views_count >= 1000000) {
      breakdown.performanceBonuses.viral = EARNINGS_STANDARD.PERFORMANCE_BONUSES.VIRAL_CONTENT;
      appliedBonuses.push('🔥 Viral (1M+ views)');
    } else if (data.views_count >= 100000) {
      breakdown.performanceBonuses.highViews = EARNINGS_STANDARD.PERFORMANCE_BONUSES.HIGH_VIEWS;
      appliedBonuses.push('👀 High Views (100k+)');
    }
  }
  
  if (data.views_count && data.likes_count) {
    const engagementRate = data.likes_count / data.views_count;
    if (engagementRate > 0.1) {
      breakdown.performanceBonuses.highEngagement = EARNINGS_STANDARD.PERFORMANCE_BONUSES.HIGH_ENGAGEMENT;
      appliedBonuses.push('💯 High Engagement');
    }
  }
  
  if (data.wave_score && data.wave_score > 70) {
    breakdown.performanceBonuses.highWave = EARNINGS_STANDARD.PERFORMANCE_BONUSES.HIGH_WAVE_SCORE;
    appliedBonuses.push('🌊 High Wave Score');
  }
  
  if (data.isFinanceTrend || 
      (data.tickers && data.tickers.length > 0) || 
      (data.category && ['finance', 'crypto', 'stocks', 'trading'].includes(data.category))) {
    breakdown.performanceBonuses.finance = EARNINGS_STANDARD.PERFORMANCE_BONUSES.FINANCE_TREND;
    appliedBonuses.push('📈 Finance Trend');
  }
  
  // Calculate totals
  const qualityBonusTotal = Object.values(breakdown.qualityBonuses).reduce((sum, val) => sum + val, 0);
  const performanceBonusTotal = Object.values(breakdown.performanceBonuses).reduce((sum, val) => sum + val, 0);
  
  const baseAmount = breakdown.base;
  const bonusAmount = qualityBonusTotal + performanceBonusTotal;
  const subtotal = baseAmount + bonusAmount;
  
  // Apply multipliers
  const tierMultiplier = breakdown.multipliers.tier;
  const streakMultiplier = breakdown.multipliers.streak;
  
  // Add multiplier descriptions
  if (spotterTier === 'elite') {
    appliedBonuses.push('🏆 Elite Tier (1.5x)');
  } else if (spotterTier === 'verified') {
    appliedBonuses.push('✅ Verified Tier (1.0x)');
  } else if (spotterTier === 'learning') {
    appliedBonuses.push('📚 Learning Tier (0.7x)');
  } else if (spotterTier === 'restricted') {
    appliedBonuses.push('⚠️ Restricted Tier (0.3x)');
  }
  
  if (streakMultiplier > 1) {
    appliedBonuses.push(`🔥 ${streakMultiplier}x Streak Bonus`);
  }
  
  let finalAmount = subtotal * tierMultiplier * streakMultiplier;
  
  // Apply cap
  if (finalAmount > EARNINGS_STANDARD.LIMITS.MAX_SINGLE_SUBMISSION) {
    finalAmount = EARNINGS_STANDARD.LIMITS.MAX_SINGLE_SUBMISSION;
    breakdown.capped = true;
    appliedBonuses.push('🔒 Capped at $3.00');
  }
  
  breakdown.total = finalAmount;
  
  return {
    baseAmount,
    bonusAmount,
    tierMultiplier,
    streakMultiplier,
    finalAmount,
    appliedBonuses,
    breakdown,
  };
}

/**
 * Calculate earnings for a validation vote
 */
export function calculateValidationEarnings(
  isCorrectVote: boolean = true,
  validatorTier: SpotterTier = 'learning'
): number {
  if (!isCorrectVote) return 0;
  
  const baseAmount = EARNINGS_STANDARD.BASE_RATES.VALIDATION_VOTE;
  const tierMultiplier = EARNINGS_STANDARD.TIER_MULTIPLIERS[validatorTier];
  
  return baseAmount * tierMultiplier;
}

/**
 * Calculate approval bonus for trend spotter
 */
export function calculateApprovalBonus(spotterTier: SpotterTier = 'learning'): number {
  const baseBonus = EARNINGS_STANDARD.BASE_RATES.APPROVAL_BONUS;
  const tierMultiplier = EARNINGS_STANDARD.TIER_MULTIPLIERS[spotterTier];
  
  return baseBonus * tierMultiplier;
}

/**
 * Get streak multiplier for given streak count
 */
export function getStreakMultiplier(streakCount: number): number {
  const multiplierKeys = Object.keys(EARNINGS_STANDARD.STREAK_MULTIPLIERS)
    .map(k => parseInt(k))
    .sort((a, b) => b - a);
  
  for (const key of multiplierKeys) {
    if (streakCount >= key) {
      return EARNINGS_STANDARD.STREAK_MULTIPLIERS[key as keyof typeof EARNINGS_STANDARD.STREAK_MULTIPLIERS];
    }
  }
  
  return 1.0;
}

/**
 * Check if user can cash out
 */
export function canCashOut(approvedBalance: number): boolean {
  return approvedBalance >= EARNINGS_STANDARD.LIMITS.MIN_CASHOUT_AMOUNT;
}

/**
 * Format currency for display
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
 * Get earning status label and styling
 */
export function getEarningStatusDisplay(status: EarningStatus) {
  const statusConfig = {
    pending: {
      label: 'Pending Verification',
      color: 'yellow',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      icon: '🟡',
      description: 'Awaiting community verification',
    },
    approved: {
      label: 'Approved',
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      icon: '🟢',
      description: 'Verified and ready to cash out',
    },
    paid: {
      label: 'Paid Out',
      color: 'blue',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      icon: '🔵',
      description: 'Successfully cashed out',
    },
    cancelled: {
      label: 'Cancelled',
      color: 'gray',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      icon: '⚫',
      description: 'Trend rejected or cancelled',
    },
  };
  
  return statusConfig[status] || statusConfig.pending;
}

/**
 * Validate earning calculation matches expected range
 */
export function validateEarningAmount(amount: number, type: EarningType): boolean {
  switch (type) {
    case 'trend_submission':
      return amount >= 0 && amount <= EARNINGS_STANDARD.LIMITS.MAX_SINGLE_SUBMISSION;
    case 'trend_validation':
      return amount >= 0 && amount <= EARNINGS_STANDARD.BASE_RATES.VALIDATION_VOTE * 1.5;
    case 'approval_bonus':
      return amount >= 0 && amount <= EARNINGS_STANDARD.BASE_RATES.APPROVAL_BONUS * 1.5;
    default:
      return amount >= 0;
  }
}

// Export for backward compatibility
export const EARNINGS_CONFIG = EARNINGS_STANDARD;