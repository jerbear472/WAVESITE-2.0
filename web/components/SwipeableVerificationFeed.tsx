'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Check, X, TrendingUp, Calendar, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';
import { EARNINGS } from '@/lib/constants';

interface Trend {
  id: string;
  category: string;
  notes: string;
  emoji?: string;
  user_name: string;
  created_at: string;
}

export const SwipeableVerificationFeed: React.FC = () => {
  const { user } = useAuth();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  // Motion values for swipe
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  // Fetch trends
  const fetchTrends = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('logged_trends')
        .select('*')
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTrends(data || []);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [user]);

  // Handle swipe complete
  const handleSwipeComplete = async (direction: 'left' | 'right') => {
    if (!user || !trends[currentIndex]) return;

    const trend = trends[currentIndex];
    const isConfirm = direction === 'right';

    try {
      // Save verification
      const { error } = await supabase
        .from('trend_verifications')
        .insert({
          trend_id: trend.id,
          verifier_id: user.id,
          is_valid: isConfirm,
          verified_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update earnings
      if (isConfirm) {
        setVerifiedCount(prev => prev + 1);
        setEarnings(prev => prev + 0.05);

        // Update user earnings
        await supabase.rpc('update_user_earnings', {
          user_id: user.id,
          amount: 0.05
        });
      }

      // Move to next trend
      setCurrentIndex(prev => prev + 1);
    } catch (error) {
      console.error('Error saving verification:', error);
    }
  };

  // Handle drag end
  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 100;
    
    if (info.offset.x > swipeThreshold) {
      handleSwipeComplete('right');
    } else if (info.offset.x < -swipeThreshold) {
      handleSwipeComplete('left');
    }
  };

  // Get category styles
  const getCategoryStyles = (category: string) => {
    const styles: Record<string, { gradient: string; icon: string }> = {
      fashion: { gradient: 'from-pink-500 to-rose-500', icon: '👗' },
      wellness: { gradient: 'from-green-500 to-emerald-500', icon: '🧘' },
      meme: { gradient: 'from-purple-500 to-indigo-500', icon: '😂' },
      audio: { gradient: 'from-blue-500 to-cyan-500', icon: '🎵' },
      tech: { gradient: 'from-orange-500 to-red-500', icon: '💻' },
      food: { gradient: 'from-yellow-500 to-amber-500', icon: '🍔' },
      lifestyle: { gradient: 'from-teal-500 to-green-500', icon: '✨' },
      other: { gradient: 'from-gray-500 to-gray-600', icon: '🎨' }
    };
    return styles[category] || styles.other;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const currentTrend = trends[currentIndex];
  const progress = ((currentIndex + 1) / trends.length) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wave-500 mx-auto mb-4" />
          <p className="text-wave-400">Loading trends...</p>
        </div>
      </div>
    );
  }

  if (!currentTrend) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-wave-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-10 h-10 text-wave-500" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">All caught up!</h3>
        <p className="text-wave-400">Check back later for more trends to verify</p>
        <div className="mt-6 p-4 bg-wave-800/30 rounded-xl inline-block">
          <p className="text-sm text-wave-300 mb-1">Session Summary</p>
          <p className="text-2xl font-bold text-white">{verifiedCount} verified</p>
          <p className="text-green-400 font-medium">{formatCurrency(earnings)} earned</p>
        </div>
      </div>
    );
  }

  const categoryStyle = getCategoryStyles(currentTrend.category);

  return (
    <div className="relative h-[600px] flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">Verify Trends</h3>
          <div className="text-sm text-wave-400">
            {formatCurrency(earnings)} earned
          </div>
        </div>
        <div className="h-2 bg-wave-800/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-wave-600 to-wave-500"
          />
        </div>
        <p className="text-xs text-wave-500 mt-1">
          {currentIndex + 1} of {trends.length}
        </p>
      </div>

      {/* Card Stack */}
      <div className="flex-1 relative">
        {/* Next card preview */}
        {trends[currentIndex + 1] && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full max-w-sm h-[400px] bg-wave-800/30 rounded-2xl scale-95 opacity-50" />
          </div>
        )}

        {/* Current card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTrend.id}
            style={{ x, rotate, opacity }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
          >
            <div className="w-full max-w-sm h-[400px] bg-wave-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-wave-700/30 p-6 flex flex-col">
              {/* Category Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className={`
                  px-4 py-2 rounded-full bg-gradient-to-r ${categoryStyle.gradient}
                  flex items-center gap-2
                `}>
                  <span className="text-lg">{categoryStyle.icon}</span>
                  <span className="text-sm font-medium text-white capitalize">
                    {currentTrend.category}
                  </span>
                </div>
                <span className="text-2xl">{currentTrend.emoji || '🌊'}</span>
              </div>

              {/* Content */}
              <div className="flex-1 flex items-center justify-center">
                <p className="text-lg text-white text-center px-4">
                  {currentTrend.notes || 'No description provided'}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-sm text-wave-400">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>@{currentTrend.user_name || 'anonymous'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(currentTrend.created_at)}</span>
                </div>
              </div>

              {/* Swipe Indicators */}
              <motion.div
                style={{
                  opacity: useTransform(x, [-100, 0, 100], [0, 0, 1])
                }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="bg-green-500/20 backdrop-blur-sm rounded-2xl px-8 py-4 border-4 border-green-500 rotate-12">
                  <p className="text-2xl font-bold text-green-500">CONFIRM</p>
                </div>
              </motion.div>
              <motion.div
                style={{
                  opacity: useTransform(x, [-100, 0, 100], [1, 0, 0])
                }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="bg-red-500/20 backdrop-blur-sm rounded-2xl px-8 py-4 border-4 border-red-500 -rotate-12">
                  <p className="text-2xl font-bold text-red-500">NOT A TREND</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-6 mt-6">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleSwipeComplete('left')}
          className="w-16 h-16 bg-red-500/20 hover:bg-red-500/30 rounded-full flex items-center justify-center text-red-400 border border-red-500/30"
        >
          <X className="w-6 h-6" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleSwipeComplete('right')}
          className="w-16 h-16 bg-green-500/20 hover:bg-green-500/30 rounded-full flex items-center justify-center text-green-400 border border-green-500/30"
        >
          <Check className="w-6 h-6" />
        </motion.button>
      </div>
    </div>
  );
};