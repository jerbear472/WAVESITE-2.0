'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import TrendSubmissionForm from '@/components/TrendSubmissionFormEnhanced';
import { TrendSubmissionService } from '@/services/TrendSubmissionService';
import { FallbackSubmission } from '@/services/FallbackSubmission';
import { useToast } from '@/contexts/ToastContext';
import { fetchUserTrends as fetchUserTrendsHelper } from '@/hooks/useAuthenticatedSupabase';
import { formatEarnings, getEarningStatusDisplay } from '@/lib/EARNINGS_STANDARD';
import { getProxiedImageUrl } from '@/lib/imageProxy';
import { 
  TrendingUp as TrendingUpIcon,
  Clock as ClockIcon,
  Eye as EyeIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Share2 as ShareIcon,
  DollarSign as DollarSignIcon,
  Hash as HashIcon,
  Calendar as CalendarIcon,
  Filter as FilterIcon,
  Grid as GridIcon,
  List as ListIcon,
  Plus as PlusIcon,
  RefreshCw as RefreshIcon,
  Sparkles as SparklesIcon,
  BarChart as BarChartIcon,
  Award as AwardIcon,
  ExternalLink as ExternalLinkIcon,
  User as UserIcon,
  Zap as ZapIcon
} from 'lucide-react';

interface Trend {
  id: string;
  spotter_id: string;
  category: string;
  description: string;
  screenshot_url?: string;
  evidence?: any;
  virality_prediction?: number;
  predicted_peak_date?: string;
  status: 'pending' | 'approved' | 'rejected' | 'viral';
  quality_score: number;
  validation_count: number;
  bounty_amount: number;
  bounty_paid: boolean;
  created_at: string;
  validated_at?: string;
  mainstream_at?: string;
  // Enhanced fields
  stage?: 'submitted' | 'validating' | 'trending' | 'viral' | 'peaked' | 'declining' | 'auto_rejected';
  trend_momentum_score?: number;
  positive_validations?: number;
  negative_validations?: number;
  // New validation system fields
  approve_count?: number;
  reject_count?: number;
  validation_status?: 'pending' | 'approved' | 'rejected';
  // Social media metadata
  creator_handle?: string;
  creator_name?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  hashtags?: string[];
  post_url?: string;
  thumbnail_url?: string;
  posted_at?: string;
  wave_score?: number;
  trend_velocity?: 'just_starting' | 'picking_up' | 'viral' | 'peaked' | 'declining';
}

// Add new types for filtering and sorting
type FilterOption = 'all' | 'submitted' | 'validating' | 'approved' | 'viral' | 'rejected';
type SortOption = 'newest' | 'oldest' | 'engagement' | 'virality';
type ViewMode = 'grid' | 'list' | 'timeline';

