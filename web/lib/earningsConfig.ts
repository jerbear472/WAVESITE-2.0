/**
 * DEPRECATED - Use EARNINGS_STANDARD.ts instead
 * 
 * This file is maintained for backward compatibility only.
 * All new code should import from '@/lib/EARNINGS_STANDARD'
 * 
 * @deprecated since version 1.0.0
 */

import {
  EARNINGS_STANDARD,
  calculateTrendSubmissionEarnings,
  calculateValidationEarnings,
  calculateApprovalBonus,
  getStreakMultiplier,
  canCashOut,
  formatEarnings,
  getEarningStatusDisplay,
  validateEarningAmount,
  type SpotterTier,
  type EarningType,
  type EarningStatus,
  type EarningCalculation,
  type TrendSubmissionData
} from './EARNINGS_STANDARD';

// Re-export the standard configuration with old name for backward compatibility
export const EARNINGS_CONFIG = {
  // Map old structure to new structure
  BASE_PAYMENT: EARNINGS_STANDARD.BASE_RATES.TREND_SUBMISSION,
  
  BONUSES: {
    COMPLETE_INFO: EARNINGS_STANDARD.QUALITY_BONUSES.COMPLETE_INFO,
    SCREENSHOT: EARNINGS_STANDARD.QUALITY_BONUSES.SCREENSHOT,
    DEMOGRAPHICS: EARNINGS_STANDARD.QUALITY_BONUSES.DEMOGRAPHICS,
    SUBCULTURES: EARNINGS_STANDARD.QUALITY_BONUSES.SUBCULTURES,
    OTHER_PLATFORMS: EARNINGS_STANDARD.QUALITY_BONUSES.MULTI_PLATFORM,
    HIGH_VIEWS: EARNINGS_STANDARD.PERFORMANCE_BONUSES.HIGH_VIEWS,
    VIRAL_CONTENT: EARNINGS_STANDARD.PERFORMANCE_BONUSES.VIRAL_CONTENT,
    HIGH_ENGAGEMENT: EARNINGS_STANDARD.PERFORMANCE_BONUSES.HIGH_ENGAGEMENT,
    CREATOR_INFO: EARNINGS_STANDARD.QUALITY_BONUSES.CREATOR_INFO,
    RICH_HASHTAGS: EARNINGS_STANDARD.QUALITY_BONUSES.RICH_HASHTAGS,
    CAPTION_PROVIDED: EARNINGS_STANDARD.QUALITY_BONUSES.CAPTION_PROVIDED,
    FINANCE_TREND: EARNINGS_STANDARD.PERFORMANCE_BONUSES.FINANCE_TREND,
    FINANCE: EARNINGS_STANDARD.PERFORMANCE_BONUSES.FINANCE_TREND, // Alias
    HIGH_WAVE_SCORE: EARNINGS_STANDARD.PERFORMANCE_BONUSES.HIGH_WAVE_SCORE,
    TRENDING_CATEGORY: EARNINGS_STANDARD.PERFORMANCE_BONUSES.TRENDING_CATEGORY,
  },
  
  STREAK_MULTIPLIERS: EARNINGS_STANDARD.STREAK_MULTIPLIERS,
  STREAK_WINDOW: EARNINGS_STANDARD.LIMITS.STREAK_WINDOW_MINUTES * 60 * 1000, // Convert to milliseconds
  
  VALIDATION_REWARDS: {
    BASE_VALIDATION: EARNINGS_STANDARD.BASE_RATES.VALIDATION_VOTE,
    CORRECT_VALIDATION: EARNINGS_STANDARD.BASE_RATES.VALIDATION_VOTE, // Alias for compatibility
  },
  
  VOTES_TO_DECIDE: EARNINGS_STANDARD.VALIDATION.VOTES_TO_APPROVE,
  MAX_SINGLE_SUBMISSION: EARNINGS_STANDARD.LIMITS.MAX_SINGLE_SUBMISSION,
  MAX_DAILY_EARNINGS: EARNINGS_STANDARD.LIMITS.MAX_DAILY_EARNINGS,
};

// Legacy function wrapper for backward compatibility
export function calculateTrendEarnings(
  data: any,
  streakCount: number = 0,
  spotterTier: 'elite' | 'verified' | 'learning' | 'restricted' = 'learning'
): { baseAmount: number; finalAmount: number; appliedBonuses: string[]; tierMultiplier: number } {
  
  console.warn('calculateTrendEarnings is deprecated. Use calculateTrendSubmissionEarnings from EARNINGS_STANDARD instead.');
  
  // Map old data structure to new TrendSubmissionData interface
  const mappedData: TrendSubmissionData = {
    trendName: data.trendName || '',
    description: data.explanation || data.description || '',
    screenshot_url: data.screenshot || data.screenshot_url,
    ageRanges: data.ageRanges,
    subcultures: data.subcultures,
    otherPlatforms: data.otherPlatforms,
    creator_handle: data.creator_handle,
    hashtags: data.hashtags,
    post_caption: data.post_caption,
    views_count: data.views_count,
    likes_count: data.likes_count,
    comments_count: data.comments_count,
    wave_score: data.wave_score,
    category: data.category,
    platform: data.platform,
    tickers: data.tickers,
    isFinanceTrend: data.isFinanceTrend,
  };
  
  // Call the new standard function
  const result = calculateTrendSubmissionEarnings(
    mappedData,
    spotterTier as SpotterTier,
    streakCount
  );
  
  // Return in old format for compatibility
  return {
    baseAmount: result.baseAmount,
    finalAmount: result.finalAmount,
    appliedBonuses: result.appliedBonuses,
    tierMultiplier: result.tierMultiplier
  };
}

// Re-export other functions
export { getStreakMultiplier };

// Export types for compatibility
export type { SpotterTier, EarningType, EarningStatus };