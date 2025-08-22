/**
 * UNIFIED XP REWARDS SYSTEM - Single Source of Truth
 * 
 * This configuration ensures consistency across web, mobile, and backend
 * for all XP calculations, multipliers, and rewards.
 * 
 * Formula: base_xp × level_multiplier × session_streak × daily_streak × quality_bonus
 */

export const UNIFIED_XP_CONFIG = {
  // Base XP rewards for actions (same across all platforms)
  base: {
    // Core Actions
    trendSubmission: 25,        // Base XP per trend submission
    validationVote: 5,          // XP per validation vote
    approvalBonus: 50,          // Bonus when trend gets approved (3+ YES votes)
    rejectionPenalty: -10,      // XP penalty when trend gets rejected
    accurateValidation: 15,     // Bonus XP for voting with majority
    
    // Engagement Actions
    dailyLogin: 10,             // Daily login bonus
    firstTrendOfDay: 20,        // Bonus for first trend of the day
    scrollPerMinute: 2,         // XP per minute of active scrolling
    
    // Social Actions
    trendShared: 5,             // When user shares a trend
    trendViralBonus: 100,       // When user's trend goes viral
    helpfulVote: 3,             // When user's validation is marked helpful
  },

  // 15-level progression system with cultural anthropologist theme
  levels: [
    { level: 1, title: 'Observer', emoji: '👁️', threshold: 0, color: 'text-gray-600' },
    { level: 2, title: 'Recorder', emoji: '📝', threshold: 100, color: 'text-blue-600' },
    { level: 3, title: 'Tracker', emoji: '🔍', threshold: 300, color: 'text-blue-700' },
    { level: 4, title: 'Spotter', emoji: '📍', threshold: 600, color: 'text-green-600' },
    { level: 5, title: 'Analyst', emoji: '📊', threshold: 1000, color: 'text-green-700' },
    { level: 6, title: 'Interpreter', emoji: '🔬', threshold: 1500, color: 'text-purple-600' },
    { level: 7, title: 'Specialist', emoji: '🎯', threshold: 2200, color: 'text-purple-700' },
    { level: 8, title: 'Expert', emoji: '🧠', threshold: 3000, color: 'text-orange-600' },
    { level: 9, title: 'Scholar', emoji: '📚', threshold: 4000, color: 'text-orange-700' },
    { level: 10, title: 'Researcher', emoji: '🔬', threshold: 5200, color: 'text-red-600' },
    { level: 11, title: 'Authority', emoji: '👑', threshold: 6600, color: 'text-red-700' },
    { level: 12, title: 'Pioneer', emoji: '🚀', threshold: 8200, color: 'text-yellow-600' },
    { level: 13, title: 'Visionary', emoji: '✨', threshold: 10000, color: 'text-yellow-700' },
    { level: 14, title: 'Master', emoji: '🏆', threshold: 12500, color: 'text-amber-600' },
    { level: 15, title: 'Legend', emoji: '⭐', threshold: 15000, color: 'text-amber-700' }
  ],

  // Level-based multipliers (consistent progression)
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

  // Daily streak multipliers (consecutive days with activity)
  dailyStreakMultipliers: [
    { minDays: 30, multiplier: 3.0, badge: '🔥', name: 'Legendary Streak' },
    { minDays: 14, multiplier: 2.5, badge: '⚡', name: 'Epic Streak' },
    { minDays: 7, multiplier: 2.0, badge: '✨', name: 'Weekly Warrior' },
    { minDays: 3, multiplier: 1.5, badge: '⭐', name: 'Consistent' },
    { minDays: 1, multiplier: 1.2, badge: '🌟', name: 'Active' },
    { minDays: 0, multiplier: 1.0, badge: '', name: 'Starting' },
  ],

  // Quality score multipliers (based on trend quality/validation accuracy)
  qualityMultipliers: {
    exceptional: 2.0,  // 95%+ quality score
    excellent: 1.75,   // 90-94% quality score
    good: 1.5,        // 80-89% quality score
    average: 1.25,    // 70-79% quality score
    fair: 1.0,        // 60-69% quality score
    poor: 0.75,       // 50-59% quality score
    low: 0.5,         // Below 50% quality score
  },

  // Quality bonuses (flat XP additions based on quality)
  qualityBonuses: {
    exceptional: 50,  // 95%+ quality score
    excellent: 40,    // 90-94% quality score
    good: 30,        // 80-89% quality score
    average: 20,     // 70-79% quality score
    fair: 10,        // 60-69% quality score
    poor: 5,         // 50-59% quality score
    low: 0,          // Below 50% quality score
  },

  // Achievement XP rewards
  achievements: {
    // Submission achievements
    firstTrend: 100,           // First trend submitted
    tenthTrend: 250,          // 10th trend submitted
    fiftiethTrend: 500,       // 50th trend submitted
    hundredthTrend: 1000,     // 100th trend submitted
    
    // Validation achievements
    firstValidation: 50,       // First validation vote
    validationStreak10: 150,   // 10 accurate validations in a row
    validationMaster: 500,     // 100 validations with 90%+ accuracy
    
    // Streak achievements
    perfectWeek: 500,          // 7-day streak achieved
    perfectFortnight: 1000,    // 14-day streak achieved
    perfectMonth: 2000,        // 30-day streak achieved
    
    // Special achievements
    viralSpotter: 500,         // Spotted a trend that went viral
    trendExpert: 1000,         // 90%+ approval rate over 50 trends
    speedDemon: 300,           // Submit 5 trends in 5 minutes
    nightOwl: 200,            // Submit trends between 12am-5am
    earlyBird: 200,           // Submit trends between 5am-8am
    communityHelper: 250,      // Help validate 100 trends
    qualityGuru: 750,         // Maintain 95%+ quality for 30 days
  },

  // Daily caps to prevent abuse
  dailyCaps: {
    maxSubmissions: 100,       // Max trends per day
    maxValidations: 200,       // Max validation votes per day
    maxXP: 5000,              // Max XP earnable per day
    maxScrollMinutes: 300,     // Max scroll session minutes counted per day
  },

  // Validation settings
  validation: {
    votesToApprove: 3,         // Minimum YES votes to approve
    votesToReject: 3,          // Minimum NO votes to reject
    maxVotingHours: 72,        // Hours before auto-resolution
    selfVoteAllowed: false,    // Can't vote on own trends
    minQualityForApproval: 50, // Minimum quality score for approval
  },

  // Special event multipliers (can be activated by admins)
  events: {
    doubleXP: 2.0,            // Double XP weekends
    tripleXP: 3.0,            // Special holidays
    newUserBonus: 1.5,        // First week bonus for new users
    communityGoal: 1.25,      // When community reaches goals
  },

  // Time windows
  timeWindows: {
    sessionWindowMinutes: 5,   // Minutes for session streak
    dailyResetHour: 0,        // Hour when daily caps reset (UTC)
    weeklyResetDay: 1,        // Day when weekly goals reset (Monday)
  },

  // XP decay (to encourage consistent activity)
  decay: {
    enabled: true,
    inactiveDays: 7,          // Days before decay starts
    decayRate: 0.01,          // 1% per day after inactive period
    maxDecay: 0.3,            // Maximum 30% decay
  },
} as const;

