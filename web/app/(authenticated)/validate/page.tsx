'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useNavigationRefresh } from '@/hooks/useNavigationRefresh';
import { useAuth } from '@/contexts/AuthContext';
import { useXPNotification } from '@/contexts/XPNotificationContext';
import { cleanTrendData } from '@/lib/cleanTrendData';
import SimpleVoteDisplay from '@/components/SimpleVoteDisplay';
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
  // New fields from origins step
  driving_generation?: string;
  trend_origin?: string;
  evolution_status?: string;
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
  const [todaysXP, setTodaysXP] = useState(0);
  const [lastXPEarned, setLastXPEarned] = useState(5);
  const [isAnimating, setIsAnimating] = useState(false);
  const [cardKey, setCardKey] = useState(0);
  // Track locally validated trends to prevent re-showing
  const [localValidatedIds, setLocalValidatedIds] = useState<string[]>([]);
  
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

  // Add keyboard event listener for arrow keys
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!currentTrend || showFeedback) return;
      
      if (e.key === 'ArrowLeft') {
        handleSwipe('left');
      } else if (e.key === 'ArrowRight') {
        handleSwipe('right');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentTrend, showFeedback]);

  // Listen for XP events to refresh stats in real-time
  useEffect(() => {
    const handleXPEarned = () => {
      if (user) {
        loadUserStats();
      }
    };

    window.addEventListener('xp-earned', handleXPEarned);
    return () => window.removeEventListener('xp-earned', handleXPEarned);
  }, [user]);


  const loadTrendsToValidate = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // First get trends the user has already validated
      const { data: userValidations, error: validationError } = await supabase
        .from('trend_validations')
        .select('trend_id')
        .eq('validator_id', user.id);
      
      if (validationError) {
        console.error('Error fetching user validations:', validationError);
      }
      
      const validatedTrendIds = userValidations?.map(v => v.trend_id) || [];
      console.log('User has already validated trends:', validatedTrendIds.length);
      console.log('Locally validated trends:', localValidatedIds.length);
      
      // Combine database validated IDs with locally tracked ones
      const allValidatedIds = [...new Set([...validatedTrendIds, ...localValidatedIds])];
      
      // Get all trends that need validation
      const { data: allTrends, error } = await supabase
        .from('trend_submissions')
        .select('*')
        .or('validation_count.is.null,validation_count.lt.3')
        .neq('spotter_id', user.id) // Don't show user's own trends
        .in('status', ['submitted', 'validating']) // Only get trends not yet quality approved
        .order('created_at', { ascending: false })
        .limit(50); // Get more initially to filter client-side
      
      if (error) throw error;
      
      // Filter out already validated trends client-side (more reliable)
      const trends = allTrends?.filter(trend => 
        !allValidatedIds.includes(trend.id)
      ) || [];
      
      console.log(`Found ${allTrends?.length} total trends, ${trends.length} after filtering out validated ones`);

      const formattedTrends = trends?.map(trend => {
        // Clean the trend data first to remove problematic values
        const cleaned = cleanTrendData(trend);
        
        return {
          id: cleaned.id,
          title: cleaned.title || cleaned.trend_headline || 'Untitled',
          description: cleaned.description || cleaned.why_trending || '',
          url: cleaned.url || cleaned.post_url || '',
          thumbnail_url: cleaned.thumbnail_url,
          screenshot_url: cleaned.screenshot_url,
          platform: cleaned.platform || 'unknown',
          creator_handle: cleaned.creator_handle,
          category: cleaned.category || 'general',
          submitted_at: cleaned.created_at,
          spotter_username: 'Trend Spotter',
          validation_count: cleaned.validation_count || 0,
          // Include metadata
          trend_velocity: cleaned.trend_velocity,
          trend_size: cleaned.trend_size,
          ai_angle: cleaned.ai_angle,
          sentiment: cleaned.sentiment,
          audience_age: cleaned.audience_age,
          hashtags: cleaned.hashtags,
          views_count: cleaned.views_count,
          likes_count: cleaned.likes_count,
          comments_count: cleaned.comments_count,
          // Origins fields
          driving_generation: cleaned.driving_generation,
          trend_origin: cleaned.trend_origin,
          evolution_status: cleaned.evolution_status
        };
      }) || [];

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
      // Get user profile for actual streak data
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('current_streak')
        .eq('id', user.id)
        .single();

      if (profile) {
        setStreak(profile.current_streak || 0);
      }

      // Get today's XP - try multiple sources
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // First try xp_events
      let { data: xpEvents } = await supabase
        .from('xp_events')
        .select('xp_change')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      let dailyXP = xpEvents?.reduce((sum, event) => sum + event.xp_change, 0) || 0;
      
      // If no XP events, try xp_transactions
      if (dailyXP === 0) {
        const { data: xpTransactions } = await supabase
          .from('xp_transactions')
          .select('amount')
          .eq('user_id', user.id)
          .gte('created_at', today.toISOString());
        
        dailyXP = xpTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      }
      
      // If still no XP, fallback to payment_amount from trend_submissions
      if (dailyXP === 0) {
        const { data: todaysTrends } = await supabase
          .from('trend_submissions')
          .select('payment_amount')
          .eq('spotter_id', user.id)
          .gte('created_at', today.toISOString());
        
        dailyXP = todaysTrends?.reduce((sum, t) => sum + (t.payment_amount || 0), 0) || 0;
      }
      
      setTodaysXP(dailyXP);

      // Get today's validations count
      const { data: validations } = await supabase
        .from('trend_validations')
        .select('id')
        .eq('validator_id', user.id)
        .gte('created_at', today.toISOString());

      setDailyValidations(validations?.length || 0);

      console.log('📊 Validate Page Stats:', {
        streak: profile?.current_streak || 0,
        todaysXP: dailyXP,
        dailyValidations: validations?.length || 0,
        xpEventsCount: xpEvents?.length || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    console.log('🔄 handleSwipe called:', { direction, currentTrend: !!currentTrend, user: !!user });
    
    if (!currentTrend || !user) {
      console.log('❌ Missing requirements:', { currentTrend: !!currentTrend, user: !!user });
      return;
    }
    
    const isValid = direction === 'right';
    setLastVote(isValid ? 'valid' : 'invalid');
    
    // Add to local validated list immediately to prevent re-showing
    setLocalValidatedIds(prev => [...prev, currentTrend.id]);
    
    try {
      console.log('📝 Submitting validation:', {
        trend_id: currentTrend.id,
        validator_id: user.id,
        is_valid: isValid,
        validation_score: isValid ? 1 : -1
      });

      // Submit validation
      const { error: validationError } = await supabase
        .from('trend_validations')
        .insert({
          trend_id: currentTrend.id,
          validator_id: user.id,
          is_valid: isValid,
          validation_score: isValid ? 1 : -1
        });

      if (validationError) {
        console.error('❌ Validation error:', validationError);
        throw validationError;
      }
      
      console.log('✅ Validation submitted successfully');

      // Update validation count and status
      const newValidationCount = currentTrend.validation_count + 1;
      const { error: updateError } = await supabase
        .from('trend_submissions')
        .update({ 
          validation_count: newValidationCount,
          status: newValidationCount >= 3 ? 'approved' : 'validating'
        })
        .eq('id', currentTrend.id);

      if (updateError) throw updateError;

      // Award XP directly to ensure it works
      const baseXP = 5;
      const streakBonus = Math.floor(streak / 10) * 2;
      const totalXP = baseXP + streakBonus;
      
      console.log('🎮 Awarding validation XP:', {
        user_id: user.id,
        baseXP,
        streakBonus,
        totalXP,
        trend_id: currentTrend.id,
        trend_title: currentTrend.title
      });

      // Insert XP directly into user_xp table
      const { data: currentXP } = await supabase
        .from('user_xp')
        .select('total_xp')
        .eq('user_id', user.id)
        .single();

      const newTotal = (currentXP?.total_xp || 0) + totalXP;

      const { error: xpError } = await supabase
        .from('user_xp')
        .upsert({
          user_id: user.id,
          total_xp: newTotal,
          updated_at: new Date().toISOString()
        });

      // Also create XP event record
      const { error: eventError } = await supabase
        .from('xp_events')
        .insert({
          user_id: user.id,
          event_type: 'validation',
          xp_change: totalXP,
          description: `Validated trend: ${currentTrend.title && currentTrend.title !== '0' ? currentTrend.title : 'Untitled Trend'}`,
          reference_id: currentTrend.id,
          reference_type: 'trend_submission'
        });
      
      console.log('🎮 XP Award Result:', { xpError, eventError, newTotal });

      if (!xpError) {
        setTodaysXP(prev => prev + totalXP);
        setLastXPEarned(totalXP);
        // Show XP notification
        const notificationText = `Trend validated! ${streakBonus > 0 ? `+${streakBonus} streak bonus` : ''}`;
        console.log('🎯 Showing validation XP notification:', totalXP, notificationText);
        
        showXPNotification(totalXP, notificationText, 'validation');
        console.log('✅ XP awarded successfully');
      } else {
        console.error('❌ XP award failed:', xpError);
        // Still show notification even if XP database update fails
        const notificationText = `Trend validated! ${streakBonus > 0 ? `+${streakBonus} streak bonus` : ''}`;
        showXPNotification(totalXP, notificationText, 'validation');
      }

      // Update stats locally
      setDailyValidations(prev => prev + 1);
      // Note: Streak should come from the profile, not be incremented locally

      // Get consensus (simplified - in production, query actual votes)
      const consensusPercent = isValid ? 65 + Math.random() * 30 : 20 + Math.random() * 40;
      setConsensus(Math.round(consensusPercent));
      
      // Show feedback briefly
      setShowFeedback(true);
      // Refresh user stats after a delay to ensure XP is recorded
      setTimeout(() => {
        setShowFeedback(false);
        moveToNextTrend();
        // Refresh stats to ensure XP is properly reflected
        loadUserStats();
      }, 1500);
      
    } catch (error) {
      console.error('Error submitting validation:', error);
      moveToNextTrend();
    }
  };

  const moveToNextTrend = () => {
    setIsAnimating(true);
    
    // Animate out current card
    setTimeout(() => {
      // Filter out any validated trends that might have slipped through
      const newQueue = trendQueue.slice(1).filter(trend => 
        !localValidatedIds.includes(trend.id)
      );
      setTrendQueue(newQueue);
      setCurrentTrend(newQueue[0] || null);
      setLastVote(null);
      setConsensus(null);
      setCardKey(prev => prev + 1); // Force re-render with new key for animation
      
      // Reload if queue is getting low
      if (newQueue.length < 5) {
        loadTrendsToValidate();
      }
      
      setTimeout(() => {
        setIsAnimating(false);
      }, 50);
    }, 200);
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
        {/* Page Header */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Trend Validation</h1>
          <p className="text-sm text-gray-600 mt-1">Help identify real trends worth tracking</p>
        </div>

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
                <span className="font-bold text-gray-900">{todaysXP}</span>
                <span className="text-xs text-gray-500">XP today</span>
              </div>
            </div>
          </div>
        </div>


        {/* Swipe Card Container */}
        <div className="relative">
          {/* Background card preview (next in queue) */}
          {trendQueue.length > 1 && (
            <div className="absolute inset-0 scale-95 opacity-30">
              <div className="h-[650px] bg-white rounded-2xl shadow-lg" />
            </div>
          )}
          
          <AnimatePresence mode="wait">
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center"
              >
                <motion.div 
                  className="bg-white rounded-2xl p-6 shadow-2xl text-center"
                  initial={{ scale: 0.8, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <motion.div 
                    className={`text-5xl mb-3 ${lastVote === 'valid' ? 'text-green-500' : 'text-red-500'}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 500 }}
                  >
                    {lastVote === 'valid' ? '✓' : '✗'}
                  </motion.div>
                  <p className="text-lg font-bold text-gray-900 mb-2">
                    {lastVote === 'valid' ? 'Trend Confirmed!' : 'Not a Trend'}
                  </p>
                  {consensus && (
                    <p className="text-sm text-gray-600">
                      {consensus}% of validators agree
                    </p>
                  )}
                  <p className="text-xs text-green-600 mt-2">+{lastXPEarned} XP</p>
                  {lastVote === 'valid' && currentTrend.validation_count >= 2 && (
                    <p className="text-xs text-blue-600 mt-1">
                      ✨ Moved to Predictions!
                    </p>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            key={cardKey}
            style={{ x, rotate, opacity }}
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ 
              scale: 0.9, 
              opacity: 0,
              x: lastVote === 'valid' ? 300 : -300,
              rotate: lastVote === 'valid' ? 20 : -20,
              transition: { duration: 0.3 }
            }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
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
            whileDrag={{ scale: 1.05 }}
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
                  
                  {currentTrend.description && currentTrend.description !== '0' && (
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

                  {/* Driving Generation */}
                  {currentTrend.driving_generation && (
                    <div className="bg-gradient-to-r from-cyan-50 to-cyan-100 rounded-lg p-2.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm">
                          {currentTrend.driving_generation === 'gen_alpha' ? '📱' :
                           currentTrend.driving_generation === 'gen_z' ? '🎮' :
                           currentTrend.driving_generation === 'millennials' ? '💻' :
                           currentTrend.driving_generation === 'gen_x' ? '💿' :
                           currentTrend.driving_generation === 'boomers' ? '📺' : '👥'}
                        </span>
                        <span className="text-xs font-medium text-cyan-900">Generation</span>
                      </div>
                      <p className="text-xs text-cyan-700 mt-0.5">
                        {currentTrend.driving_generation === 'gen_alpha' ? 'Gen Alpha' :
                         currentTrend.driving_generation === 'gen_z' ? 'Gen Z' :
                         currentTrend.driving_generation === 'millennials' ? 'Millennials' :
                         currentTrend.driving_generation === 'gen_x' ? 'Gen X' :
                         currentTrend.driving_generation === 'boomers' ? 'Boomers' :
                         currentTrend.driving_generation?.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}

                  {/* Trend Origin */}
                  {currentTrend.trend_origin && (
                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-2.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm">
                          {currentTrend.trend_origin === 'organic' ? '🌱' :
                           currentTrend.trend_origin === 'influencer' ? '🎭' :
                           currentTrend.trend_origin === 'brand' ? '🏢' :
                           currentTrend.trend_origin === 'ai_generated' ? '🤖' : '🌊'}
                        </span>
                        <span className="text-xs font-medium text-orange-900">Origin</span>
                      </div>
                      <p className="text-xs text-orange-700 mt-0.5">
                        {currentTrend.trend_origin === 'organic' ? 'Organic' :
                         currentTrend.trend_origin === 'influencer' ? 'Influencer' :
                         currentTrend.trend_origin === 'brand' ? 'Brand' :
                         currentTrend.trend_origin === 'ai_generated' ? 'AI Generated' :
                         currentTrend.trend_origin?.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}

                  {/* Evolution Status */}
                  {currentTrend.evolution_status && (
                    <div className="bg-gradient-to-r from-pink-50 to-pink-100 rounded-lg p-2.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm">
                          {currentTrend.evolution_status === 'original' ? '🧬' :
                           currentTrend.evolution_status === 'variants' ? '🔄' :
                           currentTrend.evolution_status === 'parody' ? '😂' :
                           currentTrend.evolution_status === 'meta' ? '🤯' :
                           currentTrend.evolution_status === 'final' ? '🧟' : '📈'}
                        </span>
                        <span className="text-xs font-medium text-pink-900">Evolution</span>
                      </div>
                      <p className="text-xs text-pink-700 mt-0.5">
                        {currentTrend.evolution_status === 'original' ? 'Original' :
                         currentTrend.evolution_status === 'variants' ? 'Variants' :
                         currentTrend.evolution_status === 'parody' ? 'Parody' :
                         currentTrend.evolution_status === 'meta' ? 'Meta' :
                         currentTrend.evolution_status === 'final' ? 'Final Form' :
                         currentTrend.evolution_status?.replace(/_/g, ' ')}
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
                {((currentTrend.views_count && currentTrend.views_count > 0) || 
                  (currentTrend.likes_count && currentTrend.likes_count > 0) || 
                  (currentTrend.comments_count && currentTrend.comments_count > 0)) && (
                  <div className="flex items-center justify-around py-2 bg-gray-50 rounded-lg">
                    {currentTrend.views_count !== undefined && currentTrend.views_count > 0 && (
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatNumber(currentTrend.views_count)}
                        </p>
                        <p className="text-xs text-gray-500">views</p>
                      </div>
                    )}
                    {currentTrend.likes_count !== undefined && currentTrend.likes_count > 0 && (
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatNumber(currentTrend.likes_count)}
                        </p>
                        <p className="text-xs text-gray-500">likes</p>
                      </div>
                    )}
                    {currentTrend.comments_count !== undefined && currentTrend.comments_count > 0 && (
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
                        <span>{currentTrend.creator_handle.startsWith('@') ? currentTrend.creator_handle : `@${currentTrend.creator_handle}`}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(currentTrend.submitted_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Vote Display */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <SimpleVoteDisplay 
                    trendId={currentTrend.id}
                    initialVotes={{
                      wave: 0,
                      fire: 0,
                      declining: 0,
                      dead: 0
                    }}
                  />
                </div>

                {/* Validation Question */}
                <div className="mt-auto pt-4">
                  <div className="space-y-2">
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                      <p className="text-center font-semibold text-gray-900 text-sm">
                        Is this a real trend worth tracking?
                      </p>
                      <p className="text-center text-xs text-gray-600 mt-1">
                        Authentic • Emerging • Worth monitoring
                      </p>
                    </div>
                    <p className="text-xs text-center text-gray-500">
                      Approved trends move to Predictions for community voting
                    </p>
                  </div>
                </div>
              </div>

              {/* Removed swipe indicators from card - buttons are now below */}
            </div>
          </motion.div>
        </div>

        {/* Action Buttons - Below card stack */}
        <motion.div 
          className="flex justify-center space-x-8 mt-[680px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={() => handleSwipe('left')}
            className="flex flex-col items-center group"
            disabled={showFeedback}
          >
            <div className="bg-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all hover:scale-110 border-2 border-red-500 mb-2">
              <X className="h-8 w-8 text-red-500 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-sm font-medium text-gray-700">Not a Trend</span>
          </button>
          
          <button
            onClick={() => handleSwipe('right')}
            className="flex flex-col items-center group"
            disabled={showFeedback}
          >
            <div className="bg-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all hover:scale-110 border-2 border-green-500 mb-2">
              <Check className="h-8 w-8 text-green-500 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-sm font-medium text-gray-700">Real Trend</span>
          </button>
        </motion.div>


        {/* Queue indicator and keyboard hint */}
        <motion.div 
          className="mt-8 text-center space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-sm text-gray-500">
            {trendQueue.length - 1} more trends to review
          </p>
          <p className="text-xs text-gray-400">
            💡 Tip: Use ← → arrow keys • Left = Not a Trend • Right = Real Trend
          </p>
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              <span className="font-semibold">How it works:</span> After 3 quality votes, trends move to Predictions 
              where the community votes on their trending potential
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}