'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Calendar,
  Clock,
  Hash,
  Users,
  Eye,
  ChevronRight,
  Activity,
  Sparkles,
  X,
  Link as LinkIcon,
  User,
  ThumbsUp,
  MessageSquare,
  Target,
  Brain,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, differenceInDays } from 'date-fns';

interface PastTrend {
  id: string;
  title: string;
  description: string;
  category: string;
  wave_score: number;
  validation_count: number;
  hashtags?: string[];
  platform?: string;
  views_count?: number;
  created_at: string;
  status: string;
  spotter_id?: string;
  url?: string;
  thumbnail_url?: string;
  creator_handle?: string;
  creator_name?: string;
  likes_count?: number;
  comments_count?: number;
  trend_velocity?: string;
  trend_size?: string;
  predicted_peak?: string;
  ai_analysis?: string;
  sentiment?: number;
  audience_demographic?: string;
}

interface PastTrendsTimelineProps {
  userId?: string;
}

export default function PastTrendsTimeline({ userId }: PastTrendsTimelineProps) {
  const [pastTrends, setPastTrends] = useState<PastTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('week');
  const [selectedTrend, setSelectedTrend] = useState<PastTrend | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (userId) {
      loadPastTrends();
    }
  }, [selectedTimeframe, userId]);

  const loadPastTrends = async () => {
    if (!userId) return;
    
    try {
      // Calculate date range based on timeframe
      const now = new Date();
      let startDate = new Date();
      
      if (selectedTimeframe === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (selectedTimeframe === 'month') {
        startDate.setDate(now.getDate() - 30);
      } else {
        startDate.setFullYear(now.getFullYear() - 1);
      }

      // Load only the current user's submissions
      const { data, error } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('spotter_id', userId)  // Only user's own submissions
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading trends:', error);
        setPastTrends([]);
      } else {
        setPastTrends(data || []);
      }
    } catch (error) {
      console.error('Error loading trends:', error);
      setPastTrends([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTrendClick = (trend: PastTrend) => {
    setSelectedTrend(trend);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedTrend(null), 300);
  };

  const formatCategory = (category: string): string => {
    // Convert database enum values to display labels
    const categoryMap: Record<string, string> = {
      'meme_format': 'Meme/Humor',
      'fashion': 'Fashion',
      'food_drink': 'Food & Drink',
      'audio_music': 'Music',
      'lifestyle': 'Lifestyle',
      'technology': 'Tech',
      'finance': 'Finance',
      'sports': 'Sports',
      'political': 'Political',
      'automotive': 'Cars',
      'animals_pets': 'Animals',
      'travel': 'Travel',
      'education': 'Education',
      'health': 'Health',
      'entertainment': 'Entertainment',
      'gaming': 'Gaming',
      'art': 'Art',
      'business': 'Business',
      'celebrity': 'Celebrity',
      'dance': 'Dance',
      'diy_crafts': 'DIY',
      'news_events': 'News',
      'relationship': 'Relationship',
      'product_brand': 'Product'
    };
    
    return categoryMap[category] || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Tech': 'from-blue-500 to-cyan-500',
      'Fashion': 'from-purple-500 to-pink-500',
      'Food & Drink': 'from-orange-500 to-red-500',
      'Sports': 'from-green-500 to-emerald-500',
      'Entertainment': 'from-indigo-500 to-purple-500',
      'Lifestyle': 'from-teal-500 to-green-500',
      'Gaming': 'from-violet-500 to-purple-500',
      'Music': 'from-pink-500 to-rose-500',
      'Meme/Humor': 'from-yellow-500 to-orange-500',
      art: 'from-purple-500 to-blue-500',
      education: 'from-blue-500 to-green-500',
      business: 'from-gray-500 to-blue-500',
      health: 'from-green-500 to-teal-500',
      science: 'from-blue-500 to-indigo-500',
      politics: 'from-red-500 to-blue-500',
      other: 'from-gray-500 to-gray-600'
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  const formatTimeAgo = (date: string) => {
    const daysAgo = differenceInDays(new Date(), new Date(date));
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    if (daysAgo < 7) return `${daysAgo} days ago`;
    if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
    return format(new Date(date), 'MMM d, yyyy');
  };

  const getVelocityLabel = (velocity?: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      'just_starting': { text: 'Just Starting', color: 'text-green-600' },
      'picking_up': { text: 'Picking Up', color: 'text-blue-600' },
      'viral': { text: 'Viral', color: 'text-orange-600' },
      'saturated': { text: 'Saturated', color: 'text-purple-600' },
      'declining': { text: 'Declining', color: 'text-gray-600' }
    };
    return labels[velocity || ''] || { text: 'Unknown', color: 'text-gray-500' };
  };

  const getTrendSizeLabel = (size?: string) => {
    const labels: Record<string, string> = {
      'micro': 'Micro',
      'niche': 'Niche',
      'viral': 'Viral',
      'mega': 'Mega',
      'global': 'Global'
    };
    return labels[size || ''] || 'Unknown';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-500" />
                Your Recent Submissions
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Track your trend spotting activity
              </p>
            </div>
            
            {/* Timeframe selector */}
            <div className="flex gap-2">
              {(['week', 'month', 'all'] as const).map(timeframe => (
                <button
                  key={timeframe}
                  onClick={() => setSelectedTimeframe(timeframe)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedTimeframe === timeframe
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {timeframe === 'week' ? '7 Days' : timeframe === 'month' ? '30 Days' : 'All Time'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Trends List */}
        <div className="divide-y divide-gray-100">
          {pastTrends.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No trends in this timeframe</p>
              <p className="text-sm text-gray-400 mt-2">
                Submit trends to see them here
              </p>
            </div>
          ) : (
            pastTrends.map((trend, index) => (
              <motion.div
                key={trend.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleTrendClick(trend)}
              >
                <div className="flex gap-4">
                  {/* Thumbnail - Always show, with fallback */}
                  <div className="flex-shrink-0">
                    {trend.thumbnail_url ? (
                      <img 
                        src={trend.thumbnail_url} 
                        alt={trend.title || 'Trend thumbnail'}
                        className="w-24 h-24 object-cover rounded-lg bg-gray-100"
                        onError={(e) => {
                          // Show fallback on error
                          const target = e.currentTarget as HTMLImageElement;
                          target.onerror = null; // Prevent infinite loop
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                                <span class="text-3xl">📈</span>
                              </div>
                            `;
                          }
                        }}
                      />
                    ) : (
                      // Fallback for missing thumbnails
                      <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-3xl">
                          {trend.platform === 'tiktok' ? '🎵' : 
                           trend.platform === 'instagram' ? '📸' :
                           trend.platform === 'twitter' ? '🐦' :
                           trend.platform === 'youtube' ? '📺' :
                           '📈'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Trend Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                        {/* Status Badge */}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          trend.status === 'validated' || trend.status === 'quality_approved' ? 'bg-green-100 text-green-700' :
                          trend.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          trend.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {trend.status === 'validated' || trend.status === 'quality_approved' ? '✓ Validated' :
                           trend.status === 'rejected' ? '✗ Rejected' :
                           trend.status === 'pending' ? '⏳ Pending' :
                           trend.status === 'submitted' ? '📝 Submitted' :
                           trend.status}
                        </span>
                        
                        {trend.platform && (
                          <span className="text-xs text-gray-500">
                            via {trend.platform}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(trend.created_at)}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {trend.title || 'Untitled Trend'}
                      </h3>
                      
                      {trend.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {trend.description}
                        </p>
                      )}

                      {/* Tags */}
                      {trend.hashtags && trend.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {trend.hashtags.slice(0, 5).map((tag, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs">
                              <Hash className="w-3 h-3" />
                              {tag.replace('#', '')}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {trend.views_count !== undefined && trend.views_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {trend.views_count > 1000000 
                              ? `${(trend.views_count / 1000000).toFixed(1)}M` 
                              : trend.views_count > 1000 
                              ? `${(trend.views_count / 1000).toFixed(0)}K`
                              : trend.views_count} views
                          </span>
                        )}
                        {trend.validation_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {trend.validation_count} validations
                          </span>
                        )}
                        {trend.status === 'trending' && (
                          <span className="flex items-center gap-1 text-orange-500 font-medium">
                            <Sparkles className="w-4 h-4" />
                            Trending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Wave Score Badge */}
                    {trend.wave_score > 0 && (
                      <div className="text-center ml-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                          {trend.wave_score}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Score</p>
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* View All Link */}
        {pastTrends.length > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <button className="w-full py-2 text-center text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center justify-center gap-2">
              View All Validated Trends
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Trend Details Modal */}
      <AnimatePresence>
        {showModal && selectedTrend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="relative p-6 border-b border-gray-200">
                <button
                  onClick={closeModal}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
                
                <div className="pr-10">
                  <div className="flex items-center gap-3 mb-2">
                    {selectedTrend.platform && (
                      <span className="text-sm text-gray-500">
                        {selectedTrend.platform}
                      </span>
                    )}
                    <span className="text-sm text-gray-400">
                      {formatTimeAgo(selectedTrend.created_at)}
                    </span>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedTrend.title || 'Untitled Trend'}
                  </h2>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Thumbnail */}
                {selectedTrend.thumbnail_url && (
                  <div className="mb-6 rounded-xl overflow-hidden bg-gray-100">
                    <img 
                      src={selectedTrend.thumbnail_url} 
                      alt={selectedTrend.title}
                      className="w-full h-64 object-cover"
                    />
                  </div>
                )}

                {/* Description */}
                {selectedTrend.description && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Description
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {selectedTrend.description}
                    </p>
                  </div>
                )}

                {/* Original URL */}
                {selectedTrend.url && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      Source URL
                    </h3>
                    <a 
                      href={selectedTrend.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 flex items-center gap-2 break-all"
                    >
                      {selectedTrend.url}
                      <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    </a>
                  </div>
                )}

                {/* Creator Info */}
                {(selectedTrend.creator_handle || selectedTrend.creator_name) && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Creator
                    </h3>
                    <div className="text-gray-600">
                      {selectedTrend.creator_handle && (
                        <span className="font-medium">{selectedTrend.creator_handle}</span>
                      )}
                      {selectedTrend.creator_name && selectedTrend.creator_handle && ' • '}
                      {selectedTrend.creator_name && (
                        <span>{selectedTrend.creator_name}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Trend Analysis */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {selectedTrend.trend_velocity && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Velocity
                      </h3>
                      <p className={`font-medium ${getVelocityLabel(selectedTrend.trend_velocity).color}`}>
                        {getVelocityLabel(selectedTrend.trend_velocity).text}
                      </p>
                    </div>
                  )}

                  {selectedTrend.trend_size && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Trend Size
                      </h3>
                      <p className="font-medium text-gray-900">
                        {getTrendSizeLabel(selectedTrend.trend_size)}
                      </p>
                    </div>
                  )}

                  {selectedTrend.predicted_peak && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Predicted Peak
                      </h3>
                      <p className="font-medium text-gray-900">
                        {selectedTrend.predicted_peak === '24_hours' ? 'Next 24 hours' :
                         selectedTrend.predicted_peak === '1_week' ? 'Within 1 week' :
                         selectedTrend.predicted_peak === '1_month' ? 'Within 1 month' :
                         selectedTrend.predicted_peak}
                      </p>
                    </div>
                  )}

                  {selectedTrend.sentiment !== undefined && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Sentiment
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                            style={{ width: `${selectedTrend.sentiment}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{selectedTrend.sentiment}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Analysis */}
                {selectedTrend.ai_analysis && (
                  <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                    <h3 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      AI Analysis
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedTrend.ai_analysis}
                    </p>
                  </div>
                )}

                {/* Engagement Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {selectedTrend.views_count !== undefined && (
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Eye className="w-5 h-5 text-gray-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-gray-900">
                        {selectedTrend.views_count > 1000000 
                          ? `${(selectedTrend.views_count / 1000000).toFixed(1)}M` 
                          : selectedTrend.views_count > 1000 
                          ? `${(selectedTrend.views_count / 1000).toFixed(0)}K`
                          : selectedTrend.views_count}
                      </p>
                      <p className="text-xs text-gray-500">Views</p>
                    </div>
                  )}

                  {selectedTrend.likes_count !== undefined && (
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <ThumbsUp className="w-5 h-5 text-gray-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-gray-900">
                        {selectedTrend.likes_count > 1000 
                          ? `${(selectedTrend.likes_count / 1000).toFixed(0)}K`
                          : selectedTrend.likes_count}
                      </p>
                      <p className="text-xs text-gray-500">Likes</p>
                    </div>
                  )}

                  {selectedTrend.comments_count !== undefined && (
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-gray-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-gray-900">
                        {selectedTrend.comments_count > 1000 
                          ? `${(selectedTrend.comments_count / 1000).toFixed(0)}K`
                          : selectedTrend.comments_count}
                      </p>
                      <p className="text-xs text-gray-500">Comments</p>
                    </div>
                  )}
                </div>

                {/* Hashtags */}
                {selectedTrend.hashtags && selectedTrend.hashtags.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Hashtags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTrend.hashtags.map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm">
                          #{tag.replace('#', '')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Wave Score */}
                {selectedTrend.wave_score > 0 && (
                  <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl mb-2">
                      {selectedTrend.wave_score}
                    </div>
                    <p className="text-sm text-gray-600">Wave Score</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}