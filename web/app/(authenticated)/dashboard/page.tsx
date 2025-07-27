'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface DashboardStats {
  total_earnings: number;
  pending_earnings: number;
  trends_spotted: number;
  trends_verified: number;
  scroll_sessions_count: number;
  accuracy_score: number;
  current_streak: number;
  earnings_today: number;
  earnings_this_week: number;
  earnings_this_month: number;
}

interface RecentTrend {
  id: string;
  category: string;
  description: string;
  virality_prediction: number;
  status: string;
  created_at: string;
  validation_count: number;
  screenshot_url?: string;
  thumbnail_url?: string;
  evidence?: any;
  creator_handle?: string;
  creator_name?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  hashtags?: string[];
  post_url?: string;
  posted_at?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    total_earnings: 0,
    pending_earnings: 0,
    trends_spotted: 0,
    trends_verified: 0,
    scroll_sessions_count: 0,
    accuracy_score: 0,
    current_streak: 0,
    earnings_today: 0,
    earnings_this_week: 0,
    earnings_this_month: 0,
  });
  const [recentTrends, setRecentTrends] = useState<RecentTrend[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, timeframe]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch user stats using the RPC function
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_user_dashboard_stats', { p_user_id: user?.id });

      if (statsError) throw statsError;

      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }

      // Fetch recent trends based on timeframe
      let query = supabase
        .from('trend_submissions')
        .select('*')
        .eq('spotter_id', user?.id)
        .order('created_at', { ascending: false });

      // Apply date filter only if not "all"
      if (timeframe !== 'all') {
        const dateFilter = getDateFilter(timeframe);
        query = query.gte('created_at', dateFilter);
      }

      const { data: trendsData, error: trendsError } = await query.limit(10);

      if (trendsError) throw trendsError;
      setRecentTrends(trendsData || []);

      // Fetch recent activity
      await fetchActivityFeed();

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateFilter = (timeframe: string) => {
    const now = new Date();
    switch (timeframe) {
      case 'day':
        now.setDate(now.getDate() - 1);
        break;
      case 'week':
        now.setDate(now.getDate() - 7);
        break;
      case 'month':
        now.setMonth(now.getMonth() - 1);
        break;
    }
    return now.toISOString();
  };

  const fetchActivityFeed = async () => {
    try {
      // Fetch recent earnings
      const { data: earnings } = await supabase
        .from('earnings_ledger')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const activities = [];

      // Convert earnings to activity items
      if (earnings) {
        earnings.forEach(earning => {
          let message = '';
          let icon = '💰';
          
          switch (earning.type) {
            case 'trend_submission':
              message = 'Earned for submitting a trend';
              icon = '📈';
              break;
            case 'trend_validation':
              message = 'Earned for validating a trend';
              icon = '✅';
              break;
            case 'scroll_session':
              message = 'Earned from scroll session';
              icon = '📱';
              break;
            default:
              message = earning.description || 'Earned rewards';
          }

          activities.push({
            id: earning.id,
            message,
            icon,
            amount: earning.amount,
            time: earning.created_at,
            type: earning.type
          });
        });
      }

      setActivityFeed(activities);
    } catch (error) {
      console.error('Error fetching activity feed:', error);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
    return time.toLocaleDateString();
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleString('en-US', options);
  };

  const getCategoryEmoji = (category: string) => {
    const emojiMap: { [key: string]: string } = {
      'visual_style': '🎨',
      'audio_music': '🎵',
      'creator_technique': '🎬',
      'meme_format': '😂',
      'product_brand': '🛍️',
      'behavior_pattern': '👥'
    };
    return emojiMap[category] || '📊';
  };

  const calculateWaveScore = (trend: RecentTrend) => {
    // Calculate a wave score based on virality prediction and validation count
    const baseScore = trend.virality_prediction || 5;
    const validationBonus = Math.min(trend.validation_count * 0.5, 3);
    return Math.min(baseScore + validationBonus, 10).toFixed(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="page-container main-content bg-gray-50 dark:bg-neutral-950">
      <div className="container-custom py-responsive content-scroll">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8 animate-fade-in mobile-constrain">
          <div>
            <h1 className="text-responsive-2xl font-light text-gray-900 dark:text-gray-100">
              Welcome back, <span className="font-normal text-gradient">{user?.email?.split('@')[0] || 'User'}</span>
            </h1>
            <p className="text-responsive-sm text-gray-600 dark:text-gray-400 mt-1">
              Here's your trend intelligence overview
            </p>
          </div>
          <Link href="/submit" className="btn-primary btn-responsive w-full sm:w-auto">
            Submit Trend
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8 lg:mb-12 mobile-constrain">
          <div className="card animate-scale-in p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-responsive-xs text-gray-600 dark:text-gray-400">Trends Spotted</p>
                <p className="text-responsive-xl font-semibold mt-1">{stats.trends_spotted}</p>
                <p className="text-responsive-xs text-green-600 dark:text-green-400 mt-2">
                  +{stats.trends_verified} verified
                </p>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl">📈</div>
            </div>
          </div>

          <div className="card animate-scale-in p-4 sm:p-6" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-responsive-xs text-gray-600 dark:text-gray-400">Current Streak</p>
                <p className="text-responsive-xl font-semibold mt-1">{stats.current_streak}</p>
                <p className="text-responsive-xs text-gray-500 dark:text-gray-500 mt-2">
                  {stats.current_streak === 1 ? 'day' : 'days'}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl">🔥</div>
            </div>
          </div>

          <div className="card animate-scale-in p-4 sm:p-6" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-responsive-xs text-gray-600 dark:text-gray-400">Total Earnings</p>
                <p className="text-responsive-xl font-semibold mt-1">${stats.total_earnings.toFixed(2)}</p>
                <p className="text-responsive-xs text-green-600 dark:text-green-400 mt-2">
                  +${stats.earnings_today.toFixed(2)} today
                </p>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl">💰</div>
            </div>
          </div>

          <div className="card animate-scale-in p-4 sm:p-6" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-responsive-xs text-gray-600 dark:text-gray-400">Accuracy Rate</p>
                <p className="text-responsive-xl font-semibold mt-1">
                  {stats.accuracy_score > 0 ? `${stats.accuracy_score}%` : 'N/A'}
                </p>
                <p className="text-responsive-xs text-gray-500 dark:text-gray-500 mt-2">
                  {stats.accuracy_score >= 80 ? 'Top performer' : 'Keep improving'}
                </p>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl">🎯</div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mobile-constrain">
          {/* Recent Trends */}
          <div className="lg:col-span-2">
            <div className="card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <h2 className="text-responsive-lg font-semibold">Recent Trends</h2>
                <select 
                  value={timeframe} 
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="text-sm border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-900"
                >
                  <option value="all">All Time</option>
                  <option value="day">Last 24h</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                </select>
              </div>

              <div className="space-y-4">
                {recentTrends.length > 0 ? (
                  recentTrends.map((trend) => (
                    <div key={trend.id} className="p-3 sm:p-4 bg-gray-50 dark:bg-neutral-800 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer">
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
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getCategoryEmoji(trend.category)}</span>
                            <h3 className="font-medium text-responsive-sm">{trend.evidence?.title || trend.description.split('\n')[0] || 'Untitled Trend'}</h3>
                          </div>
                          
                          {/* Creator info */}
                          {(trend.creator_handle || trend.creator_name) && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              by @{trend.creator_handle || trend.creator_name}
                            </p>
                          )}
                          
                          {/* Date */}
                          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                            📅 {formatDate(trend.created_at)} ({formatTimeAgo(trend.created_at)})
                          </p>
                          
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {trend.category.replace(/_/g, ' ')}
                            </span>
                            <span className={`text-sm font-medium ${
                              trend.status === 'viral' ? 'text-red-600 dark:text-red-400' :
                              trend.status === 'approved' ? 'text-green-600 dark:text-green-400' :
                              trend.status === 'validating' ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-gray-600 dark:text-gray-400'
                            }`}>
                              {trend.status === 'viral' ? '🔥 Viral' :
                               trend.status === 'approved' ? '✅ Approved' :
                               trend.status === 'validating' ? '🔍 Validating' :
                               '📝 Submitted'}
                            </span>
                            
                            {/* Engagement stats */}
                            {(trend.likes_count || trend.views_count) && (
                              <>
                                {trend.likes_count > 0 && (
                                  <span className="text-xs text-gray-500">
                                    ❤️ {trend.likes_count >= 1000 ? `${(trend.likes_count / 1000).toFixed(1)}k` : trend.likes_count}
                                  </span>
                                )}
                                {trend.views_count > 0 && (
                                  <span className="text-xs text-gray-500">
                                    👁 {trend.views_count >= 1000 ? `${(trend.views_count / 1000).toFixed(1)}k` : trend.views_count}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-center flex-shrink-0">
                          <div className="text-responsive-lg font-semibold text-gradient">
                            {calculateWaveScore(trend)}
                          </div>
                          <div className="text-responsive-xs text-gray-500 dark:text-gray-500">Wave Score</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No trends spotted yet in this timeframe</p>
                    <Link href="/submit" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
                      Submit your first trend →
                    </Link>
                  </div>
                )}
              </div>

              <Link href="/timeline" className="btn-secondary w-full mt-6">
                View Timeline
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4 sm:space-y-6">
            <div className="card p-4 sm:p-6">
              <h2 className="text-responsive-lg font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link href="/scroll" className="block w-full btn-primary text-center">
                  Start Scrolling
                </Link>
                <Link href="/verify" className="block w-full btn-secondary text-center">
                  Verify Trends
                </Link>
                <Link href="/persona" className="block w-full btn-ghost text-center">
                  Update Persona
                </Link>
              </div>
            </div>

            <div className="card p-4 sm:p-6">
              <h2 className="text-responsive-lg font-semibold mb-4">Activity Feed</h2>
              <div className="space-y-3">
                {activityFeed.length > 0 ? (
                  activityFeed.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="text-lg mt-0.5">{activity.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-responsive-xs">{activity.message}</p>
                          <span className="text-responsive-xs font-semibold text-green-600">
                            +${activity.amount.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {formatTimeAgo(activity.time)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    <p>No recent activity</p>
                    <p className="text-xs mt-1">Start by submitting a trend or validating others!</p>
                  </div>
                )}
              </div>
              
              {stats.pending_earnings > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Pending Earnings</span>
                    <span className="font-semibold text-yellow-600">
                      ${stats.pending_earnings.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Earnings Summary */}
            <div className="card p-4 sm:p-6">
              <h2 className="text-responsive-lg font-semibold mb-4">Earnings Summary</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-responsive-xs text-gray-600 dark:text-gray-400">Today</span>
                  <span className="text-responsive-xs font-semibold">
                    ${stats.earnings_today.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-responsive-xs text-gray-600 dark:text-gray-400">This Week</span>
                  <span className="text-responsive-xs font-semibold">
                    ${stats.earnings_this_week.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-responsive-xs text-gray-600 dark:text-gray-400">This Month</span>
                  <span className="text-responsive-xs font-semibold">
                    ${stats.earnings_this_month.toFixed(2)}
                  </span>
                </div>
                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between">
                    <span className="text-responsive-sm font-medium">Total Earned</span>
                    <span className="text-responsive-lg font-bold text-green-600">
                      ${stats.total_earnings.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}