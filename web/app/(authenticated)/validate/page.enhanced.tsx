'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { 
  TrendingUp as TrendingUpIcon,
  X as XIcon,
  Check as CheckIcon,
  ExternalLink as ExternalLinkIcon,
  Award as AwardIcon,
  Zap as ZapIcon,
  Target as TargetIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Eye as EyeIcon,
  Share2 as ShareIcon,
  Hash as HashIcon,
  Clock as ClockIcon,
  User as UserIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Info as InfoIcon,
  TrendingDown as TrendingDownIcon,
  AlertCircle as AlertCircleIcon,
  Shield as ShieldIcon,
  BarChart3 as BarChartIcon,
  Star as StarIcon
} from 'lucide-react';
// Toast notifications removed - library not installed

interface TrendToVerify {
  id: string;
  created_at: string;
  category: string;
  description: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  post_url?: string;
  spotter_id: string;
  creator_handle?: string;
  creator_name?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  hashtags?: string[];
  platform?: string;
  validation_count: number;
  positive_validations: number;
  negative_validations: number;
  validation_ratio: number;
  status: string;
  spotter?: {
    username?: string;
    email?: string;
  };
  time_since_submission?: string;
  validation_threshold?: number;
  validations_needed?: number;
}

interface ValidationStats {
  verified_today: number;
  verified_this_week: number;
  verified_this_month: number;
  earnings_today: number;
  earnings_this_week: number;
  earnings_this_month: number;
  accuracy_score: number;
  accuracy_trend: 'improving' | 'declining' | 'insufficient_data';
  total_validations: number;
  correct_validations: number;
  category_expertise: Record<string, {
    total: number;
    correct: number;
    accuracy: number;
  }>;
  validator_rank: 'novice' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
  streak_days: number;
}

const SWIPE_THRESHOLD = 100;
const ROTATION_FACTOR = 0.15;

