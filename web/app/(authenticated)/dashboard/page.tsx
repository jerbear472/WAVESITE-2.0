'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency as formatCurrencyLib } from '@/lib/formatters';
import { 
  SUSTAINABLE_EARNINGS,
  formatCurrency,
  canCashOut,
} from '@/lib/SUSTAINABLE_EARNINGS';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Zap, 
  Clock,
  ChevronRight,
  RefreshCw,
  Bell,
  Award
} from 'lucide-react';

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
  total_cashed_out: number;
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
  earnings_amount?: number;
  isUserTrend?: boolean;
  wave_score?: number; // This holds the sentiment value
  approve_count?: number;
  reject_count?: number;
  spotter?: {
    username: string;
    email: string;
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
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
    total_cashed_out: 0,
  });
  const [recentTrends, setRecentTrends] = useState<RecentTrend[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [newNotifications, setNewNotifications] = useState(0);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to trend submissions
    const trendsSubscription = supabase
      .channel('dashboard-trends')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trend_submissions',
          filter: `spotter_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Trend change:', payload);
          // Refresh trends when changes occur
          fetchRecentTrends();
          fetchDashboardStats();
        }
      )
      .subscribe();

    // Subscribe to earnings updates
    const earningsSubscription = supabase
      .channel('dashboard-earnings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'earnings_ledger',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Earnings change:', payload);
          // Refresh stats and activity feed
          fetchDashboardStats();
          fetchActivityFeed();
          setNewNotifications(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(trendsSubscription);
      supabase.removeChannel(earningsSubscription);
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, timeframe]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDashboardStats(),
        fetchRecentTrends(),
        fetchActivityFeed()
      ]);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      // Try the RPC function first, but fallback to manual calculation if it fails
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_user_dashboard_stats', { p_user_id: user?.id });

      if (statsError) {
        console.log('RPC function failed, calculating stats manually:', statsError.message);
        await calculateStatsManually();
      } else if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }
    } catch (error) {
      console.error('Error fetching stats, falling back to manual calculation:', error);
      await calculateStatsManually();
    }
  };

  const calculateStatsManually = async () => {
    try {
      // Get user's trends for accuracy calculation
      const { data: userTrends, error: trendsError } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('spotter_id', user?.id);

      if (trendsError) {
        console.error('Error fetching user trends:', trendsError);
        return;
      }

      // Get user's earnings from earnings_ledger for accuracy
      const { data: earningsLedger, error: earningsError } = await supabase
        .from('earnings_ledger')
        .select('*')
        .eq('user_id', user?.id);

      if (earningsError) {
        console.error('Error fetching user earnings:', earningsError);
        return;
      }
      
      // Map to userEarnings format for compatibility
      const userEarnings = earningsLedger;

      // Calculate accuracy rate: % of trends that get approved
      const totalTrends = userTrends?.length || 0;
      const approvedTrends = userTrends?.filter(trend => {
        // Check validation_status first, then fallback to status
        if (trend.validation_status === 'approved') return true;
        if (trend.validation_status === null && ['approved', 'viral'].includes(trend.status)) return true;
        return false;
      }).length || 0;
      
      const accuracyScore = totalTrends > 0 ? ((approvedTrends / totalTrends) * 100) : 0;

      // Calculate other stats from earnings_ledger
      const approvedEarnings = userEarnings?.filter(e => e.status === 'approved' || e.status === 'paid') || [];
      const pendingEarnings = userEarnings?.filter(e => e.status === 'pending' || e.status === 'awaiting_verification') || [];
      const paidEarnings = userEarnings?.filter(e => e.status === 'paid') || [];
      
      const totalApproved = approvedEarnings.reduce((sum, e) => sum + (e.amount || 0), 0);
      const pendingAmount = pendingEarnings.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalPaid = paidEarnings.reduce((sum, e) => sum + (e.amount || 0), 0);

      // Earnings today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const earningsToday = approvedEarnings
        .filter(e => new Date(e.created_at) >= today)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      // Earnings this week  
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const earningsThisWeek = approvedEarnings
        .filter(e => new Date(e.created_at) >= weekStart)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      // Earnings this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const earningsThisMonth = approvedEarnings
        .filter(e => new Date(e.created_at) >= monthStart)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      // Current streak (simplified)
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      const recentTrends = userTrends?.filter(t => new Date(t.created_at) >= last7Days) || [];
      const uniqueDays = new Set(recentTrends.map(t => new Date(t.created_at).toDateString())).size;

      setStats({
        total_earnings: totalApproved,  // Available earnings
        pending_earnings: pendingAmount,
        trends_spotted: totalTrends,
        trends_verified: approvedTrends,
        scroll_sessions_count: 0, // Would need scroll_sessions table
        accuracy_score: Math.round(accuracyScore * 100) / 100, // Round to 2 decimals
        current_streak: uniqueDays,
        earnings_today: earningsToday,
        earnings_this_week: earningsThisWeek,
        earnings_this_month: earningsThisMonth,
        total_cashed_out: totalPaid  // Amount already paid out
      });

      console.log(`Calculated accuracy rate: ${accuracyScore.toFixed(2)}% (${approvedTrends}/${totalTrends} trends approved)`);
    } catch (error) {
      console.error('Error in manual stats calculation:', error);
    }
  };

  const fetchRecentTrends = async () => {
    try {
      // First try to get user's own trends
      let userTrendsQuery = supabase
        .from('trend_submissions')
        .select(`
          *,
          spotter:profiles(username, email),
          earnings:earnings_ledger(amount)
        `)
        .eq('spotter_id', user?.id)
        .order('created_at', { ascending: false });

      if (timeframe !== 'all') {
        const dateFilter = getDateFilter(timeframe);
        userTrendsQuery = userTrendsQuery.gte('created_at', dateFilter);
      }

      const { data: userTrends, error: userTrendsError } = await userTrendsQuery.limit(5);
      
      if (userTrendsError) {
        console.error('User trends error:', userTrendsError);
      } else {
        console.log('User trends found:', userTrends?.length || 0);
      }
      
      // Then get recent trends from all users to fill the section
      let allTrendsQuery = supabase
        .from('trend_submissions')
        .select(`
          *,
          spotter:profiles(username, email)
        `)
        .order('created_at', { ascending: false });

      if (timeframe !== 'all') {
        const dateFilter = getDateFilter(timeframe);
        allTrendsQuery = allTrendsQuery.gte('created_at', dateFilter);
      }

      const { data: allTrends, error: allTrendsError } = await allTrendsQuery.limit(15);
      
      if (allTrendsError) {
        console.error('All trends error:', allTrendsError);
      } else {
        console.log('All trends found:', allTrends?.length || 0);
      }

      // Combine user trends and recent platform trends, prioritizing user trends
      const combinedTrends: any[] = [];
      
      if (userTrends && !userTrendsError) {
        // Add user's trends first
        userTrends.forEach(trend => {
          combinedTrends.push({
            ...trend,
            earnings_amount: trend.earnings?.[0]?.amount || 0,
            isUserTrend: true
          });
        });
        // Debug: Log first trend to see available data
        if (userTrends.length > 0) {
          console.log('Sample trend data:', userTrends[0]);
        }
      }

      if (allTrends && !allTrendsError) {
        // Add recent platform trends, avoiding duplicates
        allTrends.forEach(trend => {
          if (!combinedTrends.find(t => t.id === trend.id)) {
            combinedTrends.push({
              ...trend,
              earnings_amount: 0,
              isUserTrend: false
            });
          }
        });
      }

      // Limit to top 10 most recent
      setRecentTrends(combinedTrends.slice(0, 10));
    } catch (error) {
      console.error('Error fetching trends:', error);
    }
  };

  const fetchActivityFeed = async () => {
    try {
      const { data: earnings } = await supabase
        .from('earnings_ledger')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const activities: any[] = [];

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
            case 'referral':
              message = 'Earned from referral';
              icon = '🎯';
              break;
            case 'milestone':
              message = earning.description || 'Milestone achievement';
              icon = '🏆';
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
            type: earning.type,
            status: earning.status
          });
        });
      }

      setActivityFeed(activities);
    } catch (error) {
      console.error('Error fetching activity feed:', error);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, []);

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

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return time.toLocaleDateString();
  };

  const formatCurrency = formatCurrencyLib;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const getCategoryDetails = (category: string) => {
    const categoryMap: { [key: string]: { emoji: string, color: string, label: string } } = {
      'visual_style': { emoji: '🎨', color: 'from-purple-500 to-pink-500', label: 'Visual Style' },
      'audio_music': { emoji: '🎵', color: 'from-blue-500 to-cyan-500', label: 'Audio & Music' },
      'creator_technique': { emoji: '🎬', color: 'from-orange-500 to-red-500', label: 'Creator Technique' },
      'meme_format': { emoji: '😂', color: 'from-yellow-500 to-orange-500', label: 'Meme Format' },
      'product_brand': { emoji: '🛍️', color: 'from-green-500 to-teal-500', label: 'Product & Brand' },
      'behavior_pattern': { emoji: '👥', color: 'from-indigo-500 to-purple-500', label: 'Behavior Pattern' }
    };
    return categoryMap[category] || { emoji: '📊', color: 'from-gray-500 to-gray-600', label: category };
  };

  const getTrendVelocity = (trend: RecentTrend) => {
    // Try to get engagement data from evidence field first, then fallback to direct fields
    const likes = trend.evidence?.likes_count || trend.likes_count || 0;
    const shares = trend.evidence?.shares_count || trend.shares_count || 0;
    const comments = trend.evidence?.comments_count || trend.comments_count || 0;
    const views = trend.evidence?.views_count || trend.views_count || 0;
    
    // Calculate based on validation activity if no social data
    const validationActivity = (trend.approve_count || 0) + (trend.reject_count || 0);
    const hoursSincePost = Math.max((Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60), 1);
    
    // Use social engagement if available, otherwise use validation activity
    let engagementScore = 0;
    if (likes + shares + comments + views > 0) {
      engagementScore = (likes * 2 + shares * 3 + comments + views / 100) / hoursSincePost;
    } else {
      // Use validation activity as a proxy for velocity
      engagementScore = (validationActivity * 100) / hoursSincePost;
    }
    
    if (engagementScore > 1000) return { label: '🚀 Explosive', color: 'text-red-500' };
    if (engagementScore > 500) return { label: '⚡ Viral', color: 'text-orange-500' };
    if (engagementScore > 100) return { label: '🔥 Hot', color: 'text-yellow-500' };
    if (engagementScore > 10) return { label: '📈 Rising', color: 'text-green-500' };
    return { label: '🌱 Growing', color: 'text-blue-500' };
  };

  const getAudienceSize = (trend: RecentTrend) => {
    // Try to get data from evidence field first
    const views = trend.evidence?.views_count || trend.views_count || 0;
    const likes = trend.evidence?.likes_count || trend.likes_count || 0;
    const shares = trend.evidence?.shares_count || trend.shares_count || 0;
    
    // Calculate reach
    let totalReach = views + (likes * 10) + (shares * 50);
    
    // If no social data, estimate based on validation and virality prediction
    if (totalReach === 0) {
      const validations = (trend.approve_count || 0) + (trend.reject_count || 0);
      const viralityScore = trend.virality_prediction || 5;
      totalReach = (validations * 1000) + (viralityScore * 500);
    }
    
    if (totalReach >= 1000000) return { size: `${(totalReach / 1000000).toFixed(1)}M`, label: 'Massive' };
    if (totalReach >= 100000) return { size: `${(totalReach / 1000).toFixed(0)}K`, label: 'Large' };
    if (totalReach >= 10000) return { size: `${(totalReach / 1000).toFixed(1)}K`, label: 'Medium' };
    if (totalReach >= 1000) return { size: `${(totalReach / 1000).toFixed(1)}K`, label: 'Growing' };
    if (totalReach > 0) return { size: totalReach.toString(), label: 'Small' };
    return { size: 'New', label: 'Just Posted' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="w-8 h-8 text-wave-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, <span className="text-gradient">{user?.email?.split('@')[0] || 'User'}</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Last updated: {formatTimeAgo(lastRefresh.toISOString())}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {newNotifications > 0 && (
              <div className="relative">
                <Bell className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {newNotifications}
                </span>
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg bg-white dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link href="/scroll" className="btn-primary">
              Submit New Trend
            </Link>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 animate-pulse" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                  <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                {stats.earnings_today > 0 && (
                  <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/20 px-2 py-1 rounded-full animate-pulse">
                    +{formatCurrency(stats.earnings_today)} today
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(stats.total_earnings + stats.pending_earnings + stats.total_cashed_out)}
              </p>
              <div className="flex items-center gap-3 mt-2">
                {stats.total_earnings > 0 && (
                  <p className="text-xs text-green-600">
                    {formatCurrency(stats.total_earnings)} available
                  </p>
                )}
                {stats.pending_earnings > 0 && (
                  <p className="text-xs text-yellow-600">
                    {formatCurrency(stats.pending_earnings)} pending
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className={`text-2xl ${stats.current_streak > 0 ? 'animate-pulse' : ''}`}>
                {stats.current_streak > 0 ? '🔥' : '❄️'}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Trends Spotted</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {stats.trends_spotted}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {stats.trends_verified} verified
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
                <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              {stats.accuracy_score >= 80 && (
                <Award className="w-5 h-5 text-yellow-500" />
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Accuracy Rate</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {stats.accuracy_score > 0 ? `${stats.accuracy_score}%` : 'N/A'}
            </p>
            <div className="mt-2 bg-gray-200 dark:bg-neutral-800 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${stats.accuracy_score}%` }}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-xl">
                <Zap className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-sm text-gray-500">
                {stats.current_streak} days
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Current Streak</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {stats.current_streak} {stats.current_streak === 1 ? 'day' : 'days'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Keep it going! 🚀
            </p>
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Trends - Enhanced */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Platform Trends</h2>
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
                  recentTrends.map((trend) => {
                    const categoryDetails = getCategoryDetails(trend.category);
                    return (
                      <motion.div
                        key={trend.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-700 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start gap-4">
                          {/* Thumbnail */}
                          {(trend.thumbnail_url || trend.screenshot_url) && (
                            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                              <img 
                                src={trend.thumbnail_url || trend.screenshot_url} 
                                alt="Trend"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-2xl">{categoryDetails.emoji}</span>
                              <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${categoryDetails.color} text-white`}>
                                {categoryDetails.label}
                              </span>
                              {trend.isUserTrend && (
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-100 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                                  Your trend
                                </span>
                              )}
                              {trend.earnings_amount && trend.earnings_amount > 0 && (
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                  +{formatCurrency(trend.earnings_amount)}
                                </span>
                              )}
                            </div>
                            
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {trend.evidence?.title || trend.description.split('\n')[0] || 'Untitled Trend'}
                            </h3>
                            
                            {trend.creator_handle && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {trend.creator_handle}
                              </p>
                            )}
                            
                            {!trend.isUserTrend && trend.spotter && (
                              <p className="text-sm text-gray-500 dark:text-gray-500">
                                Spotted by @{trend.spotter.username || trend.spotter.email.split('@')[0]}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <span>{formatTimeAgo(trend.created_at)}</span>
                              {trend.likes_count && trend.likes_count > 0 && (
                                <span>❤️ {formatNumber(trend.likes_count)}</span>
                              )}
                              {trend.views_count && trend.views_count > 0 && (
                                <span>👁 {formatNumber(trend.views_count)}</span>
                              )}
                              {/* Validation votes */}
                              {(trend.approve_count || trend.reject_count) ? (
                                <span className="flex items-center gap-1">
                                  <span className="text-green-500">👍 {trend.approve_count || 0}</span>
                                  <span className="text-gray-400">·</span>
                                  <span className="text-red-500">👎 {trend.reject_count || 0}</span>
                                </span>
                              ) : null}
                              <span className={`
                                ${trend.status === 'viral' ? 'text-red-600' :
                                  trend.status === 'approved' ? 'text-green-600' :
                                  trend.status === 'validating' ? 'text-yellow-600' :
                                  'text-gray-600'}
                              `}>
                                {trend.status === 'viral' ? '🔥 Viral' :
                                 trend.status === 'approved' ? '✅ Approved' :
                                 trend.status === 'validating' ? '🔍 Validating' :
                                 '📝 Submitted'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 min-w-[100px]">
                            {/* Velocity Indicator */}
                            <div className="text-center bg-gray-100 dark:bg-neutral-800 rounded-lg px-3 py-2">
                              <div className={`text-sm font-bold ${getTrendVelocity(trend).color}`}>
                                {getTrendVelocity(trend).label}
                              </div>
                              <div className="text-xs text-gray-500">Velocity</div>
                            </div>
                            
                            {/* Audience Size */}
                            <div className="text-center bg-gray-100 dark:bg-neutral-800 rounded-lg px-3 py-2">
                              <div className="text-lg font-bold text-gray-900 dark:text-white">
                                {getAudienceSize(trend).size}
                              </div>
                              <div className="text-xs text-gray-500">{getAudienceSize(trend).label}</div>
                            </div>
                            
                            {/* Validation Count if available */}
                            {((trend.approve_count || 0) + (trend.reject_count || 0)) > 0 && (
                              <div className="text-center text-xs text-gray-500">
                                {trend.approve_count || 0} 👍 {trend.reject_count || 0} 👎
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No trends spotted yet</p>
                    <Link href="/submit" className="text-wave-600 hover:text-wave-700 mt-2 inline-block">
                      Submit your first trend →
                    </Link>
                  </div>
                )}
              </div>

              {recentTrends.length > 0 && (
                <Link href="/timeline" className="btn-secondary w-full mt-6 flex items-center justify-center gap-2">
                  View All Trends
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link href="/scroll" className="block w-full btn-primary text-center">
                  Start Scrolling
                </Link>
                <Link href="/validate" className="block w-full btn-secondary text-center">
                  Validate Trends
                </Link>
                <Link href="/profile" className="block w-full btn-ghost text-center">
                  View Profile
                </Link>
              </div>
            </div>

            {/* Activity Feed - Enhanced */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activityFeed.length > 0 ? (
                  activityFeed.map((activity) => (
                    <motion.div 
                      key={activity.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-start gap-3 p-3 rounded-lg ${
                        activity.status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/10' : 'bg-gray-50 dark:bg-neutral-800'
                      }`}
                    >
                      <div className="text-2xl">{activity.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
                          <span className={`text-sm font-semibold ${
                            activity.status === 'pending' ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            +{formatCurrency(activity.amount)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTimeAgo(activity.time)}
                          {activity.status === 'pending' && ' • Pending'}
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Earnings */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Earnings</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Today</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(stats.earnings_today)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">This Week</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(stats.earnings_this_week)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">This Month</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(stats.earnings_this_month)}
                  </span>
                </div>
                
                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Available</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(stats.total_earnings)}
                    </span>
                  </div>
                  {stats.pending_earnings > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
                      <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                        {formatCurrency(stats.pending_earnings)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {stats.total_earnings >= 10 && (
                <Link 
                  href="/earnings" 
                  className="mt-4 block w-full bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-900 dark:text-white py-2 px-4 rounded-lg text-center text-sm transition-colors"
                >
                  View Earnings Details
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}