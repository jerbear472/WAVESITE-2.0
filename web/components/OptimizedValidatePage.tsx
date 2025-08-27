'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useValidationTrends, useValidateTrend } from '@/lib/hooks/useApi';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { calculateXPWithMultipliers } from '@/lib/calculateXPWithMultipliers';
import { XP_REWARDS, getCurrentLevel } from '@/lib/XP_REWARDS';
import { 
  ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, 
  AlertCircle, Award, Zap, TrendingUp 
} from 'lucide-react';

export default function OptimizedValidatePage() {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  
  // Use React Query for cached trend data
  const { data: trends, isLoading, refetch } = useValidationTrends();
  const validateMutation = useValidateTrend();
  
  const currentTrend = trends?.[currentIndex];
  
  // Calculate XP with multipliers
  const calculateValidationXP = useCallback(async () => {
    if (!user) return 10; // Base XP
    
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('performance_tier, current_streak, session_streak, last_submission_at')
        .eq('id', user.id)
        .single();
      
      const { data: userXP } = await supabase
        .from('user_xp')
        .select('total_xp')
        .eq('user_id', user.id)
        .single();
      
      const totalXP = userXP?.total_xp || 0;
      const levelData = getCurrentLevel(totalXP);
      
      const xpCalculation = calculateXPWithMultipliers({
        baseAmount: XP_REWARDS.base.validationVote,
        totalXP: totalXP,
        currentLevel: levelData.level,
        dailyStreak: profile?.current_streak || 0,
        sessionStreak: profile?.session_streak || 0,
        isWithinSessionWindow: true
      });
      
      return xpCalculation.finalXP;
    } catch (error) {
      console.error('Error calculating XP:', error);
      return 10;
    }
  }, [user]);
  
  const handleVote = async (vote: 'wave' | 'nah') => {
    if (!currentTrend || !user || isValidating) return;
    
    setIsValidating(true);
    
    try {
      // Calculate XP
      const xp = await calculateValidationXP();
      setXpEarned(xp);
      
      // Use mutation for optimistic updates
      await validateMutation.mutateAsync({
        trendId: currentTrend.id,
        vote,
        userId: user.id
      });
      
      // Award XP
      await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_amount: xp,
        p_type: 'validation_vote',
        p_description: `Validated trend: ${currentTrend.title || 'Untitled Trend'}`,
        p_reference_id: currentTrend.id,
        p_reference_type: 'trend_submission'
      });
      
      // Move to next trend
      setTimeout(() => {
        if (currentIndex < (trends?.length || 0) - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          refetch(); // Refresh the list
          setCurrentIndex(0);
        }
        setIsValidating(false);
      }, 500);
      
    } catch (error) {
      console.error('Validation error:', error);
      setIsValidating(false);
    }
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isValidating) return;
      
      switch(e.key) {
        case 'ArrowLeft':
        case '1':
          handleVote('nah');
          break;
        case 'ArrowRight':
        case '2':
          handleVote('wave');
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentTrend, isValidating]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trends...</p>
        </div>
      </div>
    );
  }
  
  if (!trends || trends.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No trends to validate</h2>
          <p className="text-gray-500">Check back later for new submissions!</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">
            {currentIndex + 1} of {trends.length} trends
          </span>
          <span className="text-sm font-medium text-blue-600">
            +{xpEarned} XP earned this session
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / trends.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
      
      {/* Trend Card */}
      <AnimatePresence mode="wait">
        {currentTrend && (
          <motion.div
            key={currentTrend.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl shadow-lg overflow-hidden"
          >
            {/* Thumbnail */}
            {currentTrend.thumbnail_url && (
              <div className="relative h-64 bg-gray-100">
                <img
                  src={currentTrend.thumbnail_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* Content */}
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {currentTrend.title || currentTrend.description || 'Untitled Trend'}
              </h2>
              
              {currentTrend.description && currentTrend.description !== currentTrend.title && (
                <p className="text-gray-600 mb-4">{currentTrend.description}</p>
              )}
              
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Category: {currentTrend.category || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Wave Score: {currentTrend.wave_score || 50}/100
                  </span>
                </div>
              </div>
              
              {/* Source URL */}
              {currentTrend.post_url && (
                <a
                  href={currentTrend.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:text-blue-600 truncate block mb-6"
                >
                  View original post →
                </a>
              )}
            </div>
            
            {/* Vote Buttons */}
            <div className="border-t border-gray-200 p-6">
              <div className="flex gap-4">
                <button
                  onClick={() => handleVote('nah')}
                  disabled={isValidating}
                  className="flex-1 py-4 px-6 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg font-medium transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  <ThumbsDown className="w-5 h-5" />
                  Nah (←)
                </button>
                
                <button
                  onClick={() => handleVote('wave')}
                  disabled={isValidating}
                  className="flex-1 py-4 px-6 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg font-medium transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  <ThumbsUp className="w-5 h-5" />
                  Wave (→)
                </button>
              </div>
              
              <p className="text-center text-xs text-gray-500 mt-3">
                Use arrow keys or number keys (1/2) for quick voting
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* XP Animation */}
      <AnimatePresence>
        {isValidating && xpEarned > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-8 right-8 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2"
          >
            <Award className="w-5 h-5" />
            <span className="font-bold">+{xpEarned} XP</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}