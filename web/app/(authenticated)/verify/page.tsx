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
  const { user } = useAuth();
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

  useEffect(() => {
    if (user) {
      loadTrends();
      loadStats();
    }
  }, [user]);

  // Keyboard shortcuts
  useEffect(() => {
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
  }, [currentTrend, verifying, stats.remaining_hour, trends, currentIndex, user]);

  const loadTrends = async () => {
    try {
      // Get trends user hasn't validated
      const { data: validatedTrends } = await supabase
        .from('trend_validations')
        .select('trend_id')
        .eq('validator_id', user?.id);

      const validatedIds = validatedTrends?.map(v => v.trend_id) || [];

      const { data: trendsData } = await supabase
        .from('trend_submissions')
        .select('*')
        .in('status', ['submitted', 'validating'])
        .neq('spotter_id', user?.id) // Exclude user's own trends
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

      const { data: rateLimit } = await supabase
        .rpc('check_rate_limit', { p_user_id: user?.id });

      setStats({
        verified_today: validations?.length || 0,
        earnings_today: (validations?.length || 0) * 0.01,
        remaining_today: rateLimit?.[0]?.validations_remaining_today || 100,
        remaining_hour: rateLimit?.[0]?.validations_remaining_hour || 20
      });
    } catch (error) {
      console.error('Error loading stats:', error);
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
          trend_id: trends[currentIndex].id,
          validator_id: user?.id,
          vote,
          confidence_score: 0.75,
          created_at: new Date().toISOString()
        });

      // Update earnings immediately for better UX
      setStats(prev => ({
        ...prev,
        verified_today: prev.verified_today + 1,
        earnings_today: prev.earnings_today + 0.01
      }));
      setSessionEarnings(prev => prev + 0.01);
      setConsecutiveVerifies(prev => prev + 1);
      
      // Show earnings animation
      setShowEarningsAnimation(true);
      setTimeout(() => setShowEarningsAnimation(false), 2000);
      
      await loadStats();
      nextTrend();
    } catch (error) {
      console.error('Error submitting vote:', error);
      alert('Failed to submit vote. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const nextTrend = () => {
    if (currentIndex < trends.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(trends.length);
    }
  };

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

  if (!currentTrend) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
              <Zap className="w-10 h-10 text-purple-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">All caught up!</h2>
          <p className="text-gray-600 mb-6">
            You've reviewed all available trends. Check back later for more.
          </p>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-around text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.verified_today}</p>
                <p className="text-sm text-gray-500">Verified Today</p>
              </div>
              <div className="border-l border-gray-200" />
              <div>
                <p className="text-2xl font-bold text-green-600">${stats.earnings_today.toFixed(2)}</p>
                <p className="text-sm text-gray-500">Earned Today</p>
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
                className="bg-green-50 px-3 py-1.5 rounded-lg flex items-center gap-2"
                animate={showEarningsAnimation ? {
                  scale: [1, 1.1, 1],
                  backgroundColor: ['#f0fdf4', '#86efac', '#f0fdf4']
                } : {}}
                transition={{ duration: 0.5 }}
              >
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="font-bold text-green-700">
                  ${stats.earnings_today.toFixed(2)}
                </span>
                <span className="text-xs text-green-600">today</span>
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
              <h3 className="font-semibold text-gray-900">Today's Stats</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-purple-700">{stats.verified_today}</p>
                  <p className="text-xs text-purple-600">Verified</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-700">${stats.earnings_today.toFixed(2)}</p>
                  <p className="text-xs text-green-600">Earned</p>
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
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="bg-green-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
              <Coins className="w-5 h-5" />
              <span className="font-bold text-lg">+$0.01</span>
              {consecutiveVerifies >= 5 && (
                <span className="text-sm bg-green-600 px-2 py-0.5 rounded-full">
                  {consecutiveVerifies} streak!
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Earnings Bar */}
      {sessionEarnings > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
          <div className="max-w-3xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700">Session Progress</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600">Verified:</span>
                  <span className="font-bold text-green-700">{Math.floor(sessionEarnings / 0.01)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600">Earned:</span>
                  <span className="font-bold text-green-700">+${sessionEarnings.toFixed(2)}</span>
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
                  className="w-full h-full object-cover"
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
            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-xl font-bold text-gray-900">{currentTrend.description}</h2>
                  <motion.div
                    className="flex items-center gap-1"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="bg-green-100 text-green-700 text-sm font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <Coins className="w-4 h-4" />
                      <span>+$0.01</span>
                    </div>
                  </motion.div>
                </div>
                
                {currentTrend.post_caption && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                    {currentTrend.post_caption}
                  </p>
                )}

                {/* Metrics Display */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-purple-50 rounded-lg p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Zap className="w-3 h-3 text-purple-600" />
                      <span className="text-xs text-purple-600">Wave Score</span>
                    </div>
                    <p className="text-lg font-bold text-purple-700">
                      {currentTrend.wave_score?.toFixed(1) || '5.0'}/10
                    </p>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-green-600">Growth</span>
                    </div>
                    <p className="text-lg font-bold text-green-700">
                      {currentTrend.growth_rate || 0}%
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Heart className="w-3 h-3 text-blue-600" />
                      <span className="text-xs text-blue-600">Engagement</span>
                    </div>
                    <p className="text-lg font-bold text-blue-700">
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

              {/* Action Buttons with Earnings Emphasis */}
              <div className="grid grid-cols-3 gap-3">
                <motion.button
                  onClick={() => handleVote('reject')}
                  disabled={verifying || stats.remaining_hour === 0}
                  className="relative flex flex-col items-center justify-center py-4 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    +$0.01
                  </div>
                  <TrendingDown className="w-6 h-6 mb-1" />
                  <span className="text-sm font-medium">Not Trending</span>
                  <span className="text-xs text-red-500 mt-1">← or A</span>
                </motion.button>

                <motion.button
                  onClick={() => handleVote('skip')}
                  className="flex flex-col items-center justify-center py-4 px-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <SkipForward className="w-6 h-6 mb-1" />
                  <span className="text-sm font-medium">Skip</span>
                  <span className="text-xs text-gray-500 mt-1">↓ or S</span>
                  <span className="text-xs text-gray-400 mt-0.5">No earnings</span>
                </motion.button>

                <motion.button
                  onClick={() => handleVote('verify')}
                  disabled={verifying || stats.remaining_hour === 0}
                  className="relative flex flex-col items-center justify-center py-4 px-3 bg-green-50 hover:bg-green-100 text-green-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    +$0.01
                  </div>
                  <TrendingUp className="w-6 h-6 mb-1" />
                  <span className="text-sm font-medium">Trending</span>
                  <span className="text-xs text-green-500 mt-1">→ or D</span>
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
                    <span className="text-green-700">Potential today:</span>
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