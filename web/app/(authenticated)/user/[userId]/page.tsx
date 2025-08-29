'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigationRefresh } from '@/hooks/useNavigationRefresh';
import { 
  TrendingUp as TrendingUpIcon,
  User as UserIcon,
  Calendar as CalendarIcon,
  Award as AwardIcon,
  Eye as EyeIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Share2 as ShareIcon,
  ExternalLink as ExternalLinkIcon,
  ArrowLeft as ArrowLeftIcon,
  Zap as ZapIcon,
  Clock as ClockIcon,
  Sparkles as SparklesIcon,
  Grid as GridIcon,
  List as ListIcon,
  MapPin as MapPinIcon,
  Briefcase as BriefcaseIcon,
  Filter as FilterIcon,
  RefreshCw as RefreshIcon,
  Users,
  TrendingUp
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  occupation?: string;
  created_at: string;
  performance_tier?: string;
  level?: number;
  level_title?: string;
}

interface UserStats {
  total_trends: number;
  total_xp: number;
  approved_trends: number;
  viral_trends: number;
  approval_rate: number;
  level?: number;
  level_title?: string;
}

interface Trend {
  id: string;
  spotter_id: string;
  category: string;
  description: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  post_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'validating';
  quality_score: number;
  validation_count: number;
  xp_amount: number;
  xp_awarded: boolean;
  created_at: string;
  stage?: string;
  approve_count?: number;
  reject_count?: number;
  validation_status?: string;
  creator_handle?: string;
  creator_name?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  hashtags?: string[];
  wave_score?: number;
  trend_velocity?: string;
  trend_size?: string;
  ai_angle?: string;
  audience_age?: string[];
  category_answers?: any;
  evidence?: any;
}

