/**
 * EARNINGS STANDARD V2 - Unified earnings configuration
 * This is the single source of truth for all earnings calculations
 * across the entire application (frontend, backend, database)
 */

export const EARNINGS_STANDARD_V2 = {
  // Base earnings
  SUBMISSION_BASE: 1.00,
  VALIDATION_REWARD: 0.10,
  APPROVAL_BONUS: 0.50,
  
  // Quality bonuses (additive)
  BONUSES: {
    SCREENSHOT: 0.15,
    COMPLETE_INFO: 0.10,
    DEMOGRAPHICS: 0.10,
    MULTIPLE_PLATFORMS: 0.10,
    CREATOR_INFO: 0.05,
    RICH_HASHTAGS: 0.05, // 3+ hashtags
    CAPTION: 0.05,
  },
  
  // Performance bonuses (additive)
  PERFORMANCE_BONUSES: {
    HIGH_VIEWS: 0.25, // 100k+ views
    VIRAL_CONTENT: 0.50, // 1M+ views
    HIGH_ENGAGEMENT: 0.20, // >10% engagement rate
    HIGH_WAVE_SCORE: 0.20, // Wave score > 70
    FINANCE_TREND: 0.10, // Finance/crypto related
  },
  
  // Tier multipliers (multiplicative)
  TIER_MULTIPLIERS: {
    elite: 1.5,
    verified: 1.0,
    learning: 0.7,
    restricted: 0.3,
  },
  
  // Streak bonuses (multiplicative)
  STREAK_MULTIPLIERS: {
    DAYS_3: 1.05,
    DAYS_7: 1.10,
    DAYS_14: 1.15,
    DAYS_30: 1.20,
  },
  
  // Caps and limits
  LIMITS: {
    MAX_SUBMISSION_EARNING: 3.00,
    MAX_DAILY_EARNING: 50.00,
    MAX_PENDING_EARNING: 100.00,
    MIN_CASHOUT: 10.00,
  },
  
  // Validation thresholds
  VALIDATION: {
    MIN_VOTES_REQUIRED: 5,
    APPROVAL_THRESHOLD: 0.6, // 60% approval rate
    MAX_VALIDATION_TIME_HOURS: 72,
  },
  
  // Tier progression thresholds
  TIER_PROGRESSION: {
    TO_VERIFIED: {
      trends_spotted: 10,
      accuracy_score: 70,
      validation_score: 50,
    },
    TO_ELITE: {
      trends_spotted: 50,
      accuracy_score: 85,
      validation_score: 80,
    },
  },
} as const;

export type SpotterTier = 'elite' | 'verified' | 'learning' | 'restricted';
export type EarningStatus = 'pending' | 'approved' | 'paid' | 'cancelled';

export interface TrendEarningsInput {
  // Quality factors
  hasScreenshot: boolean;
  hasCompleteInfo: boolean;
  hasDemographics: boolean;
  hasMultiplePlatforms: boolean;
  hasCreatorInfo: boolean;
  hasRichHashtags: boolean;
  hasCaption: boolean;
  
  // Performance factors
  viewCount: number;
  engagementRate: number;
  waveScore: number;
  isFinanceTrend: boolean;
  
  // User factors
  spotterTier: SpotterTier;
  streakDays: number;
}

export interface EarningsCalculation {
  baseAmount: number;
  bonusAmount: number;
  tierMultiplier: number;
  streakMultiplier: number;
  totalAmount: number;
  breakdown: {
    label: string;
    amount: number;
  }[];
}

/**
 * Calculate earnings for a trend submission
 */
