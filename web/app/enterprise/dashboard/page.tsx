'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import EnterpriseViewSwitcher from '@/components/EnterpriseViewSwitcher';
import WaveSightLogo from '@/components/WaveSightLogo';
import ExportReportModal from '@/components/enterprise/ExportReportModal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, CheckCircle, XCircle, Clock, Users, BarChart, 
  Filter, Calendar, Download, Eye, Activity, Zap, ArrowUp,
  Building2, Globe, Tag, Database, AlertCircle, FileText,
  Sparkles, Shield, Target, Rocket, Brain, Award, DollarSign,
  ArrowUpRight, MessageSquare, Share2, Bookmark, MoreVertical,
  Play, Pause, RefreshCw, Volume2, VolumeX, Search
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ValidatedTrend {
  id: string;
  description: string;
  category: string;
  status: string;
  validation_count: number;
  positive_validations: number;
  negative_validations: number;
  validation_ratio: number;
  created_at: string;
  spotter_id: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  evidence?: any;
  spotter?: {
    username: string;
  };
}

interface EnterpriseStats {
  total_validated_trends: number;
  avg_validation_score: number;
  total_categories: number;
  top_category: string;
  trends_today: number;
  trends_this_week: number;
  trends_this_month: number;
  total_spotters: number;
  trend_velocity: number;
  estimated_reach: number;
}

