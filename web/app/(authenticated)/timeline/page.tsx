'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import SmartTrendSubmission from '@/components/SmartTrendSubmission';
import { submitTrend } from '@/lib/submitTrend';
import { useToast } from '@/contexts/ToastContext';
import { useXPNotification } from '@/contexts/XPNotificationContext';
import { 
  TrendingUp as TrendingUpIcon,
  Clock as ClockIcon,
  Eye as EyeIcon,
  Heart as HeartIcon,
  ExternalLink as ExternalLinkIcon,
  User as UserIcon,
  Calendar as CalendarIcon,
  Tag as TagIcon,
  Plus as PlusIcon,
  Sparkles as SparklesIcon,
  ChevronRight,
  Grid3X3,
  List,
  BarChart3
} from 'lucide-react';

interface Trend {
  id: string;
  spotter_id: string;
  trend_name?: string;
  category: string;
  description: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  evidence?: any;
  created_at: string;
  status: string;
  quality_score?: number;
  wave_votes?: number;
  fire_votes?: number;
  creator_handle?: string;
  creator_name?: string;
  likes_count?: number;
  views_count?: number;
  hashtags?: string[];
  post_url?: string;
  is_saved_trend?: boolean;
  is_own_trend?: boolean;
  saved_reaction?: string;
  saved_at?: string;
  profiles?: {
    username: string;
  };
}

type ViewMode = 'grid' | 'list';

