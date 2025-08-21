'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, TrendingUp, Clock, Zap, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useXPNotification } from '@/contexts/XPNotificationContext';
import { XP_REWARDS, calculateTrendXP, formatXP, getCurrentLevel, getProgressToNextLevel } from '@/lib/XP_REWARDS';

interface ScrollSessionProps {
  onSessionStateChange?: (isActive: boolean) => void;
  onTrendLogged?: () => void;
  streak?: number;
  streakMultiplier?: number;
  onStreakUpdate?: (streakCount: number, multiplier: number) => void;
}

export const ScrollSession = React.forwardRef<any, ScrollSessionProps>(
  ({ onSessionStateChange, onTrendLogged, streak = 0, streakMultiplier = 1, onStreakUpdate }, ref) => {
    const { user } = useAuth();
    const { showXPNotification } = useXPNotification();
    const [isActive, setIsActive] = useState(false);
    const [sessionTime, setSessionTime] = useState(0);
    const [trendsLogged, setTrendsLogged] = useState(0);
    const [xpEarned, setXpEarned] = useState(0);
    const [userLevel, setUserLevel] = useState(1);
    const [totalXP, setTotalXP] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout>();
    const sessionStartRef = useRef<Date>();

    // Load user's current XP and level
    useEffect(() => {
      if (user) {
        loadUserXP();
      }
    }, [user]);

    const loadUserXP = async () => {
      if (!user) return;
      
      try {
        // Get user's total XP
        const { data: xpEvents } = await supabase
          .from('xp_events')
          .select('xp_change')
          .eq('user_id', user.id);
        
        const total = xpEvents?.reduce((sum, event) => sum + event.xp_change, 0) || 0;
        setTotalXP(Math.max(0, total));
        
        const currentLevel = getCurrentLevel(total);
        setUserLevel(currentLevel.level);
      } catch (error) {
        console.error('Error loading user XP:', error);
      }
    };

    // Calculate XP earned in this session
    const calculateSessionXP = useCallback(() => {
      // Base XP per minute of active scrolling
      const minuteXP = 2; // 2 XP per minute
      const minutes = sessionTime / 60;
      
      // Base XP for trends logged
      const trendXP = trendsLogged * XP_REWARDS.base.trendSubmission;
      
      // Apply multipliers
      const levelMultiplier = XP_REWARDS.levelMultipliers[userLevel as keyof typeof XP_REWARDS.levelMultipliers] || 1.0;
      const sessionMultiplier = streakMultiplier; // Use the streak multiplier passed in
      
      const baseXP = (minutes * minuteXP) + trendXP;
      const totalXP = Math.round(baseXP * levelMultiplier * sessionMultiplier);
      
      // Apply daily cap
      const dailyCap = XP_REWARDS.dailyCaps.maxXP;
      
      return Math.min(totalXP, dailyCap);
    }, [sessionTime, trendsLogged, streakMultiplier, userLevel]);

    // Update XP when time or trends change
    useEffect(() => {
      setXpEarned(calculateSessionXP());
    }, [calculateSessionXP]);

    // Timer effect
    useEffect(() => {
      if (isActive) {
        intervalRef.current = setInterval(() => {
          setSessionTime(prev => prev + 1);
        }, 1000);
      } else if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, [isActive]);

    // Format time display
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Start session
    const startSession = async () => {
      sessionStartRef.current = new Date();
      setIsActive(true);
      setSessionTime(0);
      setTrendsLogged(0);
      setXpEarned(0);
      onSessionStateChange?.(true);
    };

    // End session
    const endSession = async () => {
      setIsActive(false);
      onSessionStateChange?.(false);

      if (!user || !sessionStartRef.current) return;

      // Save session to database with XP instead of earnings
      try {
        const finalXP = calculateSessionXP();
        
        // Record the session
        const { error } = await supabase
          .from('scroll_sessions')
          .insert({
            user_id: user.id,
            started_at: sessionStartRef.current.toISOString(),
            ended_at: new Date().toISOString(),
            duration_seconds: sessionTime,
            trends_logged: trendsLogged,
            xp_earned: finalXP,
            metadata: {
              level: userLevel,
              streak_multiplier: streakMultiplier
            }
          });

        if (error) throw error;

        // Record XP event
        const { error: xpError } = await supabase
          .from('xp_events')
          .insert({
            user_id: user.id,
            xp_change: finalXP,
            event_type: 'session_complete',
            metadata: {
              duration: sessionTime,
              trends: trendsLogged
            }
          });

        if (xpError) throw xpError;

        // Show XP notification for session completion
        if (finalXP > 0) {
          const durationText = `${Math.floor(sessionTime / 60)}min session completed!`;
          showXPNotification(finalXP, durationText, 'session');
        }

        // Reload user XP to reflect changes
        await loadUserXP();
      } catch (error) {
        console.error('Error saving session:', error);
      }
    };

    // Toggle session
    const toggleSession = () => {
      if (isActive) {
        endSession();
      } else {
        startSession();
      }
    };

    // Log trend (exposed via ref)
    const logTrend = useCallback(() => {
      if (isActive) {
        setTrendsLogged(prev => prev + 1);
        onTrendLogged?.();
        
        // Trigger streak update in parent component
        if (onStreakUpdate) {
          onStreakUpdate(streak, streakMultiplier);
        }
      }
    }, [isActive, onTrendLogged, streak, streakMultiplier, onStreakUpdate]);

    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
      logTrend,
      isActive
    }));

    // Get level progress
    const levelProgress = getProgressToNextLevel(totalXP);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Scroll Session</h3>
              <p className="text-sm text-gray-400 font-medium">
                Earn XP for discovering trends
              </p>
            </div>
            {isActive && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-full border border-emerald-500/30"
              >
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-emerald-400">LIVE</span>
              </motion.div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-5 bg-gray-700/50 rounded-xl border border-gray-600">
              <Clock className="w-6 h-6 text-blue-400 mx-auto mb-3" />
              <p className="text-3xl font-bold text-white">{formatTime(sessionTime)}</p>
              <p className="text-sm text-gray-400 font-medium mt-1">Duration</p>
            </div>
            <div className="text-center p-5 bg-gray-700/50 rounded-xl border border-gray-600">
              <TrendingUp className="w-6 h-6 text-purple-400 mx-auto mb-3" />
              <p className="text-3xl font-bold text-white">{trendsLogged}</p>
              <p className="text-sm text-gray-400 font-medium mt-1">Trends Logged</p>
            </div>
          </div>

          {/* User Level and Progress */}
          {user && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{levelProgress.currentLevel.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-purple-400">
                      Level {levelProgress.currentLevel.level}: {levelProgress.currentLevel.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatXP(totalXP)} Total XP
                    </p>
                  </div>
                </div>
                {levelProgress.nextLevel && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Next level</p>
                    <p className="text-sm font-semibold text-blue-400">
                      {formatXP(levelProgress.xpNeededForNext - levelProgress.xpInCurrentLevel)} XP
                    </p>
                  </div>
                )}
              </div>
              {levelProgress.nextLevel && (
                <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${levelProgress.progressPercentage}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Live XP Display */}
          {isActive && (
            <div className="mb-6 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <p className="text-sm font-semibold text-yellow-400">Session XP</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">{formatXP(xpEarned)}</p>
                  <p className="text-xs text-gray-400">
                    Daily Cap: {formatXP(XP_REWARDS.dailyCaps.maxXP)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Start/Stop Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleSession}
            className={`
              w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg
              ${isActive 
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-2 border-red-500/50' 
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
              }
            `}
          >
            {isActive ? (
              <>
                <Pause className="w-6 h-6" />
                End Scroll Session
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                Start Scroll Session
              </>
            )}
          </motion.button>

          {/* Streak Status Display */}
          {isActive && streak > 0 && (
            <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-2xl p-4 mt-6 border border-orange-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <p className="text-lg font-bold text-white">{streak} Streak Active!</p>
                    <p className="text-sm text-orange-200">{streakMultiplier}x XP multiplier</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-orange-400">
                    {formatXP(XP_REWARDS.base.trendSubmission * streakMultiplier)}
                  </p>
                  <p className="text-xs text-orange-200">XP per trend</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Helper Text */}
          <p className="text-sm text-gray-400 text-center mt-4 font-medium">
            {isActive 
              ? (streak > 0 
                  ? 'Streak active! Keep discovering trends!' 
                  : 'Log 3 trends in 5 minutes to start a streak')
              : 'Start a session to earn XP for trend discovery'
            }
          </p>
        </div>
      </motion.div>
    );
  }
);

ScrollSession.displayName = 'ScrollSession';