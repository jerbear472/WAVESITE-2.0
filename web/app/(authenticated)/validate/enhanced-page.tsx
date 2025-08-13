'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp as TrendingUpIcon,
  X as XIcon,
  Check as CheckIcon,
  ExternalLink as ExternalLinkIcon,
  Award as AwardIcon,
  Zap as ZapIcon,
  Target as TargetIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Eye as EyeIcon,
  Share2 as ShareIcon,
  Hash as HashIcon,
  Clock as ClockIcon,
  User as UserIcon,
  AlertCircle as AlertCircleIcon,
  SkipForward as SkipForwardIcon,
  Info as InfoIcon,
  ChevronUp as ChevronUpIcon,
  ChevronDown as ChevronDownIcon,
  Shield as ShieldIcon,
  Star as StarIcon
} from 'lucide-react';

interface TrendToVerify {
  id: string;
  created_at: string;
  category: string;
  description: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  post_url?: string;
  spotter_id: string;
  evidence?: {
    title?: string;
    [key: string]: any;
  };
  creator_handle?: string;
  creator_name?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  hashtags?: string[];
  platform?: string;
  validation_count: number;
  weighted_consensus_score?: number;
  stage?: string;
  validation_difficulty?: number;
  spotter?: {
    username?: string;
    email?: string;
  };
}

interface UserStats {
  verified_today: number;
  earnings_today: number;
  accuracy_score: number;
  validation_reputation: number;
  vote_weight: number;
  validation_streak: number;
  expertise_level?: string;
}

interface RateLimitInfo {
  can_validate: boolean;
  validations_remaining_today: number;
  validations_remaining_hour: number;
  reset_time: string;
}