export default function Timeline() {
  const { user, loading: authLoading } = useAuth();
  const { showError, showSuccess, showWarning } = useToast();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchUserTrends();
      
      // Set up real-time subscription for new trends
      const subscription = supabase
        .channel('user-trends')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trend_submissions',
            filter: `spotter_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Real-time update:', payload);
            fetchUserTrends();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, authLoading, router]);

  const fetchUserTrends = async (showRefreshAnimation = false) => {
    try {
      if (showRefreshAnimation) setRefreshing(true);
      setError(null);
      setLoading(true);
      
      // Ensure we have the current user
      if (!user?.id) {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          router.push('/login');
          return;
        }
      }

      const userId = user?.id || '';
      console.log('Timeline: Fetching trends for user ID:', userId);
      
      // Use the helper function that handles RLS issues
      const { data, error } = await fetchUserTrendsHelper(userId);

      if (error) {
        showError('Failed to load trends', error.message || 'Unknown error');
        setError('Failed to load trends');
        
        // Log more details for debugging
        console.error('Trend fetch error details:', {
          error,
          userId,
          isAuthenticated: !!user,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      console.log('Timeline: Found trends:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('Timeline: Latest trend:', data[0]);
        console.log('Timeline: First trend thumbnail_url:', data[0].thumbnail_url);
        console.log('Timeline: First trend screenshot_url:', data[0].screenshot_url);
        console.log('Timeline: First trend post_url:', data[0].post_url);
        console.log('Timeline: First trend wave_score:', data[0].wave_score);
      }
      setTrends(data || []);

      // Fetch total earnings from earnings_ledger
      const { data: earningsData, error: earningsError } = await supabase
        .from('earnings_ledger')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'approved');

      if (!earningsError && earningsData) {
        const total = earningsData.reduce((sum, earning) => sum + (earning.amount || 0), 0);
        setTotalEarnings(total);
      }
    } catch (error: any) {
      showError('An unexpected error occurred', 'Please refresh the page');
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
      if (showRefreshAnimation) {
        setTimeout(() => setRefreshing(false), 500);
      }
    }
  };

  // Filter and sort trends
  const getFilteredAndSortedTrends = () => {
    let filtered = trends;
    
    // Apply filter
    if (filter !== 'all') {
      filtered = trends.filter(trend => trend.status === filter);
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
        case 'virality':
          return (b.virality_prediction || 0) - (a.virality_prediction || 0);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'from-green-500 to-emerald-600';
      case 'viral': return 'from-purple-500 to-pink-600';
      case 'rejected': return 'from-red-500 to-rose-600';
      case 'validating': return 'from-yellow-500 to-amber-600';
      default: return 'from-gray-500 to-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <SparklesIcon className="w-4 h-4" />;
      case 'viral': return <ZapIcon className="w-4 h-4" />;
      case 'rejected': return <ClockIcon className="w-4 h-4" />;
      case 'validating': return <EyeIcon className="w-4 h-4" />;
      default: return <TrendingUpIcon className="w-4 h-4" />;
    }
  };

  const getTrendVelocity = (trend: Trend) => {
    // Determine velocity based on stage, status, or other metrics
    if (trend.trend_velocity) return trend.trend_velocity;
    
    if (trend.stage === 'viral' || trend.status === 'viral') return 'viral';
    if (trend.stage === 'declining') return 'declining';
    if (trend.stage === 'peaked') return 'peaked';
    if (trend.stage === 'trending' || (trend.wave_score && trend.wave_score >= 7)) return 'picking_up';
    if (trend.stage === 'submitted' || trend.stage === 'validating') return 'just_starting';
    
    // Fallback based on score
    const score = trend.wave_score || trend.virality_prediction || 5;
    if (score >= 8) return 'viral';
    if (score >= 6) return 'picking_up';
    return 'just_starting';
  };

  const getVelocityDisplay = (velocity: string) => {
    switch (velocity) {
      case 'just_starting': return { text: '🚀 Just Starting', color: 'text-blue-400' };
      case 'picking_up': return { text: '📈 Picking Up', color: 'text-green-400' };
      case 'viral': return { text: '🔥 Going Viral', color: 'text-red-400' };
      case 'peaked': return { text: '⚡ Peaked', color: 'text-purple-400' };
      case 'declining': return { text: '📉 Declining', color: 'text-orange-400' };
      default: return { text: '📊 Tracking', color: 'text-gray-400' };
    }
  };

  const getCategoryEmoji = (category: string) => {
    const emojiMap: Record<string, string> = {
      'visual_style': '🎨',
      'audio_music': '🎵',
      'creator_technique': '🎬',
      'meme_format': '😂',
      'product_brand': '🛍️',
      'behavior_pattern': '📊'
    };
    return emojiMap[category] || '📌';
  };

  const getStageInfo = (stage: string) => {
    switch (stage) {
      case 'submitted':
        return { text: 'Just Starting', icon: '🌱', color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
      case 'validating':
        return { text: 'Gaining Traction', icon: '📈', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
      case 'trending':
        return { text: 'Trending', icon: '🔥', color: 'text-green-400', bgColor: 'bg-green-500/20' };
      case 'viral':
        return { text: 'Going Viral!', icon: '🚀', color: 'text-red-400', bgColor: 'bg-red-500/20' };
      case 'peaked':
        return { text: 'At Peak', icon: '⭐', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
      case 'declining':
        return { text: 'Declining', icon: '📉', color: 'text-orange-400', bgColor: 'bg-orange-500/20' };
      case 'auto_rejected':
        return { text: 'Rejected', icon: '❌', color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
      default:
        return { text: 'Unknown', icon: '❓', color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
    }
  };

  const getCreatorProfileUrl = (platform: string, handle: string) => {
    // Clean the handle - remove @ if present
    const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
    
    switch(platform?.toLowerCase()) {
      case 'tiktok':
        return `https://www.tiktok.com/@${cleanHandle}`;
      case 'instagram':
        return `https://www.instagram.com/${cleanHandle}`;
      case 'youtube':
        return `https://www.youtube.com/@${cleanHandle}`;
      case 'twitter':
      case 'x':
        return `https://x.com/${cleanHandle}`;
      default:
        return '#';
    }
  };

  const handleTrendSubmit = async (trendData: any) => {
    console.log('Starting trend submission with data:', trendData);
    
    // Ensure user is authenticated
    if (!user?.id) {
      showError('Authentication Required', 'Please log in to submit trends');
      return;
    }

    try {
      // Use the submission service
      const submissionService = TrendSubmissionService.getInstance();
      const result = await submissionService.submitTrend(trendData, user.id);
      
      if (result.success) {
        // Close form and refresh trends
        setShowSubmitForm(false);
        await fetchUserTrends();
        
        // Show success message
        showSuccess('Trend submitted successfully!', 'Your trend is now being processed');
        setError('');
        return result.data;
      } else {
        // Handle failure - try fallback if it's a service error
        if (result.error?.includes('temporarily unavailable') || 
            result.error?.includes('timeout')) {
          console.log('Main service failed, trying fallback...');
          showWarning('Using backup submission method', 'Some features may be limited');
          
          const fallbackResult = await FallbackSubmission.submit(trendData, user.id);
          
          if (fallbackResult.success) {
            setShowSubmitForm(false);
            await fetchUserTrends();
            showSuccess('Trend submitted via backup!', 'Your trend was saved successfully');
            setError('');
            return fallbackResult.data;
          } else {
            setError(fallbackResult.error || 'Both submission methods failed');
            showError('Submission failed completely', fallbackResult.error || 'Please try again later');
          }
        } else {
          // Non-recoverable error (like duplicate)
          setError(result.error || 'Failed to submit trend');
          showError('Submission failed', result.error || 'Please try again');
        }
      }
    } catch (error: any) {
      // If main service throws, try fallback
      console.error('Main service error:', error);
      console.log('Attempting fallback submission...');
      
      try {
        const fallbackResult = await FallbackSubmission.submit(trendData, user.id);
        
        if (fallbackResult.success) {
          setShowSubmitForm(false);
          await fetchUserTrends();
          showSuccess('Trend submitted via backup!', 'Your trend was saved successfully');
          setError('');
          return fallbackResult.data;
        } else {
          throw new Error(fallbackResult.error || 'Fallback also failed');
        }
      } catch (fallbackError: any) {
        const errorMessage = fallbackError.message || 'All submission methods failed';
        setError(errorMessage);
        showError('Critical submission error', errorMessage);
      }
    }
  };

  if (authLoading || (loading && trends.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <TrendingUpIcon className="w-12 h-12 text-blue-400" />
        </motion.div>
      </div>
    );
  }

  const filteredTrends = getFilteredAndSortedTrends();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-gray-900/80 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-200 to-blue-400 bg-clip-text text-transparent">
                  Trend Timeline
                </h1>
                <p className="text-gray-400 mt-1">Track your spotted trends and earnings</p>
              </div>
              
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fetchUserTrends(true)}
                  disabled={refreshing}
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all duration-300 border border-white/10"
                >
                  <RefreshIcon className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSubmitForm(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>New Trend</span>
                </motion.button>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Total Trends</span>
                  <TrendingUpIcon className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-white">{trends.length}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Total Earnings</span>
                  <DollarSignIcon className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatEarnings(totalEarnings)}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Approved</span>
                  <SparklesIcon className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {trends.filter(t => t.status === 'approved' || t.status === 'viral').length}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Avg Score</span>
                  <BarChartIcon className="w-4 h-4 text-yellow-400" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {trends.length > 0 ? (trends.reduce((sum, t) => sum + (t.virality_prediction || 0), 0) / trends.length).toFixed(1) : '0'}
                </p>
              </motion.div>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* View Mode Selector */}
                <div className="flex bg-white/5 backdrop-blur-md rounded-lg p-1 border border-white/10">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'grid' 
                        ? 'bg-white/20 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <GridIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'list' 
                        ? 'bg-white/20 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <ListIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`p-2 rounded-md transition-all ${
                      viewMode === 'timeline' 
                        ? 'bg-white/20 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md rounded-lg border border-white/10 hover:bg-white/10 transition-all"
                >
                  <FilterIcon className="w-4 h-4" />
                  <span className="text-sm">Filters</span>
                  {filter !== 'all' && (
                    <span className="px-2 py-0.5 bg-blue-600 rounded-full text-xs">1</span>
                  )}
                </button>
              </div>

              <div className="text-sm text-gray-400">
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
                    <label className="text-sm text-gray-400 mb-2 block">Status Filter</label>
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as FilterOption)}
                      className="w-full px-4 py-2 bg-white/5 backdrop-blur-md rounded-lg border border-white/10 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="submitted">Submitted</option>
                      <option value="validating">Validating</option>
                      <option value="approved">Approved</option>
                      <option value="viral">Viral</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="w-full px-4 py-2 bg-white/5 backdrop-blur-md rounded-lg border border-white/10 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="engagement">Most Engagement</option>
                      <option value="virality">Highest Virality</option>
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
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full mb-6">
              <TrendingUpIcon className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {filter === 'all' ? 'No trends yet' : `No ${filter} trends`}
            </h3>
            <p className="text-gray-400 mb-6">
              {filter === 'all' 
                ? 'Start spotting trends to see them here!' 
                : 'Try changing your filters or submit new trends'}
            </p>
            <button
              onClick={() => setShowSubmitForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Submit Your First Trend
            </button>
          </motion.div>
        ) : (
          <>
            {/* Grid View */}
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
                      
                      <div className="relative bg-gray-900/80 backdrop-blur-md rounded-2xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-all duration-300">
                        {/* Thumbnail */}
                        <div className="relative h-48 bg-gray-800 overflow-hidden">
                          {(trend.thumbnail_url || trend.screenshot_url || trend.post_url) ? (
                            <>
                              <img 
                                src={trend.thumbnail_url || trend.screenshot_url || ''}
                                alt="Trend"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                onError={(e) => {
                                  const target = e.currentTarget as HTMLImageElement;
                                  // Try YouTube thumbnail if it's a YouTube URL
                                  if (trend.post_url && trend.post_url.includes('youtube')) {
                                    const match = trend.post_url.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                                    if (match && match[1]) {
                                      target.src = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
                                      return;
                                    }
                                  }
                                  // Otherwise hide and show placeholder
                                  target.style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-60" />
                            </>
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-900/50 to-purple-900/50 flex items-center justify-center">
                              <TrendingUpIcon className="w-16 h-16 text-gray-600" />
                            </div>
                          )}
                            
                            {/* Status Badge with Stage */}
                            <div className="absolute top-3 right-3 space-y-2">
                              <div className={`flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r ${getStatusColor(trend.status)} rounded-full text-white text-xs font-semibold shadow-lg`}>
                                {getStatusIcon(trend.status)}
                                <span className="capitalize">{trend.status}</span>
                              </div>
                              {trend.stage && (
                                <div className={`flex items-center gap-1 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-xs font-medium shadow-lg ${
                                  trend.stage === 'viral' ? 'text-red-400' :
                                  trend.stage === 'trending' ? 'text-green-400' :
                                  trend.stage === 'validating' ? 'text-blue-400' :
                                  trend.stage === 'declining' ? 'text-orange-400' :
                                  'text-gray-400'
                                }`}>
                                  <ZapIcon className="w-3 h-3" />
                                  <span>
                                    {trend.stage === 'submitted' ? 'Just Starting' :
                                     trend.stage === 'validating' ? 'Gaining Traction' :
                                     trend.stage === 'trending' ? 'Trending' :
                                     trend.stage === 'viral' ? 'Going Viral!' :
                                     trend.stage === 'peaked' ? 'At Peak' :
                                     trend.stage === 'declining' ? 'Declining' :
                                     trend.stage}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Category Badge */}
                            <div className="absolute bottom-3 left-3">
                              <div className="flex items-center gap-1 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full text-white text-xs">
                                <span className="text-base">{getCategoryEmoji(trend.category)}</span>
                                <span>{trend.category.replace(/_/g, ' ')}</span>
                              </div>
                            </div>

                            {/* External Link */}
                            {trend.post_url && (
                              <a 
                                href={trend.post_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-3 left-3 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-all"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLinkIcon className="w-4 h-4" />
                              </a>
                            )}
                          </div>

                        <div className="p-6">
                          {/* Creator Info */}
                          {(trend.creator_handle || trend.creator_name) && (
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                <UserIcon className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                {trend.creator_handle && trend.evidence?.platform ? (
                                  <a 
                                    href={getCreatorProfileUrl(trend.evidence.platform, trend.creator_handle)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-white hover:text-blue-400 truncate block transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {trend.creator_handle}
                                  </a>
                                ) : (
                                  <p className="text-sm font-medium text-white truncate">
                                    {trend.creator_handle || trend.creator_name}
                                  </p>
                                )}
                                <p className="text-xs text-gray-400" title={formatFullDate(trend.created_at)}>
                                  📅 {formatFullDate(trend.created_at)}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Title from description */}
                          <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                            {trend.evidence?.title || trend.description.split('\n')[0]}
                          </h3>

                          {/* Caption */}
                          {trend.post_caption && (
                            <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                              "{trend.post_caption}"
                            </p>
                          )}

                          {/* Engagement Stats - Only show if has values */}
                          {(trend.likes_count > 0 || trend.comments_count > 0 || trend.shares_count > 0 || trend.views_count > 0) && (
                            <div className="flex items-center gap-4 mb-4">
                              {trend.likes_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <HeartIcon className="w-4 h-4 text-red-400" />
                                  <p className="text-xs text-gray-400">{formatEngagement(trend.likes_count)}</p>
                                </div>
                              )}
                              {trend.comments_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <MessageCircleIcon className="w-4 h-4 text-blue-400" />
                                  <p className="text-xs text-gray-400">{formatEngagement(trend.comments_count)}</p>
                                </div>
                              )}
                              {trend.shares_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <ShareIcon className="w-4 h-4 text-green-400" />
                                  <p className="text-xs text-gray-400">{formatEngagement(trend.shares_count)}</p>
                                </div>
                              )}
                              {trend.views_count > 0 && (
                                <div className="flex items-center gap-1">
                                  <EyeIcon className="w-4 h-4 text-purple-400" />
                                  <p className="text-xs text-gray-400">{formatEngagement(trend.views_count)}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Hashtags */}
                          {trend.hashtags && trend.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {trend.hashtags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
                                  #{tag}
                                </span>
                              ))}
                              {trend.hashtags.length > 3 && (
                                <span className="text-xs text-gray-500">+{trend.hashtags.length - 3}</span>
                              )}
                            </div>
                          )}

                          {/* Bottom Stats */}
                          <div className="pt-4 border-t border-gray-800 space-y-3">
                            {/* Stats Row */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <BarChartIcon className="w-4 h-4 text-yellow-400" />
                                  <span className="text-xs text-gray-400">Wave Score: {trend.wave_score || 50}/100</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={`text-xs font-medium ${getVelocityDisplay(getTrendVelocity(trend)).color}`}>
                                    {getVelocityDisplay(getTrendVelocity(trend)).text}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <AwardIcon className="w-4 h-4 text-blue-400" />
                                  <span className="text-xs text-gray-400">
                                    Votes: {trend.approve_count || 0}👍 {trend.reject_count || 0}👎
                                  </span>
                                  {/* Validation Status Indicator */}
                                  {trend.validation_status && (
                                    <div className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                                      trend.validation_status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                      trend.validation_status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                      'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                      {trend.validation_status === 'approved' ? '✅ Paid' :
                                       trend.validation_status === 'rejected' ? '❌ Rejected' :
                                       '⏳ Pending'}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {trend.bounty_amount > 0 && (
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  trend.bounty_paid 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  <DollarSignIcon className="w-3 h-3" />
                                  <span>{formatEarnings(trend.bounty_amount || 0)}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Marketing Tags */}
                            {(trend.evidence?.categories?.length > 0 || trend.evidence?.moods?.length > 0) && (
                              <div className="flex flex-wrap gap-1">
                                {trend.evidence?.categories?.map((cat: string, i: number) => (
                                  <span key={`cat-${i}`} className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">
                                    {cat}
                                  </span>
                                ))}
                                {trend.evidence?.moods?.map((mood: string, i: number) => (
                                  <span key={`mood-${i}`} className="text-xs px-2 py-1 bg-pink-500/10 text-pink-400 rounded-full border border-pink-500/20">
                                    {mood}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {filteredTrends.map((trend, index) => (
                    <motion.div
                      key={trend.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="group"
                    >
                      <div className="relative bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-800 p-6 hover:border-gray-700 transition-all duration-300">
                        <div className="flex items-start gap-4">
                          {/* Thumbnail */}
                          {(trend.thumbnail_url || trend.screenshot_url) && (
                            <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                              <img 
                                src={trend.thumbnail_url || trend.screenshot_url || ''} 
                                alt="Trend"
                                className="w-full h-full object-cover"
                              />
                              {trend.post_url && (
                                <a 
                                  href={trend.post_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                  <ExternalLinkIcon className="w-6 h-6 text-white" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-semibold text-white mb-1">
                                  {trend.evidence?.title || trend.description.split('\n')[0]}
                                </h3>
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <span>{getCategoryEmoji(trend.category)}</span>
                                    {trend.category.replace(/_/g, ' ')}
                                  </span>
                                  {(trend.creator_handle || trend.creator_name) && (
                                    <span className="flex items-center gap-1">
                                      <UserIcon className="w-3 h-3" />
                                      {trend.creator_handle && trend.evidence?.platform ? (
                                        <a 
                                          href={getCreatorProfileUrl(trend.evidence.platform, trend.creator_handle)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="hover:text-blue-400 transition-colors"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {trend.creator_handle}
                                        </a>
                                      ) : (
                                        trend.creator_handle || trend.creator_name
                                      )}
                                    </span>
                                  )}
                                  <span title={formatFullDate(trend.created_at)}>📅 {formatFullDate(trend.created_at)}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className={`flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r ${getStatusColor(trend.status)} rounded-full text-white text-xs font-semibold`}>
                                  {getStatusIcon(trend.status)}
                                  <span className="capitalize">{trend.status}</span>
                                </div>
                                {trend.stage && (
                                  <div className={`flex items-center gap-1 px-3 py-1.5 ${getStageInfo(trend.stage).bgColor} rounded-full text-xs font-medium ${getStageInfo(trend.stage).color}`}>
                                    <span>{getStageInfo(trend.stage).icon}</span>
                                    <span>{getStageInfo(trend.stage).text}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {trend.post_caption && (
                              <p className="text-sm text-gray-400 mb-3">"{trend.post_caption}"</p>
                            )}

                            {/* Only show engagement stats if they have values */}
                            {(trend.likes_count > 0 || trend.comments_count > 0 || trend.shares_count > 0 || trend.views_count > 0) && (
                              <div className="flex items-center gap-6 mb-3">
                                {trend.likes_count > 0 && (
                                  <div className="flex items-center gap-1 text-sm text-gray-400">
                                    <HeartIcon className="w-4 h-4 text-red-400" />
                                    <span>{formatEngagement(trend.likes_count)}</span>
                                  </div>
                                )}
                                {trend.comments_count > 0 && (
                                  <div className="flex items-center gap-1 text-sm text-gray-400">
                                    <MessageCircleIcon className="w-4 h-4 text-blue-400" />
                                    <span>{formatEngagement(trend.comments_count)}</span>
                                  </div>
                                )}
                                {trend.shares_count > 0 && (
                                  <div className="flex items-center gap-1 text-sm text-gray-400">
                                    <ShareIcon className="w-4 h-4 text-green-400" />
                                    <span>{formatEngagement(trend.shares_count)}</span>
                                  </div>
                                )}
                                {trend.views_count > 0 && (
                                  <div className="flex items-center gap-1 text-sm text-gray-400">
                                    <EyeIcon className="w-4 h-4 text-purple-400" />
                                    <span>{formatEngagement(trend.views_count)}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1 text-sm text-gray-400">
                                  <BarChartIcon className="w-4 h-4 text-yellow-400" />
                                  <span>Wave Score: {trend.wave_score || 50}/100</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={`text-sm font-medium ${getVelocityDisplay(getTrendVelocity(trend)).color}`}>
                                    {getVelocityDisplay(getTrendVelocity(trend)).text}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-gray-400">
                                  <AwardIcon className="w-4 h-4 text-blue-400" />
                                  <span>Votes: {trend.approve_count || 0}👍 {trend.reject_count || 0}👎</span>
                                  {/* Validation Status Indicator */}
                                  {trend.validation_status && (
                                    <div className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                                      trend.validation_status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                      trend.validation_status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                      'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                      {trend.validation_status === 'approved' ? '✅ Paid' :
                                       trend.validation_status === 'rejected' ? '❌ Rejected' :
                                       '⏳ Pending'}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {trend.bounty_amount > 0 && (
                                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                                  trend.bounty_paid 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  <DollarSignIcon className="w-4 h-4" />
                                  <span>{formatEarnings(trend.bounty_amount || 0)}</span>
                                </div>
                              )}
                            </div>

                            {/* Marketing Tags and Hashtags */}
                            <div className="flex flex-wrap gap-1 mt-3">
                              {trend.evidence?.categories?.map((cat: string, i: number) => (
                                <span key={`cat-${i}`} className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">
                                  {cat}
                                </span>
                              ))}
                              {trend.evidence?.moods?.map((mood: string, i: number) => (
                                <span key={`mood-${i}`} className="text-xs px-2 py-1 bg-pink-500/10 text-pink-400 rounded-full border border-pink-500/20">
                                  {mood}
                                </span>
                              ))}
                              {trend.hashtags?.map((tag, i) => (
                                <span key={`tag-${i}`} className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Timeline View */}
            {viewMode === 'timeline' && (
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-600/50 via-purple-600/50 to-transparent" />
                
                <div className="space-y-8">
                  <AnimatePresence mode="popLayout">
                    {filteredTrends.map((trend, index) => (
                      <motion.div
                        key={trend.id}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative flex items-start gap-6"
                      >
                        {/* Timeline Node */}
                        <div className="relative z-10">
                          <motion.div
                            whileHover={{ scale: 1.2 }}
                            className={`w-16 h-16 rounded-full bg-gradient-to-br ${getStatusColor(trend.status)} flex items-center justify-center shadow-lg`}
                          >
                            <span className="text-2xl">{getCategoryEmoji(trend.category)}</span>
                          </motion.div>
                          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {formatFullDate(trend.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Content Card */}
                        <div className="flex-1 group">
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-all duration-300"
                          >
                            <div className="flex">
                              {/* Thumbnail */}
                              {(trend.thumbnail_url || trend.screenshot_url) && (
                                <div className="relative w-48 h-full flex-shrink-0">
                                  <img 
                                    src={trend.thumbnail_url || trend.screenshot_url || ''} 
                                    alt="Trend"
                                    className="w-full h-full object-cover"
                                  />
                                  {trend.post_url && (
                                    <a 
                                      href={trend.post_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                      <ExternalLinkIcon className="w-6 h-6 text-white" />
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Content */}
                              <div className="flex-1 p-6">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h3 className="text-lg font-semibold text-white mb-1">
                                      {trend.evidence?.title || trend.description.split('\n')[0]}
                                    </h3>
                                    {(trend.creator_handle || trend.creator_name) && (
                                      <p className="text-sm text-gray-400">
                                        by {trend.creator_handle && trend.evidence?.platform ? (
                                          <a 
                                            href={getCreatorProfileUrl(trend.evidence.platform, trend.creator_handle)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-300 hover:text-blue-400 transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {trend.creator_handle}
                                          </a>
                                        ) : (
                                          trend.creator_handle || trend.creator_name
                                        )}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className={`flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r ${getStatusColor(trend.status)} rounded-full text-white text-xs font-semibold`}>
                                      {getStatusIcon(trend.status)}
                                      <span className="capitalize">{trend.status}</span>
                                    </div>
                                    {trend.stage && (
                                      <div className={`flex items-center gap-1 px-3 py-1.5 ${getStageInfo(trend.stage).bgColor} rounded-full text-xs font-medium ${getStageInfo(trend.stage).color}`}>
                                        <span>{getStageInfo(trend.stage).icon}</span>
                                        <span>{getStageInfo(trend.stage).text}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {trend.post_caption && (
                                  <p className="text-sm text-gray-400 mb-3 italic">"{trend.post_caption}"</p>
                                )}

                                {/* Only show engagement stats if they have values */}
                                {(trend.likes_count > 0 || trend.comments_count > 0 || trend.shares_count > 0 || trend.views_count > 0) && (
                                  <div className="flex items-center gap-4 mb-3">
                                    {trend.likes_count > 0 && (
                                      <span className="flex items-center gap-1 text-sm text-gray-400">
                                        <HeartIcon className="w-4 h-4 text-red-400" />
                                        {formatEngagement(trend.likes_count)}
                                      </span>
                                    )}
                                    {trend.comments_count > 0 && (
                                      <span className="flex items-center gap-1 text-sm text-gray-400">
                                        <MessageCircleIcon className="w-4 h-4 text-blue-400" />
                                        {formatEngagement(trend.comments_count)}
                                      </span>
                                    )}
                                    {trend.shares_count > 0 && (
                                      <span className="flex items-center gap-1 text-sm text-gray-400">
                                        <ShareIcon className="w-4 h-4 text-green-400" />
                                        {formatEngagement(trend.shares_count)}
                                      </span>
                                    )}
                                    {trend.views_count > 0 && (
                                      <span className="flex items-center gap-1 text-sm text-gray-400">
                                        <EyeIcon className="w-4 h-4 text-purple-400" />
                                        {formatEngagement(trend.views_count)}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Stats Row */}
                                <div className="flex items-center gap-3 mb-3 text-sm">
                                  <div className="flex items-center gap-1 text-gray-400">
                                    <BarChartIcon className="w-4 h-4 text-yellow-400" />
                                    <span>Wave Score: {trend.wave_score || 50}/100</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className={`text-sm font-medium ${getVelocityDisplay(getTrendVelocity(trend)).color}`}>
                                      {getVelocityDisplay(getTrendVelocity(trend)).text}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 text-gray-400">
                                    <AwardIcon className="w-4 h-4 text-blue-400" />
                                    <span>Votes: {trend.approve_count || 0}👍 {trend.reject_count || 0}👎</span>
                                    {/* Validation Status Indicator */}
                                    {trend.validation_status && (
                                      <div className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                                        trend.validation_status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                        trend.validation_status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                        'bg-yellow-500/20 text-yellow-400'
                                      }`}>
                                        {trend.validation_status === 'approved' ? '✅ Paid' :
                                         trend.validation_status === 'rejected' ? '❌ Rejected' :
                                         '⏳ Pending'}
                                      </div>
                                    )}
                                  </div>
                                  {trend.bounty_amount > 0 && (
                                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                                      trend.bounty_paid 
                                        ? 'bg-green-500/20 text-green-400' 
                                        : 'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                      <DollarSignIcon className="w-3 h-3" />
                                      <span>{formatEarnings(trend.bounty_amount || 0)}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Marketing Tags and Hashtags */}
                                <div className="flex flex-wrap gap-1">
                                  {trend.evidence?.categories?.map((cat: string, i: number) => (
                                    <span key={`cat-${i}`} className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">
                                      {cat}
                                    </span>
                                  ))}
                                  {trend.evidence?.moods?.map((mood: string, i: number) => (
                                    <span key={`mood-${i}`} className="text-xs px-2 py-1 bg-pink-500/10 text-pink-400 rounded-full border border-pink-500/20">
                                      {mood}
                                    </span>
                                  ))}
                                  {trend.hashtags?.slice(0, 5).map((tag, i) => (
                                    <span key={`tag-${i}`} className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Trend Submission Form Modal */}
      {showSubmitForm && (
        <TrendSubmissionForm
          onClose={() => setShowSubmitForm(false)}
          onSubmit={handleTrendSubmit}
        />
      )}
    </div>
  );
}