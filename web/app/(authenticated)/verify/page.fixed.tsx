'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
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
  ThumbsUp as ThumbsUpIcon,
  ThumbsDown as ThumbsDownIcon,
  BarChart as BarChartIcon
} from 'lucide-react';

interface TrendToVerify {
  id: string;
  created_at: string;
  category: string;
  description: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  post_url?: string;
  spotter_id: string;
  // Social media metadata
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
  // User info
  spotter?: {
    username?: string;
    email?: string;
  };
}

export default function VerifyFixed() {
  const { user } = useAuth();
  const [trends, setTrends] = useState<TrendToVerify[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [stats, setStats] = useState({
    verified_today: 0,
    earnings_today: 0,
    accuracy_score: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [showVoteAnimation, setShowVoteAnimation] = useState<'yes' | 'no' | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!currentTrend || verifying) return;
      
      if (e.key === 'ArrowLeft') {
        handleVerify(false);
      } else if (e.key === 'ArrowRight') {
        handleVerify(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, verifying, trends]);

  useEffect(() => {
    if (user) {
      fetchTrendsToVerify();
      fetchUserStats();
    }
  }, [user]);

  const fetchTrendsToVerify = async () => {
    try {
      // First, let's check if we have the enhanced function
      const { data: enhancedData, error: enhancedError } = await supabase
        .rpc('get_trends_to_verify_enhanced', {
          p_user_id: user?.id,
          p_limit: 20
        });

      if (!enhancedError && enhancedData) {
        // Use enhanced data
        setTrends(enhancedData);
      } else {
        // Fallback to basic query with proper fields
        const { data: trendsData, error: trendsError } = await supabase
          .from('trend_submissions')
          .select(`
            *,
            spotter:user_profiles!spotter_id(id, username, email)
          `)
          .neq('spotter_id', user?.id)
          .or('status.eq.submitted,status.eq.validating')
          .order('created_at', { ascending: false })
          .limit(20);

        if (trendsError) throw trendsError;

        // Transform the data to ensure we have all required fields
        const transformedData = (trendsData || []).map(trend => ({
          ...trend,
          positive_validations: trend.positive_validations || 0,
          negative_validations: trend.negative_validations || 0,
          validation_ratio: trend.validation_ratio || 0,
          spotter: trend.spotter?.[0] || { username: 'Anonymous', email: null }
        }));

        setTrends(transformedData);
      }
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    setStatsLoading(true);
    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Fetch user's validations for today
      const { data: todayValidations, error: validationsError } = await supabase
        .from('trend_validations')
        .select('*')
        .eq('validator_id', user?.id)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (validationsError) throw validationsError;

      // Fetch all user's validations for accuracy calculation
      const { data: allValidations, error: allValidationsError } = await supabase
        .from('trend_validations')
        .select('confirmed, trend_id')
        .eq('validator_id', user?.id);

      if (allValidationsError) throw allValidationsError;

      // Calculate accuracy by checking if user's validations match the final trend status
      let correctValidations = 0;
      let totalCheckedValidations = 0;

      if (allValidations && allValidations.length > 0) {
        // Get trend statuses for all validated trends
        const trendIds = [...new Set(allValidations.map(v => v.trend_id))];
        const { data: trends } = await supabase
          .from('trend_submissions')
          .select('id, status, validation_ratio')
          .in('id', trendIds)
          .in('status', ['approved', 'rejected', 'viral']);

        if (trends) {
          const trendStatusMap = trends.reduce((acc, trend) => {
            acc[trend.id] = { 
              status: trend.status, 
              wasApproved: trend.status === 'approved' || trend.status === 'viral'
            };
            return acc;
          }, {} as Record<string, { status: string; wasApproved: boolean }>);

          allValidations.forEach(validation => {
            const trendInfo = trendStatusMap[validation.trend_id];
            if (trendInfo) {
              totalCheckedValidations++;
              if (validation.confirmed === trendInfo.wasApproved) {
                correctValidations++;
              }
            }
          });
        }
      }

      const accuracyScore = totalCheckedValidations > 0 
        ? Math.round((correctValidations / totalCheckedValidations) * 100)
        : 0;

      // Calculate earnings (assuming $0.10 per validation)
      const todayEarnings = (todayValidations?.length || 0) * 0.10;

      setStats({
        verified_today: todayValidations?.length || 0,
        earnings_today: todayEarnings,
        accuracy_score: accuracyScore,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        verified_today: 0,
        earnings_today: 0,
        accuracy_score: 0,
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const handleVerify = async (isValid: boolean) => {
    if (verifying || !trends[currentIndex]) return;

    setVerifying(true);
    setShowVoteAnimation(isValid ? 'yes' : 'no');
    const trend = trends[currentIndex];

    try {
      // Check if user has already validated this trend
      const { data: existingValidation } = await supabase
        .from('trend_validations')
        .select('id')
        .eq('trend_id', trend.id)
        .eq('validator_id', user?.id)
        .single();

      if (existingValidation) {
        console.log('Already validated this trend');
        // Move to next trend
        setTimeout(() => {
          setShowVoteAnimation(null);
          if (currentIndex < trends.length - 1) {
            setCurrentIndex(prev => prev + 1);
          } else {
            fetchTrendsToVerify();
            setCurrentIndex(0);
          }
        }, 500);
        return;
      }

      // Submit verification vote
      const { data: insertData, error: insertError } = await supabase
        .from('trend_validations')
        .insert({
          trend_id: trend.id,
          validator_id: user?.id,
          confirmed: isValid,
          confidence_score: isValid ? 0.8 : 0.2,
          reward_amount: 0.10, // Base reward
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // The trigger will automatically update the counts, but let's fetch the updated trend
      const { data: updatedTrend, error: fetchError } = await supabase
        .from('trend_submissions')
        .select('validation_count, positive_validations, negative_validations, validation_ratio, status')
        .eq('id', trend.id)
        .single();

      if (!fetchError && updatedTrend) {
        // Update the local trend data to show immediate feedback
        setTrends(prev => prev.map(t => 
          t.id === trend.id 
            ? { ...t, ...updatedTrend }
            : t
        ));
      }

      // Refresh user stats
      await fetchUserStats();

      // Show success animation and move to next
      setTimeout(() => {
        setShowVoteAnimation(null);
        if (currentIndex < trends.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          fetchTrendsToVerify();
          setCurrentIndex(0);
        }
      }, 1000);

    } catch (error: any) {
      console.error('Error verifying trend:', error);
      setShowVoteAnimation(null);
      
      // Check if it's a duplicate validation error
      if (error.code === '23505') {
        // Skip to next trend
        if (currentIndex < trends.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          fetchTrendsToVerify();
          setCurrentIndex(0);
        }
      }
    } finally {
      setVerifying(false);
    }
  };

  const currentTrend = trends[currentIndex];

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

  const extractTitleFromDescription = (description: string): string => {
    const lines = description.split('\n');
    return lines[0] || 'Untitled Trend';
  };

  const formatEngagementCount = (count?: number): string => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  const getVotePercentage = (trend: TrendToVerify) => {
    const total = trend.positive_validations + trend.negative_validations;
    if (total === 0) return { yes: 0, no: 0 };
    return {
      yes: Math.round((trend.positive_validations / total) * 100),
      no: Math.round((trend.negative_validations / total) * 100)
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              <TrendingUpIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">Verify Trends</h1>
              <p className="text-gray-400 mt-1">Help validate trends and earn rewards</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-800/50 p-6 mb-8"
        >
          <div className="grid grid-cols-3 gap-4">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-4 border border-blue-500/20 hover:border-blue-500/40 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/5" />
              <div className="relative text-center">
                <ZapIcon className="w-8 h-8 text-blue-400 mx-auto mb-2 opacity-50" />
                {statsLoading ? (
                  <div className="h-8 w-16 mx-auto bg-gray-700 rounded animate-pulse"></div>
                ) : (
                  <p className="text-3xl font-bold text-blue-400">{stats.verified_today}</p>
                )}
                <p className="text-sm text-gray-400 mt-1">Verified Today</p>
              </div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-600/10 p-4 border border-green-500/20 hover:border-green-500/40 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-600/5" />
              <div className="relative text-center">
                <AwardIcon className="w-8 h-8 text-green-400 mx-auto mb-2 opacity-50" />
                {statsLoading ? (
                  <div className="h-8 w-20 mx-auto bg-gray-700 rounded animate-pulse"></div>
                ) : (
                  <p className="text-3xl font-bold text-green-400">${stats.earnings_today.toFixed(2)}</p>
                )}
                <p className="text-sm text-gray-400 mt-1">Earned Today</p>
              </div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-600/10 p-4 border border-purple-500/20 hover:border-purple-500/40 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-600/5" />
              <div className="relative text-center">
                <TargetIcon className="w-8 h-8 text-purple-400 mx-auto mb-2 opacity-50" />
                {statsLoading ? (
                  <div className="h-8 w-16 mx-auto bg-gray-700 rounded animate-pulse"></div>
                ) : (
                  <p className="text-3xl font-bold text-purple-400">
                    {stats.accuracy_score > 0 ? `${stats.accuracy_score}%` : 'N/A'}
                  </p>
                )}
                <p className="text-sm text-gray-400 mt-1">Accuracy</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Trend Card */}
        <AnimatePresence mode="wait">
        {currentTrend ? (
          <motion.div 
            key={currentTrend.id}
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -50 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden mb-8 border border-gray-800/50 relative"
          >
            {/* Vote Animation Overlay */}
            <AnimatePresence>
              {showVoteAnimation && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.5 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
                  style={{
                    backgroundColor: showVoteAnimation === 'yes' 
                      ? 'rgba(34, 197, 94, 0.2)' 
                      : 'rgba(239, 68, 68, 0.2)'
                  }}
                >
                  <div className={`p-8 rounded-full ${
                    showVoteAnimation === 'yes' ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {showVoteAnimation === 'yes' ? (
                      <CheckIcon className="w-24 h-24 text-white" />
                    ) : (
                      <XIcon className="w-24 h-24 text-white" />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Validation Status Bar */}
            {currentTrend.validation_count > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm px-6 py-3 border-b border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BarChartIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-400">Community Validation</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <ThumbsUpIcon className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 font-semibold">
                        {currentTrend.positive_validations} ({getVotePercentage(currentTrend).yes}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThumbsDownIcon className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 font-semibold">
                        {currentTrend.negative_validations} ({getVotePercentage(currentTrend).no}%)
                      </span>
                    </div>
                  </div>
                </div>
                {/* Visual progress bar */}
                <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full flex">
                    <div 
                      className="bg-green-500 transition-all duration-500"
                      style={{ width: `${getVotePercentage(currentTrend).yes}%` }}
                    />
                    <div 
                      className="bg-red-500 transition-all duration-500"
                      style={{ width: `${getVotePercentage(currentTrend).no}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {(currentTrend.thumbnail_url || currentTrend.screenshot_url) && (
              <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden">
                <img
                  src={currentTrend.thumbnail_url || currentTrend.screenshot_url}
                  alt="Trend"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
                {currentTrend.post_url && (
                  <a 
                    href={currentTrend.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-4 right-4 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-xl text-sm hover:bg-white/20 transition-all duration-300 flex items-center gap-2 border border-white/20"
                  >
                    <span>View Original</span>
                    <ExternalLinkIcon className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
            
            <div className="p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-3">
                  {extractTitleFromDescription(currentTrend.description)}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    <span>@{currentTrend.spotter?.username || currentTrend.spotter?.email?.split('@')[0] || 'anonymous'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4" />
                    <span>{format(parseISO(currentTrend.created_at), 'PPp')}</span>
                  </div>
                </div>
              </div>

              {currentTrend.creator_handle && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-6 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10"
                >
                  <p className="text-sm text-gray-400 mb-2">Original Creator</p>
                  <p className="font-semibold text-white text-lg">
                    {currentTrend.creator_handle}
                    {currentTrend.creator_name && <span className="text-gray-400 font-normal"> ({currentTrend.creator_name})</span>}
                  </p>
                </motion.div>
              )}

              {currentTrend.post_caption && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-6"
                >
                  <p className="text-gray-300 italic text-lg leading-relaxed">"{currentTrend.post_caption}"</p>
                </motion.div>
              )}

              {/* Engagement Metrics */}
              {(currentTrend.likes_count || currentTrend.comments_count || currentTrend.shares_count || currentTrend.views_count) ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
                >
                  {currentTrend.likes_count !== undefined && currentTrend.likes_count > 0 && (
                    <div className="bg-red-500/10 backdrop-blur-sm rounded-xl p-3 border border-red-500/20">
                      <div className="flex items-center gap-2">
                        <HeartIcon className="w-5 h-5 text-red-400" />
                        <span className="text-white font-semibold">{formatEngagementCount(currentTrend.likes_count)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Likes</p>
                    </div>
                  )}
                  {currentTrend.comments_count !== undefined && currentTrend.comments_count > 0 && (
                    <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl p-3 border border-blue-500/20">
                      <div className="flex items-center gap-2">
                        <MessageCircleIcon className="w-5 h-5 text-blue-400" />
                        <span className="text-white font-semibold">{formatEngagementCount(currentTrend.comments_count)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Comments</p>
                    </div>
                  )}
                  {currentTrend.shares_count !== undefined && currentTrend.shares_count > 0 && (
                    <div className="bg-green-500/10 backdrop-blur-sm rounded-xl p-3 border border-green-500/20">
                      <div className="flex items-center gap-2">
                        <ShareIcon className="w-5 h-5 text-green-400" />
                        <span className="text-white font-semibold">{formatEngagementCount(currentTrend.shares_count)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Shares</p>
                    </div>
                  )}
                  {currentTrend.views_count !== undefined && currentTrend.views_count > 0 && (
                    <div className="bg-purple-500/10 backdrop-blur-sm rounded-xl p-3 border border-purple-500/20">
                      <div className="flex items-center gap-2">
                        <EyeIcon className="w-5 h-5 text-purple-400" />
                        <span className="text-white font-semibold">{formatEngagementCount(currentTrend.views_count)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Views</p>
                    </div>
                  )}
                </motion.div>
              ) : null}

              {/* Hashtags */}
              {currentTrend.hashtags && currentTrend.hashtags.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-wrap gap-2 mb-6"
                >
                  {currentTrend.hashtags.map((tag, index) => (
                    <span 
                      key={index} 
                      className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm border border-blue-500/20"
                    >
                      #{tag}
                    </span>
                  ))}
                </motion.div>
              )}

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap items-center gap-3 text-sm"
              >
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 text-gray-300 backdrop-blur-sm">
                  <span className="text-base">📂</span>
                  <span className="capitalize">{currentTrend.category.replace(/_/g, ' ')}</span>
                </span>
                {currentTrend.platform && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 text-gray-300 backdrop-blur-sm">
                    <span className="text-base">📱</span>
                    <span className="capitalize">{currentTrend.platform}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 text-gray-300 backdrop-blur-sm">
                  <CheckIcon className="w-4 h-4" />
                  <span>{currentTrend.validation_count} validations</span>
                </span>
              </motion.div>
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
            transition={{ delay: 0.6 }}
            className="space-y-4"
          >
            <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-800/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 text-center">Is this a trending topic?</h3>
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
              <p>Keyboard shortcuts: <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300">←</kbd> Not Trending <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300 mx-2">→</kbd> Yes, Trending</p>
            </div>
          </motion.div>
        )}

        {/* Progress Indicator */}
        {trends.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6"
          >
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span className="flex items-center gap-2">
                <TrendingUpIcon className="w-4 h-4" />
                <span>Progress</span>
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
  );
}