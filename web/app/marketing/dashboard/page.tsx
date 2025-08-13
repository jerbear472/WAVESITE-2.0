'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Users, Globe, Heart, Sparkles, Palette,
  Hash, Camera, Play, Clock, MapPin, ShoppingBag,
  ArrowRight, Eye, Download, Filter, Search, RefreshCw,
  BarChart3, Target, Lightbulb, Zap, BookOpen, Share2,
  MessageCircle, Instagram, Music, Star, ChevronRight
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

interface TrendInsight {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'just_starting' | 'picking_up' | 'viral' | 'saturated' | 'declining';
  validation_count: number;
  validation_ratio: number;
  screenshot_url?: string;
  demographics: {
    primary_age: string;
    secondary_age: string;
    gender_split: string;
  };
  psychographics: {
    values: string[];
    interests: string[];
    lifestyle: string;
  };
  mood_tone: string;
  why_trending: string;
  geographic_spread: string[];
  platforms: string[];
  hashtags: string[];
  brands_mentioned: string[];
  influencers: {
    name: string;
    followers: string;
    platform: string;
  }[];
  content_style: string;
  brand_opportunities: string[];
  campaign_ideas: string[];
  created_at: string;
}

interface TrendLifecycle {
  phase: string;
  description: string;
  action_items: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export default function MarketingDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<TrendInsight[]>([]);
  const [selectedTrend, setSelectedTrend] = useState<TrendInsight | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (user) {
      loadMarketingInsights();
    }
  }, [user, selectedCategory, selectedStatus]);

  const loadMarketingInsights = async () => {
    setLoading(true);
    try {
      // Get session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }
      
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const response = await fetch(`/api/v1/marketing/trends?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTrends(data.trends);
      }
    } catch (error) {
      console.error('Error loading marketing insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'just_starting': return 'bg-blue-100 text-blue-700';
      case 'picking_up': return 'bg-green-100 text-green-700';
      case 'viral': return 'bg-red-100 text-red-700';
      case 'saturated': return 'bg-orange-100 text-orange-700';
      case 'declining': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getMoodEmoji = (mood: string) => {
    const moodMap: { [key: string]: string } = {
      'empowering': '💪',
      'funny': '😂',
      'wholesome': '🥰',
      'nostalgic': '🥺',
      'rebellious': '😈',
      'cozy': '☕',
      'sexy': '🔥',
      'fancy': '✨',
      'chaotic': '🤯',
      'cringe': '😬'
    };
    return moodMap[mood] || '💫';
  };

  const getTrendLifecycle = (status: string): TrendLifecycle => {
    switch (status) {
      case 'just_starting':
        return {
          phase: 'Early Discovery',
          description: 'Niche communities are experimenting',
          action_items: ['Monitor closely', 'Prepare creative concepts', 'Identify early adopters'],
          urgency: 'low'
        };
      case 'picking_up':
        return {
          phase: 'Growth Momentum',
          description: 'Mid-tier influencers joining the wave',
          action_items: ['Launch test campaigns', 'Secure influencer partnerships', 'Create content NOW'],
          urgency: 'high'
        };
      case 'viral':
        return {
          phase: 'Peak Virality',
          description: 'Mainstream media coverage active',
          action_items: ['Activate prepared campaigns', 'Amplify existing content', 'Ride the wave'],
          urgency: 'critical'
        };
      case 'saturated':
        return {
          phase: 'Market Saturation',
          description: 'Major brands have entered',
          action_items: ['Differentiate approach', 'Focus on authenticity', 'Plan next trend'],
          urgency: 'medium'
        };
      case 'declining':
        return {
          phase: 'Trend Fatigue',
          description: 'Audiences moving to new trends',
          action_items: ['Analyze learnings', 'Archive assets', 'Scout counter-trends'],
          urgency: 'low'
        };
      default:
        return {
          phase: 'Unknown',
          description: '',
          action_items: [],
          urgency: 'low'
        };
    }
  };

  const filteredTrends = trends.filter(trend => 
    searchQuery === '' || 
    trend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trend.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-t-2 border-b-2 border-purple-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Palette className="w-8 h-8 text-purple-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Marketing Intelligence</h1>
                  <p className="text-sm text-gray-600">Cultural insights for brand strategy</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                {viewMode === 'grid' ? <BarChart3 className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
              </button>
              
              <button
                onClick={loadMarketingInsights}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Trend Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-8 h-8 text-purple-600" />
              <span className="text-3xl font-bold">{trends.filter(t => t.status === 'viral').length}</span>
            </div>
            <p className="text-gray-600">Viral Right Now</p>
            <p className="text-sm text-purple-600 mt-1">Act immediately</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <span className="text-3xl font-bold">{trends.filter(t => t.status === 'picking_up').length}</span>
            </div>
            <p className="text-gray-600">Growing Fast</p>
            <p className="text-sm text-green-600 mt-1">Perfect timing</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Target className="w-8 h-8 text-blue-600" />
              <span className="text-3xl font-bold">{trends.filter(t => t.brands_mentioned.length > 0).length}</span>
            </div>
            <p className="text-gray-600">Brand Opportunities</p>
            <p className="text-sm text-blue-600 mt-1">Ready to activate</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-pink-600" />
              <span className="text-3xl font-bold">2.4M</span>
            </div>
            <p className="text-gray-600">Total Reach</p>
            <p className="text-sm text-pink-600 mt-1">Across all trends</p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search trends, moods, or brands..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories</option>
              <option value="fashion_beauty">Fashion & Beauty</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="food_drink">Food & Drink</option>
              <option value="entertainment">Entertainment</option>
              <option value="tech">Technology</option>
            </select>

            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Phases</option>
              <option value="just_starting">Just Starting</option>
              <option value="picking_up">Picking Up</option>
              <option value="viral">Viral</option>
              <option value="saturated">Saturated</option>
              <option value="declining">Declining</option>
            </select>
          </div>
        </div>

        {/* Trend Discovery Feed */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          <AnimatePresence mode="popLayout">
            {filteredTrends.map((trend, index) => {
              const lifecycle = getTrendLifecycle(trend.status);
              
              return (
                <motion.div
                  key={trend.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
                    viewMode === 'list' ? 'flex' : ''
                  }`}
                  onClick={() => setSelectedTrend(trend)}
                >
                  {/* Trend Image */}
                  {trend.screenshot_url && viewMode === 'grid' && (
                    <div className="relative h-48 bg-gradient-to-br from-purple-100 to-pink-100">
                      <img 
                        src={trend.screenshot_url} 
                        alt={trend.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(trend.status)}`}>
                          {trend.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="absolute top-2 right-2">
                        <span className="text-2xl">{getMoodEmoji(trend.mood_tone)}</span>
                      </div>
                    </div>
                  )}

                  <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                    {/* Header */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{trend.name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{trend.description}</p>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{trend.validation_count}</p>
                        <p className="text-xs text-gray-500">Validations</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{trend.demographics.primary_age}</p>
                        <p className="text-xs text-gray-500">Primary Demo</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{trend.platforms.length}</p>
                        <p className="text-xs text-gray-500">Platforms</p>
                      </div>
                    </div>

                    {/* Why It's Trending */}
                    <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-900">
                        <span className="font-semibold">Why trending:</span> {trend.why_trending}
                      </p>
                    </div>

                    {/* Lifecycle Phase */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Trend Lifecycle</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          lifecycle.urgency === 'critical' ? 'bg-red-100 text-red-700' :
                          lifecycle.urgency === 'high' ? 'bg-orange-100 text-orange-700' :
                          lifecycle.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {lifecycle.urgency.toUpperCase()} URGENCY
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{lifecycle.description}</p>
                      <div className="space-y-1">
                        {lifecycle.action_items.map((item, i) => (
                          <p key={i} className="text-xs text-gray-500 flex items-center gap-1">
                            <ChevronRight className="w-3 h-3" />
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Platform Icons */}
                    <div className="flex items-center gap-2 mb-4">
                      {trend.platforms.includes('instagram') && <Instagram className="w-5 h-5 text-pink-500" />}
                      {trend.platforms.includes('tiktok') && <Music className="w-5 h-5 text-gray-900" />}
                      {trend.platforms.includes('twitter') && <MessageCircle className="w-5 h-5 text-blue-400" />}
                    </div>

                    {/* Hashtags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {trend.hashtags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Brand Opportunities */}
                    {trend.brand_opportunities.length > 0 && (
                      <div className="pt-4 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                          <Lightbulb className="w-4 h-4 text-yellow-500" />
                          Brand Opportunity
                        </p>
                        <p className="text-sm text-gray-600">{trend.brand_opportunities[0]}</p>
                      </div>
                    )}

                    {/* View Details Button */}
                    <button className="mt-4 w-full py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" />
                      View Full Analysis
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

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
              className="bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedTrend.name}</h2>
                  <p className="text-gray-600">{selectedTrend.category.replace('_', ' ')}</p>
                </div>
                <button
                  onClick={() => setSelectedTrend(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Visual Mood Board */}
                {selectedTrend.screenshot_url && (
                  <div>
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <Camera className="w-5 h-5 text-purple-600" />
                      Visual Mood Board
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <img 
                        src={selectedTrend.screenshot_url} 
                        alt="Trend visual"
                        className="rounded-lg"
                      />
                      <div className="space-y-3">
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <p className="text-sm font-medium text-purple-900 mb-1">Aesthetic</p>
                          <p className="text-sm text-purple-700">{selectedTrend.content_style}</p>
                        </div>
                        <div className="p-4 bg-pink-50 rounded-lg">
                          <p className="text-sm font-medium text-pink-900 mb-1">Mood</p>
                          <p className="text-sm text-pink-700 flex items-center gap-2">
                            <span className="text-2xl">{getMoodEmoji(selectedTrend.mood_tone)}</span>
                            {selectedTrend.mood_tone}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Audience Intelligence */}
                <div>
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Audience Intelligence
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Demographics</p>
                      <div className="space-y-1">
                        <p className="text-sm">Primary: {selectedTrend.demographics.primary_age}</p>
                        <p className="text-sm">Secondary: {selectedTrend.demographics.secondary_age}</p>
                        <p className="text-sm">Gender: {selectedTrend.demographics.gender_split}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Psychographics</p>
                      <div className="space-y-1">
                        <p className="text-sm">Values: {selectedTrend.psychographics.values.join(', ')}</p>
                        <p className="text-sm">Lifestyle: {selectedTrend.psychographics.lifestyle}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Campaign Ideas */}
                <div>
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-600" />
                    Campaign Inspiration
                  </h3>
                  <div className="space-y-3">
                    {selectedTrend.campaign_ideas.map((idea, i) => (
                      <div key={i} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-900">{idea}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Influencers */}
                {selectedTrend.influencers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <Star className="w-5 h-5 text-purple-600" />
                      Key Influencers
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedTrend.influencers.map((influencer, i) => (
                        <div key={i} className="p-3 bg-purple-50 rounded-lg text-center">
                          <p className="font-medium text-purple-900">{influencer.name}</p>
                          <p className="text-sm text-purple-700">{influencer.followers} followers</p>
                          <p className="text-xs text-purple-600">{influencer.platform}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Add missing import
import { X } from 'lucide-react';