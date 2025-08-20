'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import StreakDisplay from '@/components/StreakDisplay';
import NotificationsWindow from '@/components/NotificationsWindow';
import TierInfoModal from '@/components/TierInfoModal';
import { getDynamicGreeting, getTimeOfDay } from '@/lib/greetings';
// Removed currency formatting imports - using XP display instead
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
  Award,
  Info,
  Sparkles
} from 'lucide-react';

interface DashboardStats {
  approved_xp: number;
  pending_xp: number;
  trends_spotted: number;
  trends_verified: number;
  scroll_sessions_count: number;
  accuracy_score: number;
  current_streak: number;
  xp_today: number;
  xp_today_pending?: number;
  xp_today_approved?: number;
  xp_this_week: number;
  xp_this_month: number;
  total_cashed_out: number;
}

interface RecentTrend {
  id: string;
  category: string;
  description: string;
  virality_prediction: number;
  status: string;
  created_at: string;
  validation_count?: number; // Made optional since it's not being used
  screenshot_url?: string;
  thumbnail_url?: string;
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
  // New fields from SmartTrendSubmission
  title?: string;
  trend_headline?: string;
  trendName?: string;
  why_trending?: string;
  explanation?: string;
  trend_velocity?: string;
  trend_size?: string;
  first_seen_timing?: string;
  platform?: string;
  sentiment?: number;
  is_ai_generated?: boolean;
  brand_safe?: boolean;
  audience_age?: string[];
  category_answers?: any;
  // follow_up_data is now stored in evidence
  evidence?: {
    velocityMetrics?: {
      velocity?: string;
      size?: string;
      timing?: string;
    };
    trendVelocity?: string;
    trendSize?: string;
    url?: string;
    title?: string;
    [key: string]: any; // Allow other properties
  };
  posted_at?: string;
  xp_amount?: number;
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
    approved_xp: 0,
    pending_xp: 0,
    trends_spotted: 0,
    trends_verified: 0,
    scroll_sessions_count: 0,
    accuracy_score: 0,
    current_streak: 0,
    xp_today: 0,
    xp_this_week: 0,
    xp_this_month: 0,
    total_cashed_out: 0,
  });
  const [recentTrends, setRecentTrends] = useState<RecentTrend[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [newNotifications, setNewNotifications] = useState(0);
  const [showTierModal, setShowTierModal] = useState(false);

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
          filter: `spotter_id=eq.{user.id}`
        },
        (payload) => {
          console.log('Trend change:', payload);
          // Refresh trends when changes occur
          fetchRecentTrends();
          fetchDashboardStats();
        }
      )
      .subscribe();

    // Subscribe to xp updates
    const xpSubscription = supabase
      .channel('dashboard-xp')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'xp_ledger',
          filter: `user_id=eq.{user.id}`
        },
        (payload) => {
          console.log('XP change:', payload);
          // Refresh stats and activity feed
          fetchDashboardStats();
          fetchActivityFeed();
          setNewNotifications(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(trendsSubscription);
      supabase.removeChannel(xpSubscription);
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, timeframe]);

  // Subscribe to real-time xp updates
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('dashboard-xp-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'xp_ledger',
          filter: `user_id=eq.{user.id}`
        },
        (payload) => {
          console.log('XP update on dashboard:', payload);
          // Refresh dashboard data when xp change
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
    if (!user?.id) return;
    
    try {
      // Try the RPC function first, but fallback to manual calculation if it fails
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_user_dashboard_stats', { p_user_id: user.id });

      if (statsError) {
        console.log('RPC function failed, calculating stats manually:', statsError.message);
        await calculateStatsManually();
      } else if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      } else {
        // No data returned, calculate manually
        await calculateStatsManually();
      }
    } catch (error) {
      console.error('Error fetching stats, falling back to manual calculation:', error);
      await calculateStatsManually();
    }
  };

  const calculateStatsManually = async () => {
    if (!user?.id) return;
    
    try {
      // Get user's approved and pending xp directly from user_profiles
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('approved_xp, pending_xp')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile xp:', profileError);
      }

      // Get user's trends for accuracy calculation
      const { data: userTrends, error: trendsError } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('spotter_id', user.id);

      if (trendsError) {
        console.error('Error fetching user trends:', trendsError);
        return;
      }

      // Get user's xp from xp_ledger for accuracy
      const { data: xpLedger, error: xpError } = await supabase
        .from('xp_ledger')
        .select('*')
        .eq('user_id', user.id);

      if (xpError) {
        console.error('Error fetching user xp:', xpError);
        return;
      }
      
      // Map to userXP format for compatibility
      const userXP = xpLedger;

      // Calculate accuracy rate: approved / (approved + rejected)
      const totalTrends = userTrends?.length || 0;
      const approvedTrends = userTrends?.filter(trend => {
        // Check validation_status first, then fallback to status
        if (trend.validation_status === 'approved') return true;
        if (trend.validation_status === null && ['approved', 'viral'].includes(trend.status)) return true;
        return false;
      }).length || 0;
      
      const rejectedTrends = userTrends?.filter(trend => {
        // Check validation_status first, then fallback to status
        if (trend.validation_status === 'rejected' || trend.validation_status === 'cancelled') return true;
        if (trend.validation_status === null && trend.status === 'rejected') return true;
        return false;
      }).length || 0;
      
      // Accuracy is approved / (approved + rejected), not out of total
      const decidedTrends = approvedTrends + rejectedTrends;
      const accuracyScore = decidedTrends > 0 && !isNaN(decidedTrends) && !isNaN(approvedTrends) ? ((approvedTrends / decidedTrends) * 100) : 0;

      // Calculate other stats from xp_ledger
      const availableXP = userXP?.filter(e => e.status === 'approved') || [];
      const pendingXP = userXP?.filter(e => e.status === 'pending' || e.status === 'awaiting_validation') || [];
      const paidXP = userXP?.filter(e => e.status === 'paid') || [];
      
      const totalAvailable = availableXP.reduce((sum, e) => sum + (e.amount || 0), 0);
      const pendingAmount = pendingXP.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalPaid = paidXP.reduce((sum, e) => sum + (e.amount || 0), 0);

      // XP today (include both approved AND pending from today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaysApproved = availableXP
        .filter(e => new Date(e.created_at) >= today)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      const todaysPending = pendingXP
        .filter(e => new Date(e.created_at) >= today)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      const xpToday = todaysApproved + todaysPending;

      // XP this week  
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const xpThisWeek = availableXP
        .filter(e => new Date(e.created_at) >= weekStart)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      // XP this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const xpThisMonth = availableXP
        .filter(e => new Date(e.created_at) >= monthStart)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      // Current streak (simplified)
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      const recentTrends = userTrends?.filter(t => new Date(t.created_at) >= last7Days) || [];
      const uniqueDays = new Set(recentTrends.map(t => new Date(t.created_at).toDateString())).size;

      setStats({
        approved_xp: profileData?.approved_xp || totalAvailable,  // Use profile data if available
        pending_xp: profileData?.pending_xp || pendingAmount,
        trends_spotted: totalTrends,
        trends_verified: approvedTrends,
        scroll_sessions_count: 0, // Would need scroll_sessions table
        accuracy_score: !isNaN(accuracyScore) ? accuracyScore : 0, // Already in percentage
        current_streak: uniqueDays,
        xp_today: xpToday,
        xp_today_pending: todaysPending,  // Add pending from today
        xp_today_approved: todaysApproved,  // Add approved from today
        xp_this_week: xpThisWeek,
        xp_this_month: xpThisMonth,
        total_cashed_out: totalPaid  // Amount already paid out
      });

      console.log(`Calculated accuracy rate: ${!isNaN(accuracyScore) ? accuracyScore.toFixed(2) : '0'}% (${approvedTrends}/${decidedTrends} trends decided)`);
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
          trend_velocity,
          trend_size,
          evidence,
          spotter:profiles(username, email),
          xp:xp_ledger(amount)
        `)
        .order('created_at', { ascending: false });
      
      // Only filter by user if we have a user
      if (user?.id) {
        userTrendsQuery = userTrendsQuery.eq('spotter_id', user.id);
      }

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
          trend_velocity,
          trend_size,
          evidence,
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
        // Debug: Check if evidence data is coming through
        if (allTrends && allTrends.length > 0) {
          console.log('First trend evidence:', {
            hasEvidence: !!allTrends[0].evidence,
            evidence: allTrends[0].evidence,
            velocityMetrics: allTrends[0].evidence?.velocityMetrics
          });
        }
      }

      // Combine user trends and recent platform trends, prioritizing user trends
      const combinedTrends: any[] = [];
      
      if (userTrends && !userTrendsError) {
        // Add user's trends first
        userTrends.forEach(trend => {
          combinedTrends.push({
            ...trend,
            xp_amount: trend.xp?.[0]?.amount || 0,
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
              xp_amount: 0,
              isUserTrend: false
            });
          }
        });
      }

      // Filter out invalid trends and limit to top 10 most recent
      const validTrends = combinedTrends.filter(trend => {
        // Filter out trends with invalid data
        if (!trend.category || trend.category === '0' || String(trend.category) === '0') return false;
        if (trend.description === '0' || String(trend.description) === '0') return false;
        if (trend.title === '0' || String(trend.title) === '0') return false;
        return true;
      });
      
      setRecentTrends(validTrends.slice(0, 10));
    } catch (error) {
      console.error('Error fetching trends:', error);
    }
  };

  const fetchActivityFeed = async () => {
    if (!user?.id) return;
    
    try {
      const { data: xp } = await supabase
        .from('xp_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const activities: any[] = [];

      if (xp) {
        xp.forEach(xp => {
          let message = '';
          let icon = '💰';
          
          switch (xp.type) {
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
              message = xp.description || 'Milestone achievement';
              icon = '🏆';
              break;
            default:
              message = xp.description || 'Earned rewards';
          }

          activities.push({
            id: xp.id,
            message,
            icon,
            amount: xp.amount,
            time: xp.created_at,
            type: xp.type,
            status: xp.status
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

  // Removed formatCurrency - using direct XP display

  const formatNumber = (num: number) => {
    // Ensure num is a valid number and don't return empty string for 0
    if (num === undefined || num === null || isNaN(num)) return '0';
    if (num === 0) return '0';
    if (num >= 1000000) return `{(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `{(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const getCategoryDetails = (category: string) => {
    const categoryMap: { [key: string]: { emoji: string, color: string, label: string } } = {
      'visual_style': { emoji: '🎨', color: 'from-purple-500 to-pink-500', label: 'Visual Style' },
      'audio_music': { emoji: '🎵', color: 'from-blue-500 to-cyan-500', label: 'Audio & Music' },
      'creator_technique': { emoji: '🎬', color: 'from-orange-500 to-red-500', label: 'Creator Technique' },
      'meme_format': { emoji: '😂', color: 'from-yellow-500 to-orange-500', label: 'Meme Format' },
      'product_brand': { emoji: '🛍️', color: 'from-green-500 to-teal-500', label: 'Product & Brand' },
      'behavior_pattern': { emoji: '👥', color: 'from-indigo-500 to-purple-500', label: 'Behavior Pattern' },
      'political': { emoji: '🏛️', color: 'from-red-500 to-pink-500', label: 'Political' },
      'finance': { emoji: '💰', color: 'from-green-500 to-emerald-500', label: 'Finance' },
      'news_events': { emoji: '📰', color: 'from-blue-500 to-indigo-500', label: 'News & Events' },
      'education': { emoji: '📚', color: 'from-purple-500 to-indigo-500', label: 'Education' },
      'relationship': { emoji: '💕', color: 'from-pink-500 to-red-500', label: 'Relationship' },
      'animals_pets': { emoji: '🐾', color: 'from-yellow-500 to-amber-500', label: 'Animals & Pets' },
      'automotive': { emoji: '🚗', color: 'from-slate-500 to-gray-600', label: 'Cars & Machines' },
      'food_drink': { emoji: '🍔', color: 'from-orange-500 to-yellow-500', label: 'Food & Drink' },
      'technology': { emoji: '💻', color: 'from-blue-600 to-purple-600', label: 'Tech & Gaming' },
      'sports': { emoji: '⚽', color: 'from-green-600 to-emerald-600', label: 'Sports & Fitness' },
      'dance': { emoji: '💃', color: 'from-purple-500 to-pink-500', label: 'Dance' },
      'travel': { emoji: '✈️', color: 'from-blue-500 to-sky-500', label: 'Travel & Places' },
      'fashion': { emoji: '👗', color: 'from-pink-500 to-purple-500', label: 'Fashion & Beauty' },
      'gaming': { emoji: '🎮', color: 'from-purple-600 to-indigo-600', label: 'Gaming' },
      'health': { emoji: '🏥', color: 'from-green-500 to-teal-500', label: 'Health & Wellness' },
      'diy_crafts': { emoji: '🔨', color: 'from-amber-500 to-orange-500', label: 'DIY & Crafts' }
    };
    // Clean the category label if it's invalid or missing
    const details = categoryMap[category];
    if (details) {
      return details;
    }
    // Fallback with cleaned category name - never show '0'
    const cleanLabel = category && category !== '0' && String(category) !== '0'
      ? category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) 
      : '';
    return { emoji: '📊', color: 'from-gray-500 to-gray-600', label: cleanLabel };
  };

  const getTrendVelocity = (trend: RecentTrend) => {
    // First check if we have submitted velocity data from the form
    // Check multiple possible locations for velocity data
    const submittedVelocity = trend.trend_velocity || 
                             trend.evidence?.velocityMetrics?.velocity || 
                             trend.evidence?.trendVelocity ||
                             trend.evidence?.trend_velocity;
    const submittedSize = trend.trend_size ||
                         trend.evidence?.velocityMetrics?.size || 
                         trend.evidence?.trendSize ||
                         trend.evidence?.trend_size;
    
    // If we have submitted velocity data, use it to show what the spotter indicated
    if (submittedVelocity) {
      let label = '';
      let metric = '';
      let color = '';
      
      switch (submittedVelocity) {
        case 'just_starting':
          label = '🌱 Just Starting';
          color = 'text-green-500';
          break;
        case 'accelerating':
          label = '🚀 Accelerating';
          color = 'text-blue-500';
          break;
        case 'peaking':
          label = '⚡ Peaking';
          color = 'text-orange-500';
          break;
        case 'declining':
          label = '📉 Declining';
          color = 'text-yellow-600';
          break;
        case 'dead':
          label = '💀 Dead';
          color = 'text-gray-600';
          break;
        // Support old values
        case 'picking_up':
          label = '📈 Picking Up';
          color = 'text-blue-500';
          break;
        case 'going_viral':
          label = '🔥 Going Viral';
          color = 'text-orange-500';
          break;
        case 'viral':
          label = '🔥 Going Viral';
          color = 'text-orange-500';
          break;
        case 'saturated':
          label = '⚡ Saturated';
          color = 'text-purple-500';
          break;
        default:
          label = '🆕 New';
          color = 'text-gray-500';
      }
      
      // Add size context to metric
      if (submittedSize) {
        switch (submittedSize) {
          case 'under_10k':
            metric = '<10K reach';
            break;
          case '10k_100k':
            metric = '10K-100K reach';
            break;
          case '100k_1m':
            metric = '100K-1M reach';
            break;
          case '1m_10m':
            metric = '1M-10M reach';
            break;
          case 'over_10m':
            metric = '10M+ reach';
            break;
          // Support old values
          case 'micro':
            metric = '<10K reach';
            break;
          case 'niche':
            metric = '10K-100K reach';
            break;
          case 'viral':
            metric = '100K-1M reach';
            break;
          case 'mega':
            metric = '1M-10M reach';
            break;
          case 'global':
            metric = '10M+ reach';
            break;
          default:
            metric = 'Trending';
        }
      } else {
        // Fallback to engagement metrics
        const totalEngagement = (trend.likes_count || 0) + (trend.shares_count || 0) + (trend.comments_count || 0);
        if (totalEngagement > 0) {
          metric = `{totalEngagement} engagements`;
        } else {
          metric = 'Just spotted';
        }
      }
      
      return { label, metric, color, velocity: 0, growthRate: '' };
    }
    
    // Fallback to calculated velocity if no submitted data
    const currentLikes = trend.likes_count || 0;
    const currentViews = trend.views_count || 0;
    const currentShares = trend.shares_count || 0;
    const currentComments = trend.comments_count || 0;
    
    // Calculate hours since submission
    const createdTime = new Date(trend.created_at).getTime();
    const hoursSincePost = !isNaN(createdTime) ? Math.max((Date.now() - createdTime) / (1000 * 60 * 60), 0.1) : 1;
    
    // Calculate engagement velocity
    const totalEngagement = currentLikes + currentShares + currentComments;
    const engagementVelocity = hoursSincePost > 0 ? totalEngagement / hoursSincePost : 0;
    
    // Determine velocity label based on actual metrics
    let label = '';
    let metric = '';
    let color = '';
    
    if (engagementVelocity > 100) {
      label = '🚀 Explosive';
      metric = `+{(engagementVelocity * 24).toFixed(0)}/day`;
      color = 'text-red-500';
    } else if (engagementVelocity > 10) {
      label = '⚡ Trending';
      metric = `+{engagementVelocity.toFixed(0)}/hr`;
      color = 'text-orange-500';
    } else if (engagementVelocity > 1) {
      label = '📈 Rising';
      metric = `+{engagementVelocity.toFixed(1)}/hr`;
      color = 'text-green-500';
    } else if (totalEngagement > 0) {
      label = '🌱 Growing';
      metric = `{totalEngagement} total`;
      color = 'text-blue-500';
    } else {
      label = '🆕 New Submission';
      metric = 'Recently posted';
      color = 'text-gray-500';
    }
    
    return { label, metric, color, velocity: engagementVelocity, growthRate: '' };
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
      sizeDisplay = `{(views / 1000000).toFixed(1)}M`;
      growthIndicator = 'views';
    } else if (views >= 1000) {
      sizeDisplay = `{(views / 1000).toFixed(1)}K`;
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
      growthLabel = `+{!isNaN(viewsPerHour) ? (viewsPerHour / 1000).toFixed(0) : '—'}K/hr`;
    } else if (viewsPerHour > 1000) {
      growthLabel = `+{!isNaN(viewsPerHour) ? viewsPerHour.toFixed(0) : '—'}/hr`;
    } else if (viewsPerHour > 100) {
      growthLabel = `+{!isNaN(viewsPerHour) ? viewsPerHour.toFixed(0) : '—'}/hr`;
    } else if (viewsPerHour > 10) {
      growthLabel = `+{!isNaN(viewsPerHour) ? (viewsPerHour * 24).toFixed(0) : '—'}/day`;
    } else if (views > 0) {
      growthLabel = `{!isNaN(engagementRate) ? engagementRate.toFixed(1) : '—'}% engagement`;
    } else {
      growthLabel = '';  // Don't show redundant text for new submissions
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
      <div className="container mx-auto px-6 py-10 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {(() => {
                const greeting = getDynamicGreeting({
                  isFirstTime: stats.trends_spotted === 0,
                  userName: user?.email?.split('@')[0] || 'User',
                  timeOfDay: getTimeOfDay(),
                  currentStreak: stats.current_streak,
                  performance_tier: user?.performance_tier || 'lxp'
                });
                // Parse greeting to style username
                const parts = greeting.split(/\[\[|\]\]/);
                return parts.map((part, index) => {
                  // Every odd index is a username (between [[ and ]])
                  if (index % 2 === 1) {
                    return <span key={index} className="text-blue-600 dark:text-blue-400">{part}</span>;
                  }
                  return <span key={index}>{part}</span>;
                });
              })()}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Last updated: {formatTimeAgo(lastRefresh.toISOString())}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
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
              <RefreshCw className={`w-5 h-5 {refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link href="/spot" className="btn-primary whitespace-nowrap">
              Submit New Trend
            </Link>
          </div>
        </div>


        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-500 text-2xl">⚡</span>
              <span className="text-xs text-gray-500">XP</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {isNaN(stats.approved_xp) ? 0 : (stats.approved_xp || 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">Available XP</p>
            {!isNaN(stats.pending_xp) && (stats.pending_xp || 0) > 0 && (
              <p className="text-xs text-yellow-600 mt-2">
                +{(stats.pending_xp || 0).toLocaleString()} pending
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-500 text-2xl">📈</span>
              <span className="text-xs text-gray-500">Trends</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.trends_spotted || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">Spotted</p>
            <p className="text-xs text-green-600 mt-2">
              {stats.trends_verified || 0} verified
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all"
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
            className="bg-white dark:bg-neutral-900 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all"
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

        {/* Main Content Grid with Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Recent Trends - Enhanced */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Recent Platform Trends</h2>
                <select 
                  value={timeframe} 
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                >
                  <option value="all">All Time</option>
                  <option value="day">Last 24h</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                </select>
              </div>

              <div className="space-y-6">
                {recentTrends.length > 0 ? (
                  recentTrends.map((trend) => {
                    const categoryDetails = getCategoryDetails(trend.category);
                    
                    return (
                      <motion.div
                        key={trend.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={(e) => {
                          // Prevent navigation if clicking on the external link icon
                          if ((e.target as HTMLElement).closest('.external-link-icon')) {
                            return;
                          }
                          
                          // Open the trend URL if available
                          const trendUrl = trend.url || trend.post_url || trend.evidence?.url;
                          if (trendUrl) {
                            try {
                              // Validate URL first
                              const url = new URL(trendUrl);
                              
                              // Check if on mobile device
                              const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                              
                              if (isMobile) {
                                // Show confirmation on mobile to avoid app issues
                                if (confirm('Open this trend in a new window?')) {
                                  window.open(trendUrl, '_blank');
                                }
                              } else {
                                // For desktop, open in new tab
                                window.open(trendUrl, '_blank', 'noopener,noreferrer');
                              }
                            } catch (error) {
                              console.error('Invalid URL:', trendUrl);
                              alert('Unable to open this trend. The URL may be invalid.');
                            }
                          }
                        }}
                        className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer group"
                      >
                        {/* External link indicator */}
                        {(trend.url || trend.post_url || trend.evidence?.url) && (
                          <div className="external-link-icon absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row items-start gap-6">
                          {/* Thumbnail */}
                          {(trend.thumbnail_url || trend.screenshot_url) && (
                            <div className="w-full sm:w-24 h-36 sm:h-24 rounded-lg overflow-hidden flex-shrink-0">
                              <img 
                                src={trend.thumbnail_url || trend.screenshot_url} 
                                alt="Trend"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{categoryDetails.emoji}</span>
                              <span className="text-sm font-medium text-gray-600">
                                {categoryDetails.label}
                              </span>
                              {trend.xp_amount && trend.xp_amount > 0 && (
                                <span className="text-sm text-green-600 font-medium ml-auto">
                                  +{trend.xp_amount} XP
                                </span>
                              )}
                            </div>
                            
                            <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                              {trend.title || trend.trend_headline || trend.evidence?.title || trend.trendName || trend.why_trending || (trend.description && trend.description !== '0' && trend.description.split('\n')[0]) || 'Untitled Trend'}
                            </h3>
                            
                            {trend.creator_handle && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {trend.creator_handle}
                              </p>
                            )}
                            
                            {/* Trend Velocity & Size Data - Enhanced Display */}
                            {(trend.trend_velocity || trend.trend_size || trend.evidence?.velocityMetrics || trend.evidence?.trendVelocity) && (
                              <div className="flex items-center gap-3 mt-2">
                                {(trend.trend_velocity || trend.evidence?.velocityMetrics?.velocity || trend.evidence?.trendVelocity) && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-green-500/10 to-blue-500/10 text-green-400 border border-green-500/20">
                                    {(() => {
                                      const velocity = trend.trend_velocity || trend.evidence?.velocityMetrics?.velocity || trend.evidence?.trendVelocity;
                                      switch(velocity) {
                                        case 'just_starting': return '🌱 Just Starting';
                                        case 'accelerating': return '🚀 Accelerating';
                                        case 'peaking': return '⚡ Peaking';
                                        case 'declining': return '📉 Declining';
                                        case 'dead': return '💀 Dead';
                                        // Support old values too
                                        case 'picking_up': return '📈 Picking Up';
                                        case 'going_viral': return '🚀 Going Viral';
                                        case 'viral': return '🚀 Going Viral';
                                        case 'saturated': return '⚡ Saturated';
                                        default: return velocity ? `📊 {velocity}` : null;
                                      }
                                    })()}
                                  </span>
                                )}
                                {(trend.trend_size || trend.evidence?.velocityMetrics?.size || trend.evidence?.trendSize) && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-400 border border-purple-500/20">
                                    {(() => {
                                      const size = trend.trend_size || trend.evidence?.velocityMetrics?.size || trend.evidence?.trendSize;
                                      switch(size) {
                                        case 'under_10k': return '🔬 <10K reach';
                                        case '10k_100k': return '🎯 10K-100K reach';
                                        case '100k_1m': return '🔥 100K-1M reach';
                                        case '1m_10m': return '💥 1M-10M reach';
                                        case 'over_10m': return '🌍 10M+ reach';
                                        // Support old values too
                                        case 'micro': return '🔬 Micro (<10K)';
                                        case 'niche': return '🎯 Niche (10K-100K)';
                                        case 'viral': return '🔥 Viral (100K-1M)';
                                        case 'mega': return '💥 Mega (1M-10M)';
                                        case 'global': return '🌍 Global (10M+)';
                                        default: return size ? `📏 {size}` : null;
                                      }
                                    })()}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Platform indicator */}
                            {(trend.url || trend.post_url || trend.evidence?.url || trend.platform) && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-blue-600 dark:text-blue-400">
                                  {(() => {
                                    const url = trend.url || trend.post_url || trend.evidence?.url || '';
                                    const platform = trend.platform?.toLowerCase() || '';
                                    if (url.includes('tiktok') || platform === 'tiktok') return '🎵 TikTok';
                                    if (url.includes('instagram') || platform === 'instagram') return '📸 Instagram';
                                    if (url.includes('twitter') || url.includes('x.com') || platform === 'twitter') return '𝕏 Twitter';
                                    if (url.includes('youtube') || platform === 'youtube') return '📺 YouTube';
                                    if (url.includes('reddit') || platform === 'reddit') return '🔥 Reddit';
                                    if (platform) return `📱 {platform}`;
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
                            
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-500">
                              <span className="whitespace-nowrap">{formatTimeAgo(trend.created_at)}</span>
                              {trend.likes_count && trend.likes_count > 0 ? (
                                <span className="whitespace-nowrap">❤️ {formatNumber(trend.likes_count)}</span>
                              ) : null}
                              {trend.views_count && trend.views_count > 0 ? (
                                <span className="whitespace-nowrap">👁 {formatNumber(trend.views_count)}</span>
                              ) : null}
                              {trend.shares_count && trend.shares_count > 0 ? (
                                <span className="whitespace-nowrap">🔄 {formatNumber(trend.shares_count)}</span>
                              ) : null}
                              {trend.comments_count && trend.comments_count > 0 ? (
                                <span className="whitespace-nowrap">💬 {formatNumber(trend.comments_count)}</span>
                              ) : null}
                              {((trend.approve_count || 0) > 0 || (trend.reject_count || 0) > 0) && (
                                <span className="flex items-center gap-1">
                                  {(trend.approve_count || 0) > 0 && (
                                    <span className="text-green-500">👍 {trend.approve_count || 0}</span>
                                  )}
                                  {(trend.approve_count || 0) > 0 && (trend.reject_count || 0) > 0 && (
                                    <span className="text-gray-400">·</span>
                                  )}
                                  {(trend.reject_count || 0) > 0 && (
                                    <span className="text-red-500">👎 {trend.reject_count || 0}</span>
                                  )}
                                </span>
                              )}
                              <span className={`
                                {trend.status === 'viral' ? 'text-red-600' :
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
                          
                          {/* Velocity Indicator - Hidden on mobile, shown on desktop */}
                          <div className="hidden sm:flex flex-col gap-2 min-w-[140px]">
                            {/* Velocity Indicator - Enhanced */}
                            <div className="text-center bg-gradient-to-br from-gray-100 to-gray-50 dark:from-neutral-800 dark:to-neutral-900 rounded-lg px-3 py-2.5 border border-gray-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-shadow">
                              <div className={`text-sm font-bold {getTrendVelocity(trend).color}`}>
                                {getTrendVelocity(trend).label}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-0.5">
                                {getTrendVelocity(trend).metric}
                              </div>
                              {getTrendVelocity(trend).growthRate && (
                                <div className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">
                                  {getTrendVelocity(trend).growthRate}
                                </div>
                              )}
                            </div>
                            
                            {/* Audience Reach - only show if there's meaningful data */}
                            {(() => {
                              const audienceData = getAudienceSize(trend);
                              const hasValidSize = audienceData.size && audienceData.size !== '';
                              const hasValidGrowth = audienceData.growth && audienceData.growth !== '';
                              const hasValidEngagement = audienceData.engagementRate && 
                                                        audienceData.engagementRate !== '' && 
                                                        parseFloat(audienceData.engagementRate) > 0;
                              
                              // Only show if we have actual views or meaningful engagement
                              const hasViewData = trend.views_count && trend.views_count >= 100;
                              const hasEngagementData = (trend.likes_count && trend.likes_count >= 10) || 
                                                       (trend.shares_count && trend.shares_count >= 5);
                              
                              if (!hasViewData && !hasEngagementData) return null;
                              if (!hasValidSize && !hasValidGrowth) return null;
                              
                              return (
                                <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg px-3 py-2 border border-blue-200 dark:border-blue-800">
                                  {hasValidSize && (
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                                      {audienceData.size}
                                    </div>
                                  )}
                                  {hasValidGrowth && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                      {audienceData.growth}
                                    </div>
                                  )}
                                  {hasValidEngagement && (
                                    <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1">
                                      {audienceData.engagementRate}% engaged
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            
                            {/* Validation Count if available - only show if there are actual votes */}
                            {((trend.approve_count ?? 0) > 0 || (trend.reject_count ?? 0) > 0) && (
                              <div className="text-center text-xs text-gray-500">
                                {(trend.approve_count ?? 0) > 0 && <span className="text-green-500">{trend.approve_count ?? 0} 👍</span>}
                                {(trend.approve_count ?? 0) > 0 && (trend.reject_count ?? 0) > 0 && <span className="mx-1">·</span>}
                                {(trend.reject_count ?? 0) > 0 && <span className="text-red-500">{trend.reject_count ?? 0} 👎</span>}
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

          {/* Sidebar with Streak, Notifications, and Tier */}
          <div className="space-y-6 order-1 lg:order-2">
            {/* Streak Display */}
            <div>
              <StreakDisplay />
            </div>
            
            {/* Notifications */}
            <div>
              <NotificationsWindow />
            </div>
            
            {/* XP Level Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-sm text-white cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
              onClick={() => setShowTierModal(true)}
            >
              <div className="p-6 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 backdrop-blur rounded-lg">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Your Level</h3>
                      <p className="text-xs text-white/80">Click to view progression</p>
                    </div>
                  </div>
                  <Info className="w-4 h-4 text-white/60" />
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-2xl font-bold text-white">
                    {(() => {
                      const totalXP = (stats.approved_xp || 0) + (stats.pending_xp || 0);
                      if (isNaN(totalXP) || totalXP < 100) return '🌱 Novice';
                      if (totalXP < 500) return '⚡ Scout';
                      if (totalXP < 1000) return '🔍 Tracker';
                      if (totalXP < 2500) return '📊 Analyst';
                      if (totalXP < 5000) return '🎯 Expert';
                      if (totalXP < 10000) return '🏆 Master';
                      if (totalXP < 25000) return '💎 Elite';
                      return '👑 Legend';
                    })()}
                  </p>
                  <span className="text-2xl">⚡</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80">Total XP</span>
                    <span className="text-white font-medium">{((stats.approved_xp || 0) + (stats.pending_xp || 0)).toLocaleString()}</span>
                  </div>
                  <div className="bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-white h-2 rounded-full transition-all"
                      style={{ 
                        width: `${(() => {
                          const totalXP = (stats.approved_xp || 0) + (stats.pending_xp || 0);
                          if (isNaN(totalXP)) return 0;
                          const levels = [100, 500, 1000, 2500, 5000, 10000, 25000, 50000];
                          const currentLevel = levels.findIndex(l => totalXP < l);
                          if (currentLevel === -1) return 100;
                          const prevThreshold = currentLevel === 0 ? 0 : levels[currentLevel - 1];
                          const nextThreshold = levels[currentLevel];
                          const progress = ((totalXP - prevThreshold) / (nextThreshold - prevThreshold)) * 100;
                          return Math.min(progress, 100);
                        })()}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-white/70 mt-2">
                    {(() => {
                      const totalXP = (stats.approved_xp || 0) + (stats.pending_xp || 0);
                      if (isNaN(totalXP)) return '100 XP to Scout';
                      const levels = [100, 500, 1000, 2500, 5000, 10000, 25000, 50000];
                      const nextLevel = levels.find(l => totalXP < l);
                      if (!nextLevel) return 'Maximum level reached! 🎉';
                      const xpNeeded = nextLevel - totalXP;
                      const nextLevelName = 
                        nextLevel === 100 ? 'Scout' :
                        nextLevel === 500 ? 'Tracker' :
                        nextLevel === 1000 ? 'Analyst' :
                        nextLevel === 2500 ? 'Expert' :
                        nextLevel === 5000 ? 'Master' :
                        nextLevel === 10000 ? 'Elite' :
                        nextLevel === 25000 ? 'Legend' : 'Max';
                      return `${xpNeeded.toLocaleString()} XP to ${nextLevelName}`;
                    })()}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Activity Feed - Enhanced */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Recent Activity</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {activityFeed.length > 0 ? (
                  activityFeed.map((activity) => (
                    <motion.div 
                      key={activity.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-start gap-4 p-4 rounded-lg {
                        activity.status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/10' : 'bg-gray-50 dark:bg-neutral-800'
                      }`}
                    >
                      <div className="text-2xl">{activity.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
                          <span className={`text-sm font-semibold {
                            activity.status === 'pending' ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            +{activity.amount} XP
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
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Daily Streak Stats</h2>
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl mb-2">🔥</div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.current_streak} {stats.current_streak === 1 ? 'Day' : 'Days'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Current Streak</p>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-neutral-800 rounded-lg p-3">
                    <span className="text-gray-600 dark:text-gray-400">Accuracy Rate</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {!isNaN(stats.accuracy_score) && stats.accuracy_score >= 0 ? `${Math.round(stats.accuracy_score)}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-neutral-800 rounded-lg p-3">
                    <span className="text-gray-600 dark:text-gray-400">Trends Verified</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {stats.trends_verified}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-neutral-800 rounded-lg p-3">
                    <span className="text-gray-600 dark:text-gray-400">Success Rate</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {stats.trends_spotted > 0 && !isNaN(stats.trends_verified) && !isNaN(stats.trends_spotted) ? `{Math.round((stats.trends_verified / stats.trends_spotted) * 100)}%` : 'N/A'}
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

            {/* Recent XP */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Recent XP</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Today</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {stats.xp_today} XP
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">This Week</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {stats.xp_this_week} XP
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">This Month</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {stats.xp_this_month} XP
                  </span>
                </div>
                
                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Available</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      {stats.approved_xp} XP
                    </span>
                  </div>
                  {(user?.pending_xp || stats.pending_xp) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
                      <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                        {(user?.pending_xp || stats.pending_xp || 0)} XP
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {stats.approved_xp >= 10 && (
                <Link 
                  href="/xp" 
                  className="mt-4 block w-full bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-900 dark:text-white py-2 px-4 rounded-lg text-center text-sm transition-colors"
                >
                  View XP Details
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Tier Info Modal */}
      <TierInfoModal 
        isOpen={showTierModal}
        onClose={() => setShowTierModal(false)}
        currentXP={(stats.approved_xp || 0) + (stats.pending_xp || 0)}
      />
    </div>
  );
}
