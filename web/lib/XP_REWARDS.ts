/**
 * XP REWARDS SYSTEM - GAMIFIED TREND SPOTTING
 * 
 * This file re-exports the unified XP configuration to maintain compatibility
 * while ensuring consistency across all platforms.
 */

import { UNIFIED_XP_CONFIG } from '@/../../shared/src/config/UNIFIED_XP_CONFIG';

// Re-export with legacy name for backward compatibility
export const XP_REWARDS = {
  // Base XP rewards for actions
  base: {
    trendSubmission: UNIFIED_XP_CONFIG.base.trendSubmission,
    validationVote: UNIFIED_XP_CONFIG.base.validationVote,
    approvalBonus: UNIFIED_XP_CONFIG.base.approvalBonus,
    rejectionPenalty: UNIFIED_XP_CONFIG.base.rejectionPenalty,
    accurateValidation: UNIFIED_XP_CONFIG.base.accurateValidation,
  },

  // Re-export unified configuration
  levels: UNIFIED_XP_CONFIG.levels,
  levelMultipliers: UNIFIED_XP_CONFIG.levelMultipliers,
  sessionStreakMultipliers: UNIFIED_XP_CONFIG.sessionStreakMultipliers,
  dailyStreakMultipliers: UNIFIED_XP_CONFIG.dailyStreakMultipliers,
  qualityBonuses: UNIFIED_XP_CONFIG.qualityBonuses,

  achievements: UNIFIED_XP_CONFIG.achievements,
  dailyCaps: UNIFIED_XP_CONFIG.dailyCaps,
  validation: UNIFIED_XP_CONFIG.validation,
  events: UNIFIED_XP_CONFIG.events,
} as const;

// Re-export types and functions from unified config
export type { Level, Achievement, UserXPProfile } from '@/../../shared/src/config/UNIFIED_XP_CONFIG';
export { 
  getCurrentLevel,
  getProgressToNextLevel,
  getQualityTier,
  calculateTrendSubmissionXP,
  calculateValidationXP,
  calculateScrollSessionXP,
  isWithinSessionWindow,
  formatXP,
  checkAchievements,
  applyXPDecay
} from '@/../../shared/src/config/UNIFIED_XP_CONFIG';

// Legacy function exports for backward compatibility
// These are wrappers around the unified functions
export function getSessionStreakMultiplier(position: number): number {
  if (position >= 5) return 2.5;
  const multiplier = XP_REWARDS.sessionStreakMultipliers[position as keyof typeof XP_REWARDS.sessionStreakMultipliers];
  return multiplier || 1.0;
}

export function getDailyStreakMultiplier(days: number): number {
  for (const streak of XP_REWARDS.dailyStreakMultipliers) {
    if (days >= streak.minDays) {
      return streak.multiplier;
    }
  }
  return 1.0;
}

// Legacy calculateTrendXP function for backward compatibility
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
  // Use the unified function but adapt the return value
  const result = calculateTrendSubmissionXP(qualityScore, userLevel, sessionPosition, dailyStreak, false);
  return {
    base: result.base,
    qualityBonus: result.qualityBonus,
    levelMultiplier: result.levelMultiplier,
    sessionMultiplier: result.sessionMultiplier,
    dailyMultiplier: result.dailyMultiplier,
    total: result.total,
    breakdown: result.breakdown,
  };
}

// Export as default for compatibility
export default XP_REWARDS;