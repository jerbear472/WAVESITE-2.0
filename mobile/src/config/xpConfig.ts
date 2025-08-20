/**
 * XP CONFIGURATION - Mobile App
 * Experience Points system replacing monetary earnings
 * 
 * Formula: base_xp × tier_multiplier × session_streak × daily_streak × quality_bonus
 * 
 * Two types of streaks:
 * 1. Session Streak: Rapid submissions within 5 minutes
 * 2. Daily Streak: Consecutive days with submissions
 */

export const XP_CONFIG = {
  // Base XP rates
  BASE_XP: {
    TREND_SUBMISSION: 25,      // Base XP per trend submission
    VALIDATION_VOTE: 5,         // XP per validation vote
    APPROVAL_BONUS: 50,         // Bonus when trend gets approved (2+ YES votes)
    PERFECT_VALIDATION: 15,     // Bonus for perfect validation accuracy
    DAILY_LOGIN: 10,           // Daily login bonus
    FIRST_TREND_OF_DAY: 20,    // Bonus for first trend of the day
  },

  // Tier multipliers (based on user level)
  TIER_MULTIPLIERS: {
    newcomer: 1.0,      // Levels 1-2
    scout: 1.2,         // Levels 3-4
    explorer: 1.5,      // Levels 5-6
    tracker: 1.8,       // Levels 7-8
    hunter: 2.0,        // Levels 9-10
    analyst: 2.5,       // Levels 11-12
    expert: 3.0,        // Levels 13+
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
    { minDays: 30, multiplier: 3.0, badge: '🔥' },  // 30+ days
    { minDays: 14, multiplier: 2.0, badge: '⚡' },  // 14-29 days
    { minDays: 7, multiplier: 1.5, badge: '✨' },   // 7-13 days
    { minDays: 3, multiplier: 1.2, badge: '⭐' },   // 3-6 days
    { minDays: 0, multiplier: 1.0, badge: '' },     // 0-2 days
  ],

  // Quality score multipliers
  QUALITY_MULTIPLIERS: {
    exceptional: 2.0,  // 95%+ validation accuracy
    high: 1.5,        // 80-94% accuracy
    medium: 1.0,      // 60-79% accuracy
    low: 0.5,         // Below 60% accuracy
  },

  // Level progression
  LEVELS: [
    { level: 1, requiredXP: 0, title: 'Newcomer', icon: '🌱' },
    { level: 2, requiredXP: 100, title: 'Scout', icon: '🔍' },
    { level: 3, requiredXP: 300, title: 'Explorer', icon: '🗺️' },
    { level: 4, requiredXP: 600, title: 'Tracker', icon: '🎯' },
    { level: 5, requiredXP: 1000, title: 'Hunter', icon: '🏹' },
    { level: 6, requiredXP: 1500, title: 'Analyst', icon: '📊' },
    { level: 7, requiredXP: 2200, title: 'Expert', icon: '💎' },
    { level: 8, requiredXP: 3000, title: 'Master', icon: '👑' },
    { level: 9, requiredXP: 4000, title: 'Guru', icon: '🧙' },
    { level: 10, requiredXP: 5200, title: 'Legend', icon: '⚔️' },
    { level: 11, requiredXP: 6600, title: 'Mythic', icon: '🌟' },
    { level: 12, requiredXP: 8200, title: 'Titan', icon: '⛰️' },
    { level: 13, requiredXP: 10000, title: 'Oracle', icon: '🔮' },
    { level: 14, requiredXP: 12000, title: 'Sage', icon: '📿' },
    { level: 15, requiredXP: 14500, title: 'Visionary', icon: '👁️' },
  ],

  // Achievements
  ACHIEVEMENTS: {
    // Submission achievements
    FIRST_TREND: { name: 'First Steps', xp: 50, icon: '🎯', description: 'Submit your first trend' },
    TREND_10: { name: 'Trend Spotter', xp: 100, icon: '👀', description: 'Submit 10 trends' },
    TREND_50: { name: 'Eagle Eye', xp: 250, icon: '🦅', description: 'Submit 50 trends' },
    TREND_100: { name: 'Trend Master', xp: 500, icon: '🏆', description: 'Submit 100 trends' },
    
    // Validation achievements
    VALIDATOR_10: { name: 'Quality Control', xp: 75, icon: '✅', description: 'Complete 10 validations' },
    VALIDATOR_100: { name: 'Gatekeeper', xp: 300, icon: '🛡️', description: 'Complete 100 validations' },
    PERFECT_WEEK: { name: 'Perfect Week', xp: 200, icon: '💯', description: '100% validation accuracy for a week' },
    
    // Streak achievements
    WEEK_WARRIOR: { name: 'Week Warrior', xp: 200, icon: '🗓️', description: '7-day submission streak' },
    FORTNIGHT_FIGHTER: { name: 'Fortnight Fighter', xp: 400, icon: '💪', description: '14-day submission streak' },
    MONTH_MASTER: { name: 'Month Master', xp: 1000, icon: '🏅', description: '30-day submission streak' },
    
    // Special achievements
    VIRAL_TREND: { name: 'Viral Sensation', xp: 500, icon: '🚀', description: 'Submit a trend that goes viral' },
    COMMUNITY_HELPER: { name: 'Community Helper', xp: 250, icon: '🤝', description: 'Help 50 community members' },
    EARLY_BIRD: { name: 'Early Bird', xp: 150, icon: '🌅', description: 'Submit 10 trends before 7 AM' },
    NIGHT_OWL: { name: 'Night Owl', xp: 150, icon: '🦉', description: 'Submit 10 trends after 10 PM' },
  },

  // System limits
  LIMITS: {
    MAX_DAILY_XP: 5000,
    MAX_SINGLE_SUBMISSION_XP: 300,
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
  const levels = [...XP_CONFIG.LEVELS].reverse();
  for (const level of levels) {
    if (totalXP >= level.requiredXP) {
      return level;
    }
  }
  return XP_CONFIG.LEVELS[0];
}

/**
 * Calculate XP to next level
 */
export function getXPToNextLevel(totalXP: number): { current: number; required: number; percentage: number } {
  const currentLevel = getLevelFromXP(totalXP);
  const nextLevel = XP_CONFIG.LEVELS.find(l => l.level === currentLevel.level + 1);
  
  if (!nextLevel) {
    return { current: 0, required: 0, percentage: 100 };
  }
  
  const xpInCurrentLevel = totalXP - currentLevel.requiredXP;
  const xpNeededForNext = nextLevel.requiredXP - currentLevel.requiredXP;
  const percentage = Math.round((xpInCurrentLevel / xpNeededForNext) * 100);
  
  return {
    current: xpInCurrentLevel,
    required: xpNeededForNext,
    percentage: Math.min(percentage, 100),
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
  for (const streak of XP_CONFIG.DAILY_STREAK_MULTIPLIERS) {
    if (streakDays >= streak.minDays) {
      return streak;
    }
  }
  return { multiplier: 1.0, badge: '' };
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
  const baseXP = XP_CONFIG.BASE_XP.TREND_SUBMISSION;
  const userTier = getTierFromLevel(userLevel);
  const tierMultiplier = XP_CONFIG.TIER_MULTIPLIERS[userTier];
  const sessionStreakMultiplier = getSessionStreakMultiplier(sessionPosition);
  const { multiplier: dailyStreakMultiplier, badge } = getDailyStreakMultiplier(dailyStreak);
  const qualityMultiplier = getQualityMultiplier(validationAccuracy);
  
  const finalXP = Math.round(
    baseXP * tierMultiplier * sessionStreakMultiplier * dailyStreakMultiplier * qualityMultiplier
  );
  
  let description = `${baseXP} XP base`;
  
  if (tierMultiplier > 1.0) {
    description += ` × ${tierMultiplier}x (${userTier})`;
  }
  
  if (sessionStreakMultiplier > 1.0) {
    description += ` × ${sessionStreakMultiplier}x (#${sessionPosition} rapid)`;
  }
  
  if (dailyStreakMultiplier > 1.0) {
    description += ` × ${dailyStreakMultiplier}x (${dailyStreak} days ${badge})`;
  }
  
  if (qualityMultiplier !== 1.0) {
    description += ` × ${qualityMultiplier}x (quality)`;
  }
  
  description += ` = ${finalXP} XP`;
  
  return {
    baseXP,
    tierMultiplier,
    sessionStreakMultiplier,
    dailyStreakMultiplier,
    qualityMultiplier,
    finalXP,
    description,
  };
}

/**
 * Calculate validation XP
 */
export function calculateValidationXP(userLevel: number = 1): number {
  const baseXP = XP_CONFIG.BASE_XP.VALIDATION_VOTE;
  const userTier = getTierFromLevel(userLevel);
  const tierMultiplier = XP_CONFIG.TIER_MULTIPLIERS[userTier];
  
  return Math.round(baseXP * tierMultiplier);
}

/**
 * Format XP for display
 */
export function formatXP(xp: number): string {
  if (xp >= 10000) {
    return `${(xp / 1000).toFixed(1)}k`;
  }
  return xp.toLocaleString();
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