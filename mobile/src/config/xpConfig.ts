/**
 * XP CONFIGURATION - Mobile App
 * 
 * This file re-exports the unified XP configuration to maintain compatibility
 * while ensuring consistency across all platforms.
 */

import { 
  UNIFIED_XP_CONFIG,
  getCurrentLevel as getLevel,
  getProgressToNextLevel as getProgress,
  calculateTrendSubmissionXP,
  calculateValidationXP,
  calculateScrollSessionXP,
  formatXP as format,
  checkAchievements,
  type Level,
  type Achievement,
  type UserXPProfile
} from '../../../shared/src/config/UNIFIED_XP_CONFIG';

// Re-export with legacy name for backward compatibility
export const XP_CONFIG = {
  // Base XP rates
  BASE_XP: {
    TREND_SUBMISSION: UNIFIED_XP_CONFIG.base.trendSubmission,
    VALIDATION_VOTE: UNIFIED_XP_CONFIG.base.validationVote,
    APPROVAL_BONUS: UNIFIED_XP_CONFIG.base.approvalBonus,
    PERFECT_VALIDATION: UNIFIED_XP_CONFIG.base.accurateValidation,
    DAILY_LOGIN: UNIFIED_XP_CONFIG.base.dailyLogin,
    FIRST_TREND_OF_DAY: UNIFIED_XP_CONFIG.base.firstTrendOfDay,
  },

  // Map unified tiers to mobile's naming convention
  TIER_MULTIPLIERS: {
    newcomer: 1.0,      // Levels 1-2
    scout: 1.2,         // Levels 3-4
    explorer: 1.5,      // Levels 5-6
    tracker: 1.8,       // Levels 7-8
    hunter: 2.0,        // Levels 9-10
    analyst: 2.5,       // Levels 11-12
    expert: 3.0,        // Levels 13+
  },

  // Use unified multipliers
  SESSION_STREAK_MULTIPLIERS: UNIFIED_XP_CONFIG.sessionStreakMultipliers,
  DAILY_STREAK_MULTIPLIERS: UNIFIED_XP_CONFIG.dailyStreakMultipliers,
  
  // Map unified quality multipliers
  QUALITY_MULTIPLIERS: {
    exceptional: UNIFIED_XP_CONFIG.qualityMultipliers.exceptional,
    high: UNIFIED_XP_CONFIG.qualityMultipliers.excellent,
    medium: UNIFIED_XP_CONFIG.qualityMultipliers.average,
    low: UNIFIED_XP_CONFIG.qualityMultipliers.low,
  },

  // Use unified levels
  LEVELS: UNIFIED_XP_CONFIG.levels.map(level => ({
    level: level.level,
    requiredXP: level.threshold,
    title: level.title,
    icon: level.emoji,
  })),

  // Map unified achievements to mobile format
  ACHIEVEMENTS: {
    // Submission achievements
    FIRST_TREND: { 
      name: 'First Steps', 
      xp: UNIFIED_XP_CONFIG.achievements.firstTrend, 
      icon: '🎯', 
      description: 'Submit your first trend' 
    },
    TREND_10: { 
      name: 'Trend Spotter', 
      xp: UNIFIED_XP_CONFIG.achievements.tenthTrend, 
      icon: '👀', 
      description: 'Submit 10 trends' 
    },
    TREND_50: { 
      name: 'Eagle Eye', 
      xp: UNIFIED_XP_CONFIG.achievements.fiftiethTrend, 
      icon: '🦅', 
      description: 'Submit 50 trends' 
    },
    TREND_100: { 
      name: 'Trend Master', 
      xp: UNIFIED_XP_CONFIG.achievements.hundredthTrend, 
      icon: '🏆', 
      description: 'Submit 100 trends' 
    },
    
    // Validation achievements
    VALIDATOR_10: { 
      name: 'Quality Control', 
      xp: 75, 
      icon: '✅', 
      description: 'Complete 10 validations' 
    },
    VALIDATOR_100: { 
      name: 'Gatekeeper', 
      xp: UNIFIED_XP_CONFIG.achievements.communityHelper, 
      icon: '🛡️', 
      description: 'Complete 100 validations' 
    },
    PERFECT_WEEK: { 
      name: 'Perfect Week', 
      xp: UNIFIED_XP_CONFIG.achievements.perfectWeek, 
      icon: '💯', 
      description: '7-day submission streak' 
    },
    
    // Streak achievements
    WEEK_WARRIOR: { 
      name: 'Week Warrior', 
      xp: UNIFIED_XP_CONFIG.achievements.perfectWeek, 
      icon: '🗓️', 
      description: '7-day submission streak' 
    },
    FORTNIGHT_FIGHTER: { 
      name: 'Fortnight Fighter', 
      xp: UNIFIED_XP_CONFIG.achievements.perfectFortnight, 
      icon: '💪', 
      description: '14-day submission streak' 
    },
    MONTH_MASTER: { 
      name: 'Month Master', 
      xp: UNIFIED_XP_CONFIG.achievements.perfectMonth, 
      icon: '🏅', 
      description: '30-day submission streak' 
    },
    
    // Special achievements
    VIRAL_TREND: { 
      name: 'Viral Sensation', 
      xp: UNIFIED_XP_CONFIG.achievements.viralSpotter, 
      icon: '🚀', 
      description: 'Submit a trend that goes viral' 
    },
    COMMUNITY_HELPER: { 
      name: 'Community Helper', 
      xp: UNIFIED_XP_CONFIG.achievements.communityHelper, 
      icon: '🤝', 
      description: 'Help 50 community members' 
    },
    EARLY_BIRD: { 
      name: 'Early Bird', 
      xp: UNIFIED_XP_CONFIG.achievements.earlyBird, 
      icon: '🌅', 
      description: 'Submit 10 trends before 7 AM' 
    },
    NIGHT_OWL: { 
      name: 'Night Owl', 
      xp: UNIFIED_XP_CONFIG.achievements.nightOwl, 
      icon: '🦉', 
      description: 'Submit 10 trends after 10 PM' 
    },
  },

  // System limits
  LIMITS: {
    MAX_DAILY_XP: UNIFIED_XP_CONFIG.dailyCaps.maxXP,
    MAX_SINGLE_SUBMISSION_XP: 500, // Calculated based on max multipliers
    MIN_XP_FOR_LEADERBOARD: 100,
  },
} as const;

