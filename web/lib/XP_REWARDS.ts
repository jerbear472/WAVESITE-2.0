/**
 * XP REWARDS SYSTEM - GAMIFIED TREND SPOTTING
 * 
 * Users earn XP points instead of money for spotting and validating trends.
 * XP leads to level progression and unlocks new features and abilities.
 */

export const XP_REWARDS = {
  // Base XP rewards for actions
  base: {
    trendSubmission: 25,     // Base XP per trend submission (pending)
    validationVote: 5,       // XP per validation vote
    approvalBonus: 50,       // Bonus XP when trend gets approved (3+ YES votes)
    rejectionPenalty: -10,   // XP penalty when trend gets rejected
    accurateValidation: 10,  // Bonus XP for voting with majority
  },

  // 15-level cultural anthropologist progression system
  levels: [
    { level: 1, title: 'Observer', emoji: '👁️', threshold: 0, color: 'text-gray-600' },
    { level: 2, title: 'Recorder', emoji: '📝', threshold: 100, color: 'text-blue-600' },
    { level: 3, title: 'Tracker', emoji: '🔍', threshold: 300, color: 'text-blue-700' },
    { level: 4, title: 'Spotter', emoji: '📍', threshold: 600, color: 'text-green-600' },
    { level: 5, title: 'Analyst', emoji: '📊', threshold: 1000, color: 'text-green-700' },
    { level: 6, title: 'Interpreter', emoji: '🔬', threshold: 1500, color: 'text-purple-600' },
    { level: 7, title: 'Specialist', emoji: '🎯', threshold: 2100, color: 'text-purple-700' },
    { level: 8, title: 'Expert', emoji: '🧠', threshold: 2800, color: 'text-orange-600' },
    { level: 9, title: 'Scholar', emoji: '📚', threshold: 3600, color: 'text-orange-700' },
    { level: 10, title: 'Researcher', emoji: '🔬', threshold: 4500, color: 'text-red-600' },
    { level: 11, title: 'Authority', emoji: '👑', threshold: 5500, color: 'text-red-700' },
    { level: 12, title: 'Pioneer', emoji: '🚀', threshold: 6600, color: 'text-yellow-600' },
    { level: 13, title: 'Visionary', emoji: '✨', threshold: 8000, color: 'text-yellow-700' },
    { level: 14, title: 'Master', emoji: '🏆', threshold: 10000, color: 'text-amber-600' },
    { level: 15, title: 'Legend', emoji: '⭐', threshold: 12500, color: 'text-amber-700' }
  ],

  // Level-based multipliers (higher levels earn more XP)
  levelMultipliers: {
    1: 1.0,    // Observer
    2: 1.1,    // Recorder
    3: 1.2,    // Tracker
    4: 1.3,    // Spotter
    5: 1.4,    // Analyst
    6: 1.5,    // Interpreter
    7: 1.6,    // Specialist
    8: 1.7,    // Expert
    9: 1.8,    // Scholar
    10: 2.0,   // Researcher
    11: 2.2,   // Authority
    12: 2.4,   // Pioneer
    13: 2.6,   // Visionary
    14: 2.8,   // Master
    15: 3.0,   // Legend
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
    { minDays: 30, multiplier: 3.0 },  // 30+ days: 3x
    { minDays: 14, multiplier: 2.5 },  // 14-29 days: 2.5x
    { minDays: 7, multiplier: 2.0 },   // 7-13 days: 2x
    { minDays: 3, multiplier: 1.5 },   // 3-6 days: 1.5x
    { minDays: 1, multiplier: 1.2 },   // 1-2 days: 1.2x
    { minDays: 0, multiplier: 1.0 },   // 0 days: 1x (no streak)
  ],

  // Quality bonuses (based on trend quality)
  qualityBonuses: {
    excellent: 50,  // 90%+ quality score
    good: 30,       // 70-89% quality score
    average: 10,    // 50-69% quality score
    poor: 0,        // <50% quality score
  },

  // Achievement XP rewards
  achievements: {
    firstTrend: 100,           // First trend submitted
    tenthTrend: 250,          // 10th trend submitted
    hundredthTrend: 1000,     // 100th trend submitted
    firstValidation: 50,       // First validation vote
    perfectWeek: 500,          // 7-day streak achieved
    perfectMonth: 2000,        // 30-day streak achieved
    viralSpotter: 500,         // Spotted a trend that went viral
    trendExpert: 1000,         // 90%+ approval rate over 50 trends
    speedDemon: 300,           // Submit 5 trends in 5 minutes
    nightOwl: 200,            // Submit trends between 12am-5am
    earlyBird: 200,           // Submit trends between 5am-8am
  },

  // Daily caps to prevent abuse
  dailyCaps: {
    maxSubmissions: 100,       // Max trends per day
    maxValidations: 200,       // Max validation votes per day
    maxXP: 5000,              // Max XP earnable per day
  },

  // Validation settings
  validation: {
    votesToApprove: 3,
    votesToReject: 3,
    maxVotingHours: 72,
    selfVoteAllowed: true,
  },

  // Special event multipliers (can be activated for limited time)
  events: {
    doubleXP: 2.0,            // Double XP weekends
    tripleXP: 3.0,            // Special holidays
    newUserBonus: 1.5,        // First week bonus for new users
  },
} as const;

