'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Zap, Calendar, TrendingUp, Clock, Award, Sparkles } from 'lucide-react';
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
        const levelData = getCurrentLevel(userXP.total_xp || 0);
        setUserLevel(levelData.level);
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
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm p-6 cursor-pointer overflow-hidden"
        onClick={() => setShowDetails(!showDetails)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Streak Tracker</h3>
          <span className="text-xs text-gray-500">Click for details</span>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {/* Session Streak */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-3 border border-yellow-200">
            <div className="flex items-center gap-2 mb-1">
              <Zap className={`w-4 h-4 ${session.currentStreak > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
              <span className="text-xs font-medium text-gray-600">Session</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-gray-900">{session.currentStreak}</span>
              {session.currentStreak > 0 && (
                <span className="text-xs font-medium text-yellow-600">
                  {getSessionMultiplier()}x
                </span>
              )}
            </div>
            {session.currentStreak >= 5 && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-full h-1 bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full mt-2"
              />
            )}
          </div>

          {/* Daily Streak */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-3 border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <Flame className={`w-4 h-4 ${dailyStreak.current > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
              <span className="text-xs font-medium text-gray-600">Daily</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-gray-900">{dailyStreak.current}</span>
              {dailyStreak.current > 0 && (
                <span className="text-xs font-medium text-orange-600">
                  {getDailyMultiplier()}x
                </span>
              )}
            </div>
            {dailyStreak.current >= 7 && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-full h-1 bg-gradient-to-r from-orange-400 to-red-400 rounded-full mt-2"
              />
            )}
          </div>

          {/* Total Multiplier */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-gray-600">Total</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-purple-700">{getTotalMultiplier()}x</span>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
              >
                <Sparkles className="w-4 h-4 text-purple-500" />
              </motion.div>
            </div>
            <div className="w-full h-1 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full mt-2" />
          </div>
        </div>
        
        {/* Streak Timer - at the bottom */}
        {session.streakTimeRemaining > 0 && (
          <div className="flex items-center justify-center gap-2 mt-4 p-2 bg-gray-50 rounded-lg">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Keep streak: {formatTimeRemaining(session.streakTimeRemaining)}
            </span>
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