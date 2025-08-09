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
  X
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
}

interface QualityCriteria {
  id: string;
  label: string;
  description: string;
  met: boolean;
}

export default function ValidateTrendsPage() {
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

  const formatCount = (count?: number): string => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const evaluateQualityCriteria = (trend: TrendToValidate): QualityCriteria[] => {
    return [
      {
        id: 'has_image',
        label: 'Has Screenshot/Image',
        description: 'Visual proof is provided',
        met: !!(trend.screenshot_url || trend.thumbnail_url)
      },
      {
        id: 'has_description',
        label: 'Clear Description',
        description: 'Trend is well described',
        met: !!(trend.description && trend.description.length > 10)
      },
      {
        id: 'proper_category',
        label: 'Categorized',
        description: 'Has a proper category',
        met: !!(trend.category && trend.category !== 'other')
      },
      {
        id: 'recent',
        label: 'Recent Content',
        description: 'Posted within 48 hours',
        met: trend.hours_since_post ? trend.hours_since_post <= 48 : true
      },
      {
        id: 'has_engagement',
        label: 'Shows Engagement',
        description: 'Has likes, views, or comments',
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

      // Get already validated trends
      const { data: validatedTrends } = await supabase
        .from('trend_validations')
        .select('trend_submission_id')
        .eq('validator_id', user.id);

      const validatedIds = validatedTrends?.map(v => v.trend_submission_id) || [];
      
      // Get trends to validate
      let query = supabase
        .from('trend_submissions')
        .select('*');
      
      if (validatedIds.length > 0) {
        query = query.not('id', 'in', `(${validatedIds.join(',')})`);
      }
      
      const { data: trendsData, error } = await query
        .order('created_at', { ascending: false })
        .limit(20);

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

      setTrends(processedTrends);
      
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

  const loadStats = async () => {
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
        earnings_today: parseFloat(((todayValidations?.length || 0) * 0.01).toFixed(2)),
        validated_total: allValidations?.length || 0,
        earnings_total: parseFloat(((allValidations?.length || 0) * 0.01).toFixed(2))
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const nextTrend = () => {
    if (currentIndex < trends.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setQualityCriteria(evaluateQualityCriteria(trends[nextIdx]));
      setLastError('');
    } else {
      setCurrentIndex(trends.length);
    }
  };

  const handleValidation = async (decision: 'approve' | 'reject' | 'skip') => {
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
  };

  useEffect(() => {
    if (user) {
      loadTrends();
      loadStats();
    }
  }, [user]);

  useEffect(() => {
    if (trends[currentIndex]) {
      setQualityCriteria(evaluateQualityCriteria(trends[currentIndex]));
    }
  }, [currentIndex, trends]);

  const currentTrend = trends[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading trends to validate...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Shield className="w-20 h-20 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to help validate trends.</p>
          <a href="/login" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  if (!currentTrend) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-3">All Done!</h2>
          <p className="text-gray-600 text-lg mb-6">
            You've validated all available trends. Great work!
          </p>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Today's Progress</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.validated_today}</p>
                <p className="text-xs text-gray-500">Validated</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">${stats.earnings_today.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Earned</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Check for New Trends
          </button>
        </div>
      </div>
    );
  }

  const qualityScore = currentTrend ? calculateQualityScore(qualityCriteria) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CheckCircle className="w-6 h-6 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900">Validate Trends</h1>
              <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                {currentIndex + 1} of {trends.length}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-green-50 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-800">${stats.earnings_today.toFixed(2)}</span>
                  <span className="text-xs text-green-600">Today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Error Message */}
        {lastError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {lastError}
            </div>
            <button onClick={() => setLastError('')} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Image Section */}
            <div className="bg-gray-100 relative">
              {(currentTrend.thumbnail_url || currentTrend.screenshot_url) ? (
                <img
                  src={currentTrend.thumbnail_url || currentTrend.screenshot_url}
                  alt="Trend submission"
                  className="w-full h-full object-contain"
                  style={{ maxHeight: '500px' }}
                />
              ) : (
                <div className="h-full min-h-[400px] flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No image provided</p>
                  </div>
                </div>
              )}
              
              {(currentTrend.likes_count || currentTrend.views_count) && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <div className="flex gap-4 text-white text-sm">
                    {currentTrend.views_count && (
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{formatCount(currentTrend.views_count)}</span>
                      </div>
                    )}
                    {currentTrend.likes_count && (
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        <span>{formatCount(currentTrend.likes_count)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Details Section */}
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {currentTrend.description || 'No description'}
              </h2>
              
              {currentTrend.post_caption && (
                <p className="text-gray-600 text-sm mb-3">{currentTrend.post_caption}</p>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {currentTrend.platform && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                    {currentTrend.platform}
                  </span>
                )}
                {currentTrend.category && (
                  <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs">
                    {currentTrend.category.replace(/_/g, ' ')}
                  </span>
                )}
                {currentTrend.creator_handle && (
                  <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded text-xs">
                    @{currentTrend.creator_handle}
                  </span>
                )}
              </div>

              {/* Quality Checklist */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Quality Check</span>
                  <span className={`text-lg font-bold ${
                    qualityScore >= 80 ? 'text-green-600' :
                    qualityScore >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {qualityScore}%
                  </span>
                </div>
                
                <div className="space-y-1">
                  {qualityCriteria.map(criterion => (
                    <div key={criterion.id} className="flex items-center gap-2 text-xs">
                      {criterion.met ? (
                        <CheckSquare className="w-3 h-3 text-green-600" />
                      ) : (
                        <Square className="w-3 h-3 text-gray-400" />
                      )}
                      <span className={criterion.met ? 'text-gray-700' : 'text-gray-500'}>
                        {criterion.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-gray-50 p-6 border-t">
            <p className="text-center text-sm text-gray-600 mb-4">
              Is this a high-quality trend submission?
            </p>
            
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => handleValidation('reject')}
                disabled={validating}
                className="flex flex-col items-center justify-center py-4 px-3 bg-white hover:bg-red-50 border-2 border-red-200 text-red-700 rounded-lg transition-all disabled:opacity-50"
              >
                <ThumbsDown className="w-6 h-6 mb-2" />
                <span className="text-sm font-semibold">Reject</span>
              </button>

              <button
                onClick={() => handleValidation('skip')}
                disabled={validating}
                className="flex flex-col items-center justify-center py-4 px-3 bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-700 rounded-lg transition-all disabled:opacity-50"
              >
                <SkipForward className="w-6 h-6 mb-2" />
                <span className="text-sm font-semibold">Skip</span>
              </button>

              <button
                onClick={() => handleValidation('approve')}
                disabled={validating}
                className="flex flex-col items-center justify-center py-4 px-3 bg-white hover:bg-green-50 border-2 border-green-200 text-green-700 rounded-lg transition-all disabled:opacity-50"
              >
                <ThumbsUp className="w-6 h-6 mb-2" />
                <span className="text-sm font-semibold">Approve</span>
              </button>
            </div>
          </div>
        </div>

        {/* Session Progress */}
        {sessionValidations > 0 && (
          <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Session Progress</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Validated: <strong>{sessionValidations}</strong>
                </span>
                <span className="text-sm text-gray-600">
                  Earned: <strong className="text-green-600">+${(sessionValidations * 0.01).toFixed(2)}</strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}