export function calculateTrendEarnings(input: TrendEarningsInput): EarningsCalculation {
  const breakdown: { label: string; amount: number }[] = [];
  
  // Start with base amount
  let baseAmount = EARNINGS_STANDARD_V2.SUBMISSION_BASE;
  breakdown.push({ label: 'Base submission', amount: baseAmount });
  
  // Calculate quality bonuses
  let bonusAmount = 0;
  
  if (input.hasScreenshot) {
    bonusAmount += EARNINGS_STANDARD_V2.BONUSES.SCREENSHOT;
    breakdown.push({ label: 'Screenshot bonus', amount: EARNINGS_STANDARD_V2.BONUSES.SCREENSHOT });
  }
  
  if (input.hasCompleteInfo) {
    bonusAmount += EARNINGS_STANDARD_V2.BONUSES.COMPLETE_INFO;
    breakdown.push({ label: 'Complete info bonus', amount: EARNINGS_STANDARD_V2.BONUSES.COMPLETE_INFO });
  }
  
  if (input.hasDemographics) {
    bonusAmount += EARNINGS_STANDARD_V2.BONUSES.DEMOGRAPHICS;
    breakdown.push({ label: 'Demographics bonus', amount: EARNINGS_STANDARD_V2.BONUSES.DEMOGRAPHICS });
  }
  
  if (input.hasMultiplePlatforms) {
    bonusAmount += EARNINGS_STANDARD_V2.BONUSES.MULTIPLE_PLATFORMS;
    breakdown.push({ label: 'Multi-platform bonus', amount: EARNINGS_STANDARD_V2.BONUSES.MULTIPLE_PLATFORMS });
  }
  
  if (input.hasCreatorInfo) {
    bonusAmount += EARNINGS_STANDARD_V2.BONUSES.CREATOR_INFO;
    breakdown.push({ label: 'Creator info bonus', amount: EARNINGS_STANDARD_V2.BONUSES.CREATOR_INFO });
  }
  
  if (input.hasRichHashtags) {
    bonusAmount += EARNINGS_STANDARD_V2.BONUSES.RICH_HASHTAGS;
    breakdown.push({ label: 'Hashtags bonus', amount: EARNINGS_STANDARD_V2.BONUSES.RICH_HASHTAGS });
  }
  
  if (input.hasCaption) {
    bonusAmount += EARNINGS_STANDARD_V2.BONUSES.CAPTION;
    breakdown.push({ label: 'Caption bonus', amount: EARNINGS_STANDARD_V2.BONUSES.CAPTION });
  }
  
  // Calculate performance bonuses
  if (input.viewCount >= 1000000) {
    bonusAmount += EARNINGS_STANDARD_V2.PERFORMANCE_BONUSES.VIRAL_CONTENT;
    breakdown.push({ label: 'Viral content bonus', amount: EARNINGS_STANDARD_V2.PERFORMANCE_BONUSES.VIRAL_CONTENT });
  } else if (input.viewCount >= 100000) {
    bonusAmount += EARNINGS_STANDARD_V2.PERFORMANCE_BONUSES.HIGH_VIEWS;
    breakdown.push({ label: 'High views bonus', amount: EARNINGS_STANDARD_V2.PERFORMANCE_BONUSES.HIGH_VIEWS });
  }
  
  if (input.engagementRate > 10) {
    bonusAmount += EARNINGS_STANDARD_V2.PERFORMANCE_BONUSES.HIGH_ENGAGEMENT;
    breakdown.push({ label: 'High engagement bonus', amount: EARNINGS_STANDARD_V2.PERFORMANCE_BONUSES.HIGH_ENGAGEMENT });
  }
  
  if (input.waveScore > 70) {
    bonusAmount += EARNINGS_STANDARD_V2.PERFORMANCE_BONUSES.HIGH_WAVE_SCORE;
    breakdown.push({ label: 'High wave score bonus', amount: EARNINGS_STANDARD_V2.PERFORMANCE_BONUSES.HIGH_WAVE_SCORE });
  }
  
  if (input.isFinanceTrend) {
    bonusAmount += EARNINGS_STANDARD_V2.PERFORMANCE_BONUSES.FINANCE_TREND;
    breakdown.push({ label: 'Finance trend bonus', amount: EARNINGS_STANDARD_V2.PERFORMANCE_BONUSES.FINANCE_TREND });
  }
  
  // Get multipliers
  const tierMultiplier = EARNINGS_STANDARD_V2.TIER_MULTIPLIERS[input.spotterTier] || 0.7;
  const streakMultiplier = getStreakMultiplier(input.streakDays);
  
  // Calculate total with multipliers and cap
  const subtotal = baseAmount + bonusAmount;
  const totalBeforeCap = subtotal * tierMultiplier * streakMultiplier;
  const totalAmount = Math.min(totalBeforeCap, EARNINGS_STANDARD_V2.LIMITS.MAX_SUBMISSION_EARNING);
  
  return {
    baseAmount,
    bonusAmount,
    tierMultiplier,
    streakMultiplier,
    totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimals
    breakdown,
  };
}

