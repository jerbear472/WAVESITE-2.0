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
  CheckSquare,
  Square,
  Award,
  X,
  TrendingUp,
  Share2,
  Calendar,
  User,
  Hash,
  Sparkles,
  ArrowRight,
  RefreshCw
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
}

interface QualityCriteria {
  id: string;
  label: string;
  description: string;
  met: boolean;
}

export default function ValidatePage() {
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

  const formatCount = (count?: number): string => {
    if (!count || count === 0) return '';
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
        description: 'Posted within 48 hours',
        met: trend.hours_since_post ? trend.hours_since_post <= 48 : true
      },
      {
        id: 'has_engagement',
        label: 'Engagement',
        description: 'Shows social proof',
        met: (trend.likes_count || 0) > 0 || (trend.views_count || 0) > 0
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

      // Get already validated trends by this user
      const { data: validatedTrends, error: validationError } = await supabase
        .from('trend_validations')
        .select('trend_submission_id')
        .eq('validator_id', user.id);

      if (validationError) {
        console.error('Error loading validated trends:', validationError);
      }

      const validatedIds = validatedTrends?.map(v => v.trend_submission_id) || [];
      console.log('Already validated trend IDs:', validatedIds);
      
      // First, let's check all trends regardless of status to debug
      const { data: allTrends, error: allError } = await supabase
        .from('trend_submissions')
        .select('id, status, spotter_id, created_at, description')
        .order('created_at', { ascending: false })
        .limit(10);
      
      console.log('Sample of all trends in database:', allTrends);
      
      // Get trends to validate - use specific columns to avoid ambiguity
      let query = supabase
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
        .neq('spotter_id', user.id); // Exclude user's own trends
      
      if (validatedIds.length > 0) {
        query = query.not('id', 'in', `(${validatedIds.join(',')})`);
      }
      
      // First get trends with 'submitted' status, ordered by newest first
      const { data: trendsData, error } = await query
        .in('status', ['submitted', 'validating']) // Only show trends awaiting validation
        .order('created_at', { ascending: false }) // Newest submissions first
        .limit(50); // Increase limit to get more trends

      console.log('Trends loaded for validation:', trendsData?.length || 0, 'trends');
      console.log('First few trends:', trendsData?.slice(0, 3));

      if (error) {
        console.error('Error loading trends:', error);
        setLastError('Unable to load trends. Please refresh the page.');
      }

      const processedTrends = (trendsData || []).map(trend => {
        const hoursAgo = Math.round((Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60));
        return {
          ...trend,
          validation_count: trend.validation_count || 0,
          approve_count: trend.approve_count || 0,
          reject_count: trend.reject_count || 0,
          hours_since_post: hoursAgo
        };
      });

      // If no trends found with filters, try a simpler query
      if (processedTrends.length === 0) {
        console.log('No trends found with filters, trying simpler query...');
        
        const { data: simpleTrends, error: simpleError } = await supabase
          .from('trend_submissions')
          .select('*')
          .neq('spotter_id', user.id)
          .eq('status', 'submitted')
          .order('created_at', { ascending: false }) // Newest first
          .limit(50); // Increase limit to get more trends
        
        if (simpleTrends && simpleTrends.length > 0) {
          console.log('Found trends with simpler query:', simpleTrends.length);
          const simpleProcessed = simpleTrends.map(trend => {
            const hoursAgo = Math.round((Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60));
            return {
              ...trend,
              validation_count: trend.validation_count || 0,
              approve_count: trend.approve_count || 0,
              reject_count: trend.reject_count || 0,
              hours_since_post: hoursAgo
            };
          });
          setTrends(simpleProcessed);
          setInitialTrendsCount(simpleProcessed.length);
          if (simpleProcessed.length > 0) {
            setQualityCriteria(evaluateQualityCriteria(simpleProcessed[0]));
          }
        } else {
          setTrends(processedTrends);
          setInitialTrendsCount(processedTrends.length);
        }
      } else {
        setTrends(processedTrends);
        setInitialTrendsCount(processedTrends.length);
        
        if (processedTrends.length > 0) {
          setQualityCriteria(evaluateQualityCriteria(processedTrends[0]));
        }
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
        // Log debug info if available
        if (result.debug) {
          console.log('Debug info:', result.debug);
        }
        
        if (result.success === false) {
          console.error('Validation failed:', result.error);
          
          if (result.error?.includes('already voted')) {
            setLastError('You have already validated this trend.');
            nextTrend();
          } else if (result.error?.includes('not found')) {
            setLastError('This trend no longer exists.');
            nextTrend();
          } else if (result.error?.includes('authenticated')) {
            setLastError('Please sign in to validate trends.');
          } else {
            setLastError(result.error || 'Validation failed. Please try again.');
          }
          return;
        }
      }

      // Success!
      setSessionValidations(prev => prev + 1);
      await loadStats();
      
      setTrends(prev => prev.filter(t => t.id !== trendId));
      if (currentIndex >= trends.length - 1) {
        setCurrentIndex(trends.length - 1);
      }
      
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
    }
  }, [currentIndex, trends]);

  const currentTrend = trends[currentIndex];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent if user is typing in an input field
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
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <span className="text-sm font-medium text-gray-700">
                  {initialTrendsCount - trends.length + 1} of {initialTrendsCount}
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
                <p className="text-xs text-gray-500">Earnings</p>
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

      {/* Main Content - Optimized for laptop screens */}
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
              {/* Image Section - Fixed height that fits screen */}
              <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center h-full">
                {/* Display thumbnail first, then screenshot as fallback */}
                {(currentTrend.thumbnail_url || currentTrend.screenshot_url) ? (
                  <>
                    <img
                      src={currentTrend.thumbnail_url || currentTrend.screenshot_url || ''}
                      alt="Trend submission"
                      className="w-full h-full object-contain p-4"
                      onError={(e) => {
                        // If image fails to load, hide it
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    {/* Engagement Overlay - Only show if there are meaningful values */}
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
                        <AlertCircle className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">No image provided</p>
                      <p className="text-gray-400 text-sm mt-1">Visual evidence missing</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Details Section - Properly sized for content */}
              <div className="flex flex-col h-full">
                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto p-4 pb-0">
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
                    {currentTrend.hours_since_post && (
                      <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
                        <Clock className="w-3 h-3" />
                        {currentTrend.hours_since_post}h ago
                      </span>
                    )}
                  </div>

                  {/* Additional Context */}
                  {(currentTrend.source_url || currentTrend.post_url || (currentTrend.hashtags && currentTrend.hashtags.length > 0) || currentTrend.trending_position || currentTrend.confidence_score) && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">Additional Context</h4>
                      <div className="space-y-1.5">
                        {currentTrend.source_url && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-gray-600 mt-0.5">Source:</span>
                            <a href={currentTrend.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-all">
                              {currentTrend.source_url}
                            </a>
                          </div>
                        )}
                        {currentTrend.post_url && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-gray-600">Post:</span>
                            <a href={currentTrend.post_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                              View Original
                            </a>
                          </div>
                        )}
                        {currentTrend.hashtags && currentTrend.hashtags.length > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-gray-600 mt-0.5">Tags:</span>
                            <div className="flex flex-wrap gap-1">
                              {currentTrend.hashtags.slice(0, 5).map((tag, idx) => (
                                <span key={idx} className="text-xs bg-white px-2 py-0.5 rounded text-blue-700">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {currentTrend.trending_position && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">Trending:</span>
                            <span className="text-xs font-semibold text-blue-700">#{currentTrend.trending_position}</span>
                          </div>
                        )}
                        {currentTrend.confidence_score && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">AI Confidence:</span>
                            <span className="text-xs font-semibold text-blue-700">{Math.round(currentTrend.confidence_score * 100)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Validation Status - Show vote progress */}
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
                      <p className="text-xs text-gray-500 mt-1">First to 2 votes decides</p>
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

          {/* Session Progress Card - Compact */}
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