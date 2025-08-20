'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Activity,
  TrendingUp,
  TrendingDown,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Filter,
  BarChart,
  Globe,
  Flame,
  Sparkles,
  Calendar,
  MessageCircle,
  Share2,
  Eye
} from 'lucide-react';

interface CulturalTrend {
  id: string;
  trend_name: string;
  platform: string;
  categories: string[];
  lifecycle_stage: string;
  submitted_at: string;
  spotter_id: string;
  spotter_name?: string;
  trend_life_score: number;
  sentiment_score: number;
  community_votes: {
    up: number;
    down: number;
  };
  peak_prediction_date?: string;
  actual_peak_date?: string;
  thumbnail_url?: string;
  post_url?: string;
  hashtags?: string[];
  evolution_parent?: string;
  xp_earned?: number;
}

export default function CulturalTimelinePage() {
  const { user } = useAuth();
  const [trends, setTrends] = useState<CulturalTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'rising' | 'viral' | 'declining'>('all');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down'>>({});

  useEffect(() => {
    fetchTrends();
    if (user) {
      fetchUserVotes();
    }
  }, [filter, timeRange, user]);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('trend_submissions')
        .select(`
          *,
          user_profiles!spotter_id(username, avatar_url),
          trend_votes(vote_type)
        `);

      // Apply time range filter
      if (timeRange !== 'all') {
        const date = new Date();
        if (timeRange === '24h') date.setDate(date.getDate() - 1);
        else if (timeRange === '7d') date.setDate(date.getDate() - 7);
        else if (timeRange === '30d') date.setDate(date.getDate() - 30);
        query = query.gte('created_at', date.toISOString());
      }

      // Apply lifecycle filter
      if (filter === 'rising') {
        query = query.in('lifecycle_stage', ['just_starting', 'picking_up']);
      } else if (filter === 'viral') {
        query = query.eq('lifecycle_stage', 'going_viral');
      } else if (filter === 'declining') {
        query = query.in('lifecycle_stage', ['declining', 'dead']);
      }

      query = query.order('trend_life_score', { ascending: false });

      const { data, error } = await query;
      
      if (error) throw error;

      // Process trends with calculated scores
      const processedTrends = (data || []).map(trend => ({
        ...trend,
        trend_life_score: calculateTrendLifeScore(trend),
        sentiment_score: calculateSentimentScore(trend),
        community_votes: calculateVotes(trend.trend_votes || []),
        spotter_name: trend.user_profiles?.username || 'Anonymous'
      }));

      setTrends(processedTrends);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserVotes = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('trend_votes')
        .select('trend_id, vote_type')
        .eq('user_id', user.id);
      
      const votes: Record<string, 'up' | 'down'> = {};
      data?.forEach(vote => {
        votes[vote.trend_id] = vote.vote_type;
      });
      setUserVotes(votes);
    } catch (error) {
      console.error('Error fetching user votes:', error);
    }
  };

  const calculateTrendLifeScore = (trend: any): number => {
    // Calculate based on lifecycle stage, time since submission, and engagement
    const ageInDays = (Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60 * 24);
    let score = 100;

    switch (trend.lifecycle_stage) {
      case 'just_starting':
        score = 90 - (ageInDays * 2);
        break;
      case 'picking_up':
        score = 80 - (ageInDays * 1.5);
        break;
      case 'going_viral':
        score = 70 - ageInDays;
        break;
      case 'declining':
        score = 40 - (ageInDays * 0.5);
        break;
      case 'dead':
        score = 10;
        break;
    }

    return Math.max(0, Math.min(100, score));
  };

  const calculateSentimentScore = (trend: any): number => {
    // Calculate based on votes and validation status
    const votes = trend.trend_votes || [];
    const upVotes = votes.filter((v: any) => v.vote_type === 'up').length;
    const downVotes = votes.filter((v: any) => v.vote_type === 'down').length;
    const total = upVotes + downVotes;
    
    if (total === 0) return 50;
    return Math.round((upVotes / total) * 100);
  };

  const calculateVotes = (votes: any[]) => {
    return {
      up: votes.filter(v => v.vote_type === 'up').length,
      down: votes.filter(v => v.vote_type === 'down').length
    };
  };

  const handleVote = async (trendId: string, voteType: 'up' | 'down') => {
    if (!user) {
      alert('Please login to vote');
      return;
    }

    try {
      // Check if user already voted
      const currentVote = userVotes[trendId];
      
      if (currentVote === voteType) {
        // Remove vote
        await supabase
          .from('trend_votes')
          .delete()
          .match({ trend_id: trendId, user_id: user.id });
        
        const newVotes = { ...userVotes };
        delete newVotes[trendId];
        setUserVotes(newVotes);
      } else {
        // Add or update vote
        await supabase
          .from('trend_votes')
          .upsert({
            trend_id: trendId,
            user_id: user.id,
            vote_type: voteType
          });
        
        setUserVotes({ ...userVotes, [trendId]: voteType });
      }

      // Refresh trends to update vote counts
      fetchTrends();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const getLifecycleIcon = (stage: string) => {
    switch (stage) {
      case 'just_starting': return '🌱';
      case 'picking_up': return '📈';
      case 'going_viral': return '🔥';
      case 'declining': return '📉';
      case 'dead': return '💀';
      default: return '❓';
    }
  };

  const getLifecycleColor = (stage: string) => {
    switch (stage) {
      case 'just_starting': return 'bg-green-500';
      case 'picking_up': return 'bg-yellow-500';
      case 'going_viral': return 'bg-orange-500';
      case 'declining': return 'bg-red-500';
      case 'dead': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center mb-4">
            <Activity className="w-10 h-10 text-purple-600 mr-3" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Cultural Timeline
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            Track the life and sentiment of cultural waves in real-time
          </p>
        </motion.div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Lifecycle Filter */}
            <div className="flex gap-2">
              {(['all', 'rising', 'viral', 'declining'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === f
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {f === 'all' ? 'All Waves' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Time Range */}
            <div className="flex gap-2 ml-auto">
              {(['24h', '7d', '30d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {range === 'all' ? 'All Time' : range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Trends Timeline */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          </div>
        ) : trends.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
            <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              No cultural waves found for this period
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {trends.map((trend, index) => (
                <motion.div
                  key={trend.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      {/* Left Section */}
                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl">{getLifecycleIcon(trend.lifecycle_stage)}</span>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {trend.trend_name}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${getLifecycleColor(trend.lifecycle_stage)}`}>
                            {trend.lifecycle_stage?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>

                        {/* Meta Info */}
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {trend.spotter_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe className="w-4 h-4" />
                            {trend.platform}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(trend.submitted_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Categories */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {trend.categories?.map((cat, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 text-xs rounded-full"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {/* Trend Life Score */}
                          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600 dark:text-gray-300">Trend Life</span>
                              <Activity className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="text-2xl font-bold text-blue-600">
                              {trend.trend_life_score}%
                            </div>
                            <div className="h-1 bg-blue-200 rounded-full mt-2">
                              <div
                                className="h-1 bg-blue-600 rounded-full"
                                style={{ width: `${trend.trend_life_score}%` }}
                              />
                            </div>
                          </div>

                          {/* Sentiment Score */}
                          <div className="bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900 dark:to-pink-800 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600 dark:text-gray-300">Sentiment</span>
                              <Heart className="w-4 h-4 text-pink-600" />
                            </div>
                            <div className="text-2xl font-bold text-pink-600">
                              {trend.sentiment_score}%
                            </div>
                            <div className="h-1 bg-pink-200 rounded-full mt-2">
                              <div
                                className="h-1 bg-pink-600 rounded-full"
                                style={{ width: `${trend.sentiment_score}%` }}
                              />
                            </div>
                          </div>

                          {/* Community Votes */}
                          <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-3">
                            <span className="text-xs text-gray-600 dark:text-gray-300">Votes</span>
                            <div className="flex items-center gap-3 mt-1">
                              <button
                                onClick={() => handleVote(trend.id, 'up')}
                                className={`flex items-center gap-1 px-2 py-1 rounded ${
                                  userVotes[trend.id] === 'up'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-green-100'
                                }`}
                              >
                                <ThumbsUp className="w-4 h-4" />
                                <span className="text-sm font-bold">{trend.community_votes.up}</span>
                              </button>
                              <button
                                onClick={() => handleVote(trend.id, 'down')}
                                className={`flex items-center gap-1 px-2 py-1 rounded ${
                                  userVotes[trend.id] === 'down'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-red-100'
                                }`}
                              >
                                <ThumbsDown className="w-4 h-4" />
                                <span className="text-sm font-bold">{trend.community_votes.down}</span>
                              </button>
                            </div>
                          </div>

                          {/* XP Earned */}
                          {trend.xp_earned && (
                            <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-lg p-3">
                              <span className="text-xs text-gray-600 dark:text-gray-300">XP Earned</span>
                              <div className="text-2xl font-bold text-purple-600">
                                {trend.xp_earned}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Thumbnail */}
                      {trend.thumbnail_url && (
                        <div className="ml-6 w-32 h-32 rounded-xl overflow-hidden">
                          <img
                            src={trend.thumbnail_url}
                            alt={trend.trend_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}