export default function EnhancedVerify() {
  const { user } = useAuth();
  const [trends, setTrends] = useState<TrendToVerify[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [lastAction, setLastAction] = useState<'trending' | 'not-trending' | 'skip' | null>(null);
  const [stats, setStats] = useState<UserStats>({
    verified_today: 0,
    earnings_today: 0,
    accuracy_score: 0,
    validation_reputation: 0.5,
    vote_weight: 1.0,
    validation_streak: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [confidenceScore, setConfidenceScore] = useState(0.75);
  const [reasoning, setReasoning] = useState('');
  const [showReasoningInput, setShowReasoningInput] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [similarTrends, setSimilarTrends] = useState<any[]>([]);
  const [consensusData, setConsensusData] = useState<any>(null);
  const [validationStartTime, setValidationStartTime] = useState<number>(0);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!currentTrend || verifying) return;
      
      if (e.key === 'ArrowLeft') {
        handleVerify(false);
      } else if (e.key === 'ArrowRight') {
        handleVerify(true);
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        handleSkip();
      } else if (e.key >= '1' && e.key <= '5') {
        // Number keys for confidence: 1 = 20%, 2 = 40%, 3 = 60%, 4 = 80%, 5 = 100%
        setConfidenceScore(parseInt(e.key) * 0.2);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, verifying, trends, confidenceScore]);

  useEffect(() => {
    if (user) {
      checkRateLimit();
      fetchTrendsToVerify();
      fetchUserStats();
    }
  }, [user]);

  useEffect(() => {
    // Start timer when viewing a trend
    if (currentTrend) {
      setValidationStartTime(Date.now());
      fetchSimilarTrends(currentTrend.category);
      fetchConsensusData(currentTrend.id);
    }
  }, [currentIndex]);

  const checkRateLimit = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('check_rate_limit', { p_user_id: user.id });

      if (!error && data && data.length > 0) {
        setRateLimit(data[0]);
      }
    } catch (error) {
      console.error('Error checking rate limit:', error);
    }
  };

  const fetchSimilarTrends = async (category: string) => {
    try {
      const { data } = await supabase
        .from('trend_submissions')
        .select('id, description, stage, weighted_consensus_score')
        .eq('category', category)
        .in('stage', ['trending', 'viral'])
        .order('created_at', { ascending: false })
        .limit(3);

      setSimilarTrends(data || []);
    } catch (error) {
      console.error('Error fetching similar trends:', error);
    }
  };

  const fetchConsensusData = async (trendId: string) => {
    try {
      const { data } = await supabase
        .rpc('calculate_weighted_consensus', { p_trend_id: trendId });

      if (data && data.length > 0) {
        setConsensusData(data[0]);
      }
    } catch (error) {
      console.error('Error fetching consensus data:', error);
    }
  };

  const fetchTrendsToVerify = async () => {
    try {
      // Fetch trends with enhanced filtering
      const { data: trendsData, error: trendsError } = await supabase
        .from('trend_submissions')
        .select('*')
        .neq('spotter_id', user?.id)
        .in('stage', ['submitted', 'validating'])
        .eq('auto_rejected', false)
        .eq('auto_approved', false)
        .order('validation_difficulty', { ascending: false }) // Prioritize harder trends
        .order('created_at', { ascending: false })
        .limit(20);

      if (trendsError) throw trendsError;

      // Get list of trends this user has already validated
      const { data: validatedTrends, error: validatedError } = await supabase
        .from('trend_validations')
        .select('trend_id')
        .eq('validator_id', user?.id);

      if (validatedError) throw validatedError;

      // Filter out already validated trends
      const validatedTrendIds = new Set(validatedTrends?.map(v => v.trend_id) || []);
      const unvalidatedTrends = (trendsData || []).filter(trend => !validatedTrendIds.has(trend.id));

      // Fetch user details for each trend
      const userIds = [...new Set(unvalidatedTrends.map(t => t.spotter_id) || [])];
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, username, email')
        .in('id', userIds);

      const userMap = (usersData || []).reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<string, any>);

      const transformedData = unvalidatedTrends.map(trend => ({
        ...trend,
        spotter: userMap[trend.spotter_id] || { username: 'Anonymous', email: null }
      }));

      setTrends(transformedData);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    setStatsLoading(true);
    try {
      // Get user profile with enhanced stats
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profile) {
        // Get today's earnings with new calculation
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: earnings } = await supabase
          .from('earnings_ledger')
          .select('amount')
          .eq('user_id', user?.id)
          .eq('earning_type', 'validation')
          .gte('created_at', today.toISOString());

        const totalEarnings = earnings?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

        // Get expertise level for most validated category
        const { data: expertise } = await supabase
          .from('validator_expertise')
          .select('expertise_level, category')
          .eq('user_id', user?.id)
          .order('validations_count', { ascending: false })
          .limit(1);

        setStats({
          verified_today: profile.total_validations || 0,
          earnings_today: totalEarnings,
          accuracy_score: profile.correct_validations && profile.total_validations 
            ? (profile.correct_validations / profile.total_validations * 100) 
            : 0,
          validation_reputation: profile.validation_reputation || 0.5,
          vote_weight: profile.vote_weight || 1.0,
          validation_streak: profile.validation_streak || 0,
          expertise_level: expertise?.[0]?.expertise_level
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleVerify = async (isValid: boolean) => {
    if (verifying || !trends[currentIndex] || !rateLimit?.can_validate) return;

    setVerifying(true);
    const trend = trends[currentIndex];
    const validationTime = Math.floor((Date.now() - validationStartTime) / 1000);

    try {
      // Submit enhanced validation vote
      const { data: insertData, error: insertError } = await supabase
        .from('trend_validations')
        .insert({
          trend_id: trend.id,
          validator_id: user?.id,
          vote: isValid ? 'verify' : 'reject',
          confidence_score: confidenceScore,
          reasoning: showReasoningInput ? reasoning : null,
          validation_time_seconds: validationTime,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update rate limits
      const { error: rateLimitError } = await supabase
        .from('validation_rate_limits')
        .update({
          validations_today: (rateLimit.validations_remaining_today - 1),
          validations_this_hour: (rateLimit.validations_remaining_hour - 1),
          last_validation_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (rateLimitError) console.error('Rate limit update error:', rateLimitError);

      setLastAction(isValid ? 'trending' : 'not-trending');

      // Calculate estimated payment
      const estimatedPayment = await calculateEstimatedPayment(trend);
      
      // Show feedback with estimated earnings
      showValidationFeedback(isValid, estimatedPayment);

      // Reset form
      setConfidenceScore(0.75);
      setReasoning('');
      setShowReasoningInput(false);

      await fetchUserStats();
      await checkRateLimit();

      setTimeout(() => {
        setLastAction(null);
        if (currentIndex < trends.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          setCurrentIndex(trends.length);
        }
      }, 500);
    } catch (error: any) {
      console.error('Error verifying trend:', error);
      alert(`Error: ${error.message || 'Failed to submit validation. Please try again.'}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleSkip = () => {
    if (verifying) return;
    
    setLastAction('skip');
    setTimeout(() => {
      setLastAction(null);
      if (currentIndex < trends.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setCurrentIndex(trends.length);
      }
    }, 300);
  };

  const calculateEstimatedPayment = async (trend: TrendToVerify) => {
    // Simplified calculation for UI feedback
    const baseRate = 0.05;
    const accuracyMultiplier = stats.accuracy_score >= 80 ? 1.5 : 1.0;
    const difficultyBonus = (trend.validation_difficulty || 1) * 0.03;
    const confidenceBonus = (confidenceScore >= 0.9 || confidenceScore <= 0.1) ? 0.01 : 0;
    
    return (baseRate * accuracyMultiplier + difficultyBonus + confidenceBonus);
  };

  const showValidationFeedback = (isValid: boolean, estimatedPayment: number) => {
    // This would show a toast or modal with feedback
    console.log(`Vote submitted! Estimated earnings: $${estimatedPayment.toFixed(3)}`);
  };

  const formatEngagementCount = (count?: number): string => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  const getExpertiseBadgeColor = (level?: string) => {
    switch (level) {
      case 'specialist': return 'from-purple-500 to-pink-600';
      case 'expert': return 'from-blue-500 to-purple-600';
      case 'intermediate': return 'from-green-500 to-blue-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const currentTrend = trends[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading trends to verify...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 safe-area-top safe-area-bottom">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <TrendingUpIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-responsive-2xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
                  Enhanced Trend Verification
                </h1>
                <p className="text-responsive-sm text-gray-400 mt-1">
                  Help validate trends with confidence scoring
                </p>
              </div>
            </div>
            
            {/* Rate Limit Display */}
            {rateLimit && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl px-4 py-2 border border-gray-700">
                <p className="text-xs text-gray-400">Validations remaining</p>
                <p className="text-sm font-semibold text-white">
                  {rateLimit.validations_remaining_hour} / hour
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Enhanced Stats Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-800/50 p-6 mb-8"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-4 border border-blue-500/20 hover:border-blue-500/40 transition-all"
            >
              <div className="relative text-center">
                <ZapIcon className="w-6 h-6 text-blue-400 mx-auto mb-2 opacity-50" />
                <p className="text-responsive-xl font-bold text-blue-400">{stats.verified_today}</p>
                <p className="text-responsive-xs text-gray-400 mt-1">Verified Today</p>
                {stats.validation_streak > 0 && (
                  <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                    {stats.validation_streak}
                  </div>
                )}
              </div>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-600/10 p-4 border border-green-500/20"
            >
              <div className="relative text-center">
                <AwardIcon className="w-6 h-6 text-green-400 mx-auto mb-2 opacity-50" />
                <p className="text-responsive-xl font-bold text-green-400">${stats.earnings_today.toFixed(2)}</p>
                <p className="text-responsive-xs text-gray-400 mt-1">Earned Today</p>
              </div>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-600/10 p-4 border border-purple-500/20"
            >
              <div className="relative text-center">
                <TargetIcon className="w-6 h-6 text-purple-400 mx-auto mb-2 opacity-50" />
                <p className="text-responsive-xl font-bold text-purple-400">
                  {stats.accuracy_score.toFixed(1)}%
                </p>
                <p className="text-responsive-xs text-gray-400 mt-1">Accuracy</p>
              </div>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-600/10 p-4 border border-amber-500/20"
            >
              <div className="relative text-center">
                <ShieldIcon className="w-6 h-6 text-amber-400 mx-auto mb-2 opacity-50" />
                <p className="text-responsive-xl font-bold text-amber-400">
                  {(stats.validation_reputation * 100).toFixed(0)}
                </p>
                <p className="text-responsive-xs text-gray-400 mt-1">Reputation</p>
                <div className="mt-2">
                  <div className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getExpertiseBadgeColor(stats.expertise_level)} text-white`}>
                    {stats.expertise_level || 'Novice'}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Trend Card */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
            {currentTrend && currentIndex < trends.length ? (
              <motion.div 
                key={currentTrend.id}
                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -50 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-gray-800/50"
              >
                {/* Difficulty Indicator */}
                {currentTrend.validation_difficulty && (
                  <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1">
                    <p className="text-xs text-gray-400">Difficulty</p>
                    <div className="flex gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < Math.ceil((currentTrend.validation_difficulty || 0.5) * 5)
                              ? 'bg-yellow-400'
                              : 'bg-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {(currentTrend.thumbnail_url || currentTrend.screenshot_url) && (
                  <div className="relative h-48 sm:h-64 lg:h-80 overflow-hidden">
                    <img
                      src={currentTrend.thumbnail_url || currentTrend.screenshot_url}
                      alt="Trend"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
                  </div>
                )}
                
                <div className="p-6">
                  {/* Trend Details */}
                  <h2 className="text-2xl font-bold text-white mb-4">
                    {currentTrend.evidence?.title || currentTrend.description}
                  </h2>
                  
                  {/* Engagement Metrics */}
                  {(currentTrend.likes_count || currentTrend.views_count) && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      {currentTrend.likes_count !== undefined && (
                        <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                          <div className="flex items-center gap-2">
                            <HeartIcon className="w-5 h-5 text-red-400" />
                            <span className="text-white font-semibold">
                              {formatEngagementCount(currentTrend.likes_count)}
                            </span>
                          </div>
                        </div>
                      )}
                      {/* Add other metrics */}
                    </div>
                  )}

                  {/* Confidence Slider */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-300">
                        Confidence Level
                      </label>
                      <span className="text-lg font-bold text-white">
                        {(confidenceScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={confidenceScore}
                      onChange={(e) => setConfidenceScore(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${confidenceScore * 100}%, #374151 ${confidenceScore * 100}%, #374151 100%)`
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Not Sure</span>
                      <span>Very Confident</span>
                    </div>
                  </div>

                  {/* Optional Reasoning */}
                  <div className="mb-6">
                    <button
                      onClick={() => setShowReasoningInput(!showReasoningInput)}
                      className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2"
                    >
                      <InfoIcon className="w-4 h-4" />
                      Add reasoning (optional)
                    </button>
                    {showReasoningInput && (
                      <textarea
                        value={reasoning}
                        onChange={(e) => setReasoning(e.target.value)}
                        placeholder="Explain your decision..."
                        className="mt-2 w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                        rows={3}
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-12 text-center border border-gray-800/50"
              >
                <CheckIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-3">All Caught Up!</h3>
                <p className="text-gray-400">Check back later for more trends.</p>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Current Consensus */}
            {consensusData && currentTrend && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800"
              >
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Current Consensus</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Weighted Score</span>
                      <span className="text-white font-semibold">
                        {((consensusData.weighted_score + 1) * 50).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full"
                        style={{ width: `${(consensusData.weighted_score + 1) * 50}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{consensusData.vote_count} votes</span>
                    <span>Avg confidence: {(consensusData.confidence_avg * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Similar Trends */}
            {similarTrends.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800"
              >
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Similar Validated Trends</h3>
                <div className="space-y-2">
                  {similarTrends.map((trend) => (
                    <div key={trend.id} className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-sm text-gray-300 line-clamp-2">{trend.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          trend.stage === 'viral' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {trend.stage}
                        </span>
                        <span className="text-xs text-gray-500">
                          Score: {((trend.weighted_consensus_score + 1) * 50).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {currentTrend && currentIndex < trends.length && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 space-y-4"
          >
            <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-800/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 text-center">
                Is this a trending topic?
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVerify(false)}
                  disabled={verifying || !rateLimit?.can_validate}
                  className={`flex-1 border-2 py-4 px-6 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 group ${
                    lastAction === 'not-trending' 
                      ? 'bg-red-500 border-red-500 text-white' 
                      : 'bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500'
                  }`}
                >
                  <XIcon className="w-6 h-6" />
                  <span>Not Trending</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSkip}
                  disabled={verifying}
                  className="px-6 py-4 rounded-xl font-semibold bg-gray-700/50 hover:bg-gray-700 text-gray-300 transition-all flex items-center justify-center gap-2"
                >
                  <SkipForwardIcon className="w-5 h-5" />
                  <span>Skip</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVerify(true)}
                  disabled={verifying || !rateLimit?.can_validate}
                  className={`flex-1 py-4 px-6 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 ${
                    lastAction === 'trending'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                  }`}
                >
                  <CheckIcon className="w-6 h-6" />
                  <span>Yes, Trending</span>
                </motion.button>
              </div>
            </div>
            
            {/* Enhanced Keyboard Shortcuts */}
            <div className="text-center text-xs text-gray-500">
              <p>Keyboard shortcuts: 
                <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300 mx-1">←</kbd> Not Trending
                <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300 mx-1">→</kbd> Trending
                <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300 mx-1">↓/S</kbd> Skip
                <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300 mx-1">1-5</kbd> Set Confidence
              </p>
            </div>
          </motion.div>
        )}

        {/* Progress Indicator */}
        {trends.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6"
          >
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Progress</span>
              <span className="font-semibold text-white">{currentIndex + 1} / {trends.length}</span>
            </div>
            <div className="w-full bg-gray-800/50 rounded-full h-3 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIndex + 1) / trends.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}