export default function Timeline() {
  const { user, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useToast();
  const { showXPNotification } = useXPNotification();
  const router = useRouter();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);

  const fetchUserTrends = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch user's submitted trends
      const { data: submittedTrends, error: submittedError } = await supabase
        .from('trend_submissions')
        .select(`
          *,
          profiles:spotter_id (
            username
          )
        `)
        .eq('spotter_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch user's saved trends
      const { data: savedTrendsData, error: savedError } = await supabase
        .from('saved_trends')
        .select(`
          reaction,
          saved_at,
          trend:trend_submissions (
            *,
            profiles:spotter_id (
              username
            )
          )
        `)
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false });

      if (submittedError) throw submittedError;
      if (savedError) throw savedError;

      // Combine and format trends
      let allTrends: Trend[] = [];

      if (submittedTrends) {
        allTrends = submittedTrends.map(trend => ({
          ...trend,
          is_own_trend: true,
          is_saved_trend: false
        }));
      }

      if (savedTrendsData) {
        const savedTrends = savedTrendsData
          .filter(item => item.trend && typeof item.trend === 'object' && !Array.isArray(item.trend))
          .map(item => ({
            ...(item.trend as Trend),
            is_saved_trend: true,
            is_own_trend: false,
            saved_reaction: item.reaction,
            saved_at: item.saved_at
          })) as Trend[];
        allTrends = [...allTrends, ...savedTrends];
      }

      // Sort by most recent
      allTrends.sort((a, b) => {
        const dateA = new Date(a.saved_at || a.created_at).getTime();
        const dateB = new Date(b.saved_at || b.created_at).getTime();
        return dateB - dateA;
      });

      setTrends(allTrends);
    } catch (error) {
      console.error('Error fetching trends:', error);
      showError('Failed to load trends');
    } finally {
      setLoading(false);
    }
  }, [user, showError]);

  useEffect(() => {
    if (user) {
      fetchUserTrends();
    }
  }, [user, fetchUserTrends]);

  const handleTrendSubmit = async (trendData: any) => {
    if (!user) return;
    
    try {
      const result = await submitTrend(user.id, trendData);
      
      if (result.success) {
        setShowSubmitForm(false);
        await fetchUserTrends();
        
        if (result.earnings) {
          showXPNotification(
            result.earnings,
            `You earned ${result.earnings} XP!`,
            'submission',
            'Trend Submitted!',
            result.xpBreakdown?.join(' • ')
          );
        }
        
        showSuccess('Trend submitted successfully!');
      } else {
        showError(result.error || 'Failed to submit trend');
      }
    } catch (error: any) {
      console.error('Error submitting trend:', error);
      showError(error.message || 'Failed to submit trend');
    }
  };

  const getCategoryEmoji = (category: string): string => {
    const emojis: Record<string, string> = {
      technology: '💻',
      fashion: '👗',
      food: '🍔',
      travel: '✈️',
      fitness: '💪',
      entertainment: '🎬',
      gaming: '🎮',
      sports: '⚽',
      music: '🎵',
      art: '🎨',
      education: '📚',
      business: '💼',
      health: '🏥',
      science: '🔬',
      politics: '🏛️',
      comedy: '😂',
      beauty: '💄',
      diy: '🔨',
      pets: '🐾',
      automotive: '🚗',
      finance: '💰',
      realestate: '🏠',
      crypto: '₿',
      other: '📌'
    };
    return emojis[category?.toLowerCase()] || '📌';
  };

  const formatEngagement = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <TrendingUpIcon className="w-12 h-12 text-blue-600" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  My Timeline
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {trends.length} trends • {trends.filter(t => t.is_own_trend).length} submitted
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  onClick={() => setShowSubmitForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <PlusIcon className="w-5 h-5" />
                  Submit Trend
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {trends.length === 0 ? (
          <div className="text-center py-16">
            <SparklesIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No trends yet</h2>
            <p className="text-gray-500 mb-6">Start by submitting your first trend!</p>
            <button
              onClick={() => setShowSubmitForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all"
            >
              Submit Your First Trend
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 
            'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 
            'space-y-4'
          }>
            {trends.map((trend) => (
              <motion.div
                key={trend.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
                onClick={() => setSelectedTrend(trend)}
              >
                {/* Thumbnail */}
                {(trend.thumbnail_url || trend.screenshot_url) && (
                  <div className={`${viewMode === 'list' ? 'w-48' : 'h-48'} bg-gray-100 overflow-hidden`}>
                    <img
                      src={trend.thumbnail_url || trend.screenshot_url || ''}
                      alt={trend.trend_name || trend.description}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-4 flex-1">
                  {/* Category & Status */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {getCategoryEmoji(trend.category)} {trend.category}
                    </span>
                    {trend.is_saved_trend ? (
                      <span className="text-xs text-purple-600">📌 Saved</span>
                    ) : (
                      <span className="text-xs text-green-600">✨ Submitted</span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">
                    {trend.trend_name || trend.description}
                  </h3>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-3 h-3" />
                      {new Date(trend.created_at).toLocaleDateString()}
                    </div>
                    {(trend.likes_count || trend.views_count) ? (
                      <div className="flex items-center gap-2">
                        {trend.likes_count ? (
                          <span className="flex items-center gap-1">
                            <HeartIcon className="w-3 h-3" />
                            {formatEngagement(trend.likes_count)}
                          </span>
                        ) : null}
                        {trend.views_count ? (
                          <span className="flex items-center gap-1">
                            <EyeIcon className="w-3 h-3" />
                            {formatEngagement(trend.views_count)}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {/* Vote Counts */}
                  {(trend.wave_votes || trend.fire_votes) ? (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      {trend.wave_votes && trend.wave_votes > 0 ? (
                        <span className="text-blue-600">🌊 {trend.wave_votes}</span>
                      ) : null}
                      {trend.fire_votes && trend.fire_votes > 0 ? (
                        <span className="text-red-600">🔥 {trend.fire_votes}</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Form Modal */}
      {showSubmitForm && (
        <SmartTrendSubmission
          onClose={() => setShowSubmitForm(false)}
          onSubmit={handleTrendSubmit}
        />
      )}

      {/* Trend Detail Modal */}
      <AnimatePresence>
        {selectedTrend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedTrend(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">
                  {selectedTrend.trend_name || selectedTrend.description}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {getCategoryEmoji(selectedTrend.category)} {selectedTrend.category}
                </p>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {(selectedTrend.thumbnail_url || selectedTrend.screenshot_url) && (
                  <div className="mb-6">
                    <img
                      src={selectedTrend.thumbnail_url || selectedTrend.screenshot_url || ''}
                      alt={selectedTrend.trend_name || selectedTrend.description}
                      className="w-full rounded-lg"
                    />
                  </div>
                )}

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-1">Description</h3>
                    <p className="text-gray-600">{selectedTrend.description}</p>
                  </div>

                  {selectedTrend.creator_handle && (
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-1">Creator</h3>
                      <p className="text-gray-600">@{selectedTrend.creator_handle}</p>
                    </div>
                  )}

                  {selectedTrend.hashtags && selectedTrend.hashtags.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-1">Hashtags</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedTrend.hashtags.map((tag, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTrend.post_url && (
                    <div>
                      <a 
                        href={selectedTrend.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <ExternalLinkIcon className="w-4 h-4" />
                        View Original Post
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t">
                <button
                  onClick={() => setSelectedTrend(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}