/**
 * Get streak multiplier based on consecutive days
 */
export function getStreakMultiplier(days: number): number {
  if (days >= 30) return EARNINGS_STANDARD_V2.STREAK_MULTIPLIERS.DAYS_30;
  if (days >= 14) return EARNINGS_STANDARD_V2.STREAK_MULTIPLIERS.DAYS_14;
  if (days >= 7) return EARNINGS_STANDARD_V2.STREAK_MULTIPLIERS.DAYS_7;
  if (days >= 3) return EARNINGS_STANDARD_V2.STREAK_MULTIPLIERS.DAYS_3;
  return 1.0;
}

/**
 * Calculate validation earnings
 */
export function calculateValidationEarnings(
  validationCount: number,
  spotterTier: SpotterTier = 'learning'
): number {
  const base = EARNINGS_STANDARD_V2.VALIDATION_REWARD * validationCount;
  const multiplier = EARNINGS_STANDARD_V2.TIER_MULTIPLIERS[spotterTier];
  return Math.round(base * multiplier * 100) / 100;
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
 * Get earning status display
 */
export function getEarningStatusDisplay(status: EarningStatus): {
  label: string;
  color: string;
  icon: string;
} {
  switch (status) {
    case 'pending':
      return { label: 'Pending', color: 'yellow', icon: 'clock' };
    case 'approved':
      return { label: 'Approved', color: 'green', icon: 'check' };
    case 'paid':
      return { label: 'Paid', color: 'blue', icon: 'dollar' };
    case 'cancelled':
      return { label: 'Cancelled', color: 'red', icon: 'x' };
    default:
      return { label: 'Unknown', color: 'gray', icon: 'question' };
  }
}

/**
 * Check if user can progress to next tier
 */
export function canProgressTier(
  currentTier: SpotterTier,
  stats: {
    trends_spotted: number;
    accuracy_score: number;
    validation_score: number;
  }
): { canProgress: boolean; nextTier?: SpotterTier; requirements?: any } {
  if (currentTier === 'elite') {
    return { canProgress: false };
  }
  
  if (currentTier === 'learning' || currentTier === 'restricted') {
    const requirements = EARNINGS_STANDARD_V2.TIER_PROGRESSION.TO_VERIFIED;
    const meetsRequirements = 
      stats.trends_spotted >= requirements.trends_spotted &&
      stats.accuracy_score >= requirements.accuracy_score &&
      stats.validation_score >= requirements.validation_score;
    
    return {
      canProgress: meetsRequirements,
      nextTier: 'verified',
      requirements,
    };
  }
  
  if (currentTier === 'verified') {
    const requirements = EARNINGS_STANDARD_V2.TIER_PROGRESSION.TO_ELITE;
    const meetsRequirements = 
      stats.trends_spotted >= requirements.trends_spotted &&
      stats.accuracy_score >= requirements.accuracy_score &&
      stats.validation_score >= requirements.validation_score;
    
    return {
      canProgress: meetsRequirements,
      nextTier: 'elite',
      requirements,
    };
  }
  
  return { canProgress: false };
}

export default EARNINGS_STANDARD_V2;