'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy,
  Zap,
  Star,
  Award,
  ChevronRight,
  Sparkles,
  Target
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
  userId: string;
  compact?: boolean;
}

interface XPStats {
  total_xp: number;
  current_level: number;
  level_title: string;
  trends_submitted: number;
  trends_validated: number;
  validation_accuracy: number;
}

// 15-level cultural anthropologist progression system
const XP_LEVELS = [
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
];

export const XPLevelDisplay: React.FC<Props> = ({ userId, compact = false }) => {
  const [stats, setStats] = useState<XPStats>({
    total_xp: 0,
    current_level: 1,
    level_title: 'Observer',
    trends_submitted: 0,
    trends_validated: 0,
    validation_accuracy: 0
  });
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    loadXPStats();
  }, [userId]);

  // Listen for XP events to refresh display
  useEffect(() => {
    const handleXPEarned = () => {
      loadXPStats();
    };

    window.addEventListener('xp-earned', handleXPEarned);
    return () => window.removeEventListener('xp-earned', handleXPEarned);
  }, []);

  // Subscribe to real-time XP updates
  useEffect(() => {
    if (!userId) return;

    const subscription = supabase
      .channel(`xp-updates-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_xp',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('User XP update in XPLevelDisplay:', payload);
          // Reload XP stats when user XP changes
          loadXPStats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  const loadXPStats = async () => {
    try {
      // Get user XP from user_xp table (correct XP source)
      const { data: userXP } = await supabase
        .from('user_xp')
        .select('total_xp')
        .eq('user_id', userId)
        .single();

      const finalXP = Math.max(0, userXP?.total_xp || 0); // Never show negative XP

      // Calculate current level based on XP
      const currentLevelData = XP_LEVELS
        .slice()
        .reverse()
        .find(level => finalXP >= level.threshold) || XP_LEVELS[0];

      // Get trend stats
      const { data: trends } = await supabase
        .from('trend_submissions')
        .select('validation_state')
        .eq('spotter_id', userId);

      const totalTrends = trends?.length || 0;
      const validatedTrends = trends?.filter(t => t.validation_state === 'validated').length || 0;
      const rejectedTrends = trends?.filter(t => t.validation_state === 'rejected').length || 0;
      
      const decidedTrends = validatedTrends + rejectedTrends;
      const accuracy = decidedTrends > 0 ? Math.round((validatedTrends / decidedTrends) * 100) : 0;

      setStats({
        total_xp: finalXP,
        current_level: currentLevelData.level,
        level_title: currentLevelData.title,
        trends_submitted: totalTrends,
        trends_validated: validatedTrends,
        validation_accuracy: accuracy
      });

    } catch (error) {
      console.error('Error loading XP stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLevelData = () => {
    return XP_LEVELS.find(level => level.level === stats.current_level) || XP_LEVELS[0];
  };

  const getNextLevelData = () => {
    return XP_LEVELS.find(level => level.level === stats.current_level + 1);
  };

  const getLevelProgress = () => {
    const currentLevel = getCurrentLevelData();
    const nextLevel = getNextLevelData();
    
    if (!nextLevel) return { progress: 100, xpToNext: 0 }; // Max level reached
    
    const progress = ((stats.total_xp - currentLevel.threshold) / (nextLevel.threshold - currentLevel.threshold)) * 100;
    return {
      progress: Math.min(Math.max(progress, 0), 100),
      xpToNext: nextLevel.threshold - stats.total_xp
    };
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-16 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  const levelData = getCurrentLevelData();
  const levelProgress = getLevelProgress();

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative"
      >
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white shadow-sm border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md hover:scale-105"
        >
          <span className="text-xl filter drop-shadow-sm">{levelData.emoji}</span>
          <div className="flex flex-col items-start">
            <span className={`text-sm font-semibold leading-none ${levelData.color}`}>
              {levelData.title}
            </span>
            <span className="text-xs text-gray-500 leading-none mt-0.5">
              Level {stats.current_level} • {stats.total_xp.toLocaleString()} XP
            </span>
          </div>
          <div className="ml-1 w-2 h-2 rounded-full bg-blue-400" />
        </button>

        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full mt-3 right-0 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-5"
            >
              <XPDetailsTooltip stats={stats} levelData={levelData} levelProgress={levelProgress} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100">
            <span className="text-2xl">{levelData.emoji}</span>
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${levelData.color}`}>
              {levelData.title}
            </h3>
            <p className="text-sm text-gray-600">Level {stats.current_level} Cultural Anthropologist</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{stats.total_xp.toLocaleString()}</p>
          <p className="text-sm text-gray-600">XP</p>
        </div>
      </div>

      <XPDetailsPanel stats={stats} levelProgress={levelProgress} />
    </motion.div>
  );
};

const XPDetailsTooltip: React.FC<{
  stats: XPStats;
  levelData: typeof XP_LEVELS[0];
  levelProgress: { progress: number; xpToNext: number };
}> = ({ stats, levelData, levelProgress }) => {
  const nextLevel = XP_LEVELS.find(level => level.level === stats.current_level + 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100">
            <span className="text-lg">{levelData.emoji}</span>
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${levelData.color}`}>
              {levelData.title}
            </h3>
            <p className="text-sm text-gray-600">Level {stats.current_level} • {stats.total_xp.toLocaleString()} XP</p>
          </div>
        </div>
      </div>

      {/* Progress to Next Level */}
      {nextLevel && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Next: {nextLevel.title}</span>
            <span className="text-gray-900 font-medium">{levelProgress.xpToNext.toLocaleString()} XP</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-600">Accuracy</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{stats.validation_accuracy}%</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-600">Validated</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{stats.trends_validated}</p>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="pt-3 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Total submitted:</span>
          <span className="font-medium text-gray-700">{stats.trends_submitted}</span>
        </div>
      </div>
    </div>
  );
};

const XPDetailsPanel: React.FC<{
  stats: XPStats;
  levelProgress: { progress: number; xpToNext: number };
}> = ({ stats, levelProgress }) => {
  const nextLevel = XP_LEVELS.find(level => level.level === stats.current_level + 1);

  return (
    <div className="space-y-4">
      {/* Progress to Next Level */}
      {nextLevel && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress to {nextLevel.title}</span>
            <span className="text-gray-900 font-medium">{levelProgress.xpToNext.toLocaleString()} XP to go</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-600">Accuracy</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{stats.validation_accuracy}%</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Trophy className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600">Validated</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{stats.trends_validated}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-600">Submitted</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{stats.trends_submitted}</p>
        </div>
      </div>
    </div>
  );
};