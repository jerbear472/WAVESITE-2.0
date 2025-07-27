'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import EnterpriseViewSwitcher from '@/components/EnterpriseViewSwitcher';
import WaveSightLogo from '@/components/WaveSightLogo';
import { 
  TrendingUp, CheckCircle, XCircle, Clock, Users, BarChart, 
  Filter, Calendar, Download, Eye, Activity, Zap, ArrowUp,
  Building2, Globe, Tag, Database, AlertCircle, FileText
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

export default function EnterpriseDashboard() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('week');
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<ValidatedTrend[]>([]);
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
  }, [user, timeframe]);

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
          startDate = new Date('2020-01-01'); // Or your app launch date
          break;
      }

      // Fetch validated trends
      const { data: trendsData, error: trendsError } = await supabase
        .from('trend_submissions')
        .select(`
          *,
          spotter:profiles!spotter_id (username)
        `)
        .gt('validation_count', 0)
        .gt('validation_ratio', 0.5)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

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
      'travel': '✈️'
    };
    return emojiMap[category?.toLowerCase()] || '📊';
  };

  const getValidationBadge = (ratio: number) => {
    const percentage = Math.round(ratio * 100);
    if (percentage >= 90) return { color: 'text-green-500', label: 'Strong Signal' };
    if (percentage >= 75) return { color: 'text-blue-500', label: 'Good Signal' };
    if (percentage >= 60) return { color: 'text-yellow-500', label: 'Moderate Signal' };
    return { color: 'text-gray-500', label: 'Weak Signal' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950">
      <div className="container-custom py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in">
          <div className="flex items-center gap-4">
            <WaveSightLogo size="sm" showIcon={true} />
            <div>
              <h1 className="text-responsive-2xl font-light text-gray-100">
                Enterprise <span className="font-normal text-gradient">Analytics</span>
              </h1>
              <p className="text-responsive-sm text-gray-400 mt-1">
                Real-time validated trend intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <EnterpriseViewSwitcher />
            <button className="btn-secondary btn-responsive">
              <FileText className="w-4 h-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>

        {/* Enterprise Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="card bg-gray-900/50 border-gray-800 animate-scale-in p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-responsive-xs text-gray-400">Validated Trends</p>
                <p className="text-responsive-xl font-semibold text-cyan-400 mt-1">{stats.total_validated_trends}</p>
                <p className="text-responsive-xs text-green-400 mt-2">
                  +{stats.trends_today} today
                </p>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl">📈</div>
            </div>
          </div>

          <div className="card bg-gray-900/50 border-gray-800 animate-scale-in p-4 sm:p-6" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-responsive-xs text-gray-400">Avg. Validation</p>
                <p className="text-responsive-xl font-semibold text-cyan-400 mt-1">{Math.round(stats.avg_validation_score)}%</p>
                <p className="text-responsive-xs text-gray-500 mt-2">
                  Community confidence
                </p>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl">🎯</div>
            </div>
          </div>

          <div className="card bg-gray-900/50 border-gray-800 animate-scale-in p-4 sm:p-6" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-responsive-xs text-gray-400">Top Category</p>
                <p className="text-responsive-xl font-semibold text-cyan-400 mt-1 capitalize">{stats.top_category}</p>
                <p className="text-responsive-xs text-gray-500 mt-2">
                  {stats.total_categories} active
                </p>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl">{getCategoryEmoji(stats.top_category)}</div>
            </div>
          </div>

          <div className="card bg-gray-900/50 border-gray-800 animate-scale-in p-4 sm:p-6" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-responsive-xs text-gray-400">Active Spotters</p>
                <p className="text-responsive-xl font-semibold text-cyan-400 mt-1">{stats.total_spotters}</p>
                <p className="text-responsive-xs text-gray-500 mt-2">
                  Contributing users
                </p>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl">👥</div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Validated Trends Stream */}
          <div className="lg:col-span-2">
            <div className="card bg-gray-900/50 border-gray-800 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <h2 className="text-responsive-lg font-semibold text-gray-100">Validated Trends</h2>
                <select 
                  value={timeframe} 
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="text-sm border border-gray-700 rounded-lg px-3 py-1.5 bg-gray-800 text-gray-300"
                >
                  <option value="all">All Time</option>
                  <option value="day">Last 24h</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                </select>
              </div>

              <div className="space-y-4">
                {trends.length > 0 ? (
                  trends.map((trend) => {
                    const validation = getValidationBadge(trend.validation_ratio);
                    return (
                      <div key={trend.id} className="p-3 sm:p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800/70 transition-colors cursor-pointer">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                          {/* Thumbnail */}
                          {(trend.thumbnail_url || trend.screenshot_url) && (
                            <div className="w-full sm:w-20 h-48 sm:h-20 rounded-lg overflow-hidden flex-shrink-0">
                              <img 
                                src={trend.thumbnail_url || trend.screenshot_url} 
                                alt="Trend"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{getCategoryEmoji(trend.category)}</span>
                              <span className="text-xs px-2 py-1 bg-gray-700 rounded-full text-gray-300 capitalize">
                                {trend.category}
                              </span>
                              <span className={`text-xs font-medium ${validation.color}`}>
                                {validation.label}
                              </span>
                            </div>
                            
                            <p className="text-responsive-sm text-gray-200 mb-2">{trend.description}</p>
                            
                            <div className="flex items-center gap-4 text-responsive-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                {trend.positive_validations}
                              </span>
                              <span className="flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-red-400" />
                                {trend.negative_validations}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {trend.validation_count} validators
                              </span>
                              <span className="ml-auto">
                                {formatDistanceToNow(new Date(trend.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No validated trends found for this period</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enterprise Features Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="card bg-gray-900/50 border-gray-800 p-4 sm:p-6">
              <h3 className="text-responsive-sm font-semibold text-gray-100 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link href="/enterprise/analytics" className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <BarChart className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-gray-200">Deep Analytics</span>
                  </div>
                  <ArrowUp className="w-4 h-4 text-gray-400 rotate-45" />
                </Link>
                
                <Link href="/enterprise/api" className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-gray-200">API Access</span>
                  </div>
                  <ArrowUp className="w-4 h-4 text-gray-400 rotate-45" />
                </Link>
                
                <Link href="/enterprise/alerts" className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                    <span className="text-sm text-gray-200">Trend Alerts</span>
                  </div>
                  <ArrowUp className="w-4 h-4 text-gray-400 rotate-45" />
                </Link>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="card bg-gray-900/50 border-gray-800 p-4 sm:p-6">
              <h3 className="text-responsive-sm font-semibold text-gray-100 mb-4">Category Performance</h3>
              <div className="space-y-3">
                {Array.from(new Set(trends.map(t => t.category)))
                  .slice(0, 5)
                  .map(category => {
                    const categoryTrends = trends.filter(t => t.category === category);
                    const avgScore = categoryTrends.reduce((sum, t) => sum + t.validation_ratio, 0) / categoryTrends.length;
                    
                    return (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{getCategoryEmoji(category)}</span>
                          <span className="text-sm text-gray-300 capitalize">{category}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-cyan-400">{categoryTrends.length}</p>
                          <p className="text-xs text-gray-500">{Math.round(avgScore * 100)}% avg</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}