// Add filter and sort types
type FilterOption = 'all' | 'validating' | 'approved' | 'rejected';
type SortOption = 'newest' | 'oldest' | 'engagement';
type ViewMode = 'grid' | 'list' | 'timeline';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const userId = params?.userId as string;
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userTrends, setUserTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Use navigation refresh hook
  useNavigationRefresh(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  // Listen for XP events to refresh stats in real-time
  useEffect(() => {
    const handleXPEarned = (event: CustomEvent) => {
      // Only refresh if it's for the current viewed user
      if (userId) {
        console.log('XP event detected, refreshing user stats...');
        fetchUserData();
      }
    };

    window.addEventListener('xp-earned', handleXPEarned as EventListener);
    return () => window.removeEventListener('xp-earned', handleXPEarned as EventListener);
  }, [userId]);

  const fetchUserData = async (showRefreshAnimation = false) => {
    try {
      if (showRefreshAnimation) setRefreshing(true);
      setLoading(true);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!profileError && profileData) {
        setUserProfile(profileData);
      }

      // Fetch XP data - try multiple sources for accuracy
      const { data: xpSummary } = await supabase
        .from('user_xp_summary')
        .select('total_xp, level, level_title')
        .eq('user_id', userId)
        .single();

      // Fallback: Get XP from user_xp table if summary doesn't exist
      let totalXP = 0;
      let level = 1;
      let levelTitle = 'Observer';

      if (xpSummary) {
        totalXP = xpSummary.total_xp || 0;
        level = xpSummary.level || 1;
        levelTitle = xpSummary.level_title || 'Observer';
      } else {
        // Try user_xp table as fallback
        const { data: userXP } = await supabase
          .from('user_xp')
          .select('total_xp')
          .eq('user_id', userId)
          .single();
        
        if (userXP) {
          totalXP = userXP.total_xp || 0;
          // Calculate level from XP
          const levelThresholds = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 8000, 10000, 12500, 15000];
          const levelTitles = ['Observer', 'Spotter', 'Tracker', 'Scout', 'Hunter', 'Analyst', 'Expert', 'Master', 'Prophet', 'Oracle', 'Sage', 'Visionary', 'Legend', 'Mythic', 'Eternal', 'Apex'];
          
          for (let i = levelThresholds.length - 1; i >= 0; i--) {
            if (totalXP >= levelThresholds[i]) {
              level = i + 1;
              levelTitle = levelTitles[i] || 'Observer';
              break;
            }
          }
        }
      }

      // Fetch user trends
      const { data: trendsData, error: trendsError } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('spotter_id', userId)
        .order('created_at', { ascending: false });

      if (!trendsError && trendsData) {
        setUserTrends(trendsData);
        
        // Calculate stats with proper status checking
        // Validated includes: 'validated', 'approved' (for backwards compat), 'trending', 'viral', 'peaked'
        const validatedStatuses = ['validated', 'approved', 'trending', 'viral', 'peaked'];
        const approvedTrends = trendsData.filter(t => 
          validatedStatuses.includes(t.status) || 
          (t.validation_count >= 3 && t.approve_count > t.reject_count)
        ).length;
        
        const viralTrends = trendsData.filter(t => 
          t.stage === 'viral' || 
          t.wave_score >= 80 ||
          (t.views_count && t.views_count > 100000)
        ).length;
        
        // Calculate approval rate
        const validatedTrends = trendsData.filter(t => 
          t.status !== 'submitted' && t.status !== 'validating'
        ).length;
        
        const approvalRate = validatedTrends > 0 
          ? Math.round((approvedTrends / validatedTrends) * 100)
          : 0;
        
        setUserStats({
          total_trends: trendsData.length,
          total_xp: totalXP,
          approved_trends: approvedTrends,
          viral_trends: viralTrends,
          approval_rate: approvalRate,
          level: level,
          level_title: levelTitle
        });

        console.log('📊 User Stats Calculated:', {
          userId,
          totalTrends: trendsData.length,
          approvedTrends,
          viralTrends,
          approvalRate,
          totalXP,
          level,
          levelTitle
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
      if (showRefreshAnimation) {
        setTimeout(() => setRefreshing(false), 500);
      }
    }
  };

  // Filter and sort trends
  const getFilteredAndSortedTrends = () => {
    let filtered = userTrends;
    
    // Apply filter
    if (filter !== 'all') {
      filtered = userTrends.filter(trend => trend.status === filter);
    }
    
    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'engagement':
          const engagementA = (a.likes_count || 0) + (a.comments_count || 0) + (a.shares_count || 0);
          const engagementB = (b.likes_count || 0) + (b.comments_count || 0) + (b.shares_count || 0);
          return engagementB - engagementA;
        default:
          return 0;
      }
    });
    
    return sorted;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
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

  const formatEngagement = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getCategoryEmoji = (category: string) => {
    const emojiMap: Record<string, string> = {
      // Old categories (for backwards compatibility)
      'visual_style': '🎨',
      'audio_music': '🎵',
      'creator_technique': '🎬',
      'meme_format': '😂',
      'product_brand': '🛍️',
      'behavior_pattern': '📊',
      // New categories
      'meme': '😂',
      'fashion': '👗',
      'food': '🍔',
      'music': '🎵',
      'lifestyle': '🏡',
      'tech': '🎮',
      'finance': '💰',
      'sports': '⚽',
      'political': '⚖️',
      'cars': '🚗',
      'animals': '🐾',
      'travel': '✈️',
      'education': '📚',
      'health': '💊',
      'product': '🛍️'
    };
    return emojiMap[category] || '📌';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated': return 'from-green-500 to-emerald-600';
      case 'approved': return 'from-green-500 to-emerald-600'; // backwards compat
      case 'rejected': return 'from-red-500 to-rose-600';
      case 'validating': return 'from-yellow-500 to-amber-600';
      case 'submitted': return 'from-blue-500 to-blue-600';
      default: return 'from-gray-500 to-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated': return <SparklesIcon className="w-4 h-4" />;
      case 'approved': return <SparklesIcon className="w-4 h-4" />; // backwards compat
      case 'rejected': return <ClockIcon className="w-4 h-4" />;
      case 'validating': return <EyeIcon className="w-4 h-4" />;
      case 'submitted': return <TrendingUpIcon className="w-4 h-4" />;
      default: return <TrendingUpIcon className="w-4 h-4" />;
    }
  };

  const getTrendVelocity = (trend: Trend) => {
    if (trend.trend_velocity) return trend.trend_velocity;
    
    if (trend.stage === 'viral') return 'viral';
    if (trend.stage === 'declining') return 'declining';
    if (trend.stage === 'peaked') return 'peaked';
    if (trend.stage === 'trending' || (trend.wave_score && trend.wave_score >= 7)) return 'picking_up';
    if (trend.stage === 'submitted' || trend.stage === 'validating') return 'just_starting';
    
    const score = trend.wave_score || 5;
    if (score >= 8) return 'viral';
    if (score >= 6) return 'picking_up';
    return 'just_starting';
  };

  const getVelocityDisplay = (velocity: string) => {
    switch (velocity) {
      case 'just_starting': return { text: '🚀 Just Starting', color: 'text-blue-600' };
      case 'picking_up': return { text: '📈 Picking Up', color: 'text-green-600' };
      case 'viral': return { text: '🔥 Going Viral', color: 'text-red-600' };
      case 'peaked': return { text: '⚡ Peaked', color: 'text-purple-600' };
      case 'declining': return { text: '📉 Declining', color: 'text-orange-600' };
      default: return { text: '📊 Tracking', color: 'text-gray-600' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <TrendingUpIcon className="w-12 h-12 text-blue-600" />
        </motion.div>
      </div>
    );
  }

  const filteredTrends = getFilteredAndSortedTrends();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <button
              onClick={() => router.back()}
              className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back
            </button>

            {/* User Profile Header */}
            <div className="flex items-start gap-6 mb-6">
              <div className="relative">
                {userProfile?.avatar_url ? (
                  <img 
                    src={userProfile.avatar_url} 
                    alt={userProfile.username || 'User'}
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center border-4 border-white shadow-lg">
                    <UserIcon className="w-12 h-12 text-white" />
                  </div>
                )}
                {userStats && userStats.level && userStats.level > 1 && (
                  <div className="absolute -bottom-2 -right-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white">
                    Lvl {userStats.level}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {userProfile?.full_name || userProfile?.username || 'Anonymous User'}
                  </h1>
                  {userStats?.level_title && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      {userStats.level_title}
                    </span>
                  )}
                </div>
                {userProfile?.username && (
                  <p className="text-gray-600 mb-2">@{userProfile.username}</p>
                )}
                {userProfile?.bio && (
                  <p className="text-gray-700 mb-3">{userProfile.bio}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {userProfile?.location && (
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="w-4 h-4" />
                      <span>{userProfile.location}</span>
                    </div>
                  )}
                  {userProfile?.occupation && (
                    <div className="flex items-center gap-1">
                      <BriefcaseIcon className="w-4 h-4" />
                      <span>{userProfile.occupation}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Joined {new Date(userProfile?.created_at || '').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fetchUserData(true)}
                  disabled={refreshing}
                  className="p-3 rounded-xl bg-white hover:bg-gray-50 backdrop-blur-md transition-all duration-300 border border-gray-200 shadow-sm"
                >
                  <RefreshIcon className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
                </motion.button>

                {currentUser?.id === userId && (
                  <button
                    onClick={() => router.push('/profile')}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Stats Overview */}
            {userStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white/80 backdrop-blur-md rounded-xl p-4 border border-gray-200 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 text-sm">Total Trends</span>
                    <TrendingUpIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{userStats.total_trends}</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/80 backdrop-blur-md rounded-xl p-4 border border-gray-200 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 text-sm">Total XP</span>
                    <ZapIcon className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">
                    {userStats.total_xp.toLocaleString()} XP
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/80 backdrop-blur-md rounded-xl p-4 border border-gray-200 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 text-sm">Approved</span>
                    <SparklesIcon className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">
                    {userStats.approved_trends}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/80 backdrop-blur-md rounded-xl p-4 border border-gray-200 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 text-sm">Approval Rate</span>
                    <AwardIcon className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">
                    {userStats.total_trends > 0 ? `${userStats.approval_rate}%` : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {userStats.approved_trends} approved
                  </p>
                </motion.div>
              </div>
            )}

            {/* Controls Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* View Mode Selector */}
                <div className="flex bg-white/80 backdrop-blur-md rounded-lg p-1 border border-gray-200 shadow-sm">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'grid' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <GridIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'list' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ListIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'timeline' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 transition-all text-gray-700"
                >
                  <FilterIcon className="w-4 h-4" />
                  <span className="text-sm">Filters</span>
                  {filter !== 'all' && (
                    <span className="px-2 py-0.5 bg-blue-500 rounded-full text-xs text-white">1</span>
                  )}
                </button>
              </div>

              <div className="text-sm text-gray-600">
                {filteredTrends.length} {filteredTrends.length === 1 ? 'trend' : 'trends'}
              </div>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Status Filter</label>
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as FilterOption)}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="all">All Status</option>
                      <option value="validating">Validating</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="engagement">Most Engagement</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredTrends.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-6">
              <TrendingUpIcon className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {filter === 'all' ? 'No trends yet' : `No ${filter} trends`}
            </h3>
            <p className="text-gray-600">
              {currentUser?.id === userId 
                ? 'Start spotting trends to see them here!' 
                : 'This user hasn\'t spotted any trends yet'}
            </p>
          </motion.div>
        ) : (
          <>
            {/* Grid View - I'll add just the structure, the full implementation would be the same as timeline */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredTrends.map((trend, index) => (
                    <motion.div
                      key={trend.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -5 }}
                      className="group relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="relative bg-white/95 backdrop-blur-md rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 transition-all duration-300">
                        {/* Thumbnail if available */}
                        {(trend.thumbnail_url || trend.screenshot_url) && (
                          <div className="relative h-48 overflow-hidden bg-gray-100">
                            <img 
                              src={trend.thumbnail_url || trend.screenshot_url}
                              alt={trend.description || 'Trend'}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-3 right-3">
                              <div className={`px-2.5 py-1 bg-gradient-to-r ${getStatusColor(trend.status)} rounded-full text-white text-xs font-semibold shadow-lg flex items-center gap-1`}>
                                {getStatusIcon(trend.status)}
                                <span className="capitalize">{trend.status}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Trend Details */}
                        <div className="p-5">
                          {/* Title and Category */}
                          <div className="mb-3">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-2">
                              {trend.description || 'Untitled Trend'}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span>{getCategoryEmoji(trend.category)}</span>
                              <span className="capitalize">{trend.category.replace(/_/g, ' ')}</span>
                              <span>•</span>
                              <span>{formatDate(trend.created_at)}</span>
                            </div>
                          </div>

                          {/* Velocity and Size */}
                          {(trend.trend_velocity || trend.trend_size) && (
                            <div className="flex gap-2 mb-3">
                              {trend.trend_velocity && (
                                <div className={`px-2 py-1 rounded-md text-xs font-medium ${getVelocityDisplay(trend.trend_velocity).color} bg-gray-50`}>
                                  {getVelocityDisplay(trend.trend_velocity).text}
                                </div>
                              )}
                              {trend.trend_size && (
                                <div className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
                                  {trend.trend_size === 'micro' ? '🔬 Micro' :
                                   trend.trend_size === 'niche' ? '🎯 Niche' :
                                   trend.trend_size === 'viral' ? '🔥 Viral' :
                                   trend.trend_size === 'mega' ? '💥 Mega' :
                                   trend.trend_size === 'global' ? '🌍 Global' : '📏 ' + trend.trend_size}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Engagement Stats */}
                          {(trend.views_count || trend.likes_count || trend.comments_count) && (
                            <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
                              {trend.views_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <EyeIcon className="w-3 h-3" />
                                  <span>{formatEngagement(trend.views_count)}</span>
                                </div>
                              )}
                              {trend.likes_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <HeartIcon className="w-3 h-3" />
                                  <span>{formatEngagement(trend.likes_count)}</span>
                                </div>
                              )}
                              {trend.comments_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <MessageCircleIcon className="w-3 h-3" />
                                  <span>{formatEngagement(trend.comments_count)}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Creator Info */}
                          {trend.creator_handle && (
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Users className="w-3 h-3" />
                                <span>@{trend.creator_handle.replace('@', '')}</span>
                              </div>
                              {trend.post_url && (
                                <a 
                                  href={trend.post_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-600"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLinkIcon className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Status Badge if no thumbnail */}
                          {!trend.thumbnail_url && !trend.screenshot_url && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className={`inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r ${getStatusColor(trend.status)} rounded-full text-white text-xs font-semibold`}>
                                {getStatusIcon(trend.status)}
                                <span className="capitalize">{trend.status}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* List View - Enhanced with details */}
            {viewMode === 'list' && (
              <div className="space-y-4">
                {filteredTrends.map((trend, index) => (
                  <motion.div
                    key={trend.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white/95 backdrop-blur-md rounded-xl border border-gray-200 hover:border-gray-300 transition-all overflow-hidden"
                  >
                    <div className="flex">
                      {/* Thumbnail */}
                      {(trend.thumbnail_url || trend.screenshot_url) && (
                        <div className="w-48 h-32 flex-shrink-0 bg-gray-100">
                          <img 
                            src={trend.thumbnail_url || trend.screenshot_url}
                            alt={trend.description || 'Trend'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      {/* Content */}
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                              {trend.description || 'Untitled Trend'}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                              <span>{getCategoryEmoji(trend.category)} {trend.category.replace(/_/g, ' ')}</span>
                              <span>•</span>
                              <span>{formatDate(trend.created_at)}</span>
                              {trend.creator_handle && (
                                <>
                                  <span>•</span>
                                  <span>@{trend.creator_handle.replace('@', '')}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className={`px-3 py-1.5 bg-gradient-to-r ${getStatusColor(trend.status)} rounded-full text-white text-xs font-semibold flex items-center gap-1`}>
                            {getStatusIcon(trend.status)}
                            <span className="capitalize">{trend.status}</span>
                          </div>
                        </div>

                        {/* Metadata Row */}
                        <div className="flex flex-wrap items-center gap-3">
                          {trend.trend_velocity && (
                            <div className={`px-2 py-1 rounded-md text-xs font-medium ${getVelocityDisplay(trend.trend_velocity).color} bg-gray-50`}>
                              {getVelocityDisplay(trend.trend_velocity).text}
                            </div>
                          )}
                          
                          {/* Engagement Stats */}
                          {(trend.views_count || trend.likes_count || trend.comments_count) && (
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                              {trend.views_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <EyeIcon className="w-3 h-3" />
                                  <span>{formatEngagement(trend.views_count)}</span>
                                </div>
                              )}
                              {trend.likes_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <HeartIcon className="w-3 h-3" />
                                  <span>{formatEngagement(trend.likes_count)}</span>
                                </div>
                              )}
                              {trend.comments_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <MessageCircleIcon className="w-3 h-3" />
                                  <span>{formatEngagement(trend.comments_count)}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* XP Awarded */}
                          {trend.xp_awarded && trend.xp_amount > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-medium">
                              <ZapIcon className="w-3 h-3" />
                              <span>+{trend.xp_amount} XP</span>
                            </div>
                          )}

                          {/* External Link */}
                          {trend.post_url && (
                            <a 
                              href={trend.post_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-500 hover:text-blue-600 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLinkIcon className="w-3 h-3" />
                              <span>View Post</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Timeline View - simplified */}
            {viewMode === 'timeline' && (
              <div className="relative">
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-600">Timeline view of {userProfile?.username || 'user'}\'s trends</p>
                </div>
                {/* Timeline implementation would go here - same as timeline page */}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}