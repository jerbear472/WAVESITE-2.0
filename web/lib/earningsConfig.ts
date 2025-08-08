// Centralized earnings configuration for consistency across the app
export const EARNINGS_CONFIG = {
  // Base payment for submitting a trend
  BASE_PAYMENT: 0.08,
  
  // Bonus amounts for various criteria
  BONUSES: {
    // Content quality bonuses
    COMPLETE_INFO: 0.01,        // Has both title and explanation
    SCREENSHOT: 0.02,           // Includes screenshot
    DEMOGRAPHICS: 0.01,         // Includes age ranges
    SUBCULTURES: 0.01,          // Includes subcultures
    OTHER_PLATFORMS: 0.01,      // Seen on multiple platforms
    
    // Engagement bonuses
    HIGH_VIEWS: 0.02,           // Views > 100k
    VIRAL_CONTENT: 0.03,        // Views > 1M
    HIGH_ENGAGEMENT: 0.02,      // High likes/comments ratio
    
    // Metadata bonuses
    CREATOR_INFO: 0.01,         // Has creator handle
    RICH_HASHTAGS: 0.01,        // Has 3+ hashtags
    CAPTION_PROVIDED: 0.01,     // Has post caption
    
    // Special category bonuses
    FINANCE_TREND: 0.03,        // Finance/stock/crypto related
    HIGH_WAVE_SCORE: 0.02,      // Wave score > 70
    TRENDING_CATEGORY: 0.01,    // In a trending category
  },
  
  // Streak multipliers (applied to final amount)
  STREAK_MULTIPLIERS: {
    1: 1.0,   // No multiplier for first trend
    2: 1.2,   // 20% bonus for 2 trends
    3: 1.5,   // 50% bonus for 3 trends
    5: 2.0,   // 2x for 5 trends
    10: 2.5,  // 2.5x for 10 trends
    15: 3.0   // 3x for 15+ trends
  },
  
  // Time windows
  STREAK_WINDOW: 5 * 60 * 1000, // 5 minutes to maintain streak
  
  // Validation rewards (for verify page)
  VALIDATION_REWARDS: {
    CORRECT_VALIDATION: 0.02,    // Correctly validating a trend
    CONSENSUS_BONUS: 0.01,       // Agreeing with majority
    SPEED_BONUS: 0.005,          // Quick validation (< 5 seconds)
  },
  
  // Maximum earnings caps
  MAX_SINGLE_SUBMISSION: 0.50,  // Max for a single submission
  MAX_DAILY_EARNINGS: 10.00,    // Max daily earnings
};

// Helper function to calculate earnings for a trend submission
export function calculateTrendEarnings(data: {
  trendName?: string;
  explanation?: string;
  screenshot?: any;
  ageRanges?: any[];
  subcultures?: any[];
  otherPlatforms?: any[];
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  creator_handle?: string;
  hashtags?: string[];
  post_caption?: string;
  wave_score?: number;
  category?: string;
  tickers?: string[];
  isFinanceTrend?: boolean;
}, streakCount: number = 0): { baseAmount: number; finalAmount: number; appliedBonuses: string[] } {
  
  let amount = EARNINGS_CONFIG.BASE_PAYMENT;
  const appliedBonuses: string[] = [];
  
  // Apply bonuses
  if (data.trendName && data.explanation) {
    amount += EARNINGS_CONFIG.BONUSES.COMPLETE_INFO;
    appliedBonuses.push('Complete Info');
  }
  
  if (data.screenshot) {
    amount += EARNINGS_CONFIG.BONUSES.SCREENSHOT;
    appliedBonuses.push('📸 Screenshot');
  }
  
  if (data.ageRanges && data.ageRanges.length > 0) {
    amount += EARNINGS_CONFIG.BONUSES.DEMOGRAPHICS;
    appliedBonuses.push('Demographics');
  }
  
  if (data.subcultures && data.subcultures.length > 0) {
    amount += EARNINGS_CONFIG.BONUSES.SUBCULTURES;
    appliedBonuses.push('Subcultures');
  }
  
  if (data.otherPlatforms && data.otherPlatforms.length > 0) {
    amount += EARNINGS_CONFIG.BONUSES.OTHER_PLATFORMS;
    appliedBonuses.push('Multi-Platform');
  }
  
  if (data.views_count) {
    if (data.views_count > 1000000) {
      amount += EARNINGS_CONFIG.BONUSES.VIRAL_CONTENT;
      appliedBonuses.push('🔥 Viral');
    } else if (data.views_count > 100000) {
      amount += EARNINGS_CONFIG.BONUSES.HIGH_VIEWS;
      appliedBonuses.push('High Views');
    }
  }
  
  if (data.likes_count && data.views_count) {
    const engagementRate = data.likes_count / data.views_count;
    if (engagementRate > 0.1) { // 10% engagement rate
      amount += EARNINGS_CONFIG.BONUSES.HIGH_ENGAGEMENT;
      appliedBonuses.push('High Engagement');
    }
  }
  
  if (data.creator_handle) {
    amount += EARNINGS_CONFIG.BONUSES.CREATOR_INFO;
    appliedBonuses.push('Creator Info');
  }
  
  if (data.hashtags && data.hashtags.length >= 3) {
    amount += EARNINGS_CONFIG.BONUSES.RICH_HASHTAGS;
    appliedBonuses.push('Hashtags');
  }
  
  if (data.post_caption) {
    amount += EARNINGS_CONFIG.BONUSES.CAPTION_PROVIDED;
    appliedBonuses.push('Caption');
  }
  
  if (data.isFinanceTrend || (data.tickers && data.tickers.length > 0)) {
    amount += EARNINGS_CONFIG.BONUSES.FINANCE_TREND;
    appliedBonuses.push('📈 Finance');
  }
  
  if (data.wave_score && data.wave_score > 70) {
    amount += EARNINGS_CONFIG.BONUSES.HIGH_WAVE_SCORE;
    appliedBonuses.push('🌊 High Wave');
  }
  
  // Cap the base amount
  const baseAmount = Math.min(amount, EARNINGS_CONFIG.MAX_SINGLE_SUBMISSION);
  
  // Apply streak multiplier
  let multiplier = 1.0;
  if (streakCount > 0) {
    // Find the appropriate multiplier
    const multiplierKeys = Object.keys(EARNINGS_CONFIG.STREAK_MULTIPLIERS)
      .map(k => parseInt(k))
      .sort((a, b) => b - a);
    
    for (const key of multiplierKeys) {
      if (streakCount >= key) {
        multiplier = EARNINGS_CONFIG.STREAK_MULTIPLIERS[key];
        break;
      }
    }
    
    if (multiplier > 1) {
      appliedBonuses.push(`${multiplier}x Streak`);
    }
  }
  
  const finalAmount = baseAmount * multiplier;
  
  return {
    baseAmount,
    finalAmount,
    appliedBonuses
  };
}

// Helper to get streak multiplier
export function getStreakMultiplier(streakCount: number): number {
  const multiplierKeys = Object.keys(EARNINGS_CONFIG.STREAK_MULTIPLIERS)
    .map(k => parseInt(k))
    .sort((a, b) => b - a);
  
  for (const key of multiplierKeys) {
    if (streakCount >= key) {
      return EARNINGS_CONFIG.STREAK_MULTIPLIERS[key];
    }
  }
  
  return 1.0;
}