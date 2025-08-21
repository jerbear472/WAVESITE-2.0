'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useXPNotification } from '@/contexts/XPNotificationContext';
import { 
  Heart,
  MessageCircle,
  TrendingUp,
  Flame,
  Skull,
  Target,
  Clock,
  Filter,
  ChevronDown,
  BarChart3,
  Users,
  Star,
  Zap,
  Trophy,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrendWithEngagement {
  id: string;
  title: string;
  description: string;
  platform: string;
  category: string;
  url: string;
  thumbnail_url?: string;
  creator_handle?: string;
  submitted_at: string;
  spotter_id: string;
  spotter_username: string;
  
  // Engagement metrics
  likes_count: number;
  comments_count: number;
  predictions_count: number;
  heat_score: number;
  user_has_liked: boolean;
  user_has_predicted: boolean;
  
  // Prediction breakdown
  prediction_breakdown: {
    '24hrs': number;
    '3days': number;
    '1week': number;
    '2weeks': number;
    'peaked': number;
  };
}

interface PredictionWithConfidence {
  trend_id: string;
  peak_time: string;
  confidence: 'very' | 'somewhat' | 'guess';
}

type FilterType = 'all' | 'rising' | 'peaking' | 'need_predictions';
type TimeFilter = 'all' | '24hrs' | 'week';
type CategoryFilter = 'all' | 'fashion' | 'memes' | 'music' | 'tech' | 'behavior_pattern';

export default function PredictionsArenaPage() {
  const { user } = useAuth();
  const { showXPNotification } = useXPNotification();
  
  const [trends, setTrends] = useState<TrendWithEngagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrend, setSelectedTrend] = useState<TrendWithEngagement | null>(null);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Prediction form
  const [peakPrediction, setPeakPrediction] = useState('');
  const [confidence, setConfidence] = useState<'very' | 'somewhat' | 'guess'>('somewhat');

  useEffect(() => {
    if (user) {
      loadTrends();
    }
  }, [user, filterType, timeFilter, categoryFilter]);

  const loadTrends = async () => {
    try {
      setLoading(true);
      
      // Build query
      let query = supabase
        .from('trend_submissions')
        .select(`
          *,
          spotter:users!trend_submissions_spotter_id_fkey(username),
          likes:trend_likes(user_id),
          comments:trend_comments(id),
          predictions:trend_predictions(*)
        `)
        .in('status', ['approved', 'validating']);

      // Apply category filter
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      // Apply time filter
      if (timeFilter === '24hrs') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        query = query.gte('created_at', yesterday.toISOString());
      } else if (timeFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      }

      const { data: trendData, error } = await query;

      if (error) throw error;

      // Process and calculate engagement metrics
      const processedTrends = trendData?.map(trend => {
        const likes_count = trend.likes?.length || 0;
        const comments_count = trend.comments?.length || 0;
        const predictions_count = trend.predictions?.length || 0;
        
        // Calculate age in hours
        const ageHours = (Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60);
        
        // Calculate heat score (engagement / age)
        const heat_score = (likes_count + (predictions_count * 2) + (comments_count * 3)) / Math.max(ageHours, 1);
        
        // Check if current user has liked
        const user_has_liked = trend.likes?.some((like: any) => like.user_id === user?.id) || false;
        const user_has_predicted = trend.predictions?.some((pred: any) => pred.predictor_id === user?.id) || false;
        
        // Calculate prediction breakdown
        const prediction_breakdown = {
          '24hrs': 0,
          '3days': 0,
          '1week': 0,
          '2weeks': 0,
          'peaked': 0
        };
        
        trend.predictions?.forEach((pred: any) => {
          if (pred.peak_time in prediction_breakdown) {
            prediction_breakdown[pred.peak_time as keyof typeof prediction_breakdown]++;
          }
        });

        return {
          ...trend,
          spotter_username: trend.spotter?.username || 'Anonymous',
          likes_count,
          comments_count,
          predictions_count,
          heat_score,
          user_has_liked,
          user_has_predicted,
          prediction_breakdown
        };
      }) || [];

      // Sort by heat score or filter type
      let sortedTrends = [...processedTrends];
      
      if (filterType === 'rising') {
        sortedTrends = sortedTrends.filter(t => t.heat_score > 5);
      } else if (filterType === 'peaking') {
        sortedTrends = sortedTrends.filter(t => t.prediction_breakdown['24hrs'] > t.predictions_count * 0.5);
      } else if (filterType === 'need_predictions') {
        sortedTrends = sortedTrends.filter(t => t.predictions_count < 5);
      }
      
      sortedTrends.sort((a, b) => b.heat_score - a.heat_score);

      setTrends(sortedTrends);
    } catch (error) {
      console.error('Error loading trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (trendId: string, currentlyLiked: boolean) => {
    if (!user) return;

    try {
      if (currentlyLiked) {
        // Unlike
        await supabase
          .from('trend_likes')
          .delete()
          .eq('trend_id', trendId)
          .eq('user_id', user.id);
      } else {
        // Like
        await supabase
          .from('trend_likes')
          .insert({
            trend_id: trendId,
            user_id: user.id,
            reaction_type: 'like'
          });
      }

      // Update local state
      setTrends(prev => prev.map(trend => {
        if (trend.id === trendId) {
          return {
            ...trend,
            user_has_liked: !currentlyLiked,
            likes_count: currentlyLiked ? trend.likes_count - 1 : trend.likes_count + 1
          };
        }
        return trend;
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handlePredict = async () => {
    if (!user || !selectedTrend || !peakPrediction) return;

    try {
      // Submit prediction
      const { error } = await supabase
        .from('trend_predictions')
        .insert({
          trend_id: selectedTrend.id,
          predictor_id: user.id,
          peak_time: peakPrediction,
          confidence_level: confidence === 'very' ? 90 : confidence === 'somewhat' ? 60 : 30,
          scale: 'mainstream', // Default for now
          next_phase: '1-3days' // Default for now
        });

      if (error) throw error;

      // Award XP based on confidence
      const baseXP = 10;
      const confidenceBonus = confidence === 'very' ? 10 : confidence === 'somewhat' ? 5 : 0;
      const totalXP = baseXP + confidenceBonus;

      await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_amount: totalXP,
        p_type: 'prediction',
        p_description: `Predicted trend: ${selectedTrend.title}`,
        p_reference_id: selectedTrend.id,
        p_reference_type: 'trend_submission'
      });

      showXPNotification(totalXP, `Prediction locked in! ${confidence === 'very' ? 'Bold move!' : ''}`, 'prediction');

      // Update local state
      setTrends(prev => prev.map(trend => {
        if (trend.id === selectedTrend.id) {
          const updatedBreakdown = { ...trend.prediction_breakdown };
          if (peakPrediction in updatedBreakdown) {
            updatedBreakdown[peakPrediction as keyof typeof updatedBreakdown]++;
          }
          return {
            ...trend,
            user_has_predicted: true,
            predictions_count: trend.predictions_count + 1,
            prediction_breakdown: updatedBreakdown
          };
        }
        return trend;
      }));

      setShowPredictionModal(false);
      setSelectedTrend(null);
      setPeakPrediction('');
      setConfidence('somewhat');
    } catch (error) {
      console.error('Error submitting prediction:', error);
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

  const formatHeatScore = (score: number) => {
    if (score > 20) return '🔥🔥🔥';
    if (score > 10) return '🔥🔥';
    if (score > 5) return '🔥';
    return '📈';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">The Arena</h1>
              <p className="text-sm text-gray-600">Validated trends compete for attention</p>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Filter Bar */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 space-y-3 overflow-hidden"
              >
                {/* Type Filters */}
                <div className="flex gap-2">
                  <span className="text-sm text-gray-500 py-2">Show:</span>
                  {(['all', 'rising', 'peaking', 'need_predictions'] as FilterType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filterType === type
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type === 'all' && 'All'}
                      {type === 'rising' && '🔥 Rising'}
                      {type === 'peaking' && '🚀 Peaking'}
                      {type === 'need_predictions' && '❓ Need Predictions'}
                    </button>
                  ))}
                </div>

                {/* Category Filters */}
                <div className="flex gap-2">
                  <span className="text-sm text-gray-500 py-2">Category:</span>
                  {(['all', 'fashion', 'memes', 'music', 'tech', 'behavior_pattern'] as CategoryFilter[]).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                        categoryFilter === cat
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cat === 'all' ? 'All' : cat.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* Time Filters */}
                <div className="flex gap-2">
                  <span className="text-sm text-gray-500 py-2">Time:</span>
                  {(['all', '24hrs', 'week'] as TimeFilter[]).map(time => (
                    <button
                      key={time}
                      onClick={() => setTimeFilter(time)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        timeFilter === time
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {time === 'all' && 'All Time'}
                      {time === '24hrs' && 'Last 24 Hours'}
                      {time === 'week' && 'Last Week'}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Trends Feed */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {trends.map((trend) => (
            <motion.div
              key={trend.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all"
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {trend.thumbnail_url ? (
                      <img src={trend.thumbnail_url} alt={trend.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
                        <span className="text-3xl">{getPlatformEmoji(trend.platform)}</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {formatHeatScore(trend.heat_score)} {trend.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{trend.description}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>Spotted by @{trend.spotter_username}</span>
                          <span>•</span>
                          <span>{new Date(trend.submitted_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            {getPlatformEmoji(trend.platform)} {trend.platform}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Prediction Breakdown */}
                    {trend.predictions_count > 0 && (
                      <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                        <div className="text-xs font-medium text-gray-700 mb-1">
                          {trend.predictions_count} predictions:
                        </div>
                        <div className="flex gap-3 text-xs">
                          {Object.entries(trend.prediction_breakdown)
                            .filter(([_, count]) => count > 0)
                            .map(([time, count]) => (
                              <span key={time} className="text-gray-600">
                                <span className="font-semibold">{count}</span> say {time}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-4 mt-4">
                      <button
                        onClick={() => handleLike(trend.id, trend.user_has_liked)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                          trend.user_has_liked
                            ? 'bg-red-50 text-red-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${trend.user_has_liked ? 'fill-current' : ''}`} />
                        <span className="text-sm font-medium">{trend.likes_count}</span>
                      </button>

                      <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">{trend.comments_count}</span>
                      </button>

                      <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors">
                        <BarChart3 className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {trend.predictions_count} {trend.predictions_count === 1 ? 'prediction' : 'predictions'}
                        </span>
                      </button>

                      {!trend.user_has_predicted && (
                        <button
                          onClick={() => {
                            setSelectedTrend(trend);
                            setShowPredictionModal(true);
                          }}
                          className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          <Target className="w-4 h-4" />
                          <span className="text-sm font-medium">Predict Peak</span>
                        </button>
                      )}
                      
                      {trend.user_has_predicted && (
                        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Prediction Locked</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Prediction Modal */}
      <AnimatePresence>
        {showPredictionModal && selectedTrend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPredictionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Make Your Prediction</h3>
              <p className="text-gray-600 mb-4">{selectedTrend.title}</p>

              {/* Peak Time Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  When will this peak?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: '24hrs', label: '24 hours' },
                    { value: '3days', label: '3 days' },
                    { value: '1week', label: '1 week' },
                    { value: '2weeks', label: '2 weeks' },
                    { value: 'peaked', label: 'Already peaked' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setPeakPrediction(option.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        peakPrediction === option.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confidence Level */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How confident are you?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'very' as const, label: 'Very', xp: '+20 XP' },
                    { value: 'somewhat' as const, label: 'Somewhat', xp: '+15 XP' },
                    { value: 'guess' as const, label: 'Just guessing', xp: '+10 XP' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setConfidence(option.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        confidence === option.value
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div>{option.label}</div>
                      <div className="text-xs opacity-75">{option.xp}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  More XP for confident + correct predictions!
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPredictionModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePredict}
                  disabled={!peakPrediction}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lock In Prediction
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}