// Type definitions
export type Level = typeof XP_REWARDS.levels[number];
export type Achievement = keyof typeof XP_REWARDS.achievements;

export interface UserXPProfile {
  user_id: string;
  total_xp: number;
  current_level: number;
  level_title: string;
  trends_submitted: number;
  trends_validated: number;
  validation_accuracy: number;
  current_streak: number;      // Daily streak
  session_streak: number;       // Current session position
  last_submission_at?: string;
  achievements: Achievement[];
}

/**
 * Get current level based on XP
 */
export function getCurrentLevel(totalXP: number): Level {
  return XP_REWARDS.levels
    .slice()
    .reverse()
    .find(level => totalXP >= level.threshold) || XP_REWARDS.levels[0];
}

/**
 * Get XP progress to next level
 */
export function getProgressToNextLevel(totalXP: number): {
  currentLevel: Level;
  nextLevel: Level | null;
  xpInCurrentLevel: number;
  xpNeededForNext: number;
  progressPercentage: number;
} {
  const currentLevel = getCurrentLevel(totalXP);
  const currentIndex = XP_REWARDS.levels.findIndex(l => l.level === currentLevel.level);
  const nextLevel = currentIndex < XP_REWARDS.levels.length - 1 
    ? XP_REWARDS.levels[currentIndex + 1] 
    : null;

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      xpInCurrentLevel: totalXP - currentLevel.threshold,
      xpNeededForNext: 0,
      progressPercentage: 100,
    };
  }

  const xpInCurrentLevel = totalXP - currentLevel.threshold;
  const xpNeededForNext = nextLevel.threshold - currentLevel.threshold;
  const progressPercentage = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNext) * 100));

  return {
    currentLevel,
    nextLevel,
    xpInCurrentLevel,
    xpNeededForNext,
    progressPercentage,
  };
}

/**
 * Get session streak multiplier
 */
export function getSessionStreakMultiplier(position: number): number {
  if (position >= 5) return 2.5;
  const multiplier = XP_REWARDS.sessionStreakMultipliers[position as keyof typeof XP_REWARDS.sessionStreakMultipliers];
  return multiplier || 1.0;
}

/**
 * Get daily streak multiplier
 */
