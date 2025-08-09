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
  Star,
  ThumbsUp,
  ThumbsDown,
  CheckSquare,
  Square,
  Sparkles,
  Target,
  Info,
  X,
  Menu,
  Award
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
  const [showStats, setShowStats] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [stats, setStats] = useState({
    validated_today: 0,
    earnings_today: 0,
    validated_total: 0,
    earnings_total: 0,
    remaining_today: 100,
    accuracy_rate: 0
  });
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [sessionValidations, setSessionValidations] = useState(0);
  const [qualityCriteria, setQualityCriteria] = useState<QualityCriteria[]>([]);
  const [lastError, setLastError] = useState('');
  
  // Supabase client is imported from lib/supabase

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

      console.log('[Verify] Loading trends for user:', user.id);

      // Get already validated trends
      const { data: validatedTrends, error: validatedError } = await supabase
        .from('trend_validations')
        .select('trend_submission_id')
        .eq('validator_id', user.id);

      if (validatedError) {
        console.error('Error fetching validated trends:', validatedError);
      }

      const validatedIds = validatedTrends?.map(v => v.trend_submission_id) || [];
      console.log('[Verify] Already validated:', validatedIds.length, 'trends');
      
      // Get skipped trends from localStorage
      const skippedKey = `skipped_trends_${user.id}_${new Date().toDateString()}`;
      const skippedTrends = JSON.parse(localStorage.getItem(skippedKey) || '[]');
      
      const excludeIds = [...validatedIds, ...skippedTrends];

      // First try: Use RPC function if available (bypasses RLS)
      let trendsData = null;
      let trendsError = null;

      try {
        console.log('[Verify] Trying RPC function get_trends_for_validation...');
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_trends_for_validation', {
            user_id: user.id,
            limit_count: 20
          });

        if (!rpcError && rpcData) {
          console.log('[Verify] RPC function returned', rpcData.length, 'trends');
          trendsData = rpcData;
        } else if (rpcError) {
          console.log('[Verify] RPC function failed:', rpcError.message);
        }
      } catch (e) {
        console.log('[Verify] RPC function not available');
      }

      // Second try: Regular query with multiple conditions
      if (!trendsData) {
        console.log('[Verify] Trying regular query...');
        let query = supabase
          .from('trend_submissions')
          .select('*');
        
        // Add exclusions if any (but don't exclude own trends)
        if (excludeIds.length > 0) {
          query = query.not('id', 'in', `(${excludeIds.join(',')})`);
        }
        
        // Try broader query first
        const result = await query
          .order('created_at', { ascending: false })
          .limit(50); // Get more initially

        trendsData = result.data;
        trendsError = result.error;

        if (trendsError) {
          console.error('[Verify] Query error:', trendsError);
        } else {
          console.log('[Verify] Query returned', trendsData?.length || 0, 'total trends');
          
          // Filter client-side for trends that need validation
          if (trendsData && trendsData.length > 0) {
            trendsData = trendsData.filter(trend => {
              // Include if any of these conditions are true
              return (
                trend.status === 'submitted' ||
                trend.status === 'validating' ||
                trend.validation_status === 'pending' ||
                trend.validation_status === null ||
                trend.validation_count === 0 ||
                trend.validation_count === null ||
                trend.approve_count === 0 ||
                trend.approve_count === null
              );
            }).slice(0, 20); // Limit to 20 after filtering
            
            console.log('[Verify] After filtering:', trendsData.length, 'trends need validation');
          }
        }
      }

      // Third try: If still no trends, try simpler query
      if ((!trendsData || trendsData.length === 0) && !trendsError) {
        console.log('[Verify] Trying simplest query - just get recent trends...');
        const { data: simpleTrends, error: simpleError } = await supabase
          .from('trend_submissions')
          .select('*')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(20);

        if (!simpleError && simpleTrends) {
          console.log('[Verify] Simple query found', simpleTrends.length, 'recent trends');
          // Filter out already validated ones
          trendsData = simpleTrends.filter(t => !excludeIds.includes(t.id));
          console.log('[Verify] After excluding validated:', trendsData.length, 'trends available');
        }
      }

      if (trendsError) {
        console.error('[Verify] Error loading trends:', trendsError);
        setLastError('Unable to load trends. Please refresh the page.');
      }

      // Process trends
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

      console.log('[Verify] Final processed trends:', processedTrends.length);
      setTrends(processedTrends);
      
      // Set quality criteria for first trend
      if (processedTrends.length > 0) {
        setQualityCriteria(evaluateQualityCriteria(processedTrends[0]));
      }
    } catch (error) {
      console.error('[Verify] Error loading trends:', error);
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

      // Calculate accuracy (ratio of approvals)
      const approvals = todayValidations?.filter(v => v.vote === 'verify').length || 0;
      const total = todayValidations?.length || 1;
      const accuracy = Math.round((approvals / total) * 100) || 0;

      setStats({
        validated_today: todayValidations?.length || 0,
        earnings_today: parseFloat(((todayValidations?.length || 0) * 0.01).toFixed(2)),
        validated_total: allValidations?.length || 0,
        earnings_total: parseFloat(((allValidations?.length || 0) * 0.01).toFixed(2)),
        remaining_today: Math.max(0, 100 - (todayValidations?.length || 0)),
        accuracy_rate: accuracy
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
      setLastError(''); // Clear any previous errors
    } else {
      setCurrentIndex(trends.length);
    }
  };

  const handleValidation = async (decision: 'approve' | 'reject' | 'skip') => {
    if (!trends[currentIndex]) return;

    const trendId = trends[currentIndex].id;

    if (decision === 'skip') {
      // Save skipped trend to localStorage
      const skippedKey = `skipped_trends_${user?.id}_${new Date().toDateString()}`;
      const existingSkipped = JSON.parse(localStorage.getItem(skippedKey) || '[]');
      
      if (!existingSkipped.includes(trendId)) {
        existingSkipped.push(trendId);
        localStorage.setItem(skippedKey, JSON.stringify(existingSkipped));
      }
      
      nextTrend();
      return;
    }

    setValidating(true);
    setLastError('');
    
    try {
      // Map decision to vote type for the database
      const voteType = decision === 'approve' ? 'verify' : 'reject';
      
      console.log('Submitting validation:', { trend_id: trendId, vote_type: voteType });

      // Ensure we have a user from context
      if (!user?.id) {
        setLastError('You must be signed in to validate trends.');
        setValidating(false);
        return;
      }

      // Use the RPC function to submit vote (correct parameter names)
      const { data: result, error } = await supabase
        .rpc('cast_trend_vote', {
          p_trend_id: trendId,
          p_vote: voteType
        });

      console.log('Validation result:', { result, error });
      console.log('Result type:', typeof result);
      console.log('Result keys:', result ? Object.keys(result) : 'null');

      if (error) {
        console.error('Validation error:', error);
        setLastError(error.message || 'Unable to submit validation. Please try again.');
        return;
      }

      // Check the result from RPC
      if (result && typeof result === 'object') {
        if (result.success === false) {
          console.error('Validation failed:', result.error);
          
          // Handle specific errors
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

      // Success! Update stats and move to next
      setSessionValidations(prev => prev + 1);
      setShowRewardAnimation(true);
      setTimeout(() => setShowRewardAnimation(false), 2000);
      
      // Refresh stats
      await loadStats();
      
      // Remove from current list and move to next
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

  // Update quality criteria when trend changes
  useEffect(() => {
    if (trends[currentIndex]) {
      setQualityCriteria(evaluateQualityCriteria(trends[currentIndex]));
    }
  }, [currentIndex, trends]);

  // Keyboard shortcuts
  useEffect(() => {
    const currentTrend = trends[currentIndex];
    if (!currentTrend || validating) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (validating || !currentTrend) return;
      
      switch(e.key.toLowerCase()) {
        case '1':
        case 'q':
          handleValidation('approve');
          break;
        case '2':
        case 'w':
          handleValidation('reject');
          break;
        case '3':
        case 'e':
          handleValidation('skip');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [trends, currentIndex, validating]);

  const currentTrend = trends[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading trends to validate...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Shield className="w-20 h-20 text-purple-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to help validate trends.</p>
          <a href="/login" className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  if (!currentTrend) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-3">All Done!</h2>
          <p className="text-gray-600 text-lg mb-6">
            You've validated all available trends. Great work!
          </p>
          
          {/* Stats Summary */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wide">Today's Progress</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.validated_today}</p>
                <p className="text-xs text-gray-500 mt-1">Validated</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{stats.accuracy_rate}%</p>
                <p className="text-xs text-gray-500 mt-1">Quality Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">${stats.earnings_today.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Earned</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Check for New Trends
          </button>
        </div>
      </div>
    );
  }

  const qualityScore = calculateQualityScore(qualityCriteria);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-blue-900/20" />
        <div className="absolute top-0 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-32 left-20 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
      </div>
      
      <div className="relative z-10">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-20 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-blue-600/10" />
        <div className="relative max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl blur group-hover:blur-md transition-all" />
                <div className="relative p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">Validate Trends</h1>
                <p className="text-xs text-purple-300/80">Earn rewards for quality control</p>
              </div>
              <div className="ml-4">
                <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                  <div className="flex gap-1">
                    {[...Array(trends.length)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          i < currentIndex ? 'bg-green-400' :
                          i === currentIndex ? 'bg-purple-400 w-6' :
                          'bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-white/80 ml-2">
                    {currentIndex + 1}/{trends.length}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Earnings Display */}
            <div className="flex items-center gap-3">
              <motion.div
                className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-4 py-2 rounded-lg flex items-center gap-2 border border-green-500/30 backdrop-blur-sm"
                animate={showRewardAnimation ? { scale: [1, 1.05, 1] } : {}}
              >
                <Coins className="w-5 h-5 text-green-400" />
                <div>
                  <span className="font-bold text-green-300">${stats.earnings_today.toFixed(2)}</span>
                  <span className="text-xs text-green-400 ml-1">Today</span>
                </div>
              </motion.div>
              
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="p-2 hover:bg-purple-800/30 rounded-lg transition-colors"
              >
                <Info className="w-5 h-5 text-purple-400" />
              </button>
              
              <button
                onClick={() => setShowStats(!showStats)}
                className="p-2 hover:bg-purple-800/30 rounded-lg transition-colors"
              >
                {showStats ? <X className="w-5 h-5 text-purple-400" /> : <Menu className="w-5 h-5 text-purple-400" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4">How to Validate Trends</h2>
              <div className="space-y-3 text-sm text-gray-600">
                <div>
                  <strong className="text-gray-800">Your Goal:</strong>
                  <p>Help identify high-quality trend submissions that deserve to be featured.</p>
                </div>
                <div>
                  <strong className="text-gray-800">What to Look For:</strong>
                  <ul className="mt-1 space-y-1 ml-4">
                    <li>• Clear screenshots or images</li>
                    <li>• Accurate descriptions</li>
                    <li>• Recent content (within 48 hours)</li>
                    <li>• Real engagement metrics</li>
                    <li>• Proper categorization</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-gray-800">Actions:</strong>
                  <ul className="mt-1 space-y-1 ml-4">
                    <li>✅ <strong>Approve:</strong> High-quality, legitimate trend</li>
                    <li>❌ <strong>Reject:</strong> Low-quality, spam, or fake</li>
                    <li>⏭️ <strong>Skip:</strong> Unsure or need more context</li>
                  </ul>
                </div>
                <div className="pt-3 border-t">
                  <strong className="text-gray-800">Keyboard Shortcuts:</strong>
                  <p className="mt-1">Press 1 (Approve), 2 (Reject), or 3 (Skip)</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="mt-6 w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Sidebar */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed right-0 top-16 bottom-0 w-80 bg-white shadow-lg z-20 overflow-y-auto"
          >
            <div className="p-4 space-y-4">
              <h3 className="font-bold text-gray-900 text-lg">Your Stats</h3>
              
              <div className="space-y-3">
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-purple-600">Quality Rate</span>
                    <span className="text-2xl font-bold text-purple-800">{stats.accuracy_rate}%</span>
                  </div>
                  <div className="h-2 bg-purple-200 rounded-full">
                    <div className="h-full bg-purple-600 rounded-full" style={{ width: `${stats.accuracy_rate}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-blue-800">{stats.validated_today}</p>
                    <p className="text-xs text-blue-600">Validated Today</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-green-800">${stats.earnings_today.toFixed(2)}</p>
                    <p className="text-xs text-green-600">Earned Today</p>
                  </div>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">All-time validations:</span>
                    <span className="font-medium">{stats.validated_total}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Total earnings:</span>
                    <span className="font-medium">${stats.earnings_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Remaining today:</span>
                    <span className="font-medium">{stats.remaining_today}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Error Message */}
        {lastError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-3 backdrop-blur-sm"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{lastError}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentTrend.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-purple-800/30 shadow-2xl overflow-hidden"
          >
            {/* Content Section */}
            <div className="grid md:grid-cols-2 gap-0">
              {/* Left: Image */}
              <div className="bg-gray-900 relative">
                {(currentTrend.thumbnail_url || currentTrend.screenshot_url) ? (
                  <img
                    src={currentTrend.thumbnail_url || currentTrend.screenshot_url}
                    alt="Trend submission"
                    className="w-full h-full object-contain bg-black"
                    style={{ maxHeight: '500px' }}
                  />
                ) : (
                  <div className="h-full min-h-[400px] flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-purple-400 mx-auto mb-2" />
                      <p className="text-purple-300">No image provided</p>
                    </div>
                  </div>
                )}
                
                {/* Engagement overlay */}
                {(currentTrend.likes_count || currentTrend.views_count) && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <div className="flex gap-4 text-white text-sm">
                      {currentTrend.views_count && (
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>{formatCount(currentTrend.views_count)} views</span>
                        </div>
                      )}
                      {currentTrend.likes_count && (
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          <span>{formatCount(currentTrend.likes_count)} likes</span>
                        </div>
                      )}
                      {currentTrend.comments_count && (
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{formatCount(currentTrend.comments_count)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Details */}
              <div className="p-6 bg-gray-900/50">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-white mb-2">
                    {currentTrend.description || 'No description'}
                  </h2>
                  
                  {currentTrend.post_caption && (
                    <p className="text-gray-400 text-sm mb-3">
                      {currentTrend.post_caption}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs">
                    {currentTrend.platform && (
                      <span className="bg-gray-700/50 text-gray-300 px-2 py-1 rounded border border-gray-600/30">
                        {currentTrend.platform}
                      </span>
                    )}
                    {currentTrend.category && (
                      <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/30">
                        {currentTrend.category.replace(/_/g, ' ')}
                      </span>
                    )}
                    {currentTrend.creator_handle && (
                      <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded border border-blue-500/30">
                        @{currentTrend.creator_handle}
                      </span>
                    )}
                    {currentTrend.hours_since_post !== undefined && (
                      <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded border border-yellow-500/30">
                        {currentTrend.hours_since_post}h ago
                      </span>
                    )}
                  </div>
                </div>

                {/* Quality Checklist */}
                <div className="mb-4 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-purple-300">Quality Check</span>
                    <span className={`text-lg font-bold ${
                      qualityScore >= 80 ? 'text-green-400' :
                      qualityScore >= 60 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {qualityScore}%
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    {qualityCriteria.map(criterion => (
                      <div key={criterion.id} className="flex items-center gap-2 text-xs">
                        {criterion.met ? (
                          <CheckSquare className="w-3 h-3 text-green-400" />
                        ) : (
                          <Square className="w-3 h-3 text-gray-500" />
                        )}
                        <span className={criterion.met ? 'text-gray-300' : 'text-gray-500'}>
                          {criterion.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-gray-900/70 p-6 border-t border-purple-800/30">
              <p className="text-center text-sm text-purple-300 mb-4">
                Is this a high-quality trend submission?
              </p>
              
              <div className="grid grid-cols-3 gap-4">
                <motion.button
                  onClick={() => handleValidation('reject')}
                  disabled={validating}
                  className="flex flex-col items-center justify-center py-4 px-3 bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500/30 text-red-400 rounded-xl transition-all disabled:opacity-50 backdrop-blur-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ThumbsDown className="w-6 h-6 mb-2" />
                  <span className="text-sm font-semibold">Reject</span>
                  <span className="text-xs text-red-400/70 mt-0.5">Press 2</span>
                </motion.button>

                <motion.button
                  onClick={() => handleValidation('skip')}
                  disabled={validating}
                  className="flex flex-col items-center justify-center py-4 px-3 bg-gray-700/30 hover:bg-gray-700/50 border-2 border-gray-600/30 text-gray-300 rounded-xl transition-all disabled:opacity-50 backdrop-blur-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <SkipForward className="w-6 h-6 mb-2" />
                  <span className="text-sm font-semibold">Skip</span>
                  <span className="text-xs text-gray-400/70 mt-0.5">Press 3</span>
                </motion.button>

                <motion.button
                  onClick={() => handleValidation('approve')}
                  disabled={validating}
                  className="flex flex-col items-center justify-center py-4 px-3 bg-green-500/10 hover:bg-green-500/20 border-2 border-green-500/30 text-green-400 rounded-xl transition-all disabled:opacity-50 backdrop-blur-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ThumbsUp className="w-6 h-6 mb-2" />
                  <span className="text-sm font-semibold">Approve</span>
                  <span className="text-xs text-green-400/70 mt-0.5">Press 1</span>
                </motion.button>
              </div>
            </div>
            </div>
          </div>
          </motion.div>
        </AnimatePresence>

        {/* Session Progress */}
        {sessionValidations > 0 && (
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-purple-800/30 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-medium text-purple-300">Session Progress</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">
                  Validated: <strong className="text-white">{sessionValidations}</strong>
                </span>
                <span className="text-sm text-gray-400">
                  Earned: <strong className="text-green-400">+${(sessionValidations * 0.01).toFixed(2)}</strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Reward Animation */}
      <AnimatePresence>
        {showRewardAnimation && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-6 z-50"
          >
            <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-medium">+$0.01 Earned!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}