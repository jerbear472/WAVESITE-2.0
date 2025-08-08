'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp,
  TrendingDown,
  SkipForward,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Menu,
  Zap,
  Coins,
  CheckCircle2
} from 'lucide-react';
import { EARNINGS_CONFIG } from '@/lib/earningsConfig';

interface TrendToVerify {
  id: string;
  created_at: string;
  category: string;
  description: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  platform?: string;
  creator_handle?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  validation_count: number;
  spotter_id: string;
  evidence?: any;
  virality_prediction?: number;
  quality_score?: number;
  hours_since_post?: number;
  wave_score?: number;
  growth_rate?: number;
  engagement_rate?: number;
}

export default function CleanVerifyPage() {
  const { user, refreshUser } = useAuth();
  const [trends, setTrends] = useState<TrendToVerify[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState({
    verified_today: 0,
    earnings_today: 0,
    remaining_today: 100,
    remaining_hour: 20
  });
  const [showEarningsAnimation, setShowEarningsAnimation] = useState(false);
  const [sessionEarnings, setSessionEarnings] = useState(0);
  const [consecutiveVerifies, setConsecutiveVerifies] = useState(0);

  const formatCount = (count?: number): string => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const calculateWaveScore = (trend: any): number => {
    // Wave score is a combination of virality prediction, quality score, and validation count
    const viralityScore = trend.virality_prediction || 5;
    const qualityScore = trend.quality_score || 5;
    const validationBoost = Math.min(trend.validation_count * 0.5, 2); // Max 2 point boost from validations
    
    const waveScore = (viralityScore * 0.5 + qualityScore * 0.3 + validationBoost) / 1.2;
    return Math.min(10, Math.round(waveScore * 10) / 10); // Cap at 10, round to 1 decimal
  };

  const calculateGrowthRate = (trend: any): number => {
    // Calculate growth rate based on engagement over time
    const hoursOld = Math.max(1, (Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60));
    const totalEngagement = (trend.likes_count || 0) + (trend.comments_count || 0) + (trend.shares_count || 0);
    
    // Engagement per hour
    const growthRate = totalEngagement / hoursOld;
    
    if (growthRate > 10000) return 100; // Viral
    if (growthRate > 1000) return 80;  // Very High
    if (growthRate > 100) return 60;   // High
    if (growthRate > 10) return 40;    // Medium
    if (growthRate > 1) return 20;     // Low
    return 10; // Very Low
  };

  const calculateEngagementRate = (trend: any): number => {
    // Calculate engagement rate as percentage of views
    if (!trend.views_count || trend.views_count === 0) return 0;
    
    const totalEngagement = (trend.likes_count || 0) + (trend.comments_count || 0) + (trend.shares_count || 0);
    const rate = (totalEngagement / trend.views_count) * 100;
    
    return Math.min(100, Math.round(rate * 10) / 10); // Cap at 100%, round to 1 decimal
  };

  const loadTrends = async () => {
    try {
      // Check if user is authenticated
      if (!user?.id) {
        console.warn('No user ID available for loading trends');
        setLoading(false);
        return;
      }

      // Get trends user hasn't validated
      const { data: validatedTrends } = await supabase
        .from('trend_validations')
        .select('trend_id')
        .eq('validator_id', user.id);

      const validatedIds = validatedTrends?.map(v => v.trend_id) || [];

      const { data: trendsData } = await supabase
        .from('trend_submissions')
        .select('*')
        .in('status', ['submitted', 'validating'])
        .neq('spotter_id', user.id) // Exclude user's own trends
        .not('id', 'in', validatedIds.length > 0 ? `(${validatedIds.join(',')})` : '()')
        .order('created_at', { ascending: false })
        .limit(20);

      // Process trends to calculate additional metrics
      const processedTrends = (trendsData || []).map(trend => {
        const hoursAgo = (Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60);
        
        // Calculate wave score (combination of virality and quality)
        const waveScore = calculateWaveScore(trend);
        
        // Calculate growth rate
        const growthRate = calculateGrowthRate(trend);
        
        // Calculate engagement rate
        const engagementRate = calculateEngagementRate(trend);
        
        return {
          ...trend,
          hours_since_post: Math.round(hoursAgo),
          wave_score: waveScore,
          growth_rate: growthRate,
          engagement_rate: engagementRate
        };
      });

      setTrends(processedTrends);
    } catch (error) {
      console.error('Error loading trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: validations } = await supabase
        .from('trend_validations')
        .select('*')
        .eq('validator_id', user?.id)
        .gte('created_at', today.toISOString());

      // Try to get rate limits, but handle errors gracefully
      let rateLimit = null;
      try {
        const { data, error } = await supabase
          .rpc('check_rate_limit', { p_user_id: user?.id });
        
        if (error) {
          console.warn('Rate limit check failed:', error);
          // Use default limits if RPC fails
        } else {
          rateLimit = data;
        }
      } catch (rpcError) {
        console.warn('RPC function not available:', rpcError);
        // Continue with default limits
      }

      setStats({
        verified_today: validations?.length || 0,
        earnings_today: parseFloat(((validations?.length || 0) * EARNINGS_CONFIG.VALIDATION_REWARDS.CORRECT_VALIDATION).toFixed(2)),
        remaining_today: rateLimit?.[0]?.validations_remaining_today || 100,
        remaining_hour: rateLimit?.[0]?.validations_remaining_hour || 20
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      // Set default stats on error
      setStats({
        verified_today: 0,
        earnings_today: 0,
        remaining_today: 100,
        remaining_hour: 20
      });
    }
  };

  const nextTrend = () => {
    if (currentIndex < trends.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(trends.length);
    }
  };

  const handleVote = async (vote: 'verify' | 'reject' | 'skip') => {
    if (vote === 'skip') {
      nextTrend();
      return;
    }

    if (!trends[currentIndex]) {
      console.error('No trend available to vote on');
      return;
    }

    setVerifying(true);
    try {
      await supabase
        .from('trend_validations')
        .insert({
          trend_submission_id: trends[currentIndex].id,
          validator_id: user?.id,
          vote,
          confidence_score: 0.75,
          created_at: new Date().toISOString()
        });

      // Update session earnings for this vote
      setSessionEarnings(prev => prev + EARNINGS_CONFIG.VALIDATION_REWARDS.CORRECT_VALIDATION);
      setConsecutiveVerifies(prev => prev + 1);
      
      // Show earnings animation
      setShowEarningsAnimation(true);
      setTimeout(() => setShowEarningsAnimation(false), 3000);
      
      // Refresh user earnings in profile (for navigation display)
      try {
        await supabase.rpc('refresh_user_earnings', { p_user_id: user?.id });
        // Also refresh the user context to update navigation
        await refreshUser();
      } catch (refreshError) {
        console.warn('Failed to refresh user earnings:', refreshError);
      }
      
      // Reload stats from database to ensure accuracy
      await loadStats();
      nextTrend();
    } catch (error) {
      console.error('Error submitting vote:', error);
      alert('Failed to submit vote. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadTrends();
      loadStats();
    }
  }, [user]);

  // Keyboard shortcuts
  useEffect(() => {
    const currentTrend = trends[currentIndex];
    if (!currentTrend || verifying) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (verifying || !currentTrend || stats.remaining_hour === 0) return;
      
      switch(e.key.toLowerCase()) {
        case 'arrowright':
        case 'd':
          handleVote('verify');
          break;
        case 'arrowleft':
        case 'a':
          handleVote('reject');
          break;
        case 'arrowdown':
        case 's':
          handleVote('skip');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [trends, currentIndex, verifying, stats.remaining_hour]);

  const currentTrend = trends[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading trends...</p>
        </div>
      </div>
    );
  }

  // Check if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <X className="w-10 h-10 text-red-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            Please log in to access the verify page.
          </p>
          <a 
            href="/login" 
            className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (!currentTrend) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
              <Zap className="w-10 h-10 text-purple-600" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">All caught up!</h2>
          <p className="text-gray-600 text-lg mb-8">
            You've reviewed all available trends. Check back later for more.
          </p>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wide">Today's Performance</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{stats.verified_today}</p>
                <p className="text-sm text-gray-500 mt-1">Trends Verified</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">${stats.earnings_today.toFixed(2)}</p>
                <p className="text-sm text-gray-500 mt-1">Total Earned</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Earnings Display */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-gray-900">Verify Trends</h1>
              <div className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-1 rounded-full">
                {currentIndex + 1} / {trends.length}
              </div>
            </div>
            
            {/* Live Earnings Counter */}
            <div className="flex items-center gap-3">
              <motion.div
                className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-lg flex items-center gap-2 border border-green-200"
                animate={showEarningsAnimation ? {
                  scale: [1, 1.02, 1],
                  borderColor: ['#86efac', '#22c55e', '#86efac']
                } : {}}
                transition={{ duration: 1.0 }}
              >
                <DollarSign className="w-5 h-5 text-green-600" />
                <div className="flex flex-col items-start">
                  <span className="font-bold text-green-800 text-lg leading-tight">
                    ${stats.earnings_today.toFixed(2)}
                  </span>
                  <span className="text-xs text-green-600">Earned Today</span>
                </div>
              </motion.div>
              
              {/* Stats Toggle */}
              <button
                onClick={() => setShowStats(!showStats)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showStats ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-purple-600"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / trends.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Stats Sidebar */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed right-0 top-16 bottom-0 w-80 bg-white shadow-lg z-20 overflow-y-auto"
          >
            <div className="p-4 space-y-4">
              <h3 className="font-bold text-gray-900 text-lg">Today's Performance</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-3xl font-bold text-purple-800">{stats.verified_today}</p>
                  <p className="text-sm text-purple-600 mt-1">Verified</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-3xl font-bold text-green-800">${stats.earnings_today.toFixed(2)}</p>
                  <p className="text-sm text-green-600 mt-1">Earned</p>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Hourly Limit</span>
                    <span className="font-medium">{stats.remaining_hour}/20</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-600"
                      style={{ width: `${(stats.remaining_hour / 20) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Daily Limit</span>
                    <span className="font-medium">{stats.remaining_today}/100</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-600"
                      style={{ width: `${(stats.remaining_today / 100) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-900 font-medium mb-1">Keyboard Shortcuts</p>
                <div className="space-y-1 text-xs text-blue-700">
                  <div>→ or D: Trending</div>
                  <div>← or A: Not Trending</div>
                  <div>↓ or S: Skip</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Earnings Animation Overlay */}
      <AnimatePresence>
        {showEarningsAnimation && (
          <motion.div
            initial={{ opacity: 0, x: -50, scale: 0.8 }}
            animate={{ opacity: 0.9, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.8 }}
            className="fixed bottom-6 left-6 z-50 pointer-events-none"
          >
            <div className="bg-green-500/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg shadow-sm flex items-center gap-2 text-sm">
              <Coins className="w-4 h-4" />
              <div className="flex flex-col">
                <span className="font-medium">+${EARNINGS_CONFIG.VALIDATION_REWARDS.CORRECT_VALIDATION.toFixed(2)} Earned!</span>
                {consecutiveVerifies >= 3 && (
                  <span className="text-xs opacity-90">
                    {consecutiveVerifies} in a row!
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Earnings Bar */}
      {sessionEarnings > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Current Session</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-blue-600">Verified:</span>
                  <span className="font-bold text-blue-800 text-lg">{consecutiveVerifies}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-blue-600">Session Earnings:</span>
                  <span className="font-bold text-blue-800 text-lg">+${sessionEarnings.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTrend.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            {/* Trend Image */}
            {(currentTrend.thumbnail_url || currentTrend.screenshot_url) && (
              <div className="aspect-video bg-gray-100 relative">
                <img
                  src={currentTrend.thumbnail_url || currentTrend.screenshot_url}
                  alt="Trend"
                  className="w-full h-full object-contain bg-black"
                />
                
                {/* Engagement Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <div className="flex gap-4">
                    {currentTrend.likes_count !== undefined && (
                      <div className="flex items-center gap-1 text-white">
                        <Heart className="w-4 h-4" />
                        <span className="text-sm">{formatCount(currentTrend.likes_count)}</span>
                      </div>
                    )}
                    {currentTrend.views_count !== undefined && (
                      <div className="flex items-center gap-1 text-white">
                        <Eye className="w-4 h-4" />
                        <span className="text-sm">{formatCount(currentTrend.views_count)}</span>
                      </div>
                    )}
                    {currentTrend.comments_count !== undefined && (
                      <div className="flex items-center gap-1 text-white">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm">{formatCount(currentTrend.comments_count)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Trend Info */}
            <div className="p-8">
              <div className="mb-4">
                <div className="mb-3">
                  <h2 className="text-2xl font-bold text-gray-900 leading-tight">{currentTrend.description}</h2>
                </div>
                
                {currentTrend.post_caption && (
                  <p className="text-gray-700 text-base mb-4 line-clamp-4 leading-relaxed">
                    {currentTrend.post_caption}
                  </p>
                )}

                {/* Metrics Display */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-medium text-purple-700">Wave Score</span>
                    </div>
                    <p className="text-xl font-bold text-purple-800">
                      {currentTrend.wave_score?.toFixed(1) || '5.0'}/10
                    </p>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-green-700">Growth</span>
                    </div>
                    <p className="text-xl font-bold text-green-800">
                      {currentTrend.growth_rate || 0}%
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Heart className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-700">Engagement</span>
                    </div>
                    <p className="text-xl font-bold text-blue-800">
                      {currentTrend.engagement_rate?.toFixed(1) || '0.0'}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-500">
                  {currentTrend.platform && (
                    <span className="capitalize">{currentTrend.platform}</span>
                  )}
                  {currentTrend.creator_handle && (
                    <>
                      <span>•</span>
                      <span>@{currentTrend.creator_handle}</span>
                    </>
                  )}
                  {currentTrend.category && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{currentTrend.category.replace(/_/g, ' ')}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-4">
                <motion.button
                  onClick={() => handleVote('reject')}
                  disabled={verifying || stats.remaining_hour === 0}
                  className="flex flex-col items-center justify-center py-5 px-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <TrendingDown className="w-7 h-7 mb-2" />
                  <span className="text-base font-semibold">Not Trending</span>
                  <span className="text-xs text-red-500 mt-1 opacity-70">← or A</span>
                </motion.button>

                <motion.button
                  onClick={() => handleVote('skip')}
                  className="flex flex-col items-center justify-center py-5 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-700 rounded-xl transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <SkipForward className="w-7 h-7 mb-2" />
                  <span className="text-base font-semibold">Skip</span>
                  <span className="text-xs text-gray-500 mt-1 opacity-70">↓ or S</span>
                </motion.button>

                <motion.button
                  onClick={() => handleVote('verify')}
                  disabled={verifying || stats.remaining_hour === 0}
                  className="flex flex-col items-center justify-center py-5 px-3 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <TrendingUp className="w-7 h-7 mb-2" />
                  <span className="text-base font-semibold">Trending</span>
                  <span className="text-xs text-green-500 mt-1 opacity-70">→ or D</span>
                </motion.button>
              </div>

              {/* Rate Limit Warning */}
              {stats.remaining_hour === 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    You've reached your hourly limit. Come back in a bit to continue verifying!
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Earnings Info Box */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* How to Verify */}
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How to verify:</p>
                <ul className="space-y-1 text-blue-700 text-xs">
                  <li>• <strong>Trending:</strong> Growing content</li>
                  <li>• <strong>Not Trending:</strong> Declining content</li>
                  <li>• <strong>Skip:</strong> When unsure</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Earnings Tracker */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
            <div className="flex gap-3">
              <Coins className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-800 mb-1">Earnings Tracker</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-green-700">Per verification:</span>
                    <span className="font-bold text-green-800">$0.01</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Verified today:</span>
                    <span className="font-bold text-green-800">{stats.verified_today}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Potential remaining:</span>
                    <span className="font-bold text-green-800">${(stats.remaining_today * 0.01).toFixed(2)}</span>
                  </div>
                  {consecutiveVerifies >= 3 && (
                    <div className="mt-2 p-2 bg-green-100 rounded text-green-800 font-medium">
                      🔥 {consecutiveVerifies} verifications in a row!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}