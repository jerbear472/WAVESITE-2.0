'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface XPData {
  totalXP: number;
  currentLevel: number;
  levelTitle: string;
  levelIcon: string;
  xpToNextLevel: {
    current: number;
    required: number;
    percentage: number;
  };
  recentTransactions: XPTransaction[];
  achievements: Achievement[];
}

interface XPTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  xp_reward: number;
  earned_at: string;
}

const LEVEL_COLORS = {
  1: 'from-gray-400 to-gray-600',
  2: 'from-green-400 to-green-600',
  3: 'from-blue-400 to-blue-600',
  4: 'from-purple-400 to-purple-600',
  5: 'from-yellow-400 to-yellow-600',
  6: 'from-orange-400 to-orange-600',
  7: 'from-red-400 to-red-600',
  8: 'from-pink-400 to-pink-600',
  9: 'from-indigo-400 to-indigo-600',
  10: 'from-cyan-400 to-cyan-600',
};

export default function XPDisplay() {
  const [xpData, setXPData] = useState<XPData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [animatedXP, setAnimatedXP] = useState(0);

  useEffect(() => {
    fetchXPData();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchXPData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (xpData) {
      // Animate XP counter
      const timer = setTimeout(() => {
        setAnimatedXP(xpData.totalXP);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [xpData?.totalXP]);

  const fetchXPData = async () => {
    try {
      const response = await fetch('/api/xp');
      if (response.ok) {
        const data = await response.json();
        setXPData({
          totalXP: data.xp.total_xp || 0,
          currentLevel: data.xp.current_level || 1,
          levelTitle: data.xp.xp_levels?.title || 'Newcomer',
          levelIcon: getLevelIcon(data.xp.current_level || 1),
          xpToNextLevel: calculateXPProgress(data.xp.total_xp || 0, data.xp.current_level || 1),
          recentTransactions: data.transactions || [],
          achievements: data.achievements || [],
        });
      }
    } catch (error) {
      console.error('Error fetching XP data:', error);
    }
  };

  const calculateXPProgress = (totalXP: number, currentLevel: number) => {
    // This should match your level progression logic
    const levels = [
      { level: 1, required: 0 },
      { level: 2, required: 100 },
      { level: 3, required: 300 },
      { level: 4, required: 600 },
      { level: 5, required: 1000 },
      { level: 6, required: 1500 },
      { level: 7, required: 2200 },
      { level: 8, required: 3000 },
      { level: 9, required: 4000 },
      { level: 10, required: 5200 },
    ];

    const current = levels.find(l => l.level === currentLevel);
    const next = levels.find(l => l.level === currentLevel + 1);

    if (!current || !next) {
      return { current: 0, required: 0, percentage: 100 };
    }

    const xpInLevel = totalXP - current.required;
    const xpNeeded = next.required - current.required;
    const percentage = Math.round((xpInLevel / xpNeeded) * 100);

    return {
      current: xpInLevel,
      required: xpNeeded,
      percentage: Math.min(percentage, 100),
    };
  };

  const getLevelIcon = (level: number) => {
    const icons = ['🌱', '🔍', '🗺️', '🎯', '🏹', '📊', '💎', '👑', '🧙', '⚔️'];
    return icons[Math.min(level - 1, icons.length - 1)];
  };

  const formatXP = (xp: number) => {
    if (xp >= 10000) {
      return `${(xp / 1000).toFixed(1)}k`;
    }
    return xp.toLocaleString();
  };

  if (!xpData) {
    return (
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-20 w-48" />
    );
  }

  const levelColor = LEVEL_COLORS[Math.min(xpData.currentLevel, 10) as keyof typeof LEVEL_COLORS];

  return (
    <div className="relative">
      {/* Main XP Display */}
      <motion.div
        className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg cursor-pointer"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowDetails(!showDetails)}
      >
        {/* Level Badge */}
        <div className={`relative w-14 h-14 rounded-full bg-gradient-to-br ${levelColor} flex items-center justify-center`}>
          <span className="text-2xl">{xpData.levelIcon}</span>
          <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-900 rounded-full px-1.5 py-0.5 text-xs font-bold">
            {xpData.currentLevel}
          </div>
        </div>

        {/* XP Info */}
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <motion.span
              className="text-xl font-bold text-gray-900 dark:text-white"
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: -10 }}
            >
              {formatXP(animatedXP)} XP
            </motion.span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {xpData.levelTitle}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-1 w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${levelColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${xpData.xpToNextLevel.percentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {xpData.xpToNextLevel.current}/{xpData.xpToNextLevel.required} to next level
          </div>
        </div>
      </motion.div>

      {/* Detailed View */}
      {showDetails && (
        <motion.div
          className="absolute top-full mt-2 right-0 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 p-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {/* Recent XP Gains */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Recent XP Gains
            </h3>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {xpData.recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-600 dark:text-gray-400">
                    {transaction.description || transaction.type}
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    +{transaction.amount} XP
                  </span>
                </div>
              ))}
              {xpData.recentTransactions.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No recent XP gains
                </p>
              )}
            </div>
          </div>

          {/* Recent Achievements */}
          {xpData.achievements.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Recent Achievements
              </h3>
              <div className="grid grid-cols-6 gap-2">
                {xpData.achievements.slice(0, 6).map((achievement) => (
                  <div
                    key={achievement.id}
                    className="relative group"
                    title={achievement.description}
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-2xl">
                      {achievement.icon_url || '🏆'}
                    </div>
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {achievement.name}
                      <div className="text-yellow-400">+{achievement.xp_reward} XP</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View Full Profile Link */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <a
              href="/profile"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Full XP Profile →
            </a>
          </div>
        </motion.div>
      )}

      {/* Click outside to close */}
      {showDetails && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDetails(false)}
        />
      )}
    </div>
  );
}