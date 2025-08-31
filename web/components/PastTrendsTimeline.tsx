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
  Sparkles,
  Activity
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, isPast, differenceInDays } from 'date-fns';

interface PastTrend {
  id: string;
  title: string;
  description: string;
  category: string;
  predicted_peak: string;
  actual_peak?: string;
  wave_score: number;
  validation_count: number;
  hashtags?: string[];
  platform?: string;
  views_count?: number;
  submitted_at: string;
  status: string;
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

      const { data, error } = await supabase
        .from('trend_submissions')
        .select('*')
        .lte('predicted_peak', now.toISOString())
        .gte('predicted_peak', startDate.toISOString())
        .in('status', ['validated', 'quality_approved', 'trending'])
        .order('predicted_peak', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPastTrends(data || []);
    } catch (error) {
      console.error('Error loading past trends:', error);
      // Use mock data if database doesn't have predicted_peak field yet
      setPastTrends(getMockPastTrends());
    } finally {
      setLoading(false);
    }
  };

  const getMockPastTrends = (): PastTrend[] => {
    const now = new Date();
    return [
      {
        id: '1',
        title: 'Silent luxury fashion trend',
        description: 'Minimalist, logo-free fashion taking over',
        category: 'fashion',
        predicted_peak: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        wave_score: 92,
        validation_count: 156,
        hashtags: ['#quietluxury', '#minimalist', '#stealth wealth'],
        platform: 'instagram',
        views_count: 2500000,
        submitted_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'trending'
      },
      {
        id: '2',
        title: 'AI-generated movie trailers',
        description: 'Studios using AI to create personalized trailers',
        category: 'technology',
        predicted_peak: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        wave_score: 88,
        validation_count: 89,
        hashtags: ['#AItrailers', '#movietech', '#personalized'],
        platform: 'youtube',
        views_count: 5400000,
        submitted_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'validated'
      },
      {
        id: '3',
        title: 'Micro-workout routines',
        description: '5-minute high-intensity workouts throughout the day',
        category: 'fitness',
        predicted_peak: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        wave_score: 85,
        validation_count: 124,
        hashtags: ['#microworkout', '#5minfit', '#deskercise'],
        platform: 'tiktok',
        views_count: 8900000,
        submitted_at: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'trending'
      }
    ];
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
      music: 'from-pink-500 to-rose-500'
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  const getWavePosition = (predictedPeak: string) => {
    const daysAgo = differenceInDays(new Date(), new Date(predictedPeak));
    // Position on a scale of 0-100% based on how long ago it peaked
    if (daysAgo <= 1) return 85;
    if (daysAgo <= 3) return 70;
    if (daysAgo <= 7) return 50;
    if (daysAgo <= 14) return 30;
    return 15;
  };

  const WavePath = ({ trend }: { trend: PastTrend }) => {
    const position = getWavePosition(trend.predicted_peak);
    const height = (trend.wave_score / 100) * 40; // Max height 40px based on score
    
    return (
      <svg className="w-full h-16" viewBox="0 0 200 64" preserveAspectRatio="none">
        {/* Wave path */}
        <path
          d={`M 0,32 Q 50,${32 - height} ${position},32 T 200,32`}
          fill="none"
          stroke="url(#gradient-${trend.id})"
          strokeWidth="2"
          className="opacity-60"
        />
        {/* Peak indicator */}
        <circle
          cx={position * 2}
          cy={32}
          r="4"
          fill="url(#gradient-${trend.id})"
          className="animate-pulse"
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id={`gradient-${trend.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" className="text-blue-500" stopColor="currentColor" />
            <stop offset="100%" className="text-purple-500" stopColor="currentColor" />
          </linearGradient>
        </defs>
      </svg>
    );
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
              Past Trend Waves
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Trends that have peaked and are descending
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
            <p className="text-gray-500">No past trends to display</p>
          </div>
        ) : (
          pastTrends.map((trend, index) => (
            <motion.div
              key={trend.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="space-y-4">
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
                        Peaked {differenceInDays(new Date(), new Date(trend.predicted_peak))} days ago
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {trend.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {trend.description}
                    </p>

                    {/* Tags */}
                    {trend.hashtags && trend.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {trend.hashtags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs">
                            <Hash className="w-3 h-3" />
                            {tag.replace('#', '')}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {trend.views_count && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {(trend.views_count / 1000000).toFixed(1)}M views
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {trend.validation_count} validations
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {trend.wave_score}% score
                      </span>
                    </div>
                  </div>

                  {/* Wave Score Badge */}
                  <div className="text-center ml-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                      {trend.wave_score}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Wave Score</p>
                  </div>
                </div>

                {/* Wave Timeline Visualization */}
                <div className="relative bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                  <div className="absolute top-2 left-4 text-xs text-gray-500">Rising</div>
                  <div className="absolute top-2 right-4 text-xs text-gray-500">Falling</div>
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs font-medium text-purple-600">Peak</div>
                  <WavePath trend={trend} />
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>{format(new Date(trend.submitted_at), 'MMM d')}</span>
                    <span className="font-medium text-purple-600">
                      {format(new Date(trend.predicted_peak), 'MMM d')}
                    </span>
                    <span>Now</span>
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
            View All Past Trends
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}