export default function EnterpriseDashboard() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('live');
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<ValidatedTrend[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLive, setIsLive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout>();
  const audioRef = useRef<HTMLAudioElement>();
  
  const [stats, setStats] = useState<EnterpriseStats>({
    total_validated_trends: 0,
    avg_validation_score: 0,
    total_categories: 0,
    top_category: 'N/A',
    trends_today: 0,
    trends_this_week: 0,
    trends_this_month: 0,
    total_spotters: 0,
    trend_velocity: 0,
    estimated_reach: 0
  });

  useEffect(() => {
    if (user) {
      fetchEnterpriseData();
      
      // Set up live updates
      if (isLive) {
        intervalRef.current = setInterval(() => {
          fetchNewTrends();
        }, 10000); // Check every 10 seconds
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, timeframe, selectedCategory, isLive]);

  const fetchEnterpriseData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      
      switch (timeframe) {
        case 'live':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      let query = supabase
        .from('trend_submissions')
        .select(`
          *,
          spotter:profiles!spotter_id (username)
        `)
        .gt('validation_count', 0)
        .gt('validation_ratio', 0.6)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data: trendsData, error: trendsError } = await query;

      if (trendsError) throw trendsError;
      setTrends(trendsData || []);

      // Calculate enhanced stats
      if (trendsData) {
        const categoryMap = new Map();
        const spotterSet = new Set();
        let totalScore = 0;
        let hourlyTrends = 0;
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        trendsData.forEach(trend => {
          categoryMap.set(trend.category, (categoryMap.get(trend.category) || 0) + 1);
          spotterSet.add(trend.spotter_id);
          totalScore += trend.validation_ratio;
          
          const trendDate = new Date(trend.created_at);
          if (trendDate >= hourAgo) hourlyTrends++;
        });

        const topCategory = Array.from(categoryMap.entries())
          .sort((a, b) => b[1] - a[1])[0];

        setStats({
          total_validated_trends: trendsData.length,
          avg_validation_score: trendsData.length > 0 ? (totalScore / trendsData.length) * 100 : 0,
          total_categories: categoryMap.size,
          top_category: topCategory ? topCategory[0] : 'N/A',
          trends_today: trendsData.filter(t => {
            const trendDate = new Date(t.created_at);
            return trendDate >= new Date(now.getTime() - 24 * 60 * 60 * 1000);
          }).length,
          trends_this_week: trendsData.filter(t => {
            const trendDate = new Date(t.created_at);
            return trendDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          }).length,
          trends_this_month: trendsData.length,
          total_spotters: spotterSet.size,
          trend_velocity: hourlyTrends,
          estimated_reach: trendsData.reduce((sum, t) => sum + (t.validation_count * 1000), 0)
        });
      }
    } catch (error) {
      console.error('Error fetching enterprise data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNewTrends = async () => {
    try {
      const { data: newTrends } = await supabase
        .from('trend_submissions')
        .select(`
          *,
          spotter:profiles!spotter_id (username)
        `)
        .gt('validation_count', 0)
        .gt('validation_ratio', 0.6)
        .order('created_at', { ascending: false })
        .limit(5);

      if (newTrends && newTrends.length > 0) {
        const newTrendIds = newTrends.map(t => t.id);
        const existingIds = trends.map(t => t.id);
        const hasNewTrends = newTrendIds.some(id => !existingIds.includes(id));
        
        if (hasNewTrends && soundEnabled && audioRef.current) {
          audioRef.current.play();
        }
        
        setTrends(prevTrends => {
          const combined = [...newTrends, ...prevTrends];
          const unique = Array.from(new Map(combined.map(t => [t.id, t])).values());
          return unique.slice(0, 100);
        });
      }
    } catch (error) {
      console.error('Error fetching new trends:', error);
    }
  };

  const getCategoryEmoji = (category: string) => {
    const emojiMap: { [key: string]: string } = {
      'visual_style': '🎨',
      'audio_music': '🎵',
      'creator_technique': '🎬',
      'meme_format': '😂',
      'product_brand': '🛍️',
      'behavior_pattern': '👥',
      'tech': '💻',
      'fashion': '👗',
      'food': '🍔',
      'entertainment': '🎭',
      'finance': '💳',
      'health': '💪',
      'sports': '⚽',
      'travel': '✈️',
      'lifestyle': '🌟'
    };
    return emojiMap[category?.toLowerCase()] || '📊';
  };

  const getTrendValue = (trend: ValidatedTrend) => {
    const score = trend.validation_ratio * 100;
    const reach = trend.validation_count * 1000;
    const velocity = trend.validation_count / Math.max(1, Math.floor((new Date().getTime() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60)));
    
    return {
      score: Math.round(score),
      reach: reach.toLocaleString(),
      velocity: velocity.toFixed(1),
      value: `$${(reach * 0.05).toFixed(0)}` // Estimated trend value
    };
  };

  const filteredTrends = trends.filter(trend => 
    searchQuery === '' || 
    trend.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trend.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = ['all', ...Array.from(new Set(trends.map(t => t.category)))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div className="text-center">
          <WaveSightLogo size="lg" showText={true} />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-t-2 border-b-2 border-blue-500 rounded-full mx-auto mt-8"
          />
          <p className="text-gray-600 mt-4">Loading enterprise intelligence...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hidden audio element for notifications */}
      <audio ref={audioRef} src="/notification.mp3" />
      
      {/* Premium Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <WaveSightLogo size="md" showText={true} />
              <div className="hidden lg:block">
                <h1 className="text-2xl font-bold text-gray-900">Enterprise Intelligence</h1>
                <p className="text-sm text-gray-600">Real-time trend analytics & market insights</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Live Status */}
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-700">Live</span>
              </div>
              
              <EnterpriseViewSwitcher />
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowExportModal(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Report
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Value Metrics Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">Welcome to WaveSight Enterprise</h2>
                <p className="text-blue-100">Track emerging trends before they go viral • Powered by real-time validation</p>
              </div>
              <Shield className="w-24 h-24 text-white/20" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-white/20 backdrop-blur-md rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8" />
                  <span className="text-3xl font-bold">{stats.total_validated_trends}</span>
                </div>
                <p className="text-sm text-blue-100">Validated Trends</p>
                <p className="text-xs text-green-300 mt-1">+{stats.trends_today} today</p>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-white/20 backdrop-blur-md rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8" />
                  <span className="text-3xl font-bold">{stats.estimated_reach.toLocaleString()}</span>
                </div>
                <p className="text-sm text-blue-100">Estimated Reach</p>
                <p className="text-xs text-green-300 mt-1">Active audience</p>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-white/20 backdrop-blur-md rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <Zap className="w-8 h-8" />
                  <span className="text-3xl font-bold">{stats.trend_velocity}/hr</span>
                </div>
                <p className="text-sm text-blue-100">Trend Velocity</p>
                <p className="text-xs text-green-300 mt-1">New trends per hour</p>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-white/20 backdrop-blur-md rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8" />
                  <span className="text-3xl font-bold">${(stats.estimated_reach * 0.05).toLocaleString()}</span>
                </div>
                <p className="text-sm text-blue-100">Trend Value</p>
                <p className="text-xs text-green-300 mt-1">Potential market impact</p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Controls Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search trends, categories, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Filters */}
            <select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="live">Live Feed</option>
              <option value="day">Last 24h</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
            </select>

            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
            
            {/* Live Controls */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setIsLive(!isLive)}
                className={`p-2 rounded-lg transition-colors ${isLive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
              >
                {isLive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg transition-colors ${soundEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              
              <button
                onClick={fetchEnterpriseData}
                className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Trend Stream - Main Focus */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Activity className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Live Trend Stream</h2>
                      <p className="text-sm text-gray-600">{filteredTrends.length} active trends</p>
                    </div>
                  </div>
                  
                  {isLive && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm text-gray-600">Auto-updating</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 space-y-4 max-h-[800px] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {filteredTrends.length > 0 ? (
                    filteredTrends.map((trend, index) => {
                      const trendMetrics = getTrendValue(trend);
                      
                      return (
                        <motion.div
                          key={trend.id}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-all cursor-pointer group"
                        >
                          <div className="flex gap-4">
                            {/* Trend Image */}
                            {(trend.thumbnail_url || trend.screenshot_url) && (
                              <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                                <img 
                                  src={trend.thumbnail_url || trend.screenshot_url} 
                                  alt="Trend"
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                <div className="absolute bottom-2 left-2">
                                  <span className="text-3xl">{getCategoryEmoji(trend.category)}</span>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex-1">
                              {/* Header */}
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="flex items-center gap-3 mb-1">
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
                                      {trend.category.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {formatDistanceToNow(new Date(trend.created_at), { addSuffix: true })}
                                    </span>
                                  </div>
                                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                                    {trend.description}
                                  </h3>
                                </div>
                                
                                <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                  <MoreVertical className="w-4 h-4 text-gray-600" />
                                </button>
                              </div>
                              
                              {/* Metrics Grid */}
                              <div className="grid grid-cols-4 gap-4 mb-4">
                                <div>
                                  <p className="text-2xl font-bold text-gray-900">{trendMetrics.score}%</p>
                                  <p className="text-xs text-gray-600">Confidence</p>
                                </div>
                                <div>
                                  <p className="text-2xl font-bold text-gray-900">{trendMetrics.reach}</p>
                                  <p className="text-xs text-gray-600">Reach</p>
                                </div>
                                <div>
                                  <p className="text-2xl font-bold text-gray-900">{trendMetrics.velocity}</p>
                                  <p className="text-xs text-gray-600">Velocity/hr</p>
                                </div>
                                <div>
                                  <p className="text-2xl font-bold text-green-600">{trendMetrics.value}</p>
                                  <p className="text-xs text-gray-600">Est. Value</p>
                                </div>
                              </div>
                              
                              {/* Validation Bar */}
                              <div className="flex items-center gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-600">Community Validation</span>
                                    <span className="text-xs text-gray-600">{trend.validation_count} validators</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${trend.validation_ratio * 100}%` }}
                                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                    />
                                  </div>
                                </div>
                                
                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                                    <Share2 className="w-4 h-4 text-gray-600" />
                                  </button>
                                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                                    <Bookmark className="w-4 h-4 text-gray-600" />
                                  </button>
                                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                                    <ArrowUpRight className="w-4 h-4" />
                                    Analyze
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12"
                    >
                      <Globe className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No trends found matching your criteria</p>
                      <p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Insights */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                AI Insights
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-medium text-purple-900 mb-1">Trending Now</p>
                  <p className="text-xs text-purple-700">"{stats.top_category}" category is showing 34% growth in the last hour</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-1">Opportunity Alert</p>
                  <p className="text-xs text-blue-700">3 emerging trends in "Tech" with <90% confidence score</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-900 mb-1">Market Signal</p>
                  <p className="text-xs text-green-700">User engagement up 67% compared to last week</p>
                </div>
              </div>
            </motion.div>

            {/* Premium Tools */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-blue-600" />
                Enterprise Tools
              </h3>
              <div className="space-y-3">
                {[
                  { href: "/enterprise/analytics", icon: BarChart, label: "Advanced Analytics", desc: "Deep dive into trends" },
                  { href: "/enterprise/api", icon: Database, label: "API Access", desc: "Real-time data feeds" },
                  { href: "/enterprise/alerts", icon: AlertCircle, label: "Smart Alerts", desc: "Custom notifications" },
                  { href: "/enterprise/ml", icon: Brain, label: "AI Predictions", desc: "Trend forecasting" }
                ].map((tool) => (
                  <Link 
                    key={tool.href}
                    href={tool.href} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <tool.icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{tool.label}</p>
                        <p className="text-xs text-gray-600">{tool.desc}</p>
                      </div>
                    </div>
                    <ArrowUp className="w-4 h-4 text-gray-400 rotate-45 group-hover:text-blue-600 transition-colors" />
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* ROI Calculator */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Your ROI This Month
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Trends Identified</span>
                  <span className="font-bold text-gray-900">{stats.trends_this_month}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Est. Market Value</span>
                  <span className="font-bold text-green-600">${(stats.estimated_reach * 0.05).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Subscription Cost</span>
                  <span className="font-bold text-gray-900">$1,999</span>
                </div>
                <div className="pt-3 border-t border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">ROI</span>
                    <span className="text-2xl font-bold text-green-600">
                      {((stats.estimated_reach * 0.05 - 1999) / 1999 * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <ExportReportModal 
            onClose={() => setShowExportModal(false)}
            trends={trends}
            stats={stats}
            timeframe={timeframe}
          />
        )}
      </AnimatePresence>
    </div>
  );
}