export default function EnhancedVerify() {
  const { user } = useAuth();
  const [trends, setTrends] = useState<TrendToVerify[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [stats, setStats] = useState<ValidationStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [confidenceScore, setConfidenceScore] = useState(0.75);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [timeSpent, setTimeSpent] = useState(0);
  const timeRef = useRef<NodeJS.Timeout>();

  // Motion values for swipe gestures
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  // Track time spent on current trend
  useEffect(() => {
    if (currentTrend) {
      const startTime = Date.now();
      timeRef.current = setInterval(() => {
        setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => {
      if (timeRef.current) clearInterval(timeRef.current);
      setTimeSpent(0);
    };
  }, [currentIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!currentTrend || verifying) return;
      
      switch(e.key) {
        case 'ArrowLeft':
          handleVerify(false);
          break;
        case 'ArrowRight':
          handleVerify(true);
          break;
        case 'ArrowUp':
          setConfidenceScore(prev => Math.min(1, prev + 0.1));
          break;
        case 'ArrowDown':
          setConfidenceScore(prev => Math.max(0, prev - 0.1));
          break;
        case 's':
          setShowStats(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, verifying, trends, confidenceScore]);

  useEffect(() => {
    if (user) {
      fetchTrendsToVerify();
      fetchUserStats();
    }
  }, [user, selectedCategories]);

  const fetchTrendsToVerify = async () => {
    try {
      setLoading(true);
      
      // Use the enhanced function with category filtering
      const { data, error } = await supabase.rpc('get_trends_to_verify_enhanced', {
        p_user_id: user?.id,
        p_limit: 20,
        p_categories: selectedCategories.length > 0 ? selectedCategories : null
      });

      if (error) throw error;
      setTrends(data || []);
    } catch (error) {
      console.error('Error fetching trends:', error);
      console.error('Failed to load trends');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    setStatsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_verification_stats_enhanced', {
        p_user_id: user?.id
      });

      if (error) throw error;
      setStats(data?.[0] || null);
    } catch (error) {
      console.error('Error fetching stats:', error);
      console.error('Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleVerify = async (isValid: boolean) => {
    if (verifying || !trends[currentIndex]) return;

    setVerifying(true);
    const trend = trends[currentIndex];

    try {
      // Calculate dynamic confidence based on time spent
      const timeBasedConfidence = Math.min(1, 0.5 + (timeSpent / 30) * 0.5);
      const finalConfidence = (confidenceScore + timeBasedConfidence) / 2;

      // Calculate earnings
      const { data: earningsData, error: earningsError } = await supabase.rpc('calculate_validation_earnings', {
        p_validator_id: user?.id,
        p_trend_id: trend.id,
        p_is_confirmed: isValid,
        p_confidence_score: finalConfidence
      });

      if (earningsError) throw earningsError;

      // Submit validation with enhanced data
      const { error } = await supabase
        .from('trend_validations')
        .insert({
          trend_id: trend.id,
          validator_id: user?.id,
          confirmed: isValid,
          confidence_score: finalConfidence,
          time_spent_seconds: timeSpent,
          reward_amount: earningsData || 0.10,
          notes: null,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Show success feedback
      // Success notification removed - toast library not installed
      console.log(`Validation submitted! +${earningsData?.toFixed(2) || '0.10'}`);

      // Refresh stats
      await fetchUserStats();

      // Move to next trend
      if (currentIndex < trends.length - 1) {
        setCurrentIndex(prev => prev + 1);
        x.set(0);
      } else {
        await fetchTrendsToVerify();
        setCurrentIndex(0);
      }
    } catch (error: any) {
      console.error('Error verifying trend:', error);
      
      // Check for duplicate validation
      if (error.code === '23505') {
        console.error('You have already validated this trend');
        // Skip to next
        if (currentIndex < trends.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          await fetchTrendsToVerify();
          setCurrentIndex(0);
        }
      } else {
        console.error('Failed to submit validation');
      }
    } finally {
      setVerifying(false);
      setTimeSpent(0);
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      handleVerify(true);
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      handleVerify(false);
    }
  };

  const currentTrend = trends[currentIndex];

  const formatEngagementCount = (count?: number): string => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  const getCategoryEmoji = (category: string): string => {
    const emojis: Record<string, string> = {
      visual_style: '🎨',
      audio_music: '🎵',
      creator_technique: '🎬',
      meme_format: '😂',
      product_brand: '🛍️',
      behavior_pattern: '🔄'
    };
    return emojis[category] || '📈';
  };

  const getRankIcon = (rank: string) => {
    switch(rank) {
      case 'expert': return <StarIcon className="w-5 h-5 text-yellow-400" />;
      case 'advanced': return <ShieldIcon className="w-5 h-5 text-purple-400" />;
      case 'intermediate': return <ZapIcon className="w-5 h-5 text-blue-400" />;
      case 'beginner': return <TrendingUpIcon className="w-5 h-5 text-green-400" />;
      default: return <InfoIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading trends to verify...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <TrendingUpIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
                  Verify Trends
                </h1>
                <p className="text-gray-400 mt-1">Help validate trends and earn rewards</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowStats(!showStats)}
              className="p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-white transition-all"
            >
              <BarChartIcon className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Sidebar */}
          <AnimatePresence>
            {(showStats || window.innerWidth >= 1024) && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="lg:col-span-1 space-y-6"
              >
                {/* Quick Stats */}
                <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-800/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <ZapIcon className="w-5 h-5 text-yellow-400" />
                    Today's Performance
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Verified</span>
                      <span className="text-2xl font-bold text-white">
                        {stats?.verified_today || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Earned</span>
                      <span className="text-2xl font-bold text-green-400">
                        ${stats?.earnings_today?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Accuracy</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-blue-400">
                          {stats?.accuracy_score || 0}%
                        </span>
                        {stats?.accuracy_trend === 'improving' && (
                          <TrendingUpIcon className="w-4 h-4 text-green-400" />
                        )}
                        {stats?.accuracy_trend === 'declining' && (
                          <TrendingDownIcon className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validator Rank */}
                <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-800/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    {getRankIcon(stats?.validator_rank || 'novice')}
                    Validator Rank
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Current Rank</span>
                      <span className="text-lg font-semibold text-white capitalize">
                        {stats?.validator_rank || 'Novice'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Total Validations</span>
                      <span className="text-white">{stats?.total_validations || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Streak</span>
                      <span className="text-white">{stats?.streak_days || 0} days</span>
                    </div>
                  </div>
                </div>

                {/* Category Expertise */}
                {stats?.category_expertise && Object.keys(stats.category_expertise).length > 0 && (
                  <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-800/50 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Category Expertise</h3>
                    <div className="space-y-2">
                      {Object.entries(stats.category_expertise).map(([category, data]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-gray-400 flex items-center gap-2">
                            <span>{getCategoryEmoji(category)}</span>
                            <span className="capitalize">{category.replace(/_/g, ' ')}</span>
                          </span>
                          <span className="text-white">{data.accuracy}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trend Verification Area */}
          <div className={showStats && window.innerWidth >= 1024 ? 'lg:col-span-2' : 'lg:col-span-3'}>
            {/* Confidence Slider */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-gray-900/50 backdrop-blur-md rounded-xl border border-gray-800/50 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-gray-400">Confidence Level</label>
                <span className="text-sm font-semibold text-white">{Math.round(confidenceScore * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={confidenceScore * 100}
                onChange={(e) => setConfidenceScore(parseInt(e.target.value) / 100)}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${confidenceScore * 100}%, #374151 ${confidenceScore * 100}%, #374151 100%)`
                }}
              />
            </motion.div>

            {/* Trend Card */}
            <AnimatePresence mode="wait">
              {currentTrend ? (
                <motion.div
                  key={currentTrend.id}
                  style={{ x, rotate, opacity }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={handleDragEnd}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative cursor-grab active:cursor-grabbing"
                >
                  <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-gray-800/50">
                    {/* Swipe Indicators */}
                    <motion.div
                      style={{
                        opacity: useTransform(x, [-100, 0, 100], [0, 0, 1])
                      }}
                      className="absolute inset-0 bg-green-500/20 backdrop-blur-sm z-10 flex items-center justify-center pointer-events-none"
                    >
                      <div className="bg-green-500/30 backdrop-blur-sm rounded-2xl px-8 py-4 border-4 border-green-500 rotate-12">
                        <p className="text-3xl font-bold text-green-400">VALID TREND</p>
                      </div>
                    </motion.div>
                    <motion.div
                      style={{
                        opacity: useTransform(x, [-100, 0, 100], [1, 0, 0])
                      }}
                      className="absolute inset-0 bg-red-500/20 backdrop-blur-sm z-10 flex items-center justify-center pointer-events-none"
                    >
                      <div className="bg-red-500/30 backdrop-blur-sm rounded-2xl px-8 py-4 border-4 border-red-500 -rotate-12">
                        <p className="text-3xl font-bold text-red-400">NOT A TREND</p>
                      </div>
                    </motion.div>

                    {/* Image */}
                    {(currentTrend.thumbnail_url || currentTrend.screenshot_url) && (
                      <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden">
                        <img
                          src={currentTrend.thumbnail_url || currentTrend.screenshot_url}
                          alt="Trend"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
                        
                        {/* Time Since Submission Badge */}
                        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-lg text-sm">
                          <ClockIcon className="w-4 h-4 inline mr-1" />
                          {currentTrend.time_since_submission ? 
                            formatDistanceToNow(parseISO(currentTrend.created_at), { addSuffix: true }) :
                            'Just now'
                          }
                        </div>

                        {/* Validation Progress */}
                        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-lg text-sm">
                          <span className="text-yellow-400 font-semibold">
                            {currentTrend.validation_count}/{currentTrend.validation_threshold || 5}
                          </span>
                          <span className="text-gray-300 ml-1">validations</span>
                        </div>

                        {currentTrend.post_url && (
                          <a 
                            href={currentTrend.post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-xl text-sm hover:bg-white/20 transition-all duration-300 flex items-center gap-2 border border-white/20"
                          >
                            <span>View Original</span>
                            <ExternalLinkIcon className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}
                    
                    <div className="p-6 sm:p-8">
                      {/* Category and Platform */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 text-gray-300 backdrop-blur-sm">
                          <span className="text-base">{getCategoryEmoji(currentTrend.category)}</span>
                          <span className="capitalize">{currentTrend.category.replace(/_/g, ' ')}</span>
                        </span>
                        {currentTrend.platform && (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 text-gray-300 backdrop-blur-sm">
                            <span className="text-base">📱</span>
                            <span className="capitalize">{currentTrend.platform}</span>
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <h2 className="text-2xl font-bold text-white mb-3">
                        {currentTrend.description}
                      </h2>

                      {/* Spotter Info */}
                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4" />
                          <span>@{currentTrend.spotter?.username || 'anonymous'}</span>
                        </div>
                      </div>

                      {/* Creator Info */}
                      {currentTrend.creator_handle && (
                        <div className="mb-6 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                          <p className="text-sm text-gray-400 mb-2">Original Creator</p>
                          <p className="font-semibold text-white text-lg">
                            {currentTrend.creator_handle}
                            {currentTrend.creator_name && <span className="text-gray-400 font-normal"> ({currentTrend.creator_name})</span>}
                          </p>
                        </div>
                      )}

                      {/* Caption */}
                      {currentTrend.post_caption && (
                        <div className="mb-6">
                          <p className="text-gray-300 italic text-lg leading-relaxed">"{currentTrend.post_caption}"</p>
                        </div>
                      )}

                      {/* Engagement Metrics */}
                      {(currentTrend.likes_count || currentTrend.comments_count || currentTrend.shares_count || currentTrend.views_count) && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                          {currentTrend.likes_count !== undefined && (
                            <div className="bg-red-500/10 backdrop-blur-sm rounded-xl p-3 border border-red-500/20">
                              <div className="flex items-center gap-2">
                                <HeartIcon className="w-5 h-5 text-red-400" />
                                <span className="text-white font-semibold">{formatEngagementCount(currentTrend.likes_count)}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">Likes</p>
                            </div>
                          )}
                          {currentTrend.comments_count !== undefined && (
                            <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl p-3 border border-blue-500/20">
                              <div className="flex items-center gap-2">
                                <MessageCircleIcon className="w-5 h-5 text-blue-400" />
                                <span className="text-white font-semibold">{formatEngagementCount(currentTrend.comments_count)}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">Comments</p>
                            </div>
                          )}
                          {currentTrend.shares_count !== undefined && (
                            <div className="bg-green-500/10 backdrop-blur-sm rounded-xl p-3 border border-green-500/20">
                              <div className="flex items-center gap-2">
                                <ShareIcon className="w-5 h-5 text-green-400" />
                                <span className="text-white font-semibold">{formatEngagementCount(currentTrend.shares_count)}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">Shares</p>
                            </div>
                          )}
                          {currentTrend.views_count !== undefined && (
                            <div className="bg-purple-500/10 backdrop-blur-sm rounded-xl p-3 border border-purple-500/20">
                              <div className="flex items-center gap-2">
                                <EyeIcon className="w-5 h-5 text-purple-400" />
                                <span className="text-white font-semibold">{formatEngagementCount(currentTrend.views_count)}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">Views</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Hashtags */}
                      {currentTrend.hashtags && currentTrend.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                          {currentTrend.hashtags.map((tag, index) => (
                            <span 
                              key={index} 
                              className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm border border-blue-500/20"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Current Validation Status */}
                      {currentTrend.validation_count > 0 && (
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 mb-6">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">Current Validation Status</span>
                            <span className="text-sm font-semibold text-white">
                              {Math.round(currentTrend.validation_ratio * 100)}% positive
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-red-500 to-green-500 rounded-full transition-all duration-500"
                              style={{ width: `${currentTrend.validation_ratio * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-2 text-xs">
                            <span className="text-red-400">{currentTrend.negative_validations} rejected</span>
                            <span className="text-green-400">{currentTrend.positive_validations} confirmed</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-12 text-center border border-gray-800/50"
                >
                  <TrendingUpIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400 text-lg">No more trends to verify right now. Check back later!</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            {currentTrend && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 space-y-4"
              >
                <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-800/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Is this a trending topic?</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <ClockIcon className="w-4 h-4" />
                      <span>{timeSpent}s</span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleVerify(false)}
                      disabled={verifying}
                      className="flex-1 bg-red-500/10 border-2 border-red-500/50 text-red-400 py-4 px-6 rounded-xl font-semibold hover:bg-red-500/20 hover:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 group"
                    >
                      <XIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      <span>Not Trending</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleVerify(true)}
                      disabled={verifying}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl group"
                    >
                      <CheckIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      <span>Yes, Trending</span>
                    </motion.button>
                  </div>
                </div>
                
                {/* Keyboard Shortcuts */}
                <div className="text-center text-sm text-gray-500">
                  <p>
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300">←</kbd> Not Trending
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300 mx-2">→</kbd> Yes, Trending
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300 mx-2">↑↓</kbd> Confidence
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300 mx-2">S</kbd> Stats
                  </p>
                </div>
              </motion.div>
            )}

            {/* Progress Indicator */}
            {trends.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-6"
              >
                <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                  <span className="flex items-center gap-2">
                    <TrendingUpIcon className="w-4 h-4" />
                    <span>Session Progress</span>
                  </span>
                  <span className="font-semibold text-white">{currentIndex + 1} / {trends.length}</span>
                </div>
                <div className="w-full bg-gray-800/50 rounded-full h-3 overflow-hidden backdrop-blur-sm">
                  <motion.div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / trends.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}