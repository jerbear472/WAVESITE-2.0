'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Zap, Calendar, TrendingUp, Clock, Award } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';

interface DailyStreak {
  current: number;
  longest: number;
  lastActive: Date | null;
}

export default function StreakDisplay() {
  const { user } = useAuth();
  const { session } = useSession();
  const [dailyStreak, setDailyStreak] = useState<DailyStreak>({
    current: 0,
    longest: 0,
    lastActive: null
  });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (user) {
      loadDailyStreak();
    }
  }, [user]);

  const loadDailyStreak = async () => {
    if (!user) return;

    try {
      // Get daily streak from user's submission history
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Check if user submitted today
      const { count: todayCount } = await supabase
        .from('trend_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('spotter_id', user.id)
        .gte('created_at', today.toISOString());
      
      // Check if user submitted yesterday
      const { count: yesterdayCount } = await supabase
        .from('trend_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('spotter_id', user.id)
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString());
      
      // Calculate streak (simplified for now)
      let currentStreak = 0;
      if ((todayCount || 0) > 0) {
        currentStreak = 1; // At least 1 if submitted today
        if ((yesterdayCount || 0) > 0) {
          // Would need to check further back for full streak
          currentStreak = 2; // Simplified
        }
      }
      
      setDailyStreak({
        current: currentStreak,
        longest: Math.max(currentStreak, dailyStreak.longest),
        lastActive: todayCount > 0 ? new Date() : null
      });
    } catch (error) {
      console.error('Error loading daily streak:', error);
    }
  };

  const getSessionMultiplier = () => {
    if (session.currentStreak >= 15) return 3.0;
    if (session.currentStreak >= 5) return 2.0;
    if (session.currentStreak >= 2) return 1.2;
    return 1.0;
  };

  const getDailyMultiplier = () => {
    if (dailyStreak.current >= 7) return 2.0;
    if (dailyStreak.current >= 3) return 1.5;
    if (dailyStreak.current >= 1) return 1.2;
    return 1.0;
  };

  const getTotalMultiplier = () => {
    return (getSessionMultiplier() * getDailyMultiplier()).toFixed(1);
  };

  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative">
      {/* Compact Streak Display */}
      <motion.div
        className="flex items-center gap-3 bg-gray-900/80 backdrop-blur-sm rounded-xl p-3 border border-gray-800 cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Session Streak */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Zap className={`w-5 h-5 ${session.currentStreak > 0 ? 'text-yellow-400' : 'text-gray-600'}`} />
            {session.currentStreak >= 5 && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -inset-1 bg-yellow-400/20 rounded-full blur-sm"
              />
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400">Session</p>
            <p className="text-sm font-bold text-white">
              {session.currentStreak} 
              {session.currentStreak > 0 && (
                <span className="text-yellow-400 ml-1">({getSessionMultiplier()}x)</span>
              )}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-700" />

        {/* Daily Streak */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Flame className={`w-5 h-5 ${dailyStreak.current > 0 ? 'text-orange-400' : 'text-gray-600'}`} />
            {dailyStreak.current >= 7 && (
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="absolute -inset-1 bg-orange-400/20 rounded-full blur-sm"
              />
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400">Daily</p>
            <p className="text-sm font-bold text-white">
              {dailyStreak.current} days
              {dailyStreak.current > 0 && (
                <span className="text-orange-400 ml-1">({getDailyMultiplier()}x)</span>
              )}
            </p>
          </div>
        </div>

        {/* Total Multiplier */}
        <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg border border-blue-500/30">
          <Award className="w-4 h-4 text-blue-400" />
          <div>
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-sm font-bold text-blue-400">{getTotalMultiplier()}x</p>
          </div>
        </div>

        {/* Streak Timer */}
        {session.streakTimeRemaining > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-gray-400">{formatTimeRemaining(session.streakTimeRemaining)}</span>
          </div>
        )}
      </motion.div>

      {/* Detailed Streak Modal */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 left-0 right-0 z-50 bg-gray-900 rounded-xl border border-gray-800 shadow-2xl p-4"
          >
            <h3 className="text-lg font-bold text-white mb-3">Streak Rewards</h3>
            
            {/* Session Streak Details */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <p className="text-sm font-semibold text-yellow-400">Session Streak</p>
              </div>
              <p className="text-xs text-gray-400 mb-2">Submit trends quickly to build momentum</p>
              <div className="space-y-1">
                <div className={`flex justify-between text-xs ${session.currentStreak >= 2 ? 'text-green-400' : 'text-gray-500'}`}>
                  <span>2+ trends</span>
                  <span>1.2x multiplier</span>
                </div>
                <div className={`flex justify-between text-xs ${session.currentStreak >= 5 ? 'text-green-400' : 'text-gray-500'}`}>
                  <span>5+ trends</span>
                  <span>2.0x multiplier</span>
                </div>
                <div className={`flex justify-between text-xs ${session.currentStreak >= 15 ? 'text-green-400' : 'text-gray-500'}`}>
                  <span>15+ trends</span>
                  <span>3.0x multiplier</span>
                </div>
              </div>
            </div>

            {/* Daily Streak Details */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <p className="text-sm font-semibold text-orange-400">Daily Streak</p>
              </div>
              <p className="text-xs text-gray-400 mb-2">Submit at least 1 trend daily</p>
              <div className="space-y-1">
                <div className={`flex justify-between text-xs ${dailyStreak.current >= 1 ? 'text-green-400' : 'text-gray-500'}`}>
                  <span>1+ days</span>
                  <span>1.2x multiplier</span>
                </div>
                <div className={`flex justify-between text-xs ${dailyStreak.current >= 3 ? 'text-green-400' : 'text-gray-500'}`}>
                  <span>3+ days</span>
                  <span>1.5x multiplier</span>
                </div>
                <div className={`flex justify-between text-xs ${dailyStreak.current >= 7 ? 'text-green-400' : 'text-gray-500'}`}>
                  <span>7+ days</span>
                  <span>2.0x multiplier</span>
                </div>
              </div>
            </div>

            {/* Earnings Impact */}
            <div className="p-3 bg-gradient-to-r from-green-600/10 to-blue-600/10 rounded-lg border border-green-500/20">
              <p className="text-xs text-gray-400 mb-1">Your earnings with streaks:</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">$0.25 base</span>
                <span className="text-gray-500">×</span>
                <span className="text-sm font-bold text-blue-400">{getTotalMultiplier()}x</span>
                <span className="text-gray-500">=</span>
                <span className="text-lg font-bold text-green-400">
                  ${(0.25 * parseFloat(getTotalMultiplier())).toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowDetails(false)}
              className="mt-3 w-full text-xs text-gray-500 hover:text-gray-400"
            >
              Click to close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}