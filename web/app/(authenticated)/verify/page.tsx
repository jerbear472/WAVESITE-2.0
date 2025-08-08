'use client';

import { useEffect, useState } from 'react';
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
  Gauge,
  Activity,
  BarChart3
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
  // Calculate growth rate from these
  initial_views?: number;
  initial_likes?: number;
  hours_since_post?: number;
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

  useEffect(() => {
    if (user) {
      loadTrends();
      loadStats();
    }
  }, [user]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!currentTrend || verifying) return;
      
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handleVote('reject');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        handleVote('verify');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === ' ') {
        handleVote('skip');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, verifying, trends]);

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
        return {
          ...trend,
          hours_since_post: Math.round(hoursAgo)
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

  const calculateWaveScore = (trend: TrendToVerify): number => {
    // Calculate a wave score based on available metrics
    let score = 50; // Base score
    
    // Engagement rate boost
    if (trend.views_count && trend.views_count > 0) {
      const engagementRate = ((trend.likes_count || 0) + (trend.comments_count || 0) + (trend.shares_count || 0)) / trend.views_count;
      score += Math.min(20, engagementRate * 100);
    }
    
    // View count boost
    if (trend.views_count) {
      if (trend.views_count > 1000000) score += 20;
      else if (trend.views_count > 100000) score += 15;
      else if (trend.views_count > 10000) score += 10;
      else if (trend.views_count > 1000) score += 5;
    }
    
    // Virality prediction boost
    if (trend.virality_prediction) {
      score += (trend.virality_prediction - 5) * 3; // -15 to +15 based on 0-10 scale
    }
    
    // Time decay (newer is better)
    if (trend.hours_since_post) {
      if (trend.hours_since_post < 6) score += 10;
      else if (trend.hours_since_post < 24) score += 5;
      else if (trend.hours_since_post > 72) score -= 10;
    }
    
    return Math.min(100, Math.max(0, Math.round(score)));
  };

  const calculateGrowthRate = (trend: TrendToVerify): string => {
    if (!trend.views_count || !trend.hours_since_post || trend.hours_since_post === 0) {
      return 'N/A';
    }
    
    const viewsPerHour = trend.views_count / trend.hours_since_post;
    
    if (viewsPerHour > 100000) return '🚀 Explosive';
    if (viewsPerHour > 10000) return '📈 Rapid';
    if (viewsPerHour > 1000) return '⬆️ Growing';
    if (viewsPerHour > 100) return '➡️ Steady';
    return '⬇️ Slow';
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-gray-900">Verify Trends</h1>
              <div className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-1 rounded-full">
                {currentIndex + 1} / {trends.length}
              </div>
            </div>
            
            {/* Stats Toggle */}
            <button
              onClick={() => setShowStats(!showStats)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {showStats ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
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
                  <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded">
                    +$0.01
                  </span>
                </div>
                
                {currentTrend.post_caption && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                    {currentTrend.post_caption}
                  </p>
                )}

                <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
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
                  {currentTrend.hours_since_post && (
                    <>
                      <span>•</span>
                      <span>{currentTrend.hours_since_post}h ago</span>
                    </>
                  )}
                </div>

                {/* Key Metrics for Decision Making */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {/* Wave Score */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3">
                    <div className="text-xs text-blue-600 mb-1 font-medium">Wave Score</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-blue-700">
                        {calculateWaveScore(currentTrend)}
                      </span>
                      <span className="text-xs text-blue-600">/100</span>
                    </div>
                    <div className="mt-1 h-1 bg-blue-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                        style={{ width: `${calculateWaveScore(currentTrend)}%` }}
                      />
                    </div>
                  </div>

                  {/* Growth Rate */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3">
                    <div className="text-xs text-purple-600 mb-1 font-medium">Growth Rate</div>
                    <div className="text-lg font-bold text-purple-700">
                      {calculateGrowthRate(currentTrend)}
                    </div>
                    {currentTrend.views_count && currentTrend.hours_since_post ? (
                      <div className="text-xs text-purple-600 mt-1">
                        {formatCount(Math.round(currentTrend.views_count / currentTrend.hours_since_post))}/hr
                      </div>
                    ) : null}
                  </div>

                  {/* Engagement Rate */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3">
                    <div className="text-xs text-green-600 mb-1 font-medium">Engagement</div>
                    <div className="text-2xl font-bold text-green-700">
                      {currentTrend.views_count && currentTrend.views_count > 0 ? (
                        `${(((currentTrend.likes_count || 0) + (currentTrend.comments_count || 0)) / currentTrend.views_count * 100).toFixed(1)}%`
                      ) : (
                        'N/A'
                      )}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      {formatCount((currentTrend.likes_count || 0) + (currentTrend.comments_count || 0))} total
                    </div>
                  </div>
                </div>

                {/* Additional Context */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Views</span>
                    <span className="font-medium text-gray-900">{formatCount(currentTrend.views_count)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Validation Count</span>
                    <span className="font-medium text-gray-900">{currentTrend.validation_count} votes</span>
                  </div>
                  {currentTrend.virality_prediction && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Virality Prediction</span>
                      <span className="font-medium text-gray-900">{currentTrend.virality_prediction}/10</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleVote('reject')}
                  disabled={verifying || stats.remaining_hour === 0}
                  className="flex flex-col items-center justify-center py-4 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TrendingDown className="w-6 h-6 mb-1" />
                  <span className="text-sm font-medium">Not Trending</span>
                  <span className="text-xs text-red-500 mt-1">← or A</span>
                </button>

                <button
                  onClick={() => handleVote('skip')}
                  className="flex flex-col items-center justify-center py-4 px-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors"
                >
                  <SkipForward className="w-6 h-6 mb-1" />
                  <span className="text-sm font-medium">Skip</span>
                  <span className="text-xs text-gray-500 mt-1">↓ or S</span>
                </button>

                <button
                  onClick={() => handleVote('verify')}
                  disabled={verifying || stats.remaining_hour === 0}
                  className="flex flex-col items-center justify-center py-4 px-3 bg-green-50 hover:bg-green-100 text-green-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TrendingUp className="w-6 h-6 mb-1" />
                  <span className="text-sm font-medium">Trending</span>
                  <span className="text-xs text-green-500 mt-1">→ or D</span>
                </button>
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

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 rounded-xl p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">What makes a trend valid?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-blue-700">
                <div>
                  <p className="font-medium text-blue-800">✅ Vote Trending if:</p>
                  <ul className="space-y-1 text-xs mt-1">
                    <li>• Wave Score above 60</li>
                    <li>• Growing or Explosive growth rate</li>
                    <li>• High engagement (>2%)</li>
                    <li>• Recent (under 24h) with momentum</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-blue-800">❌ Vote Not Trending if:</p>
                  <ul className="space-y-1 text-xs mt-1">
                    <li>• Wave Score below 40</li>
                    <li>• Slow or declining growth</li>
                    <li>• Low engagement (<1%)</li>
                    <li>• Old content (>72h) losing steam</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}