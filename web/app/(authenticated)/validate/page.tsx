'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle,
  XCircle,
  SkipForward,
  Eye,
  Heart,
  MessageCircle,
  Clock,
  Coins,
  Shield,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Award,
  X,
  TrendingUp,
  Share2,
  User,
  Hash,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { EARNINGS_CONFIG } from '@/lib/earningsConfig';

interface TrendToValidate {
  id: string;
  created_at: string;
  category: string;
  description: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  platform?: string;
  creator_handle?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  validation_count: number;
  spotter_id: string;
  hours_since_post?: number;
  source_url?: string;
  hashtags?: string[];
  post_url?: string;
  trending_position?: number;
  confidence_score?: number;
  approve_count?: number;
  reject_count?: number;
}

interface QualityCriteria {
  id: string;
  label: string;
  description: string;
  met: boolean;
}

export default function ValidatePageFixed() {
  const { user, refreshUser } = useAuth();
  const [trends, setTrends] = useState<TrendToValidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [stats, setStats] = useState({
    validated_today: 0,
    earnings_today: 0,
    validated_total: 0,
    earnings_total: 0
  });
  const [sessionValidations, setSessionValidations] = useState(0);
  const [qualityCriteria, setQualityCriteria] = useState<QualityCriteria[]>([]);
  const [lastError, setLastError] = useState('');
  const [initialTrendsCount, setInitialTrendsCount] = useState(0);
  const [imageError, setImageError] = useState(false);

  const formatCount = (count?: number): string => {
    if (!count || count === 0) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const evaluateQualityCriteria = (trend: TrendToValidate): QualityCriteria[] => {
    return [
      {
        id: 'has_image',
        label: 'Visual Evidence',
        description: 'Screenshot or image provided',
        met: !!(trend.screenshot_url || trend.thumbnail_url)
      },
      {
        id: 'has_description',
        label: 'Clear Description',
        description: 'Well-described trend',
        met: !!(trend.description && trend.description.length > 10)
      },
      {
        id: 'proper_category',
        label: 'Categorized',
        description: 'Proper category assigned',
        met: !!(trend.category && trend.category !== 'other')
      },
      {
        id: 'recent',
        label: 'Timely',
        description: 'Recently submitted',
        met: trend.hours_since_post ? trend.hours_since_post <= 72 : true
      },
      {
        id: 'has_engagement',
        label: 'Engagement Data',
        description: 'Shows social metrics',
        met: (trend.likes_count || 0) > 0 || (trend.views_count || 0) > 0 || (trend.comments_count || 0) > 0
      }
    ];
  };

  const calculateQualityScore = (criteria: QualityCriteria[]): number => {
    const metCount = criteria.filter(c => c.met).length;
    return Math.round((metCount / criteria.length) * 100);
  };

  const loadTrends = async () => {
    try {
      if (!user?.id) {
        console.warn('No user ID available');
        setLoading(false);
        return;
      }

      console.log('Loading trends for validation. User ID:', user.id);
      console.log('User email:', user.email);

      // Get already validated trends by this user
      const { data: validatedTrends, error: validationError } = await supabase
        .from('trend_validations')
        .select('trend_id')
        .eq('validator_id', user.id);

      if (validationError) {
        console.error('Error loading validated trends:', validationError);
        setLastError('Unable to load your validation history. Some trends may appear that you\'ve already voted on.');
      }

      const validatedIds = validatedTrends?.map(v => v.trend_id).filter(id => id != null) || [];
      console.log('Already validated trend IDs:', validatedIds.length);
      console.log('Validated IDs:', validatedIds);
      
      // Get all trends that aren't from this user
      const { data: trendsData, error } = await supabase
        .from('trend_submissions')
        .select(`
          id,
          spotter_id,
          category,
          description,
          screenshot_url,
          thumbnail_url,
          platform,
          creator_handle,
          creator_name,
          post_caption,
          likes_count,
          comments_count,
          shares_count,
          views_count,
          hashtags,
          post_url,
          posted_at,
          virality_prediction,
          quality_score,
          validation_count,
          approve_count,
          reject_count,
          status,
          created_at,
          updated_at
        `)
        .neq('spotter_id', user.id) // Exclude user's own trends
        .in('status', ['submitted', 'validating'])
        .order('created_at', { ascending: false }) // NEWEST FIRST
        .limit(200); // Get more trends to handle filtering
      
      console.log('Excluding trends from spotter_id:', user.id);

      console.log('Trends loaded for validation:', trendsData?.length || 0, 'trends');
      console.log('Query filters used:', {
        excludingSpotterId: user.id,
        excludingValidatedIds: validatedIds,
        statusFilter: ['submitted', 'validating']
      });
      
      if (error) {
        console.error('Error loading trends:', error);
        setLastError('Unable to load trends. Please refresh the page.');
      }

      // Filter out already validated trends client-side
      const filteredTrends = (trendsData || []).filter(trend => 
        !validatedIds.includes(trend.id)
      );
      
      console.log(`After filtering out validated trends: ${filteredTrends.length} trends available`);
      
      // Debug: Show which trends were filtered out
      const filteredOutTrends = (trendsData || []).filter(trend => 
        validatedIds.includes(trend.id)
      );
      if (filteredOutTrends.length > 0) {
        console.log(`🚫 Filtered out ${filteredOutTrends.length} already validated trends:`, 
          filteredOutTrends.map(t => ({ id: t.id.substring(0, 8), desc: t.description.substring(0, 30) }))
        );
      }
      
      // Process trends and calculate time since submission
      const processedTrends = filteredTrends.map(trend => {
        const hoursAgo = Math.round((Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60));
        return {
          ...trend,
          validation_count: trend.validation_count || 0,
          approve_count: trend.approve_count || 0,
          reject_count: trend.reject_count || 0,
          hours_since_post: hoursAgo
        };
      });

      // Sort again client-side to ensure newest first
      processedTrends.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      console.log('Processed trends (newest first):', processedTrends.slice(0, 3).map(t => ({
        id: t.id,
        created_at: t.created_at,
        description: t.description?.substring(0, 30)
      })));

      setTrends(processedTrends);
      setInitialTrendsCount(processedTrends.length);
      
      if (processedTrends.length > 0) {
        setQualityCriteria(evaluateQualityCriteria(processedTrends[0]));
      }
    } catch (error) {
      console.error('Error loading trends:', error);
      setLastError('Unable to load trends. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayValidations } = await supabase
        .from('trend_validations')
        .select('*')
        .eq('validator_id', user?.id)
        .gte('created_at', today.toISOString());

      const { data: allValidations } = await supabase
        .from('trend_validations')
        .select('*')
        .eq('validator_id', user?.id);

      setStats({
        validated_today: todayValidations?.length || 0,
        earnings_today: parseFloat(((todayValidations?.length || 0) * 0.10).toFixed(2)),
        validated_total: allValidations?.length || 0,
        earnings_total: parseFloat(((allValidations?.length || 0) * 0.10).toFixed(2))
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [user]);

  const nextTrend = useCallback(() => {
    if (currentIndex < trends.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setQualityCriteria(evaluateQualityCriteria(trends[nextIdx]));
      setLastError('');
      setImageError(false); // Reset image error for next trend
    } else {
      setCurrentIndex(trends.length);
    }
  }, [currentIndex, trends]);

  const handleValidation = useCallback(async (decision: 'approve' | 'reject' | 'skip') => {
    if (!trends[currentIndex]) return;

    const trendId = trends[currentIndex].id;

    if (decision === 'skip') {
      nextTrend();
      return;
    }

    setValidating(true);
    setLastError('');
    
    try {
      const voteType = decision === 'approve' ? 'verify' : 'reject';
      
      if (!user?.id) {
        setLastError('You must be signed in to validate trends.');
        setValidating(false);
        return;
      }

      console.log('Calling cast_trend_vote with:', { p_trend_id: trendId, p_vote: voteType });
      
      const { data: result, error } = await supabase
        .rpc('cast_trend_vote', {
          p_trend_id: trendId,
          p_vote: voteType
        });

      console.log('RPC Response:', { result, error });

      if (error) {
        console.error('Validation error:', error);
        setLastError(error.message || 'Unable to submit validation. Please try again.');
        return;
      }

      if (result && typeof result === 'object') {
        if (result.success === false) {
          console.error('Validation failed:', result.error);
          
          if (result.error?.includes('already voted')) {
            setLastError('You have already validated this trend. This should have been filtered out - refreshing the page may help.');
            console.log('🚨 User encountered already voted error for trend:', trendId);
            nextTrend();
            // Reload trends after a delay to refresh the list
            setTimeout(() => {
              setLoading(true);
              loadTrends().finally(() => setLoading(false));
            }, 2000);
          } else if (result.error?.includes('not found')) {
            setLastError('This trend no longer exists.');
            nextTrend();
          } else {
            setLastError(result.error || 'Validation failed. Please try again.');
          }
          return;
        }
      }

      // Success!
      setSessionValidations(prev => prev + 1);
      await loadStats();
      
      // Remove validated trend from list and handle index properly
      setTrends(prev => {
        const filtered = prev.filter(t => t.id !== trendId);
        // Adjust currentIndex if needed
        if (currentIndex >= filtered.length && filtered.length > 0) {
          setCurrentIndex(filtered.length - 1);
        } else if (filtered.length === 0) {
          setCurrentIndex(0);
        }
        return filtered;
      })
      
    } catch (error: any) {
      console.error('Unexpected error:', error);
      setLastError('Something went wrong. Please try again.');
    } finally {
      setValidating(false);
    }
  }, [currentIndex, trends, user, nextTrend, loadStats]);

  useEffect(() => {
    if (user) {
      loadTrends();
      loadStats();
    }
  }, [user, loadStats]);

  useEffect(() => {
    if (trends[currentIndex]) {
      setQualityCriteria(evaluateQualityCriteria(trends[currentIndex]));
      setImageError(false); // Reset image error when trend changes
    }
  }, [currentIndex, trends]);

  const currentTrend = trends[currentIndex];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (validating || !currentTrend) return;
      
      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handleValidation('reject');
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleValidation('approve');
          break;
        case 'ArrowUp':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          handleValidation('skip');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [validating, currentTrend, handleValidation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-600 mt-4 font-medium">Loading trends to validate...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Sign In Required</h2>
          <p className="text-gray-600 mb-8">Join our community of trend validators and start earning rewards.</p>
          <a href="/login" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:shadow-lg transition-all transform hover:scale-105">
            Sign In to Continue
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    );
  }

  if (!currentTrend) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center animate-bounce">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {trends.length === 0 && initialTrendsCount === 0 ? 'No Trends Available' : 'All Done!'}
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            {trends.length === 0 && initialTrendsCount === 0 
              ? 'There are no trends to validate at the moment. Check back soon!'
              : "You've validated all available trends. Great work!"}
          </p>
          
          <div className="bg-white rounded-2xl p-8 shadow-xl mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-6 uppercase tracking-wide">Today's Performance</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <p className="text-4xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent">{stats.validated_today}</p>
                <p className="text-sm text-gray-500 mt-1">Trends Validated</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold bg-gradient-to-br from-green-600 to-emerald-600 bg-clip-text text-transparent">${stats.earnings_today.toFixed(2)}</p>
                <p className="text-sm text-gray-500 mt-1">Earned Today</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => {
              setLoading(true);
              loadTrends().finally(() => setLoading(false));
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:shadow-lg transition-all transform hover:scale-105"
          >
            <RefreshCw className="w-5 h-5" />
            Check for New Trends
          </button>
        </div>
      </div>
    );
  }

  const qualityScore = currentTrend ? calculateQualityScore(qualityCriteria) : 0;
  const imageUrl = currentTrend.thumbnail_url || currentTrend.screenshot_url;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Compact Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-gray-900">Validate Trends</h1>
                </div>
              </div>
              
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">
                  {trends.length} new trends to validate
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setLoading(true);
                  loadTrends().finally(() => setLoading(false));
                }}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh trends"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <div className="hidden sm:block text-right">
                <p className="text-xs text-gray-500">Today's Earnings</p>
                <p className="text-sm font-bold text-gray-900">${stats.earnings_today.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-3 h-3" />
                  <span className="text-sm font-bold">{sessionValidations}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-h-[calc(100vh-80px)]">
        <div className="max-w-7xl mx-auto w-full px-4 py-2 flex-1 flex flex-col">
          {/* Error Message */}
          {lastError && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{lastError}</span>
              </div>
              <button onClick={() => setLastError('')} className="text-red-500 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          <div className="bg-white rounded-xl shadow-xl flex-1 overflow-hidden">
            <div className="grid lg:grid-cols-2 h-full">
              {/* Image Section */}
              <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center h-full">
                {imageUrl && !imageError ? (
                  <>
                    <img
                      src={imageUrl}
                      alt="Trend submission"
                      className="w-full h-full object-contain p-4"
                      onError={() => {
                        console.log('Image failed to load:', imageUrl);
                        setImageError(true);
                      }}
                    />
                    {/* Engagement Overlay */}
                    {(currentTrend.likes_count > 0 || currentTrend.views_count > 0 || currentTrend.comments_count > 0 || currentTrend.shares_count > 0) && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
                        <div className="flex gap-3 text-white">
                          {currentTrend.views_count > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Eye className="w-4 h-4" />
                              <span className="text-sm font-medium">{formatCount(currentTrend.views_count)}</span>
                            </div>
                          )}
                          {currentTrend.likes_count > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Heart className="w-4 h-4" />
                              <span className="text-sm font-medium">{formatCount(currentTrend.likes_count)}</span>
                            </div>
                          )}
                          {currentTrend.comments_count > 0 && (
                            <div className="flex items-center gap-1.5">
                              <MessageCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">{formatCount(currentTrend.comments_count)}</span>
                            </div>
                          )}
                          {currentTrend.shares_count > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Share2 className="w-4 h-4" />
                              <span className="text-sm font-medium">{formatCount(currentTrend.shares_count)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-200 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">No image available</p>
                      <p className="text-gray-400 text-sm mt-1">Visual evidence missing</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Details Section */}
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-4 pb-0">
                  {/* Submission Time Badge */}
                  <div className="mb-3 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium">
                    <Clock className="w-3 h-3" />
                    Submitted {currentTrend.hours_since_post}h ago
                  </div>

                  {/* Title and Caption */}
                  <h2 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                    {currentTrend.description || 'No description provided'}
                  </h2>
                  
                  {currentTrend.post_caption && (
                    <p className="text-gray-600 text-sm leading-relaxed mb-3">
                      {currentTrend.post_caption}
                    </p>
                  )}

                  {/* Metadata Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {currentTrend.platform && (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                        <TrendingUp className="w-3 h-3" />
                        {currentTrend.platform}
                      </span>
                    )}
                    {currentTrend.category && (
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                        <Hash className="w-3 h-3" />
                        {currentTrend.category.replace(/_/g, ' ')}
                      </span>
                    )}
                    {currentTrend.creator_handle && (
                      <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">
                        <User className="w-3 h-3" />
                        @{currentTrend.creator_handle}
                      </span>
                    )}
                  </div>

                  {/* Hashtags */}
                  {currentTrend.hashtags && currentTrend.hashtags.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {currentTrend.hashtags.slice(0, 5).map((tag, idx) => (
                          <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Validation Progress */}
                  {(currentTrend.approve_count > 0 || currentTrend.reject_count > 0) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Validation Progress</h4>
                      <div className="flex gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <ThumbsUp className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium">{currentTrend.approve_count || 0}/2 approvals</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ThumbsDown className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium">{currentTrend.reject_count || 0}/2 rejections</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-300"
                          style={{ width: `${Math.min((currentTrend.approve_count || 0) * 50, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Quality Assessment */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">Quality Assessment</h3>
                      <div className={`text-lg font-bold ${
                        qualityScore >= 80 ? 'text-green-600' :
                        qualityScore >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {qualityScore}%
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {qualityCriteria.map(criterion => (
                        <div key={criterion.id} className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                            criterion.met ? 'bg-green-100' : 'bg-gray-200'
                          }`}>
                            {criterion.met ? (
                              <CheckCircle className="w-3 h-3 text-green-600" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                            )}
                          </div>
                          <p className={`text-xs ${
                            criterion.met ? 'text-gray-700 font-medium' : 'text-gray-400'
                          }`}>
                            {criterion.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Fixed Action Buttons */}
                <div className="border-t bg-white p-4">
                  <p className="text-center text-sm text-gray-600 mb-3 font-medium">
                    Is this a legitimate trending topic?
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleValidation('reject')}
                      disabled={validating}
                      className="group relative overflow-hidden bg-white border-2 border-red-200 hover:border-red-400 text-red-700 rounded-lg py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative flex flex-col items-center gap-1">
                        <ThumbsDown className="w-5 h-5" />
                        <span className="text-xs font-semibold">Reject</span>
                        <span className="text-[10px] text-gray-400">←</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleValidation('skip')}
                      disabled={validating}
                      className="group relative overflow-hidden bg-white border-2 border-gray-200 hover:border-gray-400 text-gray-700 rounded-lg py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative flex flex-col items-center gap-1">
                        <SkipForward className="w-5 h-5" />
                        <span className="text-xs font-semibold">Skip</span>
                        <span className="text-[10px] text-gray-400">Space</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleValidation('approve')}
                      disabled={validating}
                      className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative flex flex-col items-center gap-1">
                        <ThumbsUp className="w-5 h-5" />
                        <span className="text-xs font-semibold">Approve</span>
                        <span className="text-[10px] text-green-100">→</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Session Progress Card */}
          {sessionValidations > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 bg-white rounded-lg shadow-md p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Session Progress</p>
                    <p className="text-sm font-bold text-gray-900">Great work!</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Validated: <span className="font-bold text-gray-900">{sessionValidations}</span></p>
                  <p className="text-sm font-bold text-green-600">+${(sessionValidations * 0.10).toFixed(2)}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}