// Type definitions
export type UserTier = keyof typeof XP_CONFIG.TIER_MULTIPLIERS;

export interface Level {
  level: number;
  requiredXP: number;
  title: string;
  icon: string;
}

export interface XPCalculation {
  baseXP: number;
  tierMultiplier: number;
  sessionStreakMultiplier: number;
  dailyStreakMultiplier: number;
  qualityMultiplier: number;
  finalXP: number;
  description: string;
}

export interface Achievement {
  name: string;
  xp: number;
  icon: string;
  description: string;
  unlocked?: boolean;
  unlockedAt?: Date;
}

/**
 * Get user's current level from total XP
 */
export function getLevelFromXP(totalXP: number): Level {
  const level = getLevel(totalXP);
  return {
    level: level.level,
    requiredXP: level.threshold,
    title: level.title,
    icon: level.emoji,
  };
}

/**
 * Calculate XP to next level
 */
export function getXPToNextLevel(totalXP: number): { current: number; required: number; percentage: number } {
  const progress = getProgress(totalXP);
  return {
    current: progress.xpInCurrentLevel,
    required: progress.xpNeededForNext,
    percentage: progress.progressPercentage,
  };
}

/**
 * Get user tier from level
 */
export function getTierFromLevel(level: number): UserTier {
  if (level >= 13) return 'expert';
  if (level >= 11) return 'analyst';
  if (level >= 9) return 'hunter';
  if (level >= 7) return 'tracker';
  if (level >= 5) return 'explorer';
  if (level >= 3) return 'scout';
  return 'newcomer';
}

/**
 * Get session streak multiplier
 */
export function getSessionStreakMultiplier(sessionPosition: number): number {
  if (sessionPosition >= 5) return 2.5;
  return XP_CONFIG.SESSION_STREAK_MULTIPLIERS[sessionPosition as keyof typeof XP_CONFIG.SESSION_STREAK_MULTIPLIERS] || 1.0;
}

/**
 * Get daily streak multiplier
 */
export function getDailyStreakMultiplier(streakDays: number): { multiplier: number; badge: string } {
  const streak = UNIFIED_XP_CONFIG.dailyStreakMultipliers.find(s => streakDays >= s.minDays);
  return streak ? { multiplier: streak.multiplier, badge: streak.badge } : { multiplier: 1.0, badge: '' };
}

/**
 * Get quality multiplier from validation accuracy
 */
export function getQualityMultiplier(accuracy: number): number {
  if (accuracy >= 95) return XP_CONFIG.QUALITY_MULTIPLIERS.exceptional;
  if (accuracy >= 80) return XP_CONFIG.QUALITY_MULTIPLIERS.high;
  if (accuracy >= 60) return XP_CONFIG.QUALITY_MULTIPLIERS.medium;
  return XP_CONFIG.QUALITY_MULTIPLIERS.low;
}

/**
 * Calculate XP for trend submission
 */
export function calculateTrendXP(
  userLevel: number = 1,
  sessionPosition: number = 1,
  dailyStreak: number = 0,
  validationAccuracy: number = 100
): XPCalculation {
  const qualityScore = validationAccuracy / 100;
  const result = calculateTrendSubmissionXP(
    qualityScore,
    userLevel,
    sessionPosition,
    dailyStreak,
    false
  );
  
  const userTier = getTierFromLevel(userLevel);
  const tierMultiplier = XP_CONFIG.TIER_MULTIPLIERS[userTier];
  
  return {
    baseXP: result.base,
    tierMultiplier,
    sessionStreakMultiplier: result.sessionMultiplier,
    dailyStreakMultiplier: result.dailyMultiplier,
    qualityMultiplier: result.qualityMultiplier,
    finalXP: result.total,
    description: result.breakdown.join(' '),
  };
}

/**
 * Calculate validation XP
 */
export function calculateValidationXP(userLevel: number = 1): number {
  return calculateValidationXP(true, userLevel).total;
}

/**
 * Format XP for display
 */
export function formatXP(xp: number): string {
  return format(xp);
}

/**
 * Get XP earning examples
 */
export function getXPExamples(): string[] {
  return [
    `Level 1, first trend: ${calculateTrendXP(1, 1, 0).finalXP} XP`,
    `Level 3, 3rd rapid + 7-day streak: ${calculateTrendXP(3, 3, 7).finalXP} XP`,
    `Level 5, 5th rapid + 7-day streak: ${calculateTrendXP(5, 5, 7).finalXP} XP`,
    `Level 8, 5th rapid + 30-day streak: ${calculateTrendXP(8, 5, 30).finalXP} XP`,
    `Level 10, perfect quality: ${calculateTrendXP(10, 1, 0, 100).finalXP} XP`,
    `Validation at Level 5: ${calculateValidationXP(5)} XP`,
  ];
}