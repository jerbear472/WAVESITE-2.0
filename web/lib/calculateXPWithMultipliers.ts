import { XP_REWARDS } from './XP_REWARDS';
import { getCurrentLevel } from './XP_REWARDS';

interface XPCalculationData {
  baseAmount: number;
  userId?: string;
  totalXP?: number;
  currentLevel?: number;
  dailyStreak?: number;
  sessionStreak?: number;
  isWithinSessionWindow?: boolean;
}

export interface XPCalculationResult {
  baseXP: number;
  levelMultiplier: number;
  dailyStreakMultiplier: number;
  sessionStreakMultiplier: number;
  totalMultiplier: number;
  finalXP: number;
  breakdown: string[];
}

/**
 * Calculate XP with all multipliers applied
 * Formula: baseXP × levelMultiplier × dailyStreakMultiplier × sessionStreakMultiplier
 */
export function calculateXPWithMultipliers(data: XPCalculationData): XPCalculationResult {
  const breakdown: string[] = [];
  
  // Base XP
  const baseXP = data.baseAmount;
  breakdown.push(`Base XP: ${baseXP}`);
  
  // Level multiplier (based on current level)
  let levelMultiplier = 1.0;
  if (data.currentLevel !== undefined) {
    levelMultiplier = XP_REWARDS.levelMultipliers[data.currentLevel as keyof typeof XP_REWARDS.levelMultipliers] || 1.0;
    if (levelMultiplier > 1.0) {
      const levelInfo = XP_REWARDS.levels.find(l => l.level === data.currentLevel);
      breakdown.push(`Level ${data.currentLevel} (${levelInfo?.title}): ${levelMultiplier}x`);
    }
  } else if (data.totalXP !== undefined) {
    const levelData = getCurrentLevel(data.totalXP);
    const level = levelData.level;
    levelMultiplier = XP_REWARDS.levelMultipliers[level as keyof typeof XP_REWARDS.levelMultipliers] || 1.0;
    if (levelMultiplier > 1.0) {
      breakdown.push(`Level ${level} (${levelData.title}): ${levelMultiplier}x`);
    }
  }
  
  // Daily streak multiplier
  let dailyStreakMultiplier = 1.0;
  if (data.dailyStreak !== undefined && data.dailyStreak > 0) {
    for (const streak of XP_REWARDS.dailyStreakMultipliers) {
      if (data.dailyStreak >= streak.minDays) {
        dailyStreakMultiplier = streak.multiplier;
        break;
      }
    }
    if (dailyStreakMultiplier > 1.0) {
      breakdown.push(`${data.dailyStreak}-day streak: ${dailyStreakMultiplier}x`);
    }
  }
  
  // Session streak multiplier (rapid submissions)
  let sessionStreakMultiplier = 1.0;
  if (data.sessionStreak !== undefined && data.isWithinSessionWindow) {
    const position = Math.min(data.sessionStreak + 1, 5); // Cap at 5
    sessionStreakMultiplier = XP_REWARDS.sessionStreakMultipliers[position as keyof typeof XP_REWARDS.sessionStreakMultipliers] || 1.0;
    if (sessionStreakMultiplier > 1.0) {
      breakdown.push(`Session streak #${position}: ${sessionStreakMultiplier}x`);
    }
  }
  
  // Calculate total multiplier
  const totalMultiplier = levelMultiplier * dailyStreakMultiplier * sessionStreakMultiplier;
  
  // Calculate final XP
  const finalXP = Math.round(baseXP * totalMultiplier);
  
  if (totalMultiplier > 1.0) {
    breakdown.push(`Total multiplier: ${totalMultiplier.toFixed(1)}x`);
    breakdown.push(`Final XP: ${finalXP}`);
  }
  
  return {
    baseXP,
    levelMultiplier,
    dailyStreakMultiplier,
    sessionStreakMultiplier,
    totalMultiplier,
    finalXP,
    breakdown
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
 * Get level multiplier
 */
export function getLevelMultiplier(level: number): number {
  return XP_REWARDS.levelMultipliers[level as keyof typeof XP_REWARDS.levelMultipliers] || 1.0;
}

/**
 * Check if submission is within session window (5 minutes)
 */
export function isWithinSessionWindow(lastSubmissionTime?: Date | string | null): boolean {
  if (!lastSubmissionTime) return false;
  
  const lastTime = typeof lastSubmissionTime === 'string' 
    ? new Date(lastSubmissionTime) 
    : lastSubmissionTime;
  
  const timeDiff = Date.now() - lastTime.getTime();
  const FIVE_MINUTES = 5 * 60 * 1000;
  
  return timeDiff <= FIVE_MINUTES;
}