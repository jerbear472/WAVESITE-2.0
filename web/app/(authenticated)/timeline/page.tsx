'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import TrendSubmissionForm from '@/components/TrendSubmissionFormEnhanced';
import { mapCategoryToEnum } from '@/lib/categoryMapper';
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
  status: 'submitted' | 'validating' | 'approved' | 'rejected' | 'viral';
  quality_score: number;
  validation_count: number;
  bounty_amount: number;
  bounty_paid: boolean;
  created_at: string;
  validated_at?: string;
  mainstream_at?: string;
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
}

// Add new types for filtering and sorting
type FilterOption = 'all' | 'submitted' | 'validating' | 'approved' | 'viral' | 'rejected';
type SortOption = 'newest' | 'oldest' | 'engagement' | 'virality';
type ViewMode = 'grid' | 'list' | 'timeline';

export default function Timeline() {
  const { user, loading: authLoading } = useAuth();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
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
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        router.push('/login');
        return;
      }

      const userId = session.user.id;
      
      const { data, error } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('spotter_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        setError('Failed to load trends');
        return;
      }
      
      setTrends(data || []);
    } catch (error: any) {
      console.error('Unexpected error:', error);
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
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // Ensure user is authenticated
        if (!user?.id) {
          throw new Error('Please log in to submit trends');
        }

        // Upload image if present
        let imageUrl = null;
        let thumbnailUrl = trendData.thumbnail_url || null;
        
        if (trendData.screenshot && trendData.screenshot instanceof File) {
          try {
            const fileExt = trendData.screenshot.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            
            // Try to create bucket if it doesn't exist
            try {
              await supabase.storage.createBucket('trend-images', {
                public: true,
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
              });
            } catch (bucketError) {
              // Bucket might already exist, continue
              console.log('Bucket already exists or error creating:', bucketError);
            }
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('trend-images')
              .upload(fileName, trendData.screenshot, {
                cacheControl: '3600',
                upsert: false
              });

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('trend-images')
                .getPublicUrl(fileName);
              
              imageUrl = publicUrl;
            } else {
              console.error('Image upload error:', uploadError);
              // Continue without image
            }
          } catch (imageError) {
            console.error('Error handling image:', imageError);
            // Continue without image
          }
        }

        // Build the insert data object with all fields
        const insertData: any = {
          spotter_id: user.id,
          category: trendData.categories?.[0] ? mapCategoryToEnum(trendData.categories[0]) : 'meme_format', // Convert category to enum
          description: trendData.explanation || trendData.trendName || 'Untitled Trend',
          screenshot_url: imageUrl || thumbnailUrl,
          evidence: {
            url: trendData.url || '',
            title: trendData.trendName || 'Untitled Trend',
            platform: trendData.platform || 'other',
            // Store all the rich data
            ageRanges: trendData.ageRanges,
            subcultures: trendData.subcultures,
            region: trendData.region,
            categories: trendData.categories,
            moods: trendData.moods,
            spreadSpeed: trendData.spreadSpeed,
            audioOrCatchphrase: trendData.audioOrCatchphrase,
            motivation: trendData.motivation,
            firstSeen: trendData.firstSeen,
            otherPlatforms: trendData.otherPlatforms,
            brandAdoption: trendData.brandAdoption,
            submitted_by: user.email || user.id,
            metadata_captured: true
          },
          virality_prediction: trendData.spreadSpeed === 'viral' ? 8 : trendData.spreadSpeed === 'picking_up' ? 6 : 5,
          status: 'submitted',
          quality_score: 0.5,
          validation_count: 0,
          created_at: new Date().toISOString()
        };

        // Add social media metadata fields separately to avoid null issues
        if (trendData.creator_handle) insertData.creator_handle = trendData.creator_handle;
        if (trendData.creator_name) insertData.creator_name = trendData.creator_name;
        if (trendData.post_caption) insertData.post_caption = trendData.post_caption;
        if (trendData.likes_count !== undefined) insertData.likes_count = trendData.likes_count;
        if (trendData.comments_count !== undefined) insertData.comments_count = trendData.comments_count;
        if (trendData.shares_count !== undefined) insertData.shares_count = trendData.shares_count;
        if (trendData.views_count !== undefined) insertData.views_count = trendData.views_count;
        if (trendData.hashtags && trendData.hashtags.length > 0) insertData.hashtags = trendData.hashtags;
        if (trendData.url) insertData.post_url = trendData.url;
        if (thumbnailUrl) insertData.thumbnail_url = thumbnailUrl;
        if (trendData.posted_at) {
          insertData.posted_at = trendData.posted_at;
        } else {
          insertData.posted_at = new Date().toISOString();
        }

        console.log('Submitting data to database:', insertData);

        const { data, error } = await supabase
          .from('trend_submissions')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error('Database error:', error);
          throw error;
        }

        console.log('Trend submitted successfully:', data);

        // Close form and refresh trends
        setShowSubmitForm(false);
        fetchUserTrends();
        
        // Show success message
        setError('');
        return data;

      } catch (error: any) {
        console.error(`Error submitting trend (attempt ${retryCount + 1}):`, error);
        retryCount++;
        
        if (retryCount >= maxRetries) {
          // Provide more specific error messages
          let errorMessage = 'Failed to submit trend. ';
          if (error.message?.includes('user_id')) {
            errorMessage = 'Authentication error. Please log in again.';
          } else if (error.message?.includes('category')) {
            errorMessage = 'Please select a valid category.';
          } else if (error.message?.includes('url')) {
            errorMessage = 'Please provide a valid URL.';
          } else if (error.message?.includes('duplicate')) {
            errorMessage = 'This trend has already been submitted.';
          } else {
            errorMessage += error.message || 'Please try again.';
          }
          setError(errorMessage);
          throw new Error(errorMessage);
        }
        
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
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
                  ${trends.reduce((sum, t) => sum + t.bounty_amount, 0).toFixed(2)}
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
                        {(trend.thumbnail_url || trend.screenshot_url) && (
                          <div className="relative h-48 bg-gray-800 overflow-hidden">
                            <img 
                              src={trend.thumbnail_url || trend.screenshot_url} 
                              alt="Trend"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-60" />
                            
                            {/* Status Badge */}
                            <div className="absolute top-3 right-3">
                              <div className={`flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r ${getStatusColor(trend.status)} rounded-full text-white text-xs font-semibold shadow-lg`}>
                                {getStatusIcon(trend.status)}
                                <span className="capitalize">{trend.status}</span>
                              </div>
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
                        )}

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
                          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <BarChartIcon className="w-4 h-4 text-yellow-400" />
                                <span className="text-xs text-gray-400">{trend.virality_prediction || 0}/10</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <AwardIcon className="w-4 h-4 text-blue-400" />
                                <span className="text-xs text-gray-400">{trend.validation_count}</span>
                              </div>
                            </div>
                            
                            {trend.bounty_amount > 0 && (
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                trend.bounty_paid 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                <DollarSignIcon className="w-3 h-3" />
                                <span>${trend.bounty_amount}</span>
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
                                src={trend.thumbnail_url || trend.screenshot_url} 
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

                              <div className={`flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r ${getStatusColor(trend.status)} rounded-full text-white text-xs font-semibold`}>
                                {getStatusIcon(trend.status)}
                                <span className="capitalize">{trend.status}</span>
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
                                  <span>Virality: {trend.virality_prediction || 0}/10</span>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-gray-400">
                                  <AwardIcon className="w-4 h-4 text-blue-400" />
                                  <span>Validations: {trend.validation_count}</span>
                                </div>
                              </div>

                              {trend.bounty_amount > 0 && (
                                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                                  trend.bounty_paid 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  <DollarSignIcon className="w-4 h-4" />
                                  <span>${trend.bounty_amount}</span>
                                </div>
                              )}
                            </div>

                            {trend.hashtags && trend.hashtags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {trend.hashtags.map((tag, i) => (
                                  <span key={i} className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
                                    #{tag}
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
                                    src={trend.thumbnail_url || trend.screenshot_url} 
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
                                  <div className={`flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r ${getStatusColor(trend.status)} rounded-full text-white text-xs font-semibold`}>
                                    {getStatusIcon(trend.status)}
                                    <span className="capitalize">{trend.status}</span>
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

                                <div className="flex items-center justify-between">
                                  <div className="flex flex-wrap gap-1">
                                    {trend.hashtags?.slice(0, 5).map((tag, i) => (
                                      <span key={i} className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                  {trend.bounty_amount > 0 && (
                                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                                      trend.bounty_paid 
                                        ? 'bg-green-500/20 text-green-400' 
                                        : 'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                      <DollarSignIcon className="w-4 h-4" />
                                      <span>${trend.bounty_amount}</span>
                                    </div>
                                  )}
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