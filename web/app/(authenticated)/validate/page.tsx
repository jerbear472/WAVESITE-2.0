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
  Image as ImageIcon,
  Link,
  Users,
  BarChart3,
  ExternalLink,
  Star
} from 'lucide-react';
import { 
  SUSTAINABLE_EARNINGS,
  formatCurrency,
  calculateUserTier,
  type Tier
} from '@/lib/SUSTAINABLE_EARNINGS';
import XPDisplay from '@/components/XPDisplay';
import { BountyTrendCard } from '@/components/BountyTrendCard';

interface TrendToValidate {
  id: string;
  created_at: string;
  category: string;
  description: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  platform?: string;
  creator_handle?: string;
  creator_name?: string;
  post_caption?: string;
  likes_count?: number | string;
  comments_count?: number | string;
  shares_count?: number | string;
  views_count?: number | string;
  follower_count?: number | string;
  validation_count: number | string;
  spotter_id: string;
  hours_since_post?: number;
  source_url?: string;
  hashtags?: string[];
  post_url?: string;
  trending_position?: number;
  confidence_score?: number;
  approve_count?: number | string;
  reject_count?: number | string;
  virality_prediction?: number;
  evidence?: any;
  wave_score?: number;
  quality_score?: number;
  trend_velocity?: string;
  trend_size?: string;
  sentiment?: number;
  ai_angle?: string;
  audience_age?: string[];
  is_ai_generated?: boolean;
  // Bounty fields
  is_bounty_submission?: boolean;
  bounty_id?: string;
  bounty_approve_count?: number;
  bounty_reject_count?: number;
  bounty_info?: {
    id: string;
    title: string;
    enterprise_name?: string;
    price_per_spot: number;
    urgency_level: 'lightning' | 'rapid' | 'standard';
    expires_at: string;
  };
}

interface QualityCriteria {
  id: string;
  label: string;
  description: string;
  met: boolean;
}

