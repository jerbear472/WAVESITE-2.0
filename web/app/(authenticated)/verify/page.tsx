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
  ChevronRight as ChevronRightIcon
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
  status: string;
  // User info
  spotter?: {
    username?: string;
    email?: string;
  };
}

export default function Verify() {
  const { user } = useAuth();
  const [trends, setTrends] = useState<TrendToVerify[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [lastAction, setLastAction] = useState<'trending' | 'not-trending' | null>(null);
  const [stats, setStats] = useState({
    verified_today: 0,
    earnings_today: 0,
    accuracy_score: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

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
      // Fetch trends that the user hasn't verified yet
      const { data: trendsData, error: trendsError } = await supabase
        .from('trend_submissions')
        .select('*')
        .neq('spotter_id', user?.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

      if (trendsError) throw trendsError;

      // Fetch user details for each trend
      const userIds = [...new Set(trendsData?.map(t => t.spotter_id) || [])];
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('id, username, email')
        .in('id', userIds);

      // Create a map of user data
      const userMap = (usersData || []).reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<string, any>);

      // Transform the data to include spotter info
      const transformedData = (trendsData || []).map(trend => ({
        ...trend,
        spotter: userMap[trend.spotter_id] || { username: 'Anonymous', email: null }
      }));

      setTrends(transformedData);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    setStatsLoading(true);
    try {
      // First ensure user profile exists
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user?.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: user?.id,
            email: user?.email,
            username: user?.email?.split('@')[0] || 'user',
            role: 'participant',
            created_at: new Date().toISOString(),
          });

        if (createError) {
          console.error('Error creating user profile:', createError);
          setStats({
            verified_today: 0,
            earnings_today: 0,
            accuracy_score: 0,
          });
          setStatsLoading(false);
          return;
        }
      }
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

      // Fetch earnings from validation
      const { data: earnings } = await supabase
        .from('earnings_ledger')
        .select('amount')
        .eq('user_id', user?.id)
        .eq('earning_type', 'validation')
        .eq('status', 'approved');

      const totalEarnings = earnings?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

      setStats({
        verified_today: todayValidations?.length || 0,
        earnings_today: totalEarnings,
        accuracy_score: 85, // This could be calculated based on actual voting patterns
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set to 0 if there's an error
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
    const trend = trends[currentIndex];

    try {
      // First ensure user profile exists
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user?.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: user?.id,
            email: user?.email,
            username: user?.email?.split('@')[0] || 'user',
            role: 'participant',
            created_at: new Date().toISOString(),
          });

        if (createError) {
          console.error('Error creating user profile:', createError);
          throw new Error('Please complete your profile setup first');
        }
      }
      // Check if user has already validated this trend
      const { data: existingValidation, error: checkError } = await supabase
        .from('trend_validations')
        .select('id')
        .eq('trend_id', trend.id)
        .eq('validator_id', user?.id)
        .single();

      // If there's an error other than no rows, throw it
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingValidation) {
        console.log('Already validated this trend');
        // Move to next trend
        if (currentIndex < trends.length - 1) {
          setCurrentIndex(prev => prev + 1);
        }
        // If we've reached the end, don't cycle back - user has completed all trends
        return;
      }

      // Submit verification vote
      const { data: insertData, error: insertError } = await supabase
        .from('trend_validations')
        .insert({
          trend_id: trend.id,
          validator_id: user?.id,
          vote: isValid ? 'verify' : 'reject',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error details:', insertError);
        throw insertError;
      }

      console.log('Validation inserted successfully:', insertData);

      // Set the last action for visual feedback
      setLastAction(isValid ? 'trending' : 'not-trending');

      // The database trigger will handle updating validation count and status
      console.log('Vote submitted successfully');

      // Fetch updated stats from database
      await fetchUserStats();

      // Wait a moment to show the feedback
      setTimeout(() => {
        setLastAction(null);
        // Move to next trend or mark as complete
        if (currentIndex < trends.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          // We've reached the end - mark as complete by incrementing past the last index
          setCurrentIndex(trends.length);
        }
      }, 500);
    } catch (error: any) {
      console.error('Error verifying trend:', error);
      // Show user-friendly error message
      alert(`Error: ${error.message || 'Failed to submit validation. Please try again.'}`);
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
    // Try to extract title from the formatted description
    const lines = description.split('\n');
    return lines[0] || 'Untitled Trend';
  };

  const extractPlatformFromDescription = (description: string): string => {
    // Try to extract platform from the formatted description
    const platformMatch = description.match(/Platform:\s*(\w+)/i);
    return platformMatch ? platformMatch[1] : 'Unknown';
  };

  const formatEngagementCount = (count?: number): string => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 safe-area-top safe-area-bottom">
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
              <h1 className="text-responsive-2xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">Verify Trends</h1>
              <p className="text-responsive-sm text-gray-400 mt-1">Help validate trends and earn rewards</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-4 border border-blue-500/20 hover:border-blue-500/40 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/5" />
              <div className="relative text-center">
                <ZapIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mx-auto mb-2 opacity-50" />
                {statsLoading ? (
                  <div className="h-6 sm:h-8 w-12 sm:w-16 mx-auto bg-gray-700 rounded animate-pulse"></div>
                ) : (
                  <p className="text-responsive-xl font-bold text-blue-400">{stats.verified_today}</p>
                )}
                <p className="text-responsive-xs text-gray-400 mt-1">Verified Today</p>
              </div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-600/10 p-4 border border-green-500/20 hover:border-green-500/40 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-600/5" />
              <div className="relative text-center">
                <AwardIcon className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 mx-auto mb-2 opacity-50" />
                {statsLoading ? (
                  <div className="h-6 sm:h-8 w-16 sm:w-20 mx-auto bg-gray-700 rounded animate-pulse"></div>
                ) : (
                  <p className="text-responsive-xl font-bold text-green-400">${stats.earnings_today.toFixed(2)}</p>
                )}
                <p className="text-responsive-xs text-gray-400 mt-1">Earned Today</p>
              </div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-600/10 p-4 border border-purple-500/20 hover:border-purple-500/40 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-600/5" />
              <div className="relative text-center">
                <TargetIcon className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 mx-auto mb-2 opacity-50" />
                {statsLoading ? (
                  <div className="h-6 sm:h-8 w-12 sm:w-16 mx-auto bg-gray-700 rounded animate-pulse"></div>
                ) : (
                  <p className="text-responsive-xl font-bold text-purple-400">
                    {stats.accuracy_score > 0 ? `${stats.accuracy_score}%` : 'N/A'}
                  </p>
                )}
                <p className="text-responsive-xs text-gray-400 mt-1">Accuracy</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Trend Card */}
        <AnimatePresence mode="wait">
        {currentTrend && currentIndex < trends.length ? (
          <motion.div 
            key={currentTrend.id}
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -50 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden mb-8 border border-gray-800/50">
            {(currentTrend.thumbnail_url || currentTrend.screenshot_url) && (
              <div className="relative h-48 sm:h-64 lg:h-80 overflow-hidden">
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
            
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-responsive-xl font-bold text-white mb-2 sm:mb-3">
                  {extractTitleFromDescription(currentTrend.description)}
                </h2>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-responsive-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    <span className="truncate max-w-[150px] sm:max-w-none">@{currentTrend.spotter?.username || currentTrend.spotter?.email?.split('@')[0] || 'anonymous'}</span>
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
                  <p className="text-gray-300 italic text-responsive-base leading-relaxed">"{currentTrend.post_caption}"</p>
                </motion.div>
              )}

              {/* Engagement Metrics */}
              {(currentTrend.likes_count || currentTrend.comments_count || currentTrend.shares_count || currentTrend.views_count) ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6"
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
                className="flex flex-wrap items-center gap-2 sm:gap-3 text-responsive-xs"
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
            {currentIndex >= trends.length && trends.length > 0 ? (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                >
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                    <CheckIcon className="w-10 h-10 text-white" />
                  </div>
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-3">All Caught Up! 🎉</h3>
                <p className="text-gray-400 text-lg mb-6">
                  You've verified all available trends. Great job!
                </p>
                <div className="bg-gray-800/50 rounded-xl p-4 inline-block">
                  <p className="text-sm text-gray-400">Come back later for more trends to verify</p>
                </div>
              </>
            ) : (
              <>
                <TrendingUpIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-lg">No trends to verify right now. Check back later!</p>
              </>
            )}
          </motion.div>
        )}
        </AnimatePresence>

        {/* Action Buttons */}
        {currentTrend && currentIndex < trends.length && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-4"
          >
            <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-800/50 p-4 sm:p-6">
              <h3 className="text-responsive-base font-semibold text-white mb-4 text-center">Is this a trending topic?</h3>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVerify(false)}
                  disabled={verifying}
                  className={`flex-1 border-2 py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 sm:gap-3 group touch-target ${
                    lastAction === 'not-trending' 
                      ? 'bg-red-500 border-red-500 text-white' 
                      : 'bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500'
                  }`}
                >
                  <XIcon className={`w-6 h-6 transition-transform ${lastAction === 'not-trending' ? 'scale-125' : 'group-hover:scale-110'}`} />
                  <span>{verifying && lastAction === 'not-trending' ? 'Recording...' : 'Not Trending'}</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVerify(true)}
                  disabled={verifying}
                  className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 sm:gap-3 shadow-xl group touch-target ${
                    lastAction === 'trending'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white shadow-2xl'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-2xl'
                  }`}
                >
                  <CheckIcon className={`w-6 h-6 transition-transform ${lastAction === 'trending' ? 'scale-125' : 'group-hover:scale-110'}`} />
                  <span>{verifying && lastAction === 'trending' ? 'Recording...' : 'Yes, Trending'}</span>
                </motion.button>
              </div>
            </div>
            
            {/* Keyboard Shortcuts */}
            <div className="text-center text-responsive-xs text-gray-500 hidden sm:block">
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