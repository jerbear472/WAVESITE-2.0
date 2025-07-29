'use client';

import { useState, useEffect } from 'react';
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
  Sparkles, Shield, Target, Rocket, Brain, Award
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
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

export default function EnterpriseDashboard() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('week');
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<ValidatedTrend[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stats, setStats] = useState<EnterpriseStats>({
    total_validated_trends: 0,
    avg_validation_score: 0,
    total_categories: 0,
    top_category: 'N/A',
    trends_today: 0,
    trends_this_week: 0,
    trends_this_month: 0,
    total_spotters: 0
  });

  useEffect(() => {
    if (user) {
      fetchEnterpriseData();
    }
  }, [user, timeframe, selectedCategory]);

  const fetchEnterpriseData = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch (timeframe) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          startDate = new Date('2020-01-01');
          break;
      }

      // Build query
      let query = supabase
        .from('trend_submissions')
        .select(`
          *,
          spotter:profiles!spotter_id (username)
        `)
        .gt('validation_count', 0)
        .gt('validation_ratio', 0.5)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      // Apply category filter
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data: trendsData, error: trendsError } = await query;

      if (trendsError) throw trendsError;
      setTrends(trendsData || []);

      // Calculate stats
      if (trendsData) {
        const categoryMap = new Map();
        const spotterSet = new Set();
        let totalScore = 0;

        trendsData.forEach(trend => {
          categoryMap.set(trend.category, (categoryMap.get(trend.category) || 0) + 1);
          spotterSet.add(trend.spotter_id);
          totalScore += trend.validation_ratio;
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
          total_spotters: spotterSet.size
        });
      }
    } catch (error) {
      console.error('Error fetching enterprise data:', error);
    } finally {
      setLoading(false);
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

  const getValidationBadge = (ratio: number) => {
    const percentage = Math.round(ratio * 100);
    if (percentage >= 90) return { color: 'from-green-400 to-emerald-500', bg: 'bg-green-500/20', label: 'Strong Signal', icon: Rocket };
    if (percentage >= 75) return { color: 'from-blue-400 to-cyan-500', bg: 'bg-blue-500/20', label: 'Good Signal', icon: Target };
    if (percentage >= 60) return { color: 'from-yellow-400 to-amber-500', bg: 'bg-yellow-500/20', label: 'Moderate Signal', icon: Zap };
    return { color: 'from-gray-400 to-gray-500', bg: 'bg-gray-500/20', label: 'Weak Signal', icon: Activity };
  };

  const categories = ['all', ...Array.from(new Set(trends.map(t => t.category)))];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-t-2 border-b-2 border-cyan-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20" />
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full filter blur-3xl animate-pulse delay-1000" />
        </div>
      </div>

      <div className="relative z-10 container-custom py-8">
        {/* Premium Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-morphism border border-gray-800/50 rounded-2xl p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-gradient-to-br from-purple-500 to-cyan-500 p-3 rounded-xl"
              >
                <Brain className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-light text-gray-100">
                  Enterprise <span className="font-normal bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Intelligence Hub</span>
                </h1>
                <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  Real-time validated trend intelligence • Premium Access
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <EnterpriseViewSwitcher />
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowExportModal(true)}
                className="btn-primary flex items-center gap-2 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600"
              >
                <Download className="w-4 h-4" />
                Export Report
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Stats Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {[
            {
              title: "Validated Trends",
              value: stats.total_validated_trends,
              change: `+${stats.trends_today} today`,
              icon: TrendingUp,
              color: "from-purple-500 to-pink-500",
              bg: "bg-purple-500/10"
            },
            {
              title: "Avg. Confidence",
              value: `${Math.round(stats.avg_validation_score)}%`,
              change: "Community score",
              icon: Award,
              color: "from-cyan-500 to-blue-500",
              bg: "bg-cyan-500/10"
            },
            {
              title: "Top Category",
              value: stats.top_category,
              change: `${stats.total_categories} active`,
              icon: Sparkles,
              color: "from-amber-500 to-orange-500",
              bg: "bg-amber-500/10"
            },
            {
              title: "Active Spotters",
              value: stats.total_spotters,
              change: "Contributing",
              icon: Users,
              color: "from-green-500 to-emerald-500",
              bg: "bg-green-500/10"
            }
          ].map((stat, index) => (
            <motion.div 
              key={stat.title}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="glass-morphism border border-gray-800/50 rounded-xl p-6 relative overflow-hidden group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`w-6 h-6 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} />
                  </div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">{stat.title}</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-sm text-gray-400">{stat.change}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters Bar */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-morphism border border-gray-800/50 rounded-xl p-4 mb-6"
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Filters:</span>
            </div>
            
            <select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="all">All Time</option>
              <option value="day">Last 24h</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
            </select>

            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>

            <div className="ml-auto flex items-center gap-2 text-sm text-gray-400">
              <Activity className="w-4 h-4" />
              <span>Live Updates</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Validated Trends Stream */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-morphism border border-gray-800/50 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  Validated Trends
                </h2>
                <span className="text-sm text-gray-400">{trends.length} results</span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div 
                  key={`${timeframe}-${selectedCategory}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar"
                >
                  {trends.length > 0 ? (
                    trends.map((trend, index) => {
                      const validation = getValidationBadge(trend.validation_ratio);
                      const ValidationIcon = validation.icon;
                      
                      return (
                        <motion.div 
                          key={trend.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.02 }}
                          className="glass-morphism border border-gray-800/50 rounded-xl p-4 hover:border-gray-700/50 transition-all cursor-pointer group"
                        >
                          <div className="flex gap-4">
                            {/* Enhanced Thumbnail */}
                            {(trend.thumbnail_url || trend.screenshot_url) && (
                              <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                                <img 
                                  src={trend.thumbnail_url || trend.screenshot_url} 
                                  alt="Trend"
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{getCategoryEmoji(trend.category)}</span>
                                <span className="px-3 py-1 bg-gray-800/50 rounded-full text-xs text-gray-300 capitalize">
                                  {trend.category.replace('_', ' ')}
                                </span>
                                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${validation.bg}`}>
                                  <ValidationIcon className={`w-3 h-3 bg-gradient-to-r ${validation.color} bg-clip-text text-transparent`} />
                                  <span className={`bg-gradient-to-r ${validation.color} bg-clip-text text-transparent`}>
                                    {validation.label}
                                  </span>
                                </div>
                              </div>
                              
                              <p className="text-sm text-gray-200 mb-3 line-clamp-2">{trend.description}</p>
                              
                              <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 text-green-400">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>{trend.positive_validations}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-red-400">
                                    <XCircle className="w-3 h-3" />
                                    <span>{trend.negative_validations}</span>
                                  </div>
                                </div>
                                <span className="text-gray-500">•</span>
                                <span className="text-gray-400">
                                  {trend.validation_count} validators
                                </span>
                                <span className="ml-auto text-gray-500">
                                  {formatDistanceToNow(new Date(trend.created_at), { addSuffix: true })}
                                </span>
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
                      <Globe className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                      <p className="text-gray-400">No validated trends found for this period</p>
                      <p className="text-sm text-gray-500 mt-2">Try adjusting your filters</p>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-morphism border border-gray-800/50 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-purple-400" />
                Quick Actions
              </h3>
              <div className="space-y-3">
                {[
                  { href: "/enterprise/analytics", icon: BarChart, label: "Deep Analytics", color: "text-purple-400" },
                  { href: "/enterprise/api", icon: Database, label: "API Access", color: "text-blue-400" },
                  { href: "/enterprise/alerts", icon: AlertCircle, label: "Smart Alerts", color: "text-yellow-400" },
                  { href: "/enterprise/ml", icon: Brain, label: "AI Insights", color: "text-green-400" }
                ].map((action) => (
                  <Link 
                    key={action.href}
                    href={action.href} 
                    className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <action.icon className={`w-5 h-5 ${action.color}`} />
                      <span className="text-sm text-gray-200">{action.label}</span>
                    </div>
                    <ArrowUp className="w-4 h-4 text-gray-600 rotate-45 group-hover:text-gray-400 transition-colors" />
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Category Performance */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-morphism border border-gray-800/50 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-cyan-400" />
                Category Performance
              </h3>
              <div className="space-y-3">
                {Array.from(new Set(trends.map(t => t.category)))
                  .slice(0, 5)
                  .map(category => {
                    const categoryTrends = trends.filter(t => t.category === category);
                    const avgScore = categoryTrends.reduce((sum, t) => sum + t.validation_ratio, 0) / categoryTrends.length;
                    const percentage = Math.round(avgScore * 100);
                    
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getCategoryEmoji(category)}</span>
                            <span className="text-sm text-gray-300 capitalize">
                              {category.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-cyan-400">{categoryTrends.length}</p>
                            <p className="text-xs text-gray-500">{percentage}% avg</p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-800/50 rounded-full h-2">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
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