'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { formatCurrency, calculateUserTier } from '@/lib/SUSTAINABLE_EARNINGS';
import {
  TrendingUp, TrendingDown, DollarSign, Award, Target,
  Clock, Calendar, BarChart3, PieChart, Activity,
  Users, Zap, Star, ArrowUp, ArrowDown
} from 'lucide-react';

interface DashboardStats {
  // Earnings
  current_balance: number;
  total_earned: number;
  today_earnings: number;
  week_earnings: number;
  month_earnings: number;
  
  // Performance
  trends_submitted: number;
  trends_approved: number;
  validations_completed: number;
  approval_rate: number;
  performance_tier: string;
  quality_score: number;
  
  // Trends
  trending_categories: Array<{ category: string; count: number }>;
  best_performing_trend: any;
  recent_submissions: any[];
  
  // Growth
  daily_earnings_growth: number;
  weekly_earnings_growth: number;
  tier_progress: number;
}

interface ChartData {
  labels: string[];
  values: number[];
}

export default function AnalyticsDashboard() {
  const supabase = createClientComponentClient();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [earningsChart, setEarningsChart] = useState<ChartData>({ labels: [], values: [] });
  const [categoryChart, setCategoryChart] = useState<ChartData>({ labels: [], values: [] });

  // Helper functions for tier display
  const getTierColor = (tier: string): string => {
    switch (tier?.toLowerCase()) {
      case 'bronze': return '#CD7F32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'platinum': return '#E5E4E2';
      case 'diamond': return '#B9F2FF';
      default: return '#6B7280';
    }
  };

  const getTierEmoji = (tier: string): string => {
    switch (tier?.toLowerCase()) {
      case 'bronze': return '🥉';
      case 'silver': return '🥈';
      case 'gold': return '🥇';
      case 'platinum': return '💎';
      case 'diamond': return '💠';
      default: return '⭐';
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user stats
      const { data: userStats } = await supabase
        .rpc('get_user_earnings_stats', { p_user_id: user.id });

      // Get recent submissions
      const { data: recentTrends } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('spotter_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get best performing trend
      const { data: bestTrend } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('spotter_id', user.id)
        .eq('status', 'approved')
        .order('base_amount', { ascending: false })
        .limit(1)
        .single();

      // Get earnings over time
      const { data: earningsData } = await supabase
        .from('earnings_ledger')
        .select('amount, created_at')
        .eq('user_id', user.id)
        .gte('created_at', getTimeRangeStart())
        .order('created_at', { ascending: true });

      // Process earnings chart data
      const chartData = processEarningsChart(earningsData || []);
      setEarningsChart(chartData);

      // Get category distribution
      const { data: categoryData } = await supabase
        .from('trend_submissions')
        .select('category')
        .eq('spotter_id', user.id)
        .gte('created_at', getTimeRangeStart());

      // Process category chart data
      const catChart = processCategoryChart(categoryData || []);
      setCategoryChart(catChart);

      // Calculate growth metrics
      const growth = calculateGrowth(earningsData || []);

      // Calculate tier progress
      const tierProgress = calculateTierProgress(userStats?.[0] || {});

      setStats({
        ...userStats?.[0],
        recent_submissions: recentTrends || [],
        best_performing_trend: bestTrend,
        trending_categories: catChart.labels.map((label, i) => ({
          category: label,
          count: catChart.values[i]
        })),
        daily_earnings_growth: growth.daily,
        weekly_earnings_growth: growth.weekly,
        tier_progress: tierProgress,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRangeStart = () => {
    const now = new Date();
    switch (timeRange) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1)).toISOString();
      case 'week':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      default:
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
    }
  };

  const processEarningsChart = (data: any[]): ChartData => {
    const grouped: { [key: string]: number } = {};
    
    data.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString();
      grouped[date] = (grouped[date] || 0) + item.amount;
    });

    return {
      labels: Object.keys(grouped),
      values: Object.values(grouped),
    };
  };

  const processCategoryChart = (data: any[]): ChartData => {
    const counts: { [key: string]: number } = {};
    
    data.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      labels: sorted.map(([cat]) => cat),
      values: sorted.map(([, count]) => count),
    };
  };

  const calculateGrowth = (data: any[]) => {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const todayEarnings = data
      .filter(e => new Date(e.created_at) > dayAgo)
      .reduce((sum, e) => sum + e.amount, 0);
    
    const yesterdayEarnings = data
      .filter(e => {
        const date = new Date(e.created_at);
        return date < dayAgo && date > new Date(dayAgo.getTime() - 24 * 60 * 60 * 1000);
      })
      .reduce((sum, e) => sum + e.amount, 0);
    
    const thisWeekEarnings = data
      .filter(e => new Date(e.created_at) > weekAgo)
      .reduce((sum, e) => sum + e.amount, 0);
    
    const lastWeekEarnings = data
      .filter(e => {
        const date = new Date(e.created_at);
        return date < weekAgo && date > new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
      })
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      daily: yesterdayEarnings > 0 ? ((todayEarnings - yesterdayEarnings) / yesterdayEarnings) * 100 : 0,
      weekly: lastWeekEarnings > 0 ? ((thisWeekEarnings - lastWeekEarnings) / lastWeekEarnings) * 100 : 0,
    };
  };

  const calculateTierProgress = (stats: any): number => {
    const tier = stats.performance_tier || 'learning';
    
    if (tier === 'elite') return 100;
    if (tier === 'verified') {
      // Progress to elite
      const trendsNeeded = 50 - (stats.trends_submitted || 0);
      const approvalNeeded = 0.85 - (stats.approval_rate || 0);
      return Math.max(0, Math.min(100, 
        ((stats.trends_submitted || 0) / 50) * 50 +
        ((stats.approval_rate || 0) / 0.85) * 50
      ));
    }
    if (tier === 'learning') {
      // Progress to verified
      const trendsNeeded = 10 - (stats.trends_submitted || 0);
      const approvalNeeded = 0.70 - (stats.approval_rate || 0);
      return Math.max(0, Math.min(100,
        ((stats.trends_submitted || 0) / 10) * 50 +
        ((stats.approval_rate || 0) / 0.70) * 50
      ));
    }
    return 0;
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatGrowth = (value: number) => {
    const formatted = value.toFixed(1);
    if (value > 0) return `+${formatted}%`;
    return `${formatted}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return <div>Failed to load dashboard data</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600">Track your performance and earnings</p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex gap-2">
          {(['day', 'week', 'month'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Balance */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-green-600" />
            <span className={`text-xs font-medium ${
              stats.daily_earnings_growth > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatGrowth(stats.daily_earnings_growth)}
            </span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.current_balance)}</p>
          <p className="text-sm text-gray-600">Current Balance</p>
        </div>

        {/* Total Earned */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <span className={`text-xs font-medium ${
              stats.weekly_earnings_growth > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatGrowth(stats.weekly_earnings_growth)}
            </span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.total_earned)}</p>
          <p className="text-sm text-gray-600">Total Earned</p>
        </div>

        {/* Approval Rate */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-purple-600" />
            <span className="text-xs font-medium text-gray-600">
              {stats.trends_approved}/{stats.trends_submitted}
            </span>
          </div>
          <p className="text-2xl font-bold">{formatPercentage(stats.approval_rate)}</p>
          <p className="text-sm text-gray-600">Approval Rate</p>
        </div>

        {/* Performance Tier */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8" style={{ color: getTierColor(stats.performance_tier) }} />
            <span className="text-2xl">{getTierEmoji(stats.performance_tier)}</span>
          </div>
          <p className="text-2xl font-bold capitalize">{stats.performance_tier}</p>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${stats.tier_progress}%`,
                  backgroundColor: getTierColor(stats.performance_tier),
                }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {stats.tier_progress}% to next tier
            </p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Chart */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Earnings Over Time
          </h3>
          <div className="h-64 flex items-end gap-2">
            {earningsChart.values.map((value, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-600 rounded-t transition-all hover:bg-blue-700"
                  style={{
                    height: `${(value / Math.max(...earningsChart.values)) * 200}px`,
                    minHeight: '4px',
                  }}
                />
                <p className="text-xs text-gray-600 mt-2 rotate-45 origin-left">
                  {earningsChart.labels[i]}
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div>
              <p className="text-sm text-gray-600">Period Total</p>
              <p className="text-xl font-bold">
                {formatCurrency(earningsChart.values.reduce((a, b) => a + b, 0))}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Daily Average</p>
              <p className="text-xl font-bold">
                {formatCurrency(
                  earningsChart.values.reduce((a, b) => a + b, 0) / earningsChart.values.length
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-600" />
            Top Categories
          </h3>
          <div className="space-y-3">
            {stats.trending_categories.map((cat, i) => (
              <div key={cat.category} className="flex items-center gap-3">
                <span className="text-sm font-medium w-24 text-right">
                  {cat.category}
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-end pr-2"
                    style={{
                      width: `${(cat.count / Math.max(...categoryChart.values)) * 100}%`,
                    }}
                  >
                    <span className="text-xs text-white font-medium">{cat.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Submissions Stats */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            Submission Activity
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Submitted</span>
              <span className="font-bold">{stats.trends_submitted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Approved</span>
              <span className="font-bold text-green-600">{stats.trends_approved}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending</span>
              <span className="font-bold text-yellow-600">
                {stats.trends_submitted - stats.trends_approved}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Quality Score</span>
              <span className="font-bold">{(stats.quality_score * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Validation Stats */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Validation Activity
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Validations</span>
              <span className="font-bold">{stats.validations_completed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Earnings</span>
              <span className="font-bold text-green-600">
                {formatCurrency(stats.validations_completed * 0.10)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Per Day</span>
              <span className="font-bold">
                {(stats.validations_completed / 30).toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Best Performing Trend */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Best Trend
          </h3>
          {stats.best_performing_trend ? (
            <div className="space-y-2">
              <p className="font-medium text-sm line-clamp-2">
                {stats.best_performing_trend.title}
              </p>
              <div className="flex items-center gap-2">
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                  {formatCurrency(stats.best_performing_trend.earnings || 0)}
                </span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                  {stats.best_performing_trend.category}
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {new Date(stats.best_performing_trend.created_at).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No approved trends yet</p>
          )}
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" />
          Recent Submissions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Title</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Category</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Earnings</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_submissions.map(trend => (
                <tr key={trend.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <p className="text-sm font-medium line-clamp-1">{trend.title}</p>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {trend.category}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      trend.validation_status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : trend.validation_status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {trend.validation_status}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-sm font-medium">
                      {formatCurrency(trend.earnings || 0)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-sm text-gray-600">
                    {new Date(trend.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}