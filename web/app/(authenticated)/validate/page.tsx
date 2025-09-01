'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useNavigationRefresh } from '@/hooks/useNavigationRefresh';
import { useAuth } from '@/contexts/AuthContext';
import { cleanTrendData } from '@/lib/cleanTrendData';
import SimpleVoteDisplay from '@/components/SimpleVoteDisplay';
import { 
  X, 
  Check, 
  Flame, 
 
  TrendingUp, 
  Clock,
  Award,
  ChevronLeft,
  ChevronRight,
  Eye,
  Users,
  Timer,
  Shield
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
  const router = useRouter();
  const [currentTrend, setCurrentTrend] = useState<TrendToValidate | null>(null);
  const [trendQueue, setTrendQueue] = useState<TrendToValidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [dailyValidations, setDailyValidations] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastVote, setLastVote] = useState<'valid' | 'invalid' | null>(null);
  const [consensus, setConsensus] = useState<number | null>(null);
  const [streakAnimation, setStreakAnimation] = useState<'increase' | 'reset' | null>(null);
  const [cardKey, setCardKey] = useState(0);
  // Track locally validated trends to prevent re-showing
  const [localValidatedIds, setLocalValidatedIds] = useState<string[]>([]);
  
  // Check if user is community monitor
  const isCommunityMonitor = user?.email === 'jeremy@wavesight.app' || 
                             user?.email === 'admin@wavesight.app' ||
                             user?.id === 'YOUR_USER_ID_HERE'; // Replace with your actual user ID
  
  // Swipe animation values
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  // Removed opacity transform to keep card fully visible

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
    // Removed XP event listener - validation no longer awards XP
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

      // Get today's XP from xp_transactions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get today's validations count
      const { data: validations } = await supabase
        .from('trend_validations')
        .select('id')
        .eq('validator_id', user.id)
        .gte('created_at', today.toISOString());

      setDailyValidations(validations?.length || 0);

      console.log('📊 Validate Page Stats:', {
        streak: profile?.current_streak || 0,
        dailyValidations: validations?.length || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    console.log('🔄 handleSwipe called:', { 
      direction, 
      currentTrendId: currentTrend?.id, 
      userId: user?.id,
      currentTrendTitle: currentTrend?.title 
    });
    
    if (!currentTrend || !user) {
      console.log('❌ Missing requirements:', { currentTrend: !!currentTrend, user: !!user });
      return;
    }
    
    const isValid = direction === 'right';
    setLastVote(isValid ? 'valid' : 'invalid');
    
    // Add to local validated list immediately to prevent re-showing
    setLocalValidatedIds(prev => [...prev, currentTrend.id]);
    
    console.log('🎯 Starting validation process...');
    
    try {
      // First check if user already validated this trend
      const { data: existingVote, error: checkError } = await supabase
        .from('trend_validations')
        .select('id, vote')
        .eq('trend_id', currentTrend.id)
        .eq('validator_id', user.id)
        .single();

      if (existingVote) {
        console.log('⚠️ User already validated this trend:', existingVote);
        // Skip to next trend without error
        setShowFeedback(true);
        setConsensus(100); // Show they already voted
        setTimeout(() => {
          setShowFeedback(false);
          moveToNextTrend();
        }, 1500);
        return;
      }

      console.log('📝 Submitting validation:', {
        trend_id: currentTrend.id,
        validator_id: user.id,
        vote: isValid ? 'verify' : 'reject',
        is_valid: isValid,
        validation_score: isValid ? 1 : -1
      });

      // Check if user is community monitor (you can set this email or user ID)
      const isCommunityMonitor = user.email === 'jeremy@wavesight.app' || 
                                 user.email === 'admin@wavesight.app' ||
                                 user.id === 'YOUR_USER_ID_HERE'; // Replace with your actual user ID
      
      // Submit validation with proper vote field
      // If community monitor, submit 3 votes to instantly validate/reject
      const votesToSubmit = isCommunityMonitor ? 3 : 1;
      
      console.log(`👮 Community Monitor: ${isCommunityMonitor}, submitting ${votesToSubmit} vote(s)`);
      
      if (isCommunityMonitor) {
        // Submit 3 votes for instant validation/rejection
        const validations = [];
        for (let i = 0; i < votesToSubmit; i++) {
          validations.push({
            trend_id: currentTrend.id,
            validator_id: user.id,
            vote: isValid ? 'wave' : 'dead',
            is_valid: isValid,
            validation_score: isValid ? 1 : -1,
            created_at: new Date().toISOString()
          });
        }
        
        const { data: validationData, error: validationError } = await supabase
          .from('trend_validations')
          .insert(validations[0]) // Insert first vote normally
          .select()
          .single();
          
        if (!validationError) {
          // Add 2 more system votes to reach 3 total
          const systemVotes = [];
          for (let i = 1; i < votesToSubmit; i++) {
            systemVotes.push({
              trend_id: currentTrend.id,
              validator_id: `system_${i}`, // System validator IDs
              vote: isValid ? 'wave' : 'dead',
              is_valid: isValid,
              validation_score: isValid ? 1 : -1,
              created_at: new Date().toISOString()
            });
          }
          
          await supabase
            .from('trend_validations')
            .insert(systemVotes);
            
          // Update trend status immediately since we have 3 votes
          await supabase
            .from('trend_submissions')
            .update({ 
              validation_count: 3,
              status: isValid ? 'quality_approved' : 'rejected'
            })
            .eq('id', currentTrend.id);
            
          console.log('✅ Community Monitor: Trend instantly ' + (isValid ? 'approved' : 'rejected'));
        }
      } else {
        // Regular user - submit single vote
        const { data: validationData, error: validationError } = await supabase
          .from('trend_validations')
          .insert({
            trend_id: currentTrend.id,
            validator_id: user.id,
            vote: isValid ? 'wave' : 'dead',
            is_valid: isValid,
            validation_score: isValid ? 1 : -1,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
      }

      // Note: validationError is handled within the conditional blocks above
      console.log('✅ Validation process completed');
      
      // For regular users, update validation count
      if (!isCommunityMonitor) {
        const newValidationCount = currentTrend.validation_count + 1;
        const { error: updateError } = await supabase
          .from('trend_submissions')
          .update({ 
            validation_count: newValidationCount
            // Status is handled by database trigger when 3 votes reached
          })
          .eq('id', currentTrend.id);

        if (updateError) {
          console.error('⚠️ Update error:', updateError);
        }
      }

      // XP for validation is disabled - validation is now a community manager role
      console.log('🔒 Validation is a community manager role - no XP awarded');

      // Update stats locally
      setDailyValidations(prev => prev + 1);

      // Get actual consensus from database
      const { data: allVotes, error: votesError } = await supabase
        .from('trend_validations')
        .select('is_valid')
        .eq('trend_id', currentTrend.id);
      
      let consensusPercent = 50; // Default if no votes yet
      let inConsensus = false;
      
      if (allVotes && allVotes.length > 0) {
        const validVotes = allVotes.filter(v => v.is_valid).length;
        const totalVotes = allVotes.length;
        const validPercent = Math.round((validVotes / totalVotes) * 100);
        
        // Determine if user is with majority
        const majorityVotedValid = validPercent >= 50;
        inConsensus = (isValid && majorityVotedValid) || (!isValid && !majorityVotedValid);
        
        // Show the percentage that agrees with the user's vote
        if (isValid) {
          consensusPercent = validPercent;
        } else {
          consensusPercent = 100 - validPercent;
        }
        
        console.log('📊 Consensus data:', {
          totalVotes,
          validVotes,
          validPercent,
          userVote: isValid ? 'valid' : 'invalid',
          inConsensus,
          consensusWithUser: consensusPercent
        });
      } else {
        // First vote - user sets the consensus
        consensusPercent = 100;
        inConsensus = true;
      }
      
      setConsensus(consensusPercent);
      
      // XP bonuses disabled - validation is now a community manager role
      
      // Update streak based on consensus (only continue streak if in consensus with majority)
      const newStreak = inConsensus ? streak + 1 : 0;
      setStreak(newStreak);
      
      // Trigger streak animation
      if (inConsensus && newStreak > streak) {
        setStreakAnimation('increase');
      } else if (!inConsensus && streak > 0) {
        setStreakAnimation('reset');
      }
      setTimeout(() => setStreakAnimation(null), 1000);
      
      // Update streak in database
      const { error: streakError } = await supabase
        .from('user_profiles')
        .update({ 
          current_streak: newStreak,
          last_validation_date: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (streakError) {
        console.error('Error updating streak:', streakError);
      } else {
        console.log('🔥 Streak updated:', { 
          newStreak, 
          inConsensus,
          consensusPercent: `${consensusPercent}%` 
        });
      }
      
      // Show feedback briefly with XP animation
      setShowFeedback(true);
      
      // Show feedback for longer so user can see XP clearly
      setTimeout(() => {
        setShowFeedback(false);
        moveToNextTrend();
        // Refresh stats to ensure everything is synced
        loadUserStats();
      }, 3000); // Increased to 3 seconds so user can see XP clearly
      
    } catch (error) {
      console.error('🔥 CRITICAL ERROR in handleSwipe:', error);
      console.error('🔥 Error stack:', error instanceof Error ? error.stack : 'No stack');
      moveToNextTrend();
    }
  };

  const moveToNextTrend = () => {
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
          {isCommunityMonitor && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-lg"
            >
              <Shield className="w-5 h-5" />
              <span className="font-bold">Community Monitor Mode</span>
              <span className="text-xs opacity-90">• Your vote = 3 votes</span>
            </motion.div>
          )}
        </div>

        {/* Header Stats */}
        <div className="mb-6 flex justify-between items-center relative">
          <div className="flex items-center space-x-4">
            <motion.div 
              className="bg-white rounded-lg px-4 py-2 shadow-sm relative"
              animate={{
                scale: streakAnimation ? [1, 1.2, 1] : 1,
              }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col">
                <div className="flex items-center space-x-1">
                  <Flame className={`h-5 w-5 transition-colors ${
                    streakAnimation === 'reset' ? 'text-gray-400' : 
                    dailyValidations > 0 ? 'text-orange-500' : 'text-gray-400'
                  } ${streakAnimation === 'increase' ? 'animate-pulse' : ''}`} />
                  <span className="font-bold text-gray-900">{dailyValidations}</span>
                  <span className="text-xs text-gray-500">validations</span>
                </div>
                <div className="flex items-center mt-1">
                  <div className="text-xs text-gray-600">
                    {(() => {
                      const streakLevel = Math.floor(dailyValidations / 10);
                      const nextMilestone = (streakLevel + 1) * 10;
                      const progressInLevel = dailyValidations % 10;
                      const multiplier = 1.0 + (streakLevel * 0.1);
                      
                      return (
                        <>
                          <span className="font-medium text-purple-600">{multiplier.toFixed(1)}x</span>
                          <span className="text-gray-500 ml-1">
                            ({progressInLevel}/10 to {(multiplier + 0.1).toFixed(1)}x)
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
              {streakAnimation === 'increase' && (
                <motion.div
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.8 }}
                  className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-orange-500 font-bold text-sm"
                >
                  +1 🔥
                </motion.div>
              )}
              {streakAnimation === 'reset' && streak === 0 && (
                <motion.div
                  initial={{ opacity: 1, scale: 1 }}
                  animate={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.5 }}
                  className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-red-500 font-bold text-sm"
                >
                  Reset 💔
                </motion.div>
              )}
            </motion.div>
            
          </div>
        </div>


        {/* Trend Confirmed notification removed per user request - showing XP only via notification system */}

        {/* Swipe Card Container */}
        <div className="relative">
          {/* Background card preview (next in queue) */}
          {trendQueue.length > 1 && (
            <div className="absolute inset-0 scale-95 opacity-30">
              <div className="h-[650px] bg-white rounded-2xl shadow-lg" />
            </div>
          )}

          <motion.div
            key={cardKey}
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
            className="relative cursor-grab active:cursor-grabbing"
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
          className="flex justify-center space-x-8 mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Reject Button */}
          <button
            onClick={() => handleSwipe('left')}
            className="group relative"
            disabled={showFeedback}
          >
            <div className="flex items-center space-x-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 hover:from-red-600 hover:to-red-700">
              <X className="h-6 w-6" />
              <span className="text-lg font-semibold">Reject</span>
            </div>
            <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">Not a real trend</span>
          </button>
          
          {/* Approve Button */}
          <button
            onClick={() => handleSwipe('right')}
            className="group relative"
            disabled={showFeedback}
          >
            <div className="flex items-center space-x-3 bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 hover:from-green-600 hover:to-green-700">
              <Check className="h-6 w-6" />
              <span className="text-lg font-semibold">Approve</span>
            </div>
            <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">Valid trend</span>
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
            💡 Tip: Use ← → arrow keys • Left = Reject • Right = Approve
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