export default function ValidatePageFixed() {
  const { user, refreshUser } = useAuth();
  const { notification, showXP, dismissNotification } = useXPNotification();
  const [trends, setTrends] = useState<TrendToValidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [stats, setStats] = useState({
    validated_today: 0,
    xp_today: 0,
    validated_total: 0,
    xp_total: 0
  });
  const [sessionValidations, setSessionValidations] = useState(0);
  const [qualityCriteria, setQualityCriteria] = useState<QualityCriteria[]>([]);
  const [lastError, setLastError] = useState('');
  const [initialTrendsCount, setInitialTrendsCount] = useState(0);
  const [imageError, setImageError] = useState(false);

  const formatCount = (count?: number | string): string => {
    // Handle potential numeric overflow by converting to BigInt if needed
    let numCount: number;
    
    if (typeof count === 'string') {
      // Parse string numbers that might be too large
      const parsed = parseFloat(count);
      if (isNaN(parsed) || !isFinite(parsed)) return '0';
      numCount = parsed;
    } else if (typeof count === 'number') {
      if (!count || isNaN(count) || !isFinite(count)) return '0';
      numCount = count;
    } else {
      return '0';
    }
    
    if (numCount >= 1000000) return `{(numCount / 1000000).toFixed(1)}M`;
    if (numCount >= 1000) return `{(numCount / 1000).toFixed(1)}K`;
    return Math.floor(numCount).toString();
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
        met: Number(trend.likes_count || 0) > 0 || Number(trend.views_count || 0) > 0 || Number(trend.comments_count || 0) > 0
      },
      {
        id: 'has_source',
        label: 'Source Link',
        description: 'Original post link provided',
        met: !!(trend.post_url || trend.source_url)
      },
      {
        id: 'creator_info',
        label: 'Creator Info',
        description: 'Creator details provided',
        met: !!(trend.creator_handle || trend.creator_name)
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
      // First, try to get the column structure to see what's available
      let validatedIds: string[] = [];
      
      try {
        // Get validated trends using trend_id column
        const { data: validatedTrends, error: validationError } = await supabase
          .from('trend_validations')
          .select('trend_id')
          .eq('validator_id', user.id);

        if (validationError) {
          console.error('Error loading validated trends:', validationError);
          setLastError('Unable to load your validation history. Some trends may appear that you\'ve already voted on.');
        } else {
          validatedIds = validatedTrends?.map(v => v.trend_id).filter(id => id != null) || [];
        }
      } catch (error) {
        console.error('Error querying validation history:', error);
        setLastError('Unable to load your validation history. Some trends may appear that you\'ve already voted on.');
      }
      console.log('Already validated trend IDs:', validatedIds.length);
      console.log('Validated IDs:', validatedIds);
      
      // Get all trends that aren't from this user, including bounty information
      // Select all columns we need, being explicit to avoid ambiguity
      const { data: trendsData, error } = await supabase
        .from('trend_submissions')
        .select(`
          *,
          bounties!trend_submissions_bounty_id_fkey(
            id,
            title,
            price_per_spot,
            urgency_level,
            expires_at,
            enterprise_id
          )
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
      
      console.log(`After filtering out validated trends: {filteredTrends.length} trends available`);
      
      // Debug: Show which trends were filtered out
      const filteredOutTrends = (trendsData || []).filter(trend => 
        validatedIds.includes(trend.id)
      );
      if (filteredOutTrends.length > 0) {
        console.log(`🚫 Filtered out {filteredOutTrends.length} already validated trends:`, 
          filteredOutTrends.map(t => ({ id: t.id.substring(0, 8), desc: t.description.substring(0, 30) }))
        );
      }
      
      // Process trends and calculate time since submission
      const processedTrends = filteredTrends.map(trend => {
        const hoursAgo = Math.round((Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60));
        
        // Check if this is a bounty submission
        const bountyInfo = trend.bounties ? {
          id: trend.bounties.id,
          title: trend.bounties.title,
          price_per_spot: trend.bounties.price_per_spot,
          urgency_level: trend.bounties.urgency_level,
          expires_at: trend.bounties.expires_at,
          enterprise_name: trend.bounties.enterprise_name
        } : undefined;
        
        return {
          ...trend,
          // Bounty information
          is_bounty_submission: !!trend.bounty_id,
          bounty_info: bountyInfo,
          bounty_approve_count: trend.bounty_approve_count || 0,
          bounty_reject_count: trend.bounty_reject_count || 0,
          // Ensure numeric fields are properly handled
          likes_count: trend.likes_count,
          comments_count: trend.comments_count,
          shares_count: trend.shares_count,
          views_count: trend.views_count,
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

      // Calculate xp using EARNINGS_STANDARD
      const spotterTier = (user?.spotter_tier || 'lxp') as Tier;
      const todayXP = calculateValidationXP(todayValidations?.length || 0, spotterTier);
      const totalXP = calculateValidationXP(allValidations?.length || 0, spotterTier);
      
      setStats({
        validated_today: todayValidations?.length || 0,
        xp_today: parseFloat(todayXP.toFixed(2)),
        validated_total: allValidations?.length || 0,
        xp_total: parseFloat(totalXP.toFixed(2))
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

      console.log('Submitting validation:', { trend_id: trendId, vote: voteType });
      
      // Direct insert approach to avoid RPC function issues
      // Direct insert to trend_validations table
      console.log('Submitting validation directly:', { trend_id: trendId, vote: voteType });
      
      // First check if user already voted
      const { data: existingVote } = await supabase
        .from('trend_validations')
        .select('id')
        .eq('trend_id', trendId)
        .eq('validator_id', user.id)
        .single();

      if (existingVote) {
        setLastError('You have already validated this trend.');
        nextTrend();
        return;
      }

      // Get validation reward - 2 cents base, 3x for bounty submissions
      const isBountySubmission = trends[currentIndex].is_bounty_submission || false;
      const rewardAmount = isBountySubmission ? 0.06 : 0.02; // 3x reward for bounty validations
      
      // Insert the validation - use only the columns that exist in the database
      const validationPayload = {
        trend_id: trendId,
        validator_id: user.id,
        vote: voteType  // Only use the vote column, not is_genuine which doesn't exist
      };

      console.log('Attempting insert with payload:', validationPayload);

      const { data: validationData, error: validationError } = await supabase
        .from('trend_validations')
        .insert(validationPayload)
        .select()
        .single();

      console.log('Insert Response:', { validationData, validationError });
      
      if (validationError) {
        console.error('Validation error details:', {
          message: validationError.message,
          details: validationError.details,
          hint: validationError.hint,
          code: validationError.code
        });
        
        // Handle specific errors
        if (validationError.message?.includes('duplicate') || validationError.code === '23505') {
          setLastError('You have already validated this trend.');
          nextTrend();
        } else if (validationError.message?.includes('not found') || validationError.code === '23503') {
          setLastError('This trend no longer exists.');
          nextTrend();
        } else {
          // Show the actual error for debugging
          setLastError(`Validation error: {validationError.message || 'Unknown error'}`);
        }
        return;
      }

      // Success! Now create xp entry
      setSessionValidations(prev => prev + 1);
      
      // AGGRESSIVE FIX: Delete any existing validation xp for this trend, then create the correct one
      // This handles the case where database triggers create wrong amounts
      await supabase
        .from('xp_ledger')
        .delete()
        .eq('user_id', user.id)
        .eq('trend_id', trendId)
        .eq('type', 'validation');
      
      // Wait a moment to ensure deletion completes before recreating
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Now create the CORRECT xp entry (exactly 0.02)
      const { error: xpError } = await supabase
        .from('xp_ledger')
        .insert({
          user_id: user.id,
          trend_id: trendId,
          amount: rewardAmount, // This is 0.02
          type: 'validation',
          transaction_type: 'validation_vote',
          status: 'approved',
          description: `Validation: Verified trend`,
          metadata: {
            vote: voteType,
            validation_id: validationData.id,
            corrected: true // Flag to indicate this is the corrected amount
          }
        });
      
      if (xpError) {
        console.error('Failed to create xp entry:', xpError);
        // Don't fail the validation, just log the error
      } else {
        console.log('XP entry created for validation:', rewardAmount);
        
        // Show subtle xp notification
        const notificationMessage = isBountySubmission 
          ? `+{rewardAmount.toFixed(2)} (3x Bounty Bonus!)` 
          : `+{rewardAmount.toFixed(2)}`;
        showXP(
          rewardAmount,
          'validation',
          notificationMessage,
          [] // No breakdown needed for subtle notification
        );
        
        // Update user xp immediately
        refreshUser();
      }
      
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
          <p className="text-gray-600 mb-8">Join our community of trend validators and start xp rewards.</p>
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
                <p className="text-4xl font-bold bg-gradient-to-br from-green-600 to-emerald-600 bg-clip-text text-transparent">{stats.xp_today.toFixed(2)}</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      {/* XP Notification */}
      {notification && (
        <XPDisplay 
          notification={notification} 
          onDismiss={dismissNotification} 
        />
      )}
      {/* Elegant Header */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Trend Validation</h1>
                  <p className="text-sm text-gray-600">{trends.length} trends waiting</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setLoading(true);
                  loadTrends().finally(() => setLoading(false));
                }}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 group"
                title="Refresh trends"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 {loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-300'}`} />
              </button>
              <div className="hidden lg:flex items-center gap-3 text-right">
                <div>
                  <p className="text-xs text-gray-500">Today's XP</p>
                  <p className="text-sm font-bold text-gray-900">{stats.xp_today.toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl shadow-md">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    <span className="text-sm font-bold">{sessionValidations} validated</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-5xl mx-auto flex-1 flex flex-col">
        {/* Error Message */}
        {lastError && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50/80 backdrop-blur border border-red-200/50 rounded-xl text-red-700 flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{lastError}</span>
            </div>
            <button onClick={() => setLastError('')} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Main Validation Card */}
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl flex-1 overflow-hidden">
          <div className="grid lg:grid-cols-5 h-full min-h-[600px]">
            {/* Image Section - Larger */}
            <div className="lg:col-span-3 relative bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center h-full">
                {imageUrl && !imageError ? (
                  <>
                    <img
                      src={imageUrl}
                      alt="Trend submission"
                      className="w-full h-full object-cover"
                      onError={() => {
                        console.log('Image failed to load:', imageUrl);
                        setImageError(true);
                      }}
                    />
                    {/* Engagement Overlay */}
                    {(Number(currentTrend.likes_count) > 0 || Number(currentTrend.views_count) > 0 || Number(currentTrend.comments_count) > 0 || Number(currentTrend.shares_count) > 0) && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2">
                        <div className="flex gap-2 text-white">
                          {Number(currentTrend.views_count) > 0 && (
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              <span className="text-xs font-medium">{formatCount(currentTrend.views_count)}</span>
                            </div>
                          )}
                          {Number(currentTrend.likes_count) > 0 && (
                            <div className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              <span className="text-xs font-medium">{formatCount(currentTrend.likes_count)}</span>
                            </div>
                          )}
                          {Number(currentTrend.comments_count) > 0 && (
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              <span className="text-xs font-medium">{formatCount(currentTrend.comments_count)}</span>
                            </div>
                          )}
                          {Number(currentTrend.shares_count) > 0 && (
                            <div className="flex items-center gap-1">
                              <Share2 className="w-3 h-3" />
                              <span className="text-xs font-medium">{formatCount(currentTrend.shares_count)}</span>
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

            {/* Details Section - Narrower but taller */}
            <div className="lg:col-span-2 flex flex-col h-full bg-gradient-to-b from-white to-gray-50/50">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Bounty Card - Show if this is a bounty submission */}
                  {currentTrend.is_bounty_submission && currentTrend.bounty_info && (
                    <BountyTrendCard 
                      bountyInfo={{
                        ...currentTrend.bounty_info,
                        current_votes: {
                          approve: currentTrend.bounty_approve_count || 0,
                          reject: currentTrend.bounty_reject_count || 0
                        }
                      }}
                      isValidating={true}
                    />
                  )}
                  
                  {/* Submission Time Badge */}
                  <div className="mb-2 inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                    <Clock className="w-3 h-3" />
                    {currentTrend.hours_since_post}h ago
                  </div>

                  {/* Title and Caption */}
                  <h2 className="text-lg font-bold text-gray-900 mb-3 leading-tight">
                    {currentTrend.description || 'No description provided'}
                  </h2>
                  
                  {currentTrend.post_caption && (
                    <p className="text-gray-700 text-sm leading-relaxed mb-3 italic">
                      "{currentTrend.post_caption}"
                    </p>
                  )}

                  {/* Metadata Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {currentTrend.platform && (
                      <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium">
                        <TrendingUp className="w-4 h-4" />
                        {currentTrend.platform}
                      </span>
                    )}
                    {currentTrend.category && (
                      <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
                        <Hash className="w-4 h-4" />
                        {currentTrend.category.replace(/_/g, ' ')}
                      </span>
                    )}
                    {currentTrend.creator_handle && (
                      <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium">
                        <User className="w-4 h-4" />
                        {currentTrend.creator_handle}
                      </span>
                    )}
                  </div>

                  {/* Hashtags */}
                  {currentTrend.hashtags && currentTrend.hashtags.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {currentTrend.hashtags.slice(0, 5).map((tag, idx) => (
                          <span key={idx} className="text-sm bg-gray-100 px-2 py-1 rounded-lg text-gray-700 font-medium">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trend Intelligence Assessment */}
                  {(currentTrend.trend_velocity || currentTrend.trend_size || currentTrend.sentiment || currentTrend.ai_angle || currentTrend.wave_score) && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 mb-4">
                      <h3 className="font-semibold text-gray-900 text-base mb-3 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-purple-600" />
                        Trend Intelligence
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {currentTrend.trend_velocity && (
                          <div className="bg-white/70 rounded-lg p-2">
                            <span className="text-xs text-gray-600 block">Velocity:</span>
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {currentTrend.trend_velocity.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}
                        {currentTrend.trend_size && (
                          <div className="bg-white/70 rounded-lg p-2">
                            <span className="text-xs text-gray-600 block">Size:</span>
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {currentTrend.trend_size.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}
                        {currentTrend.sentiment !== undefined && (
                          <div className="bg-white/70 rounded-lg p-2">
                            <span className="text-xs text-gray-600 block">Sentiment:</span>
                            <span className={`text-sm font-medium {
                              currentTrend.sentiment >= 70 ? 'text-green-600' :
                              currentTrend.sentiment >= 40 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {currentTrend.sentiment}% positive
                            </span>
                          </div>
                        )}
                        {currentTrend.wave_score !== undefined && (
                          <div className="bg-white/70 rounded-lg p-2">
                            <span className="text-xs text-gray-600 block">Wave Score:</span>
                            <div className="flex items-center gap-1">
                              <Star className={`w-3 h-3 {currentTrend.wave_score >= 70 ? 'text-yellow-500' : 'text-gray-400'}`} fill="currentColor" />
                              <span className="text-sm font-medium text-gray-900">{currentTrend.wave_score}/100</span>
                            </div>
                          </div>
                        )}
                        {currentTrend.ai_angle && currentTrend.ai_angle !== 'not_ai' && (
                          <div className="col-span-2 bg-orange-100 border border-orange-200 rounded-lg p-2">
                            <span className="text-xs text-orange-700 block">AI Content Detected:</span>
                            <span className="text-sm font-medium text-orange-800 capitalize">
                              {currentTrend.ai_angle.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}
                        {currentTrend.audience_age && currentTrend.audience_age.length > 0 && (
                          <div className="col-span-2 bg-blue-100 border border-blue-200 rounded-lg p-2">
                            <span className="text-xs text-blue-700 block">Target Audience:</span>
                            <span className="text-sm font-medium text-blue-800">
                              {currentTrend.audience_age.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Validation Progress */}
                  {(Number(currentTrend.approve_count) > 0 || Number(currentTrend.reject_count) > 0) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Community Validation</h4>
                      <div className="flex gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <ThumbsUp className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-gray-700">{Number(currentTrend.approve_count) || 0}/3 Verified</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ThumbsDown className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-gray-700">{Number(currentTrend.reject_count) || 0}/3 Rejected</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-300"
                          style={{ width: `{Math.min((Number(currentTrend.approve_count) || 0) * 33.33, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Submission Details */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-gray-900 text-base mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      Trend Details
                    </h3>
                    <div className="space-y-2.5">
                      {currentTrend.post_url && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Source:</span>
                          <a href={currentTrend.post_url} target="_blank" rel="noopener noreferrer" 
                             className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1">
                            View Original Post
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {currentTrend.follower_count && Number(currentTrend.follower_count) > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Creator Reach:</span>
                          <span className="text-sm font-bold text-purple-600">{formatCount(currentTrend.follower_count)} followers</span>
                        </div>
                      )}
                      {currentTrend.trending_position && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Trending:</span>
                          <span className="text-sm font-bold text-green-600">#{currentTrend.trending_position}</span>
                        </div>
                      )}
                      {currentTrend.evidence && typeof currentTrend.evidence === 'object' && (() => {
                        // Only show key evidence fields
                        const keyFields = ['platform', 'region', 'spreadSpeed', 'categories', 'moods'];
                        const relevantEntries = Object.entries(currentTrend.evidence)
                          .filter(([key, value]) => keyFields.includes(key) && value && value !== '' && value !== null)
                          .slice(0, 3); // Max 3 items
                        
                        if (relevantEntries.length === 0) return null;
                        
                        return (
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <div className="space-y-1">
                              {relevantEntries.map(([key, value]) => {
                                const labels: Record<string, string> = {
                                  platform: 'Platform',
                                  region: 'Region',
                                  spreadSpeed: 'Speed',
                                  categories: 'Categories',
                                  moods: 'Moods'
                                };
                                
                                let displayValue = value;
                                if (Array.isArray(value)) {
                                  displayValue = value.slice(0, 2).join(', ');
                                  if (value.length > 2) displayValue += '...';
                                }
                                
                                return (
                                  <div key={key} className="flex justify-between items-center">
                                    <span className="text-xs text-gray-500">{labels[key as string] || key}:</span>
                                    <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">
                                      {String(displayValue)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Quick Quality Check */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-md p-2">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 text-xs">Quick Check</h3>
                      <div className={`text-xs font-bold {
                        qualityScore >= 80 ? 'text-green-600' :
                        qualityScore >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {qualityScore}%
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      {qualityCriteria.slice(0, 4).map(criterion => (
                        <div key={criterion.id} className="flex items-center gap-1">
                          <div className={`w-2.5 h-2.5 rounded-full {
                            criterion.met ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                          <p className={`text-[10px] {
                            criterion.met ? 'text-gray-700 font-medium' : 'text-gray-400'
                          }`}>
                            {criterion.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200/50 bg-white/80 backdrop-blur p-6">
                <div className="text-center mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Is this trending?</h3>
                  <p className="text-xs text-gray-600">Help validate this trend submission</p>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleValidation('reject')}
                    disabled={validating}
                    className="group relative overflow-hidden bg-white border-2 border-red-200 hover:border-red-400 hover:shadow-lg text-red-700 rounded-xl py-3 px-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative flex flex-col items-center gap-1">
                      <ThumbsDown className="w-5 h-5" />
                      <span className="text-xs font-semibold">Reject</span>
                      <span className="text-[10px] text-gray-500">← key</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleValidation('skip')}
                    disabled={validating}
                    className="group relative overflow-hidden bg-white border-2 border-gray-200 hover:border-gray-400 hover:shadow-lg text-gray-700 rounded-xl py-3 px-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative flex flex-col items-center gap-1">
                      <SkipForward className="w-5 h-5" />
                      <span className="text-xs font-semibold">Skip</span>
                      <span className="text-[10px] text-gray-500">space</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleValidation('approve')}
                    disabled={validating}
                    className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl py-3 px-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transform hover:scale-105"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative flex flex-col items-center gap-1">
                      <ThumbsUp className="w-5 h-5" />
                      <span className="text-xs font-semibold">Approve</span>
                      <span className="text-[10px] text-green-100">→ key</span>
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
            className="mt-6 bg-white/80 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Great work this session!</p>
                  <p className="text-lg font-bold text-gray-900">{sessionValidations} trends validated</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Session XP</p>
                <p className="text-xl font-bold text-green-600">+{formatCurrency(calculateValidationXP(sessionValidations, (user?.spotter_tier || 'lxp') as Tier))}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}