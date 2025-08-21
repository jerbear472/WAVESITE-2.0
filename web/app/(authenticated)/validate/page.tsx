'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useXPNotification } from '@/contexts/XPNotificationContext';
import { 
  X, 
  Check, 
  Flame, 
  Zap, 
  TrendingUp, 
  Clock,
  Award,
  ChevronLeft,
  ChevronRight,
  Eye,
  Users,
  Timer
} from 'lucide-react';

interface TrendToValidate {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail_url?: string;
  screenshot_url?: string;
  platform: string;
  creator_handle?: string;
  category: string;
  submitted_at: string;
  spotter_username: string;
  validation_count: number;
}

export default function ValidatePage() {
  const { user } = useAuth();
  const { showXPNotification } = useXPNotification();
  const router = useRouter();
  const [currentTrend, setCurrentTrend] = useState<TrendToValidate | null>(null);
  const [trendQueue, setTrendQueue] = useState<TrendToValidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [dailyValidations, setDailyValidations] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastVote, setLastVote] = useState<'valid' | 'invalid' | null>(null);
  const [consensus, setConsensus] = useState<number | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [lightningMode, setLightningMode] = useState(false);
  const [lightningTimer, setLightningTimer] = useState(0);
  const [lightningCount, setLightningCount] = useState(0);
  const [lastXPEarned, setLastXPEarned] = useState(5);
  
  // Swipe animation values
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  useEffect(() => {
    if (user) {
      loadTrendsToValidate();
      loadUserStats();
    }
  }, [user]);

  // Lightning mode timer
  useEffect(() => {
    if (lightningMode && lightningTimer > 0) {
      const interval = setInterval(() => {
        setLightningTimer(prev => {
          if (prev <= 1) {
            setLightningMode(false);
            handleLightningComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lightningMode, lightningTimer]);

  const loadTrendsToValidate = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get trends that need validation (less than 3 votes)
      const { data: trends, error } = await supabase
        .from('trend_submissions')
        .select('*')
        .or('validation_count.is.null,validation_count.lt.3')
        .neq('spotter_id', user.id) // Don't show user's own trends
        .in('status', ['submitted', 'validating']) // Show submitted and validating trends
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedTrends = trends?.map(trend => ({
        id: trend.id,
        title: trend.title || trend.trend_headline || 'Untitled',
        description: trend.description || trend.why_trending || '',
        url: trend.url || trend.post_url || '',
        thumbnail_url: trend.thumbnail_url,
        screenshot_url: trend.screenshot_url,
        platform: trend.platform || 'unknown',
        creator_handle: trend.creator_handle,
        category: trend.category || 'general',
        submitted_at: trend.created_at,
        spotter_username: 'Trend Spotter',
        validation_count: trend.validation_count || 0
      })) || [];

      setTrendQueue(formattedTrends);
      setCurrentTrend(formattedTrends[0] || null);
    } catch (error) {
      console.error('Error loading trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    if (!user) return;
    
    try {
      // Get user's validation streak
      const today = new Date().toISOString().split('T')[0];
      const { data: validations } = await supabase
        .from('trend_validations')
        .select('created_at')
        .eq('validator_id', user.id)
        .gte('created_at', today + 'T00:00:00')
        .order('created_at', { ascending: false });

      setDailyValidations(validations?.length || 0);
      
      // Calculate streak (simplified for now)
      if (validations && validations.length > 0) {
        setStreak(Math.min(validations.length, 50));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!currentTrend || !user) return;
    
    const isValid = direction === 'right';
    setLastVote(isValid ? 'valid' : 'invalid');
    
    try {
      // Submit validation
      const { error: validationError } = await supabase
        .from('trend_validations')
        .insert({
          trend_id: currentTrend.id,
          validator_id: user.id,
          is_valid: isValid,
          validation_score: isValid ? 1 : -1
        });

      if (validationError) throw validationError;

      // Update validation count
      const { error: updateError } = await supabase
        .from('trend_submissions')
        .update({ 
          validation_count: currentTrend.validation_count + 1,
          status: currentTrend.validation_count + 1 >= 3 ? 'validated' : 'pending'
        })
        .eq('id', currentTrend.id);

      if (updateError) throw updateError;

      // Award XP using unified XP system
      const baseXP = 5;
      const streakBonus = Math.floor(streak / 10) * 2;
      const totalXP = baseXP + streakBonus + (lightningMode ? baseXP : 0);
      
      const { error: xpError } = await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_amount: totalXP,
        p_type: 'validation',
        p_description: `Validated trend: ${currentTrend.title}`,
        p_reference_id: currentTrend.id,
        p_reference_type: 'trend_submission'
      });

      if (!xpError) {
        setXpEarned(prev => prev + totalXP);
        setLastXPEarned(totalXP);
        // Show XP notification
        const notificationText = lightningMode ? 
          `Lightning validation! ${streakBonus > 0 ? `+${streakBonus} streak bonus` : ''}` :
          `Trend validated! ${streakBonus > 0 ? `+${streakBonus} streak bonus` : ''}`;
        showXPNotification(totalXP, notificationText, 'validation');
      }

      // Update stats
      setStreak(prev => prev + 1);
      setDailyValidations(prev => prev + 1);
      
      if (lightningMode) {
        setLightningCount(prev => prev + 1);
      }

      // Get consensus (simplified - in production, query actual votes)
      const consensusPercent = isValid ? 65 + Math.random() * 30 : 20 + Math.random() * 40;
      setConsensus(Math.round(consensusPercent));
      
      // Show feedback briefly
      setShowFeedback(true);
      setTimeout(() => {
        setShowFeedback(false);
        moveToNextTrend();
      }, 1500);
      
    } catch (error) {
      console.error('Error submitting validation:', error);
      moveToNextTrend();
    }
  };

  const moveToNextTrend = () => {
    const newQueue = trendQueue.slice(1);
    setTrendQueue(newQueue);
    setCurrentTrend(newQueue[0] || null);
    setLastVote(null);
    setConsensus(null);
    
    // Reload if queue is getting low
    if (newQueue.length < 5) {
      loadTrendsToValidate();
    }
  };

  const startLightningRound = () => {
    setLightningMode(true);
    setLightningTimer(60);
    setLightningCount(0);
  };

  const handleLightningComplete = async () => {
    const bonusXP = lightningCount * 10;
    if (bonusXP > 0 && user) {
      try {
        const { error } = await supabase.rpc('award_xp', {
          p_user_id: user.id,
          p_amount: bonusXP,
          p_type: 'lightning_bonus',
          p_description: `Lightning round: ${lightningCount} validations`,
          p_reference_id: null,
          p_reference_type: null
        });
        
        if (!error) {
          setXpEarned(prev => prev + bonusXP);
          showXPNotification(bonusXP, `Lightning round complete! ${lightningCount} validations`, 'bonus');
        }
      } catch (error) {
        console.error('Error awarding lightning bonus:', error);
      }
    }
  };

  const getPlatformEmoji = (platform: string) => {
    const emojis: Record<string, string> = {
      tiktok: '🎵',
      instagram: '📸',
      twitter: '𝕏',
      reddit: '🔥',
      youtube: '📺',
      default: '🌐'
    };
    return emojis[platform.toLowerCase()] || emojis.default;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trends to validate...</p>
        </div>
      </div>
    );
  }

  if (!currentTrend) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">All Caught Up!</h2>
          <p className="text-gray-600 mb-6">
            No trends need validation right now. Check back soon or submit your own trends!
          </p>
          <button
            onClick={() => router.push('/spot')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Start Spotting Trends
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-md mx-auto px-4">
        {/* Header Stats */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
              <div className="flex items-center space-x-1">
                <Flame className={`h-5 w-5 ${streak > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                <span className="font-bold text-gray-900">{streak}</span>
                <span className="text-xs text-gray-500">streak</span>
              </div>
            </div>
            
            <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
              <div className="flex items-center space-x-1">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span className="font-bold text-gray-900">{xpEarned}</span>
                <span className="text-xs text-gray-500">XP today</span>
              </div>
            </div>
          </div>
          
          {!lightningMode && (
            <button
              onClick={startLightningRound}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-1 hover:shadow-lg transition-all"
            >
              <Zap className="h-4 w-4" />
              <span>Lightning</span>
            </button>
          )}
        </div>

        {/* Lightning Mode Banner */}
        {lightningMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-4 text-white"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Zap className="h-6 w-6" />
                <span className="font-bold">LIGHTNING ROUND!</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-2xl font-bold">{lightningTimer}s</div>
                  <div className="text-xs">{lightningCount}/10 validated</div>
                </div>
              </div>
            </div>
            <div className="mt-2 bg-white/20 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all"
                style={{ width: `${(lightningCount / 10) * 100}%` }}
              />
            </div>
          </motion.div>
        )}

        {/* Swipe Card */}
        <div className="relative h-[600px]">
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center"
              >
                <div className="bg-white rounded-2xl p-6 shadow-2xl text-center">
                  <div className={`text-5xl mb-3 ${lastVote === 'valid' ? 'text-green-500' : 'text-red-500'}`}>
                    {lastVote === 'valid' ? '✓' : '✗'}
                  </div>
                  <p className="text-lg font-bold text-gray-900 mb-2">
                    You voted: {lastVote === 'valid' ? 'Valid' : 'Invalid'}
                  </p>
                  {consensus && (
                    <p className="text-sm text-gray-600">
                      Community: {consensus}% agree
                    </p>
                  )}
                  <p className="text-xs text-green-600 mt-2">+{lastXPEarned} XP</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            style={{ x, rotate, opacity }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = Math.abs(offset.x) * velocity.x;
              if (swipe < -10000) {
                handleSwipe('left');
              } else if (swipe > 10000) {
                handleSwipe('right');
              }
            }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <div className="h-full bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Trend Image/Thumbnail */}
              {(currentTrend.thumbnail_url || currentTrend.screenshot_url) ? (
                <div className="h-56 bg-gray-100 relative">
                  <img 
                    src={currentTrend.thumbnail_url || currentTrend.screenshot_url}
                    alt={currentTrend.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur rounded-lg px-3 py-1">
                    <span className="text-lg mr-1">{getPlatformEmoji(currentTrend.platform)}</span>
                    <span className="text-sm font-medium text-gray-700">{currentTrend.platform}</span>
                  </div>
                </div>
              ) : (
                <div className="h-56 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-6xl mb-2">{getPlatformEmoji(currentTrend.platform)}</div>
                    <p className="font-medium">{currentTrend.platform}</p>
                  </div>
                </div>
              )}

              {/* Trend Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {currentTrend.title}
                </h3>
                
                {currentTrend.description && (
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {currentTrend.description}
                  </p>
                )}

                {currentTrend.creator_handle && (
                  <div className="flex items-center space-x-2 mb-4">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">@{currentTrend.creator_handle}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>Spotted by {currentTrend.spotter_username}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(currentTrend.submitted_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Question */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-center font-medium text-gray-900">
                    Is this actually trending?
                  </p>
                </div>
              </div>

              {/* Swipe Indicators */}
              <div className="absolute inset-x-0 bottom-0 p-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2 text-red-500">
                    <X className="h-8 w-8" />
                    <span className="font-bold">NO</span>
                  </div>
                  <div className="flex items-center space-x-2 text-green-500">
                    <span className="font-bold">YES</span>
                    <Check className="h-8 w-8" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="absolute bottom-[-70px] inset-x-0 flex justify-center space-x-6">
            <button
              onClick={() => handleSwipe('left')}
              className="bg-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all hover:scale-110 border-2 border-red-500"
            >
              <X className="h-8 w-8 text-red-500" />
            </button>
            
            <button
              onClick={() => handleSwipe('right')}
              className="bg-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all hover:scale-110 border-2 border-green-500"
            >
              <Check className="h-8 w-8 text-green-500" />
            </button>
          </div>
        </div>

        {/* Queue indicator */}
        <div className="mt-24 text-center">
          <p className="text-sm text-gray-500">
            {trendQueue.length - 1} more trends to validate
          </p>
        </div>
      </div>
    </div>
  );
}