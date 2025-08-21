'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Zap, Calendar, TrendingUp, Clock, Award } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { XP_REWARDS, getCurrentLevel } from '@/lib/XP_REWARDS';
import { getLevelMultiplier, getDailyStreakMultiplier, getSessionStreakMultiplier } from '@/lib/calculateXPWithMultipliers';

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
  const [userLevel, setUserLevel] = useState(1);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (user) {
      loadDailyStreak();
      loadUserLevel();
    }
  }, [user]);

  const loadDailyStreak = async () => {
    if (!user) return;

    try {
      // Get daily streak from user_profiles table
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('current_streak, longest_streak, last_submission_at')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setDailyStreak({
          current: profile.current_streak || 0,
          longest: profile.longest_streak || 0,
          lastActive: profile.last_submission_at ? new Date(profile.last_submission_at) : null
        });
      }
    } catch (error) {
      console.error('Error loading daily streak:', error);
    }
  };

  const loadUserLevel = async () => {
    if (!user) return;

    try {
      // Get user's current XP for level calculation
      const { data: userXP } = await supabase
        .from('user_xp')
        .select('total_xp')
        .eq('user_id', user.id)
        .single();
      
      if (userXP) {
        const level = getCurrentLevel(userXP.total_xp || 0);
        setUserLevel(level);
      }
    } catch (error) {
      console.error('Error loading user level:', error);
    }
  };

  const getSessionMultiplier = () => {
    return getSessionStreakMultiplier(session.currentStreak + 1);
  };

  const getDailyMultiplier = () => {
    return getDailyStreakMultiplier(dailyStreak.current);
  };

  const getLevelMult = () => {
    return getLevelMultiplier(userLevel);
  };

  const getTotalMultiplier = () => {
    // Multiply all three multipliers: level × daily × session
    const total = getLevelMult() * getDailyMultiplier() * getSessionMultiplier();
    return total.toFixed(1);
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
        className="flex items-center gap-4 bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-neutral-700 cursor-pointer"
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
            <p className="text-xs text-gray-600 dark:text-gray-400">Session</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {session.currentStreak} 
              {session.currentStreak > 0 && (
                <span className="text-yellow-400 ml-1">({getSessionMultiplier()}x)</span>
              )}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-gray-200 dark:bg-neutral-700" />

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
            <p className="text-xs text-gray-600 dark:text-gray-400">Daily</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {dailyStreak.current} days
              {dailyStreak.current > 0 && (
                <span className="text-orange-400 ml-1">({getDailyMultiplier()}x)</span>
              )}
            </p>
          </div>
        </div>

        {/* Level Multiplier */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Award className={`w-5 h-5 ${getLevelMult() > 1 ? 'text-purple-400' : 'text-gray-600'}`} />
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Level {userLevel}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              <span className="text-purple-400">({getLevelMult()}x)</span>
            </p>
          </div>
        </div>

        {/* Total Multiplier */}
        <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl border border-blue-500/20">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
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
            className="absolute top-full mt-3 left-0 right-0 z-50 bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-700 shadow-2xl p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Streak Rewards</h3>
            
            {/* Session Streak Details */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <p className="text-sm font-semibold text-yellow-400">Session Streak</p>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Submit trends within 5 minutes to build momentum</p>
              <div className="space-y-1">
                <div className={`flex justify-between text-xs ${session.currentStreak >= 2 ? 'text-green-400' : 'text-gray-500'}`}>
                  <span>2nd trend</span>
                  <span>1.2x multiplier</span>
                </div>
                <div className={`flex justify-between text-xs ${session.currentStreak >= 3 ? 'text-green-400' : 'text-gray-500'}`}>
                  <span>3rd trend</span>
                  <span>1.5x multiplier</span>
                </div>
                <div className={`flex justify-between text-xs ${session.currentStreak >= 4 ? 'text-green-400' : 'text-gray-500'}`}>
                  <span>4th trend</span>
                  <span>2.0x multiplier</span>
                </div>
                <div className={`flex justify-between text-xs ${session.currentStreak >= 5 ? 'text-green-400' : 'text-gray-500'}`}>
                  <span>5+ trends</span>
                  <span>2.5x multiplier</span>
                </div>
              </div>
            </div>

            {/* Daily Streak Details */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <p className="text-sm font-semibold text-orange-400">Daily Streak</p>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Submit at least 1 trend daily</p>
              <div className="space-y-1">
                <div className={`flex justify-between text-xs ${dailyStreak.current >= 2 ? 'text-green-400' : 'text-gray-500'}`}>
                  <span>2-6 days</span>
                  <span>1.2x multiplier</span>
                </div>
                <div className={`flex justify-between text-xs ${dailyStreak.current >= 7 ? 'text-green-400' : 'text-gray-500'}`}>
                  <span>7-13 days</span>
                  <span>1.5x multiplier</span>
                </div>
                <div className={`flex justify-between text-xs ${dailyStreak.current >= 14 ? 'text-green-400' : 'text-gray-500'}`}>
                  <span>14-29 days</span>
                  <span>2.0x multiplier</span>
                </div>
                <div className={`flex justify-between text-xs ${dailyStreak.current >= 30 ? 'text-green-400' : 'text-gray-500'}`}>
                  <span>30+ days</span>
                  <span>2.5x multiplier</span>
                </div>
              </div>
            </div>

            {/* XP Impact */}
            <div className="p-4 bg-gradient-to-r from-green-600/10 to-blue-600/10 rounded-xl border border-green-500/20">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Your XP per trend submission:</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900 dark:text-white">10 base</span>
                <span className="text-gray-500">×</span>
                <span className="text-sm font-bold text-blue-400">{getTotalMultiplier()}x</span>
                <span className="text-gray-500">=</span>
                <span className="text-lg font-bold text-green-400">
                  {Math.round(10 * parseFloat(getTotalMultiplier()))} XP
                </span>
              </div>
              {parseFloat(getTotalMultiplier()) > 1 && (
                <div className="mt-2 text-xs text-gray-500">
                  <div>Level {userLevel}: {getLevelMult()}x</div>
                  <div>Daily streak: {getDailyMultiplier()}x</div>
                  <div>Session streak: {getSessionMultiplier()}x</div>
                </div>
              )}
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