'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { 
  TrendingUp,
  Award,
  Clock,
  Users,
  RefreshCw,
  Sparkles,
  Eye,
  ThumbsUp,
  MessageSquare,
  Share2,
  ExternalLink,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';

interface ValidatedTrend {
  id: string;
  title: string;
  description: string;
  category: string;
  platform?: string;
  creator_handle?: string;
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  wave_score?: number;
  validation_status: string;
  approve_count?: number;
  created_at: string;
  spotter_id: string;
  url?: string;
  thumbnail_url?: string;
  hashtags?: string[];
  profiles?: {
    username: string;
  };
}

export default function HeadlinesPage() {
  const { user } = useAuth();
  const [trends, setTrends] = useState<ValidatedTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all');

  useEffect(() => {
    if (user) {
      loadValidatedTrends();
    }
  }, [user, filter]);

  const loadValidatedTrends = async () => {
    try {
      setLoading(true);
      
      // Calculate date filter
      let dateFilter = new Date();
      if (filter === 'today') {
        dateFilter.setHours(0, 0, 0, 0);
      } else if (filter === 'week') {
        dateFilter.setDate(dateFilter.getDate() - 7);
      } else {
        dateFilter.setMonth(dateFilter.getMonth() - 1); // Last month for 'all'
      }

      // Fetch only validated/approved trends from all users
      const { data, error } = await supabase
        .from('trend_submissions')
        .select(`
          *,
          profiles:spotter_id (
            username
          )
        `)
        .in('validation_status', ['approved', 'validated'])
        .gte('created_at', dateFilter.toISOString())
        .order('approve_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading trends:', error);
      } else {
        setTrends(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadValidatedTrends();
  };

  const getCategoryEmoji = (category: string) => {
    const emojiMap: Record<string, string> = {
      'technology': '💻',
      'fashion': '👗',
      'food': '🍔',
      'gaming': '🎮',
      'sports': '⚽',
      'music': '🎵',
      'health': '💪',
      'travel': '✈️',
      'finance': '💰',
      'entertainment': '🎬',
      'education': '📚',
      'art': '🎨',
      'politics': '🏛️',
      'science': '🔬',
      'lifestyle': '✨',
      'business': '💼',
      'automotive': '🚗',
      'pets': '🐾',
      'beauty': '💄',
      'diy': '🔨'
    };
    return emojiMap[category?.toLowerCase()] || '📈';
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffInHours = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return format(then, 'MMM d');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Community Headlines
              </h1>
              <p className="text-gray-600 mt-1">Discover validated trends from the community</p>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors border border-gray-200"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {(['all', 'today', 'week'] as const).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === filterOption
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {filterOption === 'all' ? 'All Time' : 
                 filterOption === 'today' ? 'Today' : 'This Week'}
              </button>
            ))}
          </div>
        </div>

        {/* Trends Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
            </div>
          </div>
        ) : trends.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
            <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Validated Trends Yet</h3>
            <p className="text-gray-600">Check back later for community-validated trends</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trends.map((trend, index) => (
              <motion.div
                key={trend.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
              >
                {/* Thumbnail or Category Icon */}
                <div className="h-40 bg-gradient-to-br from-blue-50 to-purple-50 relative overflow-hidden">
                  {trend.thumbnail_url ? (
                    <img 
                      src={trend.thumbnail_url} 
                      alt={trend.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-5xl">{getCategoryEmoji(trend.category)}</span>
                    </div>
                  )}
                  
                  {/* Validation Badge */}
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    Validated
                  </div>
                </div>

                <div className="p-4">
                  {/* Title and Description */}
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {trend.title || trend.description || 'Untitled Trend'}
                  </h3>
                  
                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>@{trend.profiles?.username || 'anonymous'}</span>
                    <span>{formatTimeAgo(trend.created_at)}</span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    {trend.views_count && trend.views_count > 0 && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Eye className="w-4 h-4" />
                        <span>{trend.views_count.toLocaleString()}</span>
                      </div>
                    )}
                    {trend.approve_count && trend.approve_count > 0 && (
                      <div className="flex items-center gap-1 text-green-600">
                        <ThumbsUp className="w-4 h-4" />
                        <span>{trend.approve_count}</span>
                      </div>
                    )}
                    {trend.wave_score && trend.wave_score > 0 && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <Sparkles className="w-4 h-4" />
                        <span>{trend.wave_score}%</span>
                      </div>
                    )}
                  </div>

                  {/* Hashtags */}
                  {trend.hashtags && trend.hashtags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {trend.hashtags.slice(0, 3).map((tag, i) => (
                        <span 
                          key={i}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* View Link */}
                  {trend.url && (
                    <a
                      href={trend.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium group-hover:underline"
                    >
                      View Original
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}