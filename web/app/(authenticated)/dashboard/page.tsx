'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import StreakDisplay from '@/components/StreakDisplay';
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
  earnings_today_pending?: number;
  earnings_today_approved?: number;
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
  url?: string;  // Main trend URL
  post_url?: string;  // Alternative URL field
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

  // Subscribe to real-time earnings updates
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('dashboard-earnings-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'earnings_ledger',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Earnings update on dashboard:', payload);
          // Refresh dashboard data when earnings change
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

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
      
      const accuracyScore = totalTrends > 0 && !isNaN(totalTrends) && !isNaN(approvedTrends) ? ((approvedTrends / totalTrends) * 100) : 0;

      // Calculate other stats from earnings_ledger
      const approvedEarnings = userEarnings?.filter(e => e.status === 'approved' || e.status === 'paid') || [];
      const pendingEarnings = userEarnings?.filter(e => e.status === 'pending' || e.status === 'awaiting_validation') || [];
      const paidEarnings = userEarnings?.filter(e => e.status === 'paid') || [];
      
      const totalApproved = approvedEarnings.reduce((sum, e) => sum + (e.amount || 0), 0);
      const pendingAmount = pendingEarnings.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalPaid = paidEarnings.reduce((sum, e) => sum + (e.amount || 0), 0);

      // Earnings today (include both approved AND pending from today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaysApproved = approvedEarnings
        .filter(e => new Date(e.created_at) >= today)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      const todaysPending = pendingEarnings
        .filter(e => new Date(e.created_at) >= today)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      const earningsToday = todaysApproved + todaysPending;

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
        accuracy_score: !isNaN(accuracyScore) ? Math.round(accuracyScore * 100) / 100 : 0, // Round to 2 decimals
        current_streak: uniqueDays,
        earnings_today: earningsToday,
        earnings_today_pending: todaysPending,  // Add pending from today
        earnings_today_approved: todaysApproved,  // Add approved from today
        earnings_this_week: earningsThisWeek,
        earnings_this_month: earningsThisMonth,
        total_cashed_out: totalPaid  // Amount already paid out
      });

      console.log(`Calculated accuracy rate: ${!isNaN(accuracyScore) ? accuracyScore.toFixed(2) : '0'}% (${approvedTrends}/${totalTrends} trends approved)`);
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
    // Ensure num is a valid number
    if (!num || isNaN(num)) return '0';
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
    // Get current and initial metrics
    const currentLikes = trend.likes_count || 0;
    const currentViews = trend.views_count || 0;
    const currentShares = trend.shares_count || 0;
    const currentComments = trend.comments_count || 0;
    
    // Calculate hours since submission - ensure valid date
    const createdTime = new Date(trend.created_at).getTime();
    const hoursSincePost = !isNaN(createdTime) ? Math.max((Date.now() - createdTime) / (1000 * 60 * 60), 0.1) : 1;
    
    // Calculate engagement velocity (interactions per hour) - ensure no NaN
    const totalEngagement = currentLikes + currentShares + currentComments;
    const engagementVelocity = hoursSincePost > 0 && !isNaN(hoursSincePost) ? totalEngagement / hoursSincePost : 0;
    
    // Calculate view velocity (views per hour) - ensure no NaN
    const viewVelocity = hoursSincePost > 0 && !isNaN(hoursSincePost) && !isNaN(currentViews) ? currentViews / hoursSincePost : 0;
    
    // Combined velocity score (weighted)
    const velocityScore = (engagementVelocity * 10) + (viewVelocity / 100);
    
    // Growth rate calculation - if we had previous data points
    let growthRate = 0;
    if (hoursSincePost > 1) {
      // Estimate growth rate based on current velocity vs average
      const avgExpectedEngagement = 100 * hoursSincePost; // baseline expectation
      growthRate = ((totalEngagement - avgExpectedEngagement) / avgExpectedEngagement) * 100;
    }
    
    // Determine velocity label and actual metrics
    let label = '';
    let metric = '';
    let color = '';
    
    if (velocityScore > 10000) {
      label = '🚀 Explosive';
      metric = `+${!isNaN(engagementVelocity) ? (engagementVelocity * 24).toFixed(0) : '—'}/day`;
      color = 'text-red-500';
    } else if (velocityScore > 1000) {
      label = '⚡ Viral';
      metric = `+${!isNaN(engagementVelocity) ? (engagementVelocity * 24).toFixed(0) : '—'}/day`;
      color = 'text-orange-500';
    } else if (velocityScore > 100) {
      label = '🔥 Hot';
      metric = `+${!isNaN(engagementVelocity) ? engagementVelocity.toFixed(1) : '—'}/hr`;
      color = 'text-yellow-500';
    } else if (velocityScore > 10) {
      label = '📈 Rising';
      metric = `+${!isNaN(engagementVelocity) ? engagementVelocity.toFixed(1) : '—'}/hr`;
      color = 'text-green-500';
    } else if (velocityScore > 1) {
      label = '🌱 Growing';
      metric = `+${!isNaN(totalEngagement) ? totalEngagement.toFixed(0) : '—'} total`;
      color = 'text-blue-500';
    } else {
      label = '🆕 New';
      metric = 'Just posted';
      color = 'text-gray-500';
    }
    
    return { 
      label, 
      metric,
      color,
      velocity: velocityScore,
      growthRate: growthRate > 0 && !isNaN(growthRate) ? `+${growthRate.toFixed(0)}%` : ''
    };
  };

  const getAudienceSize = (trend: RecentTrend) => {
    // Get actual metrics from the trend
    const views = trend.views_count || 0;
    const likes = trend.likes_count || 0;
    const shares = trend.shares_count || 0;
    const comments = trend.comments_count || 0;
    
    // Calculate estimated reach (views + potential reach from shares)
    const estimatedReach = views + (shares * 100); // Each share reaches ~100 people on average
    
    // Calculate engagement rate - ensure no NaN
    const engagementRate = views > 0 && !isNaN(views) ? ((likes + shares + comments) / views) * 100 : 0;
    
    // Format the audience size
    let sizeDisplay = '';
    let growthIndicator = '';
    
    if (views >= 1000000) {
      sizeDisplay = `${(views / 1000000).toFixed(1)}M`;
      growthIndicator = 'views';
    } else if (views >= 1000) {
      sizeDisplay = `${(views / 1000).toFixed(1)}K`;
      growthIndicator = 'views';
    } else if (views >= 100) {
      sizeDisplay = views.toString();
      growthIndicator = 'views';
    } else if (views > 0) {
      // Show views if we have any, even if less than 100
      sizeDisplay = views.toString();
      growthIndicator = 'views';
    } else {
      // If no views yet, show engagement only if meaningful
      const totalEngagement = likes + shares + comments;
      if (totalEngagement >= 10) {
        sizeDisplay = totalEngagement.toString();
        growthIndicator = 'engagements';
      } else {
        // Don't show anything if numbers are too small
        sizeDisplay = '';
        growthIndicator = '';
      }
    }
    
    // Calculate hourly growth rate - ensure valid date
    const createdTime = new Date(trend.created_at).getTime();
    const hoursSincePost = !isNaN(createdTime) ? Math.max((Date.now() - createdTime) / (1000 * 60 * 60), 0.1) : 1;
    const viewsPerHour = views > 0 && !isNaN(hoursSincePost) ? views / hoursSincePost : 0;
    
    // Create growth label based on rate
    let growthLabel = '';
    if (viewsPerHour > 10000) {
      growthLabel = `+${!isNaN(viewsPerHour) ? (viewsPerHour / 1000).toFixed(0) : '—'}K/hr`;
    } else if (viewsPerHour > 1000) {
      growthLabel = `+${!isNaN(viewsPerHour) ? viewsPerHour.toFixed(0) : '—'}/hr`;
    } else if (viewsPerHour > 100) {
      growthLabel = `+${!isNaN(viewsPerHour) ? viewsPerHour.toFixed(0) : '—'}/hr`;
    } else if (viewsPerHour > 10) {
      growthLabel = `+${!isNaN(viewsPerHour) ? (viewsPerHour * 24).toFixed(0) : '—'}/day`;
    } else if (views > 0) {
      growthLabel = `${!isNaN(engagementRate) ? engagementRate.toFixed(1) : '—'}% engagement`;
    } else {
      growthLabel = 'New submission';
    }
    
    return { 
      size: sizeDisplay,
      label: growthIndicator,
      growth: growthLabel,
      engagementRate: engagementRate > 0.5 && !isNaN(engagementRate) ? engagementRate.toFixed(1) : '',
      reach: estimatedReach
    };
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

        {/* Streak Display */}
        <div className="mb-6">
          <StreakDisplay />
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
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/20 px-2 py-1 rounded-full animate-pulse">
                      +{formatCurrency(stats.earnings_today)} today
                    </span>
                    {(stats.earnings_today_pending ?? 0) > 0 && (
                      <span className="text-xs text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
                        {formatCurrency(stats.earnings_today_pending ?? 0)} pending
                      </span>
                    )}
                  </div>
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
              {!isNaN(stats.accuracy_score) && stats.accuracy_score >= 0 ? `${Math.round(stats.accuracy_score)}%` : 'N/A'}
            </p>
            <div className="mt-2 bg-gray-200 dark:bg-neutral-800 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${!isNaN(stats.accuracy_score) ? Math.min(stats.accuracy_score, 100) : 0}%` }}
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
                        onClick={() => {
                          // Open the trend URL if available, otherwise open trend details
                          const trendUrl = trend.url || trend.post_url || trend.evidence?.url;
                          if (trendUrl) {
                            window.open(trendUrl, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-700 transition-all cursor-pointer group relative"
                      >
                        {/* External link indicator */}
                        {(trend.url || trend.post_url || trend.evidence?.url) && (
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        )}
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
                            
                            <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {trend.evidence?.title || trend.description.split('\n')[0] || 'Untitled Trend'}
                            </h3>
                            
                            {trend.creator_handle && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {trend.creator_handle}
                              </p>
                            )}
                            
                            {/* Platform indicator */}
                            {(trend.url || trend.post_url || trend.evidence?.url) && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-blue-600 dark:text-blue-400">
                                  {(() => {
                                    const url = trend.url || trend.post_url || trend.evidence?.url || '';
                                    if (url.includes('tiktok')) return '🎵 TikTok';
                                    if (url.includes('instagram')) return '📸 Instagram';
                                    if (url.includes('twitter') || url.includes('x.com')) return '𝕏 Twitter';
                                    if (url.includes('youtube')) return '📺 YouTube';
                                    if (url.includes('reddit')) return '🔥 Reddit';
                                    return '🔗 View Source';
                                  })()}
                                </span>
                              </div>
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
                              {/* Validation votes - only show if there are actual votes */}
                              {(trend.approve_count > 0 || trend.reject_count > 0) && (
                                <span className="flex items-center gap-1">
                                  {trend.approve_count > 0 && (
                                    <span className="text-green-500">👍 {trend.approve_count}</span>
                                  )}
                                  {trend.approve_count > 0 && trend.reject_count > 0 && (
                                    <span className="text-gray-400">·</span>
                                  )}
                                  {trend.reject_count > 0 && (
                                    <span className="text-red-500">👎 {trend.reject_count}</span>
                                  )}
                                </span>
                              )}
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
                          
                          <div className="flex flex-col gap-2 min-w-[140px]">
                            {/* Velocity Indicator */}
                            <div className="text-center bg-gradient-to-br from-gray-100 to-gray-50 dark:from-neutral-800 dark:to-neutral-900 rounded-lg px-3 py-2 border border-gray-200 dark:border-neutral-700">
                              <div className={`text-sm font-bold ${getTrendVelocity(trend).color}`}>
                                {getTrendVelocity(trend).label}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                {getTrendVelocity(trend).metric}
                              </div>
                              {getTrendVelocity(trend).growthRate && (
                                <div className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">
                                  {getTrendVelocity(trend).growthRate}
                                </div>
                              )}
                            </div>
                            
                            {/* Audience Reach */}
                            {(getAudienceSize(trend).size || getAudienceSize(trend).growth) && (
                              <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg px-3 py-2 border border-blue-200 dark:border-blue-800">
                                {getAudienceSize(trend).size && (
                                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                                    {getAudienceSize(trend).size}
                                  </div>
                                )}
                                {getAudienceSize(trend).growth && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                    {getAudienceSize(trend).growth}
                                  </div>
                                )}
                                {getAudienceSize(trend).engagementRate && parseFloat(getAudienceSize(trend).engagementRate) > 0 && !isNaN(parseFloat(getAudienceSize(trend).engagementRate)) && (
                                  <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1">
                                    {getAudienceSize(trend).engagementRate}% engaged
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Validation Count if available - only show if there are actual votes */}
                            {(trend.approve_count > 0 || trend.reject_count > 0) && (
                              <div className="text-center text-xs text-gray-500">
                                {trend.approve_count > 0 && <span className="text-green-500">{trend.approve_count} 👍</span>}
                                {trend.approve_count > 0 && trend.reject_count > 0 && <span className="mx-1">·</span>}
                                {trend.reject_count > 0 && <span className="text-red-500">{trend.reject_count} 👎</span>}
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

            {/* Daily Streak Information */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Daily Streak Stats</h2>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl mb-2">🔥</div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.current_streak} {stats.current_streak === 1 ? 'Day' : 'Days'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Current Streak</p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-neutral-800 rounded-lg p-2">
                    <span className="text-gray-600 dark:text-gray-400">Accuracy Rate</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {!isNaN(stats.accuracy_score) && stats.accuracy_score >= 0 ? `${Math.round(stats.accuracy_score)}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-neutral-800 rounded-lg p-2">
                    <span className="text-gray-600 dark:text-gray-400">Trends Verified</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {stats.trends_verified}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-neutral-800 rounded-lg p-2">
                    <span className="text-gray-600 dark:text-gray-400">Success Rate</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {stats.trends_spotted > 0 && !isNaN(stats.trends_verified) && !isNaN(stats.trends_spotted) ? `${Math.round((stats.trends_verified / stats.trends_spotted) * 100)}%` : 'N/A'}
                    </span>
                  </div>
                </div>
                
                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-neutral-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Streak Rewards:</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">1+ days</span>
                      <span className="text-green-600 dark:text-green-400">1.2x multiplier</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">3+ days</span>
                      <span className="text-green-600 dark:text-green-400">1.5x multiplier</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">7+ days</span>
                      <span className="text-green-600 dark:text-green-400">2.0x multiplier</span>
                    </div>
                  </div>
                </div>
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
                  {(user?.pending_earnings || stats.pending_earnings) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
                      <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                        {formatCurrency(user?.pending_earnings || stats.pending_earnings)}
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