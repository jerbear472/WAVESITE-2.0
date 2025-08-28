// Unified XP level definitions used across the app
export const XP_LEVELS = [
  { level: 1, title: 'Observer', emoji: '👁️', threshold: 0, color: 'text-gray-600', benefit: 'Begin your journey as a cultural observer' },
  { level: 2, title: 'Recorder', emoji: '📝', threshold: 100, color: 'text-blue-600', benefit: 'Document emerging cultural patterns' },
  { level: 3, title: 'Tracker', emoji: '🔍', threshold: 300, color: 'text-blue-700', benefit: 'Track trends across multiple platforms' },
  { level: 4, title: 'Spotter', emoji: '📍', threshold: 600, color: 'text-green-600', benefit: 'Spot trends before they peak' },
  { level: 5, title: 'Analyst', emoji: '📊', threshold: 1000, color: 'text-green-700', benefit: 'Analyze cultural movement patterns' },
  { level: 6, title: 'Interpreter', emoji: '🔬', threshold: 1500, color: 'text-purple-600', benefit: 'Interpret deeper cultural meanings' },
  { level: 7, title: 'Specialist', emoji: '🎯', threshold: 2100, color: 'text-purple-700', benefit: 'Specialize in trend prediction' },
  { level: 8, title: 'Expert', emoji: '🧠', threshold: 2800, color: 'text-orange-600', benefit: 'Expert in cultural wave mechanics' },
  { level: 9, title: 'Scholar', emoji: '📚', threshold: 3600, color: 'text-orange-700', benefit: 'Scholar of cultural anthropology' },
  { level: 10, title: 'Researcher', emoji: '🔬', threshold: 4500, color: 'text-red-600', benefit: 'Lead cultural research initiatives' },
  { level: 11, title: 'Authority', emoji: '👑', threshold: 5500, color: 'text-red-700', benefit: 'Recognized cultural authority' },
  { level: 12, title: 'Pioneer', emoji: '🚀', threshold: 6600, color: 'text-yellow-600', benefit: 'Pioneer new cultural territories' },
  { level: 13, title: 'Visionary', emoji: '✨', threshold: 8000, color: 'text-yellow-700', benefit: 'Visionary cultural insights' },
  { level: 14, title: 'Master', emoji: '🏆', threshold: 10000, color: 'text-amber-600', benefit: 'Master of cultural wave science' },
  { level: 15, title: 'Legend', emoji: '⭐', threshold: 12500, color: 'text-amber-700', benefit: 'Legendary cultural anthropologist' }
];

export function getLevelByNumber(levelNumber: number) {
  return XP_LEVELS.find(l => l.level === levelNumber) || XP_LEVELS[0];
}

export function getLevelByXP(xp: number) {
  // Find the highest level the user has reached based on XP
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].threshold) {
      return XP_LEVELS[i];
    }
  }
  return XP_LEVELS[0];
}

export function getLevelTitle(levelNumber: number): string {
  const level = getLevelByNumber(levelNumber);
  return level.title;
}

export function getNextLevel(currentLevel: number) {
  if (currentLevel >= 15) return null;
  return XP_LEVELS.find(l => l.level === currentLevel + 1);
}

export function calculateLevelProgress(totalXP: number, currentLevel: number) {
  const current = getLevelByNumber(currentLevel);
  const next = getNextLevel(currentLevel);
  
  if (!next) {
    return { progress: 100, xpToNext: 0 };
  }
  
  const currentThreshold = current.threshold;
  const nextThreshold = next.threshold;
  const xpInCurrentLevel = totalXP - currentThreshold;
  const xpNeededForLevel = nextThreshold - currentThreshold;
  const progress = (xpInCurrentLevel / xpNeededForLevel) * 100;
  
  return {
    progress: Math.min(Math.max(progress, 0), 100),
    xpToNext: Math.max(nextThreshold - totalXP, 0)
  };
}