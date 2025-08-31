'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Calendar,
  Clock,
  Hash,
  Users,
  Eye,
  ChevronRight,
  Activity,
  Sparkles
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
}

export default function PastTrendsTimeline() {
  const [pastTrends, setPastTrends] = useState<PastTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    loadPastTrends();
  }, [selectedTimeframe]);

  const loadPastTrends = async () => {
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

      // Load validated trends from the selected timeframe
      const { data, error } = await supabase
        .from('trend_submissions')
        .select('*')
        .in('status', ['validated', 'quality_approved', 'trending'])
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

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      technology: 'from-blue-500 to-cyan-500',
      fashion: 'from-purple-500 to-pink-500',
      food: 'from-orange-500 to-red-500',
      fitness: 'from-green-500 to-emerald-500',
      entertainment: 'from-indigo-500 to-purple-500',
      lifestyle: 'from-teal-500 to-green-500',
      gaming: 'from-violet-500 to-purple-500',
      music: 'from-pink-500 to-rose-500',
      sports: 'from-red-500 to-orange-500',
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
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-500" />
              Validated Trends
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Successfully validated community trends
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
            <p className="text-gray-500">No validated trends in this timeframe</p>
            <p className="text-sm text-gray-400 mt-2">
              Submit and validate trends to see them here
            </p>
          </div>
        ) : (
          pastTrends.map((trend, index) => (
            <motion.div
              key={trend.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="space-y-3">
                {/* Trend Info */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getCategoryColor(trend.category)} text-white`}>
                        {trend.category}
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
                      <p className="text-sm text-gray-600 mb-3">
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
  );
}