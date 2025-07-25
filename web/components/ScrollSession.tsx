'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ScrollSessionProps {
  onSessionStateChange?: (isActive: boolean) => void;
  onTrendLogged?: () => void;
}

export const ScrollSession = React.forwardRef<any, ScrollSessionProps>(
  ({ onSessionStateChange, onTrendLogged }, ref) => {
    const { user } = useAuth();
    const [isActive, setIsActive] = useState(false);
    const [sessionTime, setSessionTime] = useState(0);
    const [trendsLogged, setTrendsLogged] = useState(0);
    const [earnings, setEarnings] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout>();
    const sessionStartRef = useRef<Date>();

    // Calculate earnings
    const calculateEarnings = useCallback(() => {
      const baseRate = 0.10; // $0.10 per minute
      const trendBonus = 0.25; // $0.25 per trend
      const minutes = sessionTime / 60;
      const baseEarnings = minutes * baseRate;
      const bonusEarnings = trendsLogged * trendBonus;
      return baseEarnings + bonusEarnings;
    }, [sessionTime, trendsLogged]);

    // Update earnings when time or trends change
    useEffect(() => {
      setEarnings(calculateEarnings());
    }, [calculateEarnings]);

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
      setEarnings(0);
      onSessionStateChange?.(true);
    };

    // End session
    const endSession = async () => {
      setIsActive(false);
      onSessionStateChange?.(false);

      if (!user || !sessionStartRef.current) return;

      // Save session to database
      try {
        const { error } = await supabase
          .from('scroll_sessions')
          .insert({
            user_id: user.id,
            started_at: sessionStartRef.current.toISOString(),
            ended_at: new Date().toISOString(),
            duration_seconds: sessionTime,
            trends_logged: trendsLogged,
            base_earnings: (sessionTime / 60) * 0.10,
            bonus_earnings: trendsLogged * 0.25,
            total_earnings: earnings
          });

        if (error) throw error;

        // Update user earnings
        const { error: rpcError } = await supabase
          .rpc('update_user_earnings', {
            user_id: user.id,
            amount: earnings
          });

        if (rpcError) throw rpcError;
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
      }
    }, [isActive, onTrendLogged]);

    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
      logTrend,
      isActive
    }));

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-wave-900/30 to-wave-800/20 backdrop-blur-xl rounded-2xl p-6 border border-wave-700/30"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-wave-500 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Scroll Session</h3>
              <p className="text-sm text-wave-400">
                Earn while you discover trends
              </p>
            </div>
            {isActive && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full"
              >
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-400">LIVE</span>
              </motion.div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-wave-800/30 rounded-xl">
              <Clock className="w-5 h-5 text-wave-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{formatTime(sessionTime)}</p>
              <p className="text-xs text-wave-500">Duration</p>
            </div>
            <div className="text-center p-4 bg-wave-800/30 rounded-xl">
              <TrendingUp className="w-5 h-5 text-wave-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{trendsLogged}</p>
              <p className="text-xs text-wave-500">Trends</p>
            </div>
            <div className="text-center p-4 bg-wave-800/30 rounded-xl">
              <DollarSign className="w-5 h-5 text-wave-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">${earnings.toFixed(2)}</p>
              <p className="text-xs text-wave-500">Earned</p>
            </div>
          </div>

          {/* Earnings Breakdown */}
          <AnimatePresence mode="wait">
            {isActive && sessionTime > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-wave-800/20 rounded-xl"
              >
                <p className="text-xs text-wave-400 mb-2">Earnings Breakdown</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-wave-300">Base ({formatTime(sessionTime)} @ $0.10/min)</span>
                    <span className="text-white">${((sessionTime / 60) * 0.10).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-wave-300">Trend Bonus ({trendsLogged} @ $0.25)</span>
                    <span className="text-white">${(trendsLogged * 0.25).toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-wave-700/50 my-2" />
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-wave-200">Total</span>
                    <span className="text-green-400">${earnings.toFixed(2)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Start/Stop Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleSession}
            className={`
              w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-3
              ${isActive 
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30' 
                : 'bg-gradient-to-r from-wave-600 to-wave-700 hover:from-wave-500 hover:to-wave-600 text-white'
              }
            `}
          >
            {isActive ? (
              <>
                <Pause className="w-5 h-5" />
                End Scroll Session
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start Scroll Session
              </>
            )}
          </motion.button>

          {/* Helper Text */}
          <p className="text-xs text-wave-500 text-center mt-4">
            {isActive 
              ? 'Keep scrolling and logging trends to maximize earnings' 
              : 'Start a session to begin earning while browsing trends'
            }
          </p>
        </div>
      </motion.div>
    );
  }
);

ScrollSession.displayName = 'ScrollSession';