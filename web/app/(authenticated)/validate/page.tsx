'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
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

const SWIPE_CONFIDENCE_THRESHOLD = 0.3;
const ROTATION_LIMIT = 30;

export default function ValidatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showXPNotification } = useXPNotification();
  const [trendQueue, setTrendQueue] = useState<TrendToValidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastVote, setLastVote] = useState<'valid' | 'invalid' | null>(null);
  const [consecutiveValidations, setConsecutiveValidations] = useState(0);
  const [isInConsensus, setIsInConsensus] = useState<boolean | null>(null);
  const [consensusPercentage, setConsensusPercentage] = useState<number>(0);
  const [showStreakAnimation, setShowStreakAnimation] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const swipeInProgressRef = useRef(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Navigation refresh hook
  const { refresh: refreshNav } = useNavigationRefresh(() => {
    // Callback to refresh navigation state
    console.log('Navigation refreshed');
  });

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-ROTATION_LIMIT, ROTATION_LIMIT]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const currentTrend = trendQueue[currentIndex];

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load user's current streak
  useEffect(() => {
    const loadUserStreak = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('validation_streak')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setCurrentStreak(data.validation_streak || 0);
        }
      } catch (error) {
        console.error('Error loading streak:', error);
      }
    };
    
    loadUserStreak();
  }, [user]);

  // Keyboard shortcuts for desktop
  useEffect(() => {
    if (isMobile) return;
    
    const handleKeyPress = (event: KeyboardEvent) => {
      if (showFeedback || !currentTrend) return;
      
      if (event.key === 'ArrowLeft' || event.key === 'a') {
        handleSwipe('left');
      } else if (event.key === 'ArrowRight' || event.key === 'd') {
        handleSwipe('right');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showFeedback, currentTrend]);

  const fetchTrends = useCallback(async () => {
    if (!user?.id) {
      setError('Please log in to validate trends');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Get trends that need validation (haven't been validated by this user)
      const { data: trends, error: trendsError } = await supabase
        .from('trend_submissions')
        .select(`
          id,
          title,
          description,
          post_url,
          thumbnail_url,
          screenshot_url,
          platform,
          creator_handle,
          category,
          created_at,
          validation_count,
          spotter_id,
          trend_velocity,
          trend_size,
          ai_angle,
          sentiment,
          audience_age,
          hashtags,
          views_count,
          likes_count,
          comments_count,
          driving_generation,
          trend_origin,
          evolution_status,
          profiles!trend_submissions_spotter_id_fkey (
            username
          )
        `)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false })
        .limit(20);

      if (trendsError) throw trendsError;

      // Filter out trends already validated by this user
      const { data: userValidations } = await supabase
        .from('trend_validations')
        .select('trend_id')
        .eq('validator_id', user.id);

      const validatedTrendIds = new Set(userValidations?.map(v => v.trend_id) || []);
      
      const unvalidatedTrends = (trends || [])
        .filter(trend => !validatedTrendIds.has(trend.id))
        .map(trend => {
          const cleaned = cleanTrendData(trend);
          return {
            id: cleaned.id,
            title: cleaned.title || cleaned.trend_headline || 'Untitled Trend',
            description: cleaned.description || cleaned.why_trending || '',
            url: cleaned.post_url || '',
            thumbnail_url: cleaned.thumbnail_url,
            screenshot_url: cleaned.screenshot_url,
            platform: cleaned.platform || 'unknown',
            creator_handle: cleaned.creator_handle,
            category: cleaned.category || 'lifestyle',
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
            driving_generation: cleaned.driving_generation,
            trend_origin: cleaned.trend_origin,
            evolution_status: cleaned.evolution_status
          } as TrendToValidate;
        });

      setTrendQueue(unvalidatedTrends);
      setCurrentIndex(0);
      setError('');
    } catch (error: any) {
      console.error('Error fetching trends:', error);
      setError('Failed to load trends. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const getPlatformEmoji = (platform?: string) => {
    const emojis: Record<string, string> = {
      'TikTok': '📱',
      'Instagram': '📸',
      'Twitter': '🐦',
      'X': '✖️',
      'YouTube': '📺',
      'Reddit': '🤖',
      'LinkedIn': '💼',
      'Facebook': '👥',
      'Threads': '🧵',
      'unknown': '🌐'
    };
    return emojis[platform || 'unknown'] || '🌐';
  };

  const checkConsensus = async (trendId: string, vote: 'valid' | 'invalid'): Promise<{ isInConsensus: boolean; percentage: number }> => {
    try {
      // Get all validations for this trend
      const { data: validations, error } = await supabase
        .from('trend_validations')
        .select('is_valid')
        .eq('trend_id', trendId);

      if (error) {
        console.error('Error checking consensus:', error);
        return { isInConsensus: false, percentage: 50 };
      }

      if (!validations || validations.length === 0) {
        // First validator - always in consensus
        return { isInConsensus: true, percentage: 100 };
      }

      // Calculate consensus
      const validCount = validations.filter(v => v.is_valid).length;
      const invalidCount = validations.length - validCount;
      
      // Add user's vote to the calculation
      const newValidCount = vote === 'valid' ? validCount + 1 : validCount;
      const newInvalidCount = vote === 'invalid' ? invalidCount + 1 : invalidCount;
      const total = newValidCount + newInvalidCount;
      
      // Calculate majority
      const majority = newValidCount > newInvalidCount ? 'valid' : 'invalid';
      const majorityCount = Math.max(newValidCount, newInvalidCount);
      const percentage = Math.round((majorityCount / total) * 100);
      
      // Check if user is with majority
      const isInConsensus = vote === majority;
      
      return { isInConsensus, percentage };
    } catch (error) {
      console.error('Error in consensus check:', error);
      return { isInConsensus: false, percentage: 50 };
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    console.log('🔄 handleSwipe called:', { 
      direction, 
      currentIndex, 
      hasCurrentTrend: !!currentTrend,
      inProgress: swipeInProgressRef.current 
    });
    
    // Prevent double-processing
    if (swipeInProgressRef.current || !currentTrend || !user?.id) {
      console.log('⚠️ Skipping swipe - already processing or no trend/user');
      return;
    }
    
    swipeInProgressRef.current = true;
    const vote = direction === 'right' ? 'valid' : 'invalid';
    setLastVote(vote);
    
    // Start swipe animation
    await animate(x, direction === 'left' ? -300 : 300, { 
      type: "spring",
      stiffness: 300,
      damping: 30
    });
    
    try {
      console.log('📝 Recording validation:', { trendId: currentTrend.id, vote });
      
      // Record the validation
      const { error: validationError } = await supabase
        .from('trend_validations')
        .insert({
          trend_id: currentTrend.id,
          validator_id: user.id,
          is_valid: vote === 'valid',
          confidence_score: 80
        });

      if (validationError) {
        console.error('❌ Validation error:', validationError);
        throw validationError;
      }

      console.log('✅ Validation recorded successfully');

      // Check consensus
      const consensus = await checkConsensus(currentTrend.id, vote);
      setIsInConsensus(consensus.isInConsensus);
      setConsensusPercentage(consensus.percentage);

      // Calculate XP based on consensus
      let xpAmount = 10; // Base XP
      if (consensus.isInConsensus) {
        xpAmount = 15; // Bonus for consensus
      }

      // Update streak
      const newConsecutive = consecutiveValidations + 1;
      setConsecutiveValidations(newConsecutive);
      
      // Award streak bonus every 5 validations
      if (newConsecutive % 5 === 0) {
        xpAmount += 20; // Streak bonus
        setShowStreakAnimation(true);
        setTimeout(() => setShowStreakAnimation(false), 2000);
        
        // Update user's validation streak in database
        await supabase
          .from('user_profiles')
          .update({ validation_streak: currentStreak + 1 })
          .eq('id', user.id);
        
        setCurrentStreak(prev => prev + 1);
      }

      // Check for accuracy bonus (when user reaches milestones)
      if (newConsecutive === 10) {
        xpAmount += 50; // Accuracy bonus
      }

      console.log('💰 Awarding XP:', xpAmount);

      // Award XP and record in xp_transactions
      try {
        const { error: xpError } = await supabase
          .from('xp_transactions')
          .insert({
            user_id: user.id,
            amount: xpAmount,
            type: 'validation',
            description: `Validated trend: ${currentTrend.title}`,
            reference_id: currentTrend.id,
            reference_type: 'trend_validation'
          });

        if (xpError) {
          console.error('XP transaction error:', xpError);
        } else {
          console.log('✅ XP awarded successfully');
        }

        // Update user's total XP
        const { data: userData } = await supabase
          .from('user_xp')
          .select('total_xp')
          .eq('user_id', user.id)
          .single();

        const currentXP = userData?.total_xp || 0;
        
        await supabase
          .from('user_xp')
          .upsert({
            user_id: user.id,
            total_xp: currentXP + xpAmount,
            updated_at: new Date().toISOString()
          });

      } catch (xpError) {
        console.error('Failed to award XP:', xpError);
      }

      // Show XP notification
      showXPNotification(
        xpAmount,
        consensus.isInConsensus 
          ? `In consensus! (${consensus.percentage}% agree)`
          : `Against consensus (${100 - consensus.percentage}% disagree)`,
        'validation'
      );

      // Show feedback
      setShowFeedback(true);
      
      // Move to next trend after delay
      setTimeout(() => {
        // Reset animation
        x.set(0);
        
        // Move to next trend
        if (currentIndex < trendQueue.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          // Queue exhausted, try to fetch more
          fetchTrends();
        }
        
        setShowFeedback(false);
        swipeInProgressRef.current = false;
      }, 1500);

      // Update validation count
      const { error: updateError } = await supabase
        .from('trend_submissions')
        .update({ 
          validation_count: currentTrend.validation_count + 1,
          last_validated_at: new Date().toISOString()
        })
        .eq('id', currentTrend.id);

      if (updateError) {
        console.error('Failed to update validation count:', updateError);
      }

      // Check if trend should change status based on validations
      const { data: allValidations } = await supabase
        .from('trend_validations')
        .select('is_valid')
        .eq('trend_id', currentTrend.id);

      if (allValidations && allValidations.length >= 5) {
        const validCount = allValidations.filter(v => v.is_valid).length;
        const validPercentage = (validCount / allValidations.length) * 100;
        
        if (validPercentage >= 70) {
          // Trend is validated
          await supabase
            .from('trend_submissions')
            .update({ status: 'validated' })
            .eq('id', currentTrend.id);
        } else if (validPercentage <= 30) {
          // Trend is rejected
          await supabase
            .from('trend_submissions')
            .update({ status: 'rejected' })
            .eq('id', currentTrend.id);
        }
      }

      // Refresh navigation to update XP
      refreshNav();

    } catch (error: any) {
      console.error('🔥 CRITICAL ERROR in handleSwipe:', error);
      setError('Failed to record validation. Please try again.');
      
      // Reset on error
      x.set(0);
      swipeInProgressRef.current = false;
      
      // If it's a duplicate key error, move to next trend
      if (error.code === '23505') {
        console.log('Already validated this trend, moving to next...');
        if (currentIndex < trendQueue.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          fetchTrends();
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading trends to validate...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchTrends}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (trendQueue.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2">All caught up!</h2>
          <p className="text-gray-600 mb-4">
            You've validated all available trends. Check back later for more!
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 overflow-hidden">
      {/* Mobile-optimized header */}
      <div className="px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-4xl mx-auto">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white/80 backdrop-blur rounded-lg p-2 sm:p-3">
              <div className="flex items-center space-x-2">
                <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                <div>
                  <p className="text-xs text-gray-600">Streak</p>
                  <p className="text-sm sm:text-lg font-bold text-gray-900">{currentStreak}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur rounded-lg p-2 sm:p-3">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                <div>
                  <p className="text-xs text-gray-600">Session</p>
                  <p className="text-sm sm:text-lg font-bold text-gray-900">{consecutiveValidations}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur rounded-lg p-2 sm:p-3">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                <div>
                  <p className="text-xs text-gray-600">Queue</p>
                  <p className="text-sm sm:text-lg font-bold text-gray-900">{trendQueue.length - currentIndex}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur rounded-lg p-2 sm:p-3">
              <div className="flex items-center space-x-2">
                <Award className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                <div>
                  <p className="text-xs text-gray-600">Bonus</p>
                  <p className="text-sm sm:text-lg font-bold text-gray-900">
                    {consecutiveValidations > 0 && consecutiveValidations % 5 === 0 ? '+20' : 
                     consecutiveValidations >= 10 ? '+50' : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="bg-white/80 backdrop-blur rounded-lg p-2 sm:p-3 mb-4 sm:mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs sm:text-sm text-gray-600">Progress</span>
              <span className="text-xs sm:text-sm font-medium text-gray-900">
                {currentIndex + 1} / {trendQueue.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${((currentIndex + 1) / trendQueue.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Mobile optimized */}
      <div className="relative px-4 sm:px-6" style={{ height: isMobile ? 'calc(100vh - 280px)' : 'calc(100vh - 320px)' }}>
        <div className="max-w-md mx-auto h-full flex flex-col justify-center">
          {/* Card Stack */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTrend?.id}
              style={{ x, rotate }}
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
              drag={isMobile ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = offset.x * velocity.x;
                
                // Mobile swipe thresholds - more forgiving
                if (swipe < -3000 || offset.x < -100) {
                  handleSwipe('left');
                } else if (swipe > 3000 || offset.x > 100) {
                  handleSwipe('right');
                } else {
                  // Snap back
                  animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
                }
              }}
              className="relative cursor-grab active:cursor-grabbing"
              whileDrag={{ scale: 1.05 }}
            >
              <div className={`${isMobile ? 'h-[500px]' : 'h-[600px]'} bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col`}>
                {/* Trend Image/Thumbnail */}
                {(currentTrend.thumbnail_url || currentTrend.screenshot_url) ? (
                  <div className={`${isMobile ? 'h-40' : 'h-48'} bg-gray-100 relative flex-shrink-0`}>
                    <img 
                      src={currentTrend.thumbnail_url || currentTrend.screenshot_url}
                      alt={currentTrend.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-white/90 backdrop-blur rounded-lg px-2 sm:px-3 py-1">
                      <span className="text-base sm:text-lg mr-1">{getPlatformEmoji(currentTrend.platform)}</span>
                      <span className="text-xs sm:text-sm font-medium text-gray-700">{currentTrend.platform}</span>
                    </div>
                  </div>
                ) : (
                  <div className={`${isMobile ? 'h-40' : 'h-48'} bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0`}>
                    <div className="text-center text-white">
                      <div className="text-5xl sm:text-6xl mb-2">{getPlatformEmoji(currentTrend.platform)}</div>
                      <p className="font-medium">{currentTrend.platform}</p>
                    </div>
                  </div>
                )}

                {/* Content - Scrollable on mobile */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                  {/* Title */}
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 line-clamp-2">
                    {currentTrend.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4 line-clamp-3">
                    {currentTrend.description}
                  </p>

                  {/* Stats Grid - Mobile optimized */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                    {currentTrend.views_count && (
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                          <span className="text-xs sm:text-sm text-gray-600">Views</span>
                        </div>
                        <p className="text-sm sm:text-base font-semibold text-gray-900">
                          {currentTrend.views_count.toLocaleString()}
                        </p>
                      </div>
                    )}
                    
                    {currentTrend.likes_count && (
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="flex items-center gap-1">
                          <Flame className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                          <span className="text-xs sm:text-sm text-gray-600">Likes</span>
                        </div>
                        <p className="text-sm sm:text-base font-semibold text-gray-900">
                          {currentTrend.likes_count.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Quick Info Pills - Mobile optimized */}
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {currentTrend.trend_velocity && (
                      <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
                        {currentTrend.trend_velocity === 'just_starting' ? '🚀 Just Starting' :
                         currentTrend.trend_velocity === 'picking_up' ? '📈 Picking Up' :
                         currentTrend.trend_velocity === 'viral' ? '🔥 Going Viral' :
                         currentTrend.trend_velocity === 'saturated' ? '📊 Saturated' : 
                         currentTrend.trend_velocity === 'declining' ? '📉 Declining' : currentTrend.trend_velocity}
                      </span>
                    )}
                    
                    {currentTrend.trend_size && (
                      <span className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs sm:text-sm font-medium">
                        {currentTrend.trend_size === 'micro' ? '🔬 Micro' :
                         currentTrend.trend_size === 'niche' ? '🎯 Niche' :
                         currentTrend.trend_size === 'viral' ? '🌟 Viral' :
                         currentTrend.trend_size === 'mega' ? '💥 Mega' : 
                         currentTrend.trend_size === 'global' ? '🌍 Global' : currentTrend.trend_size}
                      </span>
                    )}
                  </div>

                  {/* Spotted by - Mobile size */}
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
                    <p className="text-xs sm:text-sm text-gray-500">
                      Spotted by <span className="font-medium text-gray-700">{currentTrend.spotter_username}</span>
                    </p>
                  </div>
                </div>

                {/* Swipe Indicators - Mobile visible */}
                {isMobile && (
                  <>
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 left-4 bg-red-500 text-white rounded-full p-3 shadow-lg"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: x.get() < -50 ? 1 : 0,
                        scale: x.get() < -50 ? 1 : 0.5
                      }}
                    >
                      <X className="h-6 w-6" />
                    </motion.div>
                    
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 right-4 bg-green-500 text-white rounded-full p-3 shadow-lg"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: x.get() > 50 ? 1 : 0,
                        scale: x.get() > 50 ? 1 : 0.5
                      }}
                    >
                      <Check className="h-6 w-6" />
                    </motion.div>
                  </>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Action Buttons - Mobile optimized */}
          {!isMobile && (
            <motion.div 
              className="flex justify-center space-x-4 sm:space-x-8 mt-6 sm:mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <button
                onClick={() => handleSwipe('left')}
                className="group relative touch-manipulation"
                disabled={showFeedback}
              >
                <div className="flex items-center space-x-2 sm:space-x-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 hover:from-red-600 hover:to-red-700">
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-base sm:text-lg font-semibold">Reject</span>
                </div>
                <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap hidden sm:block">
                  Not a real trend
                </span>
              </button>
              
              <button
                onClick={() => handleSwipe('right')}
                className="group relative touch-manipulation"
                disabled={showFeedback}
              >
                <div className="flex items-center space-x-2 sm:space-x-3 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 hover:from-green-600 hover:to-green-700">
                  <Check className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-base sm:text-lg font-semibold">Approve</span>
                </div>
                <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap hidden sm:block">
                  Valid trend
                </span>
              </button>
            </motion.div>
          )}

          {/* Mobile swipe hint */}
          {isMobile && (
            <motion.div 
              className="mt-4 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-xs text-gray-500">
                Swipe left to reject • Swipe right to approve
              </p>
            </motion.div>
          )}

          {/* Desktop keyboard hint */}
          {!isMobile && (
            <motion.div 
              className="mt-6 sm:mt-8 text-center space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-xs sm:text-sm text-gray-500">
                {trendQueue.length - currentIndex - 1} more trends to review
              </p>
              <p className="text-xs text-gray-400">
                Use ← → arrow keys or A/D for quick validation
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Streak Animation Overlay */}
      <AnimatePresence>
        {showStreakAnimation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl shadow-2xl">
              <div className="flex items-center space-x-3">
                <Flame className="h-8 w-8 sm:h-10 sm:w-10 animate-pulse" />
                <div>
                  <p className="text-xl sm:text-2xl font-bold">Streak Bonus!</p>
                  <p className="text-sm sm:text-base">+20 XP</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}