'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Zap, Bell, X, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface DailyNotificationProps {
  onClose?: () => void;
}

export default function DailyTrendSpotNotification({ onClose }: DailyNotificationProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check if user has already submitted today
    checkTodaySubmission();
    
    // Set up daily notification time (randomized between 10am-6pm user's timezone)
    const checkNotificationTime = () => {
      const now = new Date();
      const hours = now.getHours();
      
      // Check if it's the notification window and user hasn't submitted
      if (hours >= 10 && hours <= 18 && !hasSubmittedToday) {
        // Random chance to show notification (once per hour)
        const shouldShow = Math.random() < 0.15; // 15% chance per check
        if (shouldShow && !localStorage.getItem(`notification_shown_${now.toDateString()}`)) {
          setShow(true);
          localStorage.setItem(`notification_shown_${now.toDateString()}`, 'true');
          
          // Start countdown
          const interval = setInterval(() => {
            setTimeLeft(prev => {
              if (prev <= 1) {
                clearInterval(interval);
                setShow(false);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          
          return () => clearInterval(interval);
        }
      }
    };

    // Check immediately
    checkNotificationTime();
    
    // Check every 30 minutes
    const interval = setInterval(checkNotificationTime, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user, hasSubmittedToday]);

  const checkTodaySubmission = async () => {
    if (!user) return;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data } = await supabase
        .from('trend_submissions')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
        .limit(1);
      
      setHasSubmittedToday(!!data && data.length > 0);
    } catch (error) {
      console.error('Error checking submission:', error);
    }
  };

  const handleSpotTrend = () => {
    setShow(false);
    localStorage.setItem('daily_notification_active', 'true');
    router.push('/spot?daily=true');
  };

  const handleDismiss = () => {
    setShow(false);
    if (onClose) onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed top-4 right-4 z-50 max-w-sm"
        >
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-2xl p-4 text-white">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 animate-pulse" />
                <span className="font-bold text-sm">Daily Trend Alert!</span>
              </div>
              <button
                onClick={handleDismiss}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-bold mb-1">
                  🔥 Spot Today's Trend for 500 XP!
                </h3>
                <p className="text-sm text-white/90">
                  Quick! Share what trend you're seeing right now. Bonus XP for unique insights!
                </p>
              </div>

              <div className="bg-white/20 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Time left:</span>
                  </div>
                  <span className="font-bold text-lg">{formatTime(timeLeft)}</span>
                </div>
                <div className="mt-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white"
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / 120) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSpotTrend}
                  className="flex-1 bg-white text-purple-600 px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                >
                  <TrendingUp className="w-4 h-4" />
                  Spot Trend Now
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-colors"
                >
                  Later
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-white/80">
                <Zap className="w-3 h-3" />
                <span>On-time submission = 2x XP multiplier!</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}