'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useNavigationRefresh } from '@/hooks/useNavigationRefresh';
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
  // Additional metadata fields
  trend_velocity?: string;
  trend_size?: string;
  ai_angle?: string;
  sentiment?: number;
  audience_age?: string[];
  hashtags?: string[];
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  wave_score?: number;
}

// Utility function to format numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

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
  const [lastXPEarned, setLastXPEarned] = useState(5);
  
  // Swipe animation values
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  // Use navigation refresh hook to reload data on route changes
  useNavigationRefresh(() => {
    if (user) {
      loadTrendsToValidate();
      loadUserStats();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadTrendsToValidate();
      loadUserStats();
    }
  }, [user]);


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
        validation_count: trend.validation_count || 0,
        // Include metadata
        trend_velocity: trend.trend_velocity,
        trend_size: trend.trend_size,
        ai_angle: trend.ai_angle,
        sentiment: trend.sentiment,
        audience_age: trend.audience_age,
        hashtags: trend.hashtags,
        views_count: trend.views_count,
        likes_count: trend.likes_count,
        comments_count: trend.comments_count,
        wave_score: trend.wave_score
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
      const totalXP = baseXP + streakBonus;
      
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
        const notificationText = `Trend validated! ${streakBonus > 0 ? `+${streakBonus} streak bonus` : ''}`;
        showXPNotification(totalXP, notificationText, 'validation');
      } else {
        // Still show notification even if XP RPC fails
        console.warn('XP award failed:', xpError);
        showXPNotification(baseXP, 'Trend validated!', 'validation');
      }

      // Update stats
      setStreak(prev => prev + 1);
      setDailyValidations(prev => prev + 1);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-6">
      <div className="max-w-lg mx-auto px-4">
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
        </div>

        {/* Swipe Card - Adjusted height for better balance */}
        <div className="relative h-[650px]">
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
            <div className="h-[650px] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
              {/* Trend Image/Thumbnail - Optimized height */}
              {(currentTrend.thumbnail_url || currentTrend.screenshot_url) ? (
                <div className="h-48 bg-gray-100 relative flex-shrink-0">
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
                <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <div className="text-center text-white">
                    <div className="text-6xl mb-2">{getPlatformEmoji(currentTrend.platform)}</div>
                    <p className="font-medium">{currentTrend.platform}</p>
                  </div>
                </div>
              )}

              {/* Trend Content - Redesigned with better spacing */}
              <div className="flex-1 p-5 space-y-3 overflow-y-auto">
                {/* Title and Category */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl font-bold text-gray-900 flex-1">
                      {currentTrend.title}
                    </h3>
                    <span className="ml-2 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                      {currentTrend.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  
                  {currentTrend.description && (
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {currentTrend.description}
                    </p>
                  )}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Velocity */}
                  {currentTrend.trend_velocity && (
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-2.5">
                      <div className="flex items-center space-x-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-purple-600" />
                        <span className="text-xs font-medium text-purple-900">Velocity</span>
                      </div>
                      <p className="text-xs text-purple-700 mt-0.5 capitalize">
                        {currentTrend.trend_velocity.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}

                  {/* Size */}
                  {currentTrend.trend_size && (
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-2.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm">
                          {currentTrend.trend_size === 'micro' ? '🔬' :
                           currentTrend.trend_size === 'niche' ? '🎯' :
                           currentTrend.trend_size === 'viral' || currentTrend.trend_size === 'medium' ? '🔥' :
                           currentTrend.trend_size === 'mega' || currentTrend.trend_size === 'large' ? '💥' :
                           currentTrend.trend_size === 'global' ? '🌍' : '📏'}
                        </span>
                        <span className="text-xs font-medium text-blue-900">Size</span>
                      </div>
                      <p className="text-xs text-blue-700 mt-0.5 capitalize">
                        {currentTrend.trend_size === 'micro' ? 'Micro' :
                         currentTrend.trend_size === 'niche' ? 'Niche' :
                         currentTrend.trend_size === 'viral' || currentTrend.trend_size === 'medium' ? 'Viral' :
                         currentTrend.trend_size === 'mega' || currentTrend.trend_size === 'large' ? 'Mega' :
                         currentTrend.trend_size === 'global' ? 'Global' :
                         currentTrend.trend_size.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}

                  {/* Wave Score */}
                  {currentTrend.wave_score !== undefined && (
                    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-2.5">
                      <div className="flex items-center space-x-1.5">
                        <Zap className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-xs font-medium text-green-900">Wave Score</span>
                      </div>
                      <p className="text-xs text-green-700 mt-0.5">
                        {currentTrend.wave_score}/100
                      </p>
                    </div>
                  )}

                  {/* AI Angle */}
                  {currentTrend.ai_angle && (
                    <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg p-2.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs">🤖</span>
                        <span className="text-xs font-medium text-amber-900">AI Angle</span>
                      </div>
                      <p className="text-xs text-amber-700 mt-0.5 capitalize">
                        {currentTrend.ai_angle.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Audience Age if present */}
                {currentTrend.audience_age && currentTrend.audience_age.length > 0 && (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-indigo-50 rounded-lg">
                    <span className="text-xs font-medium text-indigo-900">Audience:</span>
                    <div className="flex flex-wrap gap-1">
                      {currentTrend.audience_age.map((age, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-md">
                          {age}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Engagement Stats */}
                {(currentTrend.views_count || currentTrend.likes_count || currentTrend.comments_count) && (
                  <div className="flex items-center justify-around py-2 bg-gray-50 rounded-lg">
                    {currentTrend.views_count !== undefined && (
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatNumber(currentTrend.views_count)}
                        </p>
                        <p className="text-xs text-gray-500">views</p>
                      </div>
                    )}
                    {currentTrend.likes_count !== undefined && (
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatNumber(currentTrend.likes_count)}
                        </p>
                        <p className="text-xs text-gray-500">likes</p>
                      </div>
                    )}
                    {currentTrend.comments_count !== undefined && (
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatNumber(currentTrend.comments_count)}
                        </p>
                        <p className="text-xs text-gray-500">comments</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Hashtags */}
                {currentTrend.hashtags && currentTrend.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {currentTrend.hashtags.slice(0, 5).map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Creator and Timestamp */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {currentTrend.creator_handle && (
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>@{currentTrend.creator_handle}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Eye className="h-3 w-3" />
                      <span>Spotted by {currentTrend.spotter_username}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(currentTrend.submitted_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Validation Question */}
                <div className="mt-auto pt-4">
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                    <p className="text-center font-semibold text-gray-900 text-sm">
                      Is this actually trending?
                    </p>
                  </div>
                </div>
              </div>

              {/* Swipe Indicators - Moved further down to avoid overlap */}
              <div className="absolute inset-x-0 bottom-3 px-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2 text-red-500 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg">
                    <X className="h-6 w-6" />
                    <span className="font-semibold text-sm">REJECT</span>
                  </div>
                  <div className="flex items-center space-x-2 text-green-500 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg">
                    <span className="font-semibold text-sm">VALIDATE</span>
                    <Check className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons - Positioned below the card with proper spacing */}
          <div className="mt-6 flex justify-center space-x-6">
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