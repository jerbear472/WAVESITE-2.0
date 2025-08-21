'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Clock,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface TrendingTrend {
  id: string;
  description: string;
  thumbnail_url?: string;
  screenshot_url?: string;
  post_url?: string;
  creator_handle?: string;
  creator_name?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
  category: string;
  created_at: string;
  validation_count: number;
  quality_score: number;
}

export default function TrendingSection() {
  const [trends, setTrends] = useState<TrendingTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingTrends();
  }, []);

  const fetchTrendingTrends = async () => {
    try {
      // Fetch top trending/viral trends that have thumbnails
      const { data, error } = await supabase
        .from('trend_submissions')
        .select('*')
        .in('status', ['approved', 'viral'])
        .not('thumbnail_url', 'is', null)
        .order('quality_score', { ascending: false })
        .order('validation_count', { ascending: false })
        .limit(6);

      if (error) throw error;
      
      if (data) {
        setTrends(data);
      }
    } catch (error) {
      console.error('Error fetching trending trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatEngagement = (num: number): string => {
    if (!num || isNaN(num)) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getCategoryEmoji = (category: string): string => {
    const emojiMap: Record<string, string> = {
      'meme_format': '😂',
      'audio_music': '🎵',
      'visual_style': '🎨',
      'behavior_pattern': '💫',
      'creator_technique': '🎬',
      'product_placement': '🛍️',
      'dance_move': '💃',
      'challenge': '🏆',
      'educational': '📚',
      'social_cause': '🌍'
    };
    return emojiMap[category] || '📱';
  };

  const getTimeAgo = (date: string): string => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-b from-white to-gray-50 dark:from-neutral-900 dark:to-black">
        <div className="container-custom">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-64 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-96 mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (trends.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50 dark:from-neutral-900 dark:to-black">
      <div className="container-custom">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            <h2 className="text-3xl md:text-4xl font-light">
              Trending <span className="text-gradient font-normal">Now</span>
            </h2>
            <Sparkles className="w-6 h-6 text-yellow-500" />
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Real trends spotted by our community, validated and going viral
          </p>
        </motion.div>

        {/* Trends Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {trends.map((trend, index) => (
              <motion.div
                key={trend.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative"
              >
                <div className="card card-hover overflow-hidden h-full">
                  {/* Thumbnail */}
                  <div className="relative h-48 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20">
                    {(trend.thumbnail_url || trend.screenshot_url) ? (
                      <>
                        <img
                          src={trend.thumbnail_url || trend.screenshot_url}
                          alt="Trend thumbnail"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <TrendingUp className="w-12 h-12 text-gray-400 dark:text-gray-600" />
                      </div>
                    )}
                    
                    {/* Category Badge */}
                    <div className="absolute top-3 left-3 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white text-xs font-medium flex items-center gap-1">
                      <span>{getCategoryEmoji(trend.category)}</span>
                      <span className="capitalize">{trend.category.replace(/_/g, ' ')}</span>
                    </div>

                    {/* View Link */}
                    {trend.post_url && (
                      <a
                        href={trend.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-black/50 backdrop-blur-sm rounded-full hover:bg-white dark:hover:bg-black/70 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4 text-gray-700 dark:text-white" />
                      </a>
                    )}

                    {/* Quality Score */}
                    {trend.quality_score != null && (
                      <div className="absolute bottom-3 right-3 px-2 py-1 bg-green-500/90 backdrop-blur-sm rounded-full text-white text-xs font-bold">
                        {Math.round((trend.quality_score || 0.7) * 100)}% Quality
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {/* Creator Info */}
                    {trend.creator_handle && (
                      <div className="flex items-center gap-2 mb-2 text-sm">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full"></div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {trend.creator_handle}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          • {getTimeAgo(trend.created_at)}
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    <p className="text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
                      {trend.post_caption || trend.description}
                    </p>

                    {/* Engagement Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {trend.likes_count && trend.likes_count > 0 && (
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4 text-red-400" />
                          <span>{formatEngagement(trend.likes_count)}</span>
                        </div>
                      )}
                      {trend.comments_count && trend.comments_count > 0 && (
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4 text-blue-400" />
                          <span>{formatEngagement(trend.comments_count)}</span>
                        </div>
                      )}
                      {trend.views_count && trend.views_count > 0 && (
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4 text-purple-400" />
                          <span>{formatEngagement(trend.views_count)}</span>
                        </div>
                      )}
                      {trend.validation_count > 0 && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-green-400" />
                          <span>{trend.validation_count} validations</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover-lift"
          >
            <TrendingUp className="w-5 h-5" />
            Start Spotting Trends & Earn
          </Link>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Join thousands earning by spotting the next viral trends
          </p>
        </motion.div>
      </div>
    </section>
  );
}