export function getDailyStreakMultiplier(days: number): number {
  for (const streak of XP_REWARDS.dailyStreakMultipliers) {
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
 * Calculate XP for a trend submission
 */
export function calculateTrendXP(
  qualityScore: number,
  userLevel: number,
  sessionPosition: number,
  dailyStreak: number
): {
  base: number;
  qualityBonus: number;
  levelMultiplier: number;
  sessionMultiplier: number;
  dailyMultiplier: number;
  total: number;
  breakdown: string[];
} {
  const breakdown: string[] = [];
  
  // Base XP
  const base = XP_REWARDS.base.trendSubmission;
  breakdown.push(`Base submission: ${base} XP`);
  
  // Quality bonus
  let qualityBonus = 0;
  if (qualityScore >= 0.9) {
    qualityBonus = XP_REWARDS.qualityBonuses.excellent;
    breakdown.push(`Excellent quality: +${qualityBonus} XP`);
  } else if (qualityScore >= 0.7) {
    qualityBonus = XP_REWARDS.qualityBonuses.good;
    breakdown.push(`Good quality: +${qualityBonus} XP`);
  } else if (qualityScore >= 0.5) {
    qualityBonus = XP_REWARDS.qualityBonuses.average;
    breakdown.push(`Average quality: +${qualityBonus} XP`);
  }
  
  // Level multiplier
  const levelMultiplier = XP_REWARDS.levelMultipliers[userLevel as keyof typeof XP_REWARDS.levelMultipliers] || 1.0;
  if (levelMultiplier > 1.0) {
    breakdown.push(`Level ${userLevel} bonus: ${levelMultiplier}x`);
  }
  
  // Session streak multiplier
  const sessionMultiplier = getSessionStreakMultiplier(sessionPosition);
  if (sessionMultiplier > 1.0) {
    breakdown.push(`Session #${sessionPosition}: ${sessionMultiplier}x`);
  }
  
  // Daily streak multiplier
  const dailyMultiplier = getDailyStreakMultiplier(dailyStreak);
  if (dailyMultiplier > 1.0) {
    breakdown.push(`${dailyStreak}-day streak: ${dailyMultiplier}x`);
  }
  
  // Calculate total
  const total = Math.round((base + qualityBonus) * levelMultiplier * sessionMultiplier * dailyMultiplier);
  
  return {
    base,
    qualityBonus,
    levelMultiplier,
    sessionMultiplier,
    dailyMultiplier,
    total,
    breakdown,
  };
}

/**
 * Calculate validation XP
 */
export function calculateValidationXP(
  isAccurate: boolean,
  userLevel: number
): number {
  const base = XP_REWARDS.base.validationVote;
  const accuracyBonus = isAccurate ? XP_REWARDS.base.accurateValidation : 0;
  const levelMultiplier = XP_REWARDS.levelMultipliers[userLevel as keyof typeof XP_REWARDS.levelMultipliers] || 1.0;
  
  return Math.round((base + accuracyBonus) * levelMultiplier);
}

/**
 * Format XP for display
 */
export function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`;
  }
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`;
  }
  return xp.toString();
}

/**
 * Check if user has earned an achievement
 */
export function checkAchievements(
  profile: UserXPProfile,
  action: string
): Achievement[] {
  const newAchievements: Achievement[] = [];
  
  // Check various achievement conditions
  if (profile.trends_submitted === 1 && !profile.achievements.includes('firstTrend')) {
    newAchievements.push('firstTrend');
  }
  if (profile.trends_submitted === 10 && !profile.achievements.includes('tenthTrend')) {
    newAchievements.push('tenthTrend');
  }
  if (profile.trends_submitted === 100 && !profile.achievements.includes('hundredthTrend')) {
    newAchievements.push('hundredthTrend');
  }
  if (profile.current_streak === 7 && !profile.achievements.includes('perfectWeek')) {
    newAchievements.push('perfectWeek');
  }
  if (profile.current_streak === 30 && !profile.achievements.includes('perfectMonth')) {
    newAchievements.push('perfectMonth');
  }
  
  return newAchievements;
}

// Export as default for compatibility
export default XP_REWARDS;