// Type definitions
export type Level = typeof UNIFIED_XP_CONFIG.levels[number];
export type Achievement = keyof typeof UNIFIED_XP_CONFIG.achievements;
export type QualityTier = keyof typeof UNIFIED_XP_CONFIG.qualityMultipliers;

export interface UserXPProfile {
  user_id: string;
  total_xp: number;
  current_level: number;
  level_title: string;
  level_emoji: string;
  trends_submitted: number;
  trends_validated: number;
  validation_accuracy: number;
  quality_average: number;
  current_streak: number;      // Daily streak
  longest_streak: number;       // Best streak ever
  session_streak: number;       // Current session position
  last_submission_at?: string;
  last_login_at?: string;
  achievements: Achievement[];
  xp_today: number;             // XP earned today
  submissions_today: number;    // Submissions today
  validations_today: number;    // Validations today
}

/**
 * Get current level based on XP
 */
export function getCurrentLevel(totalXP: number): Level {
  return UNIFIED_XP_CONFIG.levels
    .slice()
    .reverse()
    .find(level => totalXP >= level.threshold) || UNIFIED_XP_CONFIG.levels[0];
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
  const currentIndex = UNIFIED_XP_CONFIG.levels.findIndex(l => l.level === currentLevel.level);
  const nextLevel = currentIndex < UNIFIED_XP_CONFIG.levels.length - 1 
    ? UNIFIED_XP_CONFIG.levels[currentIndex + 1] 
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
 * Get quality tier from score
 */
export function getQualityTier(qualityScore: number): QualityTier {
  if (qualityScore >= 0.95) return 'exceptional';
  if (qualityScore >= 0.90) return 'excellent';
  if (qualityScore >= 0.80) return 'good';
  if (qualityScore >= 0.70) return 'average';
  if (qualityScore >= 0.60) return 'fair';
  if (qualityScore >= 0.50) return 'poor';
  return 'low';
}

/**
 * Calculate XP for a trend submission
 */
export function calculateTrendSubmissionXP(
  qualityScore: number,
  userLevel: number,
  sessionPosition: number,
  dailyStreak: number,
  isFirstOfDay: boolean = false
): {
  base: number;
  qualityBonus: number;
  firstOfDayBonus: number;
  levelMultiplier: number;
  sessionMultiplier: number;
  dailyMultiplier: number;
  qualityMultiplier: number;
  total: number;
  breakdown: string[];
} {
  const breakdown: string[] = [];
  
  // Base XP
  const base = UNIFIED_XP_CONFIG.base.trendSubmission;
  breakdown.push(`Base submission: ${base} XP`);
  
  // First of day bonus
  const firstOfDayBonus = isFirstOfDay ? UNIFIED_XP_CONFIG.base.firstTrendOfDay : 0;
  if (firstOfDayBonus > 0) {
    breakdown.push(`First trend of day: +${firstOfDayBonus} XP`);
  }
  
  // Quality bonus (flat addition)
  const qualityTier = getQualityTier(qualityScore);
  const qualityBonus = UNIFIED_XP_CONFIG.qualityBonuses[qualityTier];
  if (qualityBonus > 0) {
    breakdown.push(`${qualityTier} quality: +${qualityBonus} XP`);
  }
  
  // Calculate multipliers
  const levelMultiplier = UNIFIED_XP_CONFIG.levelMultipliers[userLevel as keyof typeof UNIFIED_XP_CONFIG.levelMultipliers] || 1.0;
  if (levelMultiplier > 1.0) {
    breakdown.push(`Level ${userLevel}: ${levelMultiplier}x`);
  }
  
  const sessionMultiplier = sessionPosition >= 5 ? 2.5 : 
    UNIFIED_XP_CONFIG.sessionStreakMultipliers[sessionPosition as keyof typeof UNIFIED_XP_CONFIG.sessionStreakMultipliers] || 1.0;
  if (sessionMultiplier > 1.0) {
    breakdown.push(`Session #${sessionPosition}: ${sessionMultiplier}x`);
  }
  
  const dailyStreakConfig = UNIFIED_XP_CONFIG.dailyStreakMultipliers.find(s => dailyStreak >= s.minDays);
  const dailyMultiplier = dailyStreakConfig?.multiplier || 1.0;
  if (dailyMultiplier > 1.0) {
    breakdown.push(`${dailyStreak}-day streak ${dailyStreakConfig?.badge}: ${dailyMultiplier}x`);
  }
  
  const qualityMultiplier = UNIFIED_XP_CONFIG.qualityMultipliers[qualityTier];
  if (qualityMultiplier !== 1.0) {
    breakdown.push(`Quality multiplier: ${qualityMultiplier}x`);
  }
  
  // Calculate total with multipliers applied to base + bonuses
  const baseTotal = base + qualityBonus + firstOfDayBonus;
  const total = Math.round(baseTotal * levelMultiplier * sessionMultiplier * dailyMultiplier * qualityMultiplier);
  
  breakdown.push(`Total: ${total} XP`);
  
  return {
    base,
    qualityBonus,
    firstOfDayBonus,
    levelMultiplier,
    sessionMultiplier,
    dailyMultiplier,
    qualityMultiplier,
    total,
    breakdown,
  };
}

/**
 * Calculate validation XP
 */
export function calculateValidationXP(
  isAccurate: boolean,
  userLevel: number,
  validationStreak: number = 0
): {
  base: number;
  accuracyBonus: number;
  levelMultiplier: number;
  streakBonus: number;
  total: number;
} {
  const base = UNIFIED_XP_CONFIG.base.validationVote;
  const accuracyBonus = isAccurate ? UNIFIED_XP_CONFIG.base.accurateValidation : 0;
  const levelMultiplier = UNIFIED_XP_CONFIG.levelMultipliers[userLevel as keyof typeof UNIFIED_XP_CONFIG.levelMultipliers] || 1.0;
  
  // Streak bonus for consecutive accurate validations
  const streakBonus = Math.min(validationStreak * 2, 20); // 2 XP per streak, max 20
  
  const total = Math.round((base + accuracyBonus + streakBonus) * levelMultiplier);
  
  return {
    base,
    accuracyBonus,
    levelMultiplier,
    streakBonus,
    total,
  };
}

/**
 * Calculate scroll session XP
 */
export function calculateScrollSessionXP(
  minutes: number,
  trendsLogged: number,
  userLevel: number
): number {
  const scrollXP = minutes * UNIFIED_XP_CONFIG.base.scrollPerMinute;
  const trendXP = trendsLogged * UNIFIED_XP_CONFIG.base.trendSubmission;
  const levelMultiplier = UNIFIED_XP_CONFIG.levelMultipliers[userLevel as keyof typeof UNIFIED_XP_CONFIG.levelMultipliers] || 1.0;
  
  return Math.round((scrollXP + trendXP) * levelMultiplier);
}

/**
 * Check if submission is within session window
 */
export function isWithinSessionWindow(lastSubmissionAt?: string): boolean {
  if (!lastSubmissionAt) return false;
  
  const lastSubmission = new Date(lastSubmissionAt);
  const now = new Date();
  const minutesSinceLast = (now.getTime() - lastSubmission.getTime()) / (1000 * 60);
  
  return minutesSinceLast <= UNIFIED_XP_CONFIG.timeWindows.sessionWindowMinutes;
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
  if (profile.trends_submitted === 50 && !profile.achievements.includes('fiftiethTrend')) {
    newAchievements.push('fiftiethTrend');
  }
  if (profile.trends_submitted === 100 && !profile.achievements.includes('hundredthTrend')) {
    newAchievements.push('hundredthTrend');
  }
  if (profile.current_streak === 7 && !profile.achievements.includes('perfectWeek')) {
    newAchievements.push('perfectWeek');
  }
  if (profile.current_streak === 14 && !profile.achievements.includes('perfectFortnight')) {
    newAchievements.push('perfectFortnight');
  }
  if (profile.current_streak === 30 && !profile.achievements.includes('perfectMonth')) {
    newAchievements.push('perfectMonth');
  }
  
  return newAchievements;
}

/**
 * Apply XP decay for inactive users
 */
export function applyXPDecay(
  totalXP: number,
  lastActiveDate: string
): {
  decayedXP: number;
  decayAmount: number;
  daysInactive: number;
} {
  if (!UNIFIED_XP_CONFIG.decay.enabled) {
    return { decayedXP: totalXP, decayAmount: 0, daysInactive: 0 };
  }
  
  const lastActive = new Date(lastActiveDate);
  const now = new Date();
  const daysInactive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysInactive < UNIFIED_XP_CONFIG.decay.inactiveDays) {
    return { decayedXP: totalXP, decayAmount: 0, daysInactive };
  }
  
  const decayDays = daysInactive - UNIFIED_XP_CONFIG.decay.inactiveDays;
  const decayPercentage = Math.min(decayDays * UNIFIED_XP_CONFIG.decay.decayRate, UNIFIED_XP_CONFIG.decay.maxDecay);
  const decayAmount = Math.round(totalXP * decayPercentage);
  const decayedXP = Math.max(0, totalXP - decayAmount);
  
  return { decayedXP, decayAmount, daysInactive };
}

// Export as default for compatibility
export default UNIFIED_XP_CONFIG;