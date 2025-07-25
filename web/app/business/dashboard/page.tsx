'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, subDays, subWeeks, subMonths } from 'date-fns';

interface TrendInsight {
  category: string;
  trend_count: number;
  growth_rate: number;
  avg_virality_score: number;
  top_platforms: string[];
}

interface DemographicInsight {
  age_group: string;
  location: string;
  percentage: number;
  top_categories: string[];
}

interface BusinessStats {
  total_trends_analyzed: number;
  active_trend_spotters: number;
  avg_prediction_accuracy: number;
  top_performing_category: string;
  weekly_growth: number;
}

export default function BusinessDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<BusinessStats>({
    total_trends_analyzed: 0,
    active_trend_spotters: 0,
    avg_prediction_accuracy: 0,
    top_performing_category: '',
    weekly_growth: 0,
  });
  const [trendInsights, setTrendInsights] = useState<TrendInsight[]>([]);
  const [demographicData, setDemographicData] = useState<DemographicInsight[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.is_business) {
      fetchBusinessAnalytics();
    }
  }, [user, timeRange]);

  const fetchBusinessAnalytics = async () => {
    try {
      // Calculate date range
      let startDate = new Date();
      if (timeRange === 'week') {
        startDate = subWeeks(new Date(), 1);
      } else if (timeRange === 'month') {
        startDate = subMonths(new Date(), 1);
      } else {
        startDate = subMonths(new Date(), 3);
      }

      // Fetch trend data
      const { data: trends, error: trendsError } = await supabase
        .from('trend_submissions')
        .select(`
          *,
          user_profiles!user_id (
            demographics,
            interests,
            location
          )
        `)
        .gte('created_at', startDate.toISOString())
        .eq('status', 'verified');

      if (trendsError) throw trendsError;

      // Calculate insights
      const insights = calculateTrendInsights(trends || []);
      const demographics = calculateDemographicInsights(trends || []);
      const businessStats = calculateBusinessStats(trends || []);

      setTrendInsights(insights);
      setDemographicData(demographics);
      setStats(businessStats);

    } catch (error) {
      console.error('Error fetching business analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrendInsights = (trends: any[]): TrendInsight[] => {
    const categoryMap = new Map();

    trends.forEach(trend => {
      const category = trend.category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          trend_count: 0,
          total_virality: 0,
          platforms: new Set(),
        });
      }

      const data = categoryMap.get(category);
      data.trend_count += 1;
      data.total_virality += trend.virality_score || 0;
      if (trend.platform) data.platforms.add(trend.platform);
    });

    return Array.from(categoryMap.values()).map(data => ({
      category: data.category,
      trend_count: data.trend_count,
      growth_rate: Math.random() * 50, // Placeholder - would calculate from historical data
      avg_virality_score: data.total_virality / data.trend_count,
      top_platforms: Array.from(data.platforms).slice(0, 3) as string[],
    })).sort((a, b) => b.trend_count - a.trend_count);
  };

  const calculateDemographicInsights = (trends: any[]): DemographicInsight[] => {
    // Placeholder demographic analysis
    return [
      {
        age_group: '18-24',
        location: 'Urban',
        percentage: 35,
        top_categories: ['fashion', 'meme', 'audio'],
      },
      {
        age_group: '25-34',
        location: 'Suburban',
        percentage: 28,
        top_categories: ['wellness', 'tech', 'lifestyle'],
      },
      {
        age_group: '35-44',
        location: 'Urban',
        percentage: 22,
        top_categories: ['wellness', 'lifestyle', 'fashion'],
      },
    ];
  };

  const calculateBusinessStats = (trends: any[]): BusinessStats => {
    const uniqueUsers = new Set(trends.map(t => t.user_id)).size;
    const categoryCount = trends.reduce((acc, trend) => {
      acc[trend.category] = (acc[trend.category] || 0) + 1;
      return acc;
    }, {});

    const topCategory = Object.entries(categoryCount).sort((a, b) => (b[1] as number) - (a[1] as number))[0];

    return {
      total_trends_analyzed: trends.length,
      active_trend_spotters: uniqueUsers,
      avg_prediction_accuracy: 84.2, // Placeholder
      top_performing_category: topCategory?.[0] || 'fashion',
      weekly_growth: 12.5, // Placeholder
    };
  };

  if (!user?.is_business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">This dashboard is only available to business users.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Analytics</h1>
          <p className="text-gray-600">Behavioral insights and trend intelligence dashboard</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 mb-6">
          {(['week', 'month', 'quarter'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Past {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Trends Analyzed</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_trends_analyzed.toLocaleString()}</p>
            <p className="text-sm text-green-600 mt-1">+{stats.weekly_growth}% this week</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Active Spotters</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.active_trend_spotters.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Prediction Accuracy</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.avg_prediction_accuracy}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Top Category</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1 capitalize">{stats.top_performing_category}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">API Calls</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">2.4K</p>
            <p className="text-sm text-gray-500 mt-1">of 10K limit</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Trend Categories */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Trending Categories</h2>
            <div className="space-y-4">
              {trendInsights.map((insight) => (
                <div key={insight.category} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 capitalize">{insight.category}</h3>
                    <p className="text-sm text-gray-600">{insight.trend_count} trends</p>
                    <div className="flex gap-2 mt-1">
                      {insight.top_platforms.map(platform => (
                        <span key={platform} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      {insight.avg_virality_score.toFixed(1)}
                    </p>
                    <p className="text-sm text-green-600">+{insight.growth_rate.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Demographics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Audience Demographics</h2>
            <div className="space-y-4">
              {demographicData.map((demo, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">{demo.age_group} • {demo.location}</h3>
                    <span className="text-lg font-semibold text-blue-600">{demo.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${demo.percentage}%` }}
                    />
                  </div>
                  <div className="flex gap-1">
                    {demo.top_categories.map(category => (
                      <span key={category} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button className="p-4 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-medium text-gray-900">Generate Report</h3>
              <p className="text-sm text-gray-600">Create custom analytics report</p>
            </button>
            <button className="p-4 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <div className="text-2xl mb-2">🔔</div>
              <h3 className="font-medium text-gray-900">Set Alert</h3>
              <p className="text-sm text-gray-600">Monitor specific trends</p>
            </button>
            <button className="p-4 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <div className="text-2xl mb-2">🔌</div>
              <h3 className="font-medium text-gray-900">API Setup</h3>
              <p className="text-sm text-gray-600">Configure data access</p>
            </button>
            <button className="p-4 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <div className="text-2xl mb-2">👥</div>
              <h3 className="font-medium text-gray-900">Team Settings</h3>
              <p className="text-sm text-gray-600">Manage user access</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}