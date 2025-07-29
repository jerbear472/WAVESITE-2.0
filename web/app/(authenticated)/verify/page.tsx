'use client';
// Enhanced Performance-Based Verification Page - V3 with improved UI/UX
import { useEffect, useState, useCallback, useRef } from 'react';
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
  Star as StarIcon,
  DollarSign as DollarSignIcon,
  Sparkles as SparklesIcon,
  Trophy as TrophyIcon,
  Flame as FlameIcon,
  BarChart3 as BarChart3Icon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { PerformanceTierDisplay } from '@/components/PerformanceTierDisplay';
import { ConsensusVisualization } from '@/components/ConsensusVisualization';
import { 
  PerformanceManagementService, 
  UserPerformanceMetrics 
} from '@/lib/performanceManagementService';

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

export default function Verify() {
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
  const [performanceMetrics, setPerformanceMetrics] = useState<UserPerformanceMetrics | null>(null);
  const [estimatedPayment, setEstimatedPayment] = useState<number>(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  // Removed swipe gesture handling for better UX

  const performanceService = PerformanceManagementService.getInstance();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!currentTrend || verifying) return;
      
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handleVerify(false);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        handleVerify(true);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === ' ') {
        handleSkip();
      } else if (e.key >= '1' && e.key <= '5') {
        setConfidenceScore(parseInt(e.key) * 0.2);
      } else if (e.key === '?') {
        setShowTutorial(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, verifying, trends, confidenceScore]);

  useEffect(() => {
    if (user) {
      loadUserPerformance();
      checkRateLimit();
      fetchTrendsToVerify();
      fetchUserStats();
      checkFirstTime();
    }
  }, [user]);
  
  const checkFirstTime = () => {
    const hasSeenTutorial = localStorage.getItem('verify-tutorial-seen');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
      localStorage.setItem('verify-tutorial-seen', 'true');
    }
  };

  useEffect(() => {
    if (currentTrend) {
      setValidationStartTime(Date.now());
      fetchSimilarTrends(currentTrend.category);
      fetchConsensusData(currentTrend.id);
      calculateEstimatedPayment();
    }
  }, [currentIndex, confidenceScore]);

  const loadUserPerformance = async () => {
    if (!user) return;
    const metrics = await performanceService.getUserPerformanceMetrics(user.id);
    setPerformanceMetrics(metrics);
  };

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
      // Get prioritized trends based on user tier
      const prioritizedIds = await performanceService.getPrioritizedTrends(user?.id || '', 20);
      
      // Fetch trends with enhanced filtering
      const { data: trendsData, error: trendsError } = await supabase
        .from('trend_submissions')
        .select('*')
        .neq('spotter_id', user?.id)
        .in('stage', ['submitted', 'validating'])
        .eq('auto_rejected', false)
        .eq('auto_approved', false)
        .in('id', prioritizedIds.length > 0 ? prioritizedIds : ['00000000-0000-0000-0000-000000000000'])
        .order('validation_difficulty', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (trendsError) throw trendsError;

      // Get list of trends this user has already validated
      const { data: validatedTrends, error: validatedError } = await supabase
        .from('trend_validations')
        .select('trend_id')
        .eq('validator_id', user?.id);

      if (validatedError) throw validatedError;

      const validatedTrendIds = new Set(validatedTrends?.map(v => v.trend_id) || []);
      const unvalidatedTrends = (trendsData || []).filter(trend => !validatedTrendIds.has(trend.id));

      // Fetch user details
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profile) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: earnings } = await supabase
          .from('earnings_ledger')
          .select('amount')
          .eq('user_id', user?.id)
          .eq('earning_type', 'validation')
          .gte('created_at', today.toISOString());

        const totalEarnings = earnings?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

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
          validation_streak: profile.consecutive_good_votes || 0,
          expertise_level: expertise?.[0]?.expertise_level
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const calculateEstimatedPayment = async () => {
    if (!user || !trends[currentIndex]) return;

    const trend = trends[currentIndex];
    const baseRate = 0.05;
    const difficultyBonus = (trend.validation_difficulty || 1) * 0.03;
    const confidenceBonus = (confidenceScore >= 0.9 || confidenceScore <= 0.1) ? 0.01 : 0;
    
    const payment = await performanceService.calculateTieredPayment(
      user.id,
      baseRate,
      difficultyBonus,
      confidenceBonus
    );
    
    setEstimatedPayment(payment);
  };

  const handleVerify = async (isValid: boolean) => {
    if (verifying || !trends[currentIndex] || !rateLimit?.can_validate) return;

    // Check if user is suspended
    if (performanceMetrics?.currentTier === 'suspended') {
      alert('You are currently suspended and cannot earn from validations. Your votes still count for improving your performance score.');
    }

    setVerifying(true);
    const trend = trends[currentIndex];
    const validationTime = Math.floor((Date.now() - validationStartTime) / 1000);

    try {
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
      
      showValidationFeedback(isValid, estimatedPayment);

      setConfidenceScore(0.75);
      setReasoning('');
      setShowReasoningInput(false);

      await fetchUserStats();
      await checkRateLimit();
      await loadUserPerformance();

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
  

  const showValidationFeedback = (isValid: boolean, payment: number) => {
    console.log(`Vote submitted! ${performanceMetrics?.currentTier === 'suspended' ? 'No payment (suspended)' : `Estimated earnings: $${payment.toFixed(3)}`}`);
  };

  const formatEngagementCount = (count?: number): string => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  const currentTrend = trends[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <SparklesIcon className="w-8 h-8 text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-400 mt-4 animate-pulse">Loading trends to verify...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/5 via-purple-900/5 to-pink-900/5 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 safe-area-top safe-area-bottom">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <motion.div 
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg"
              >
                <TrendingUpIcon className="w-6 h-6" />
              </motion.div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  Trend Verification
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  Help validate what's trending
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Tutorial Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowTutorial(true)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <InfoIcon className="w-5 h-5 text-gray-400" />
              </motion.button>
              
              {/* Stats Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowStats(true)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <BarChart3Icon className="w-5 h-5 text-gray-400" />
              </motion.button>
              
              {/* Performance Tier Badge */}
              {user && performanceMetrics && (
                <PerformanceTierDisplay 
                  userId={user.id} 
                  compact={true}
                  onTierChange={() => loadUserPerformance()}
                />
              )}
            </div>
          </div>
        </motion.div>

        {/* Progress Bar */}
        {trends.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4"
          >
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIndex + 1) / trends.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        )}

        {/* Quick Stats Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
        >
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-2xl p-4 border border-blue-500/20 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{stats.verified_today}</p>
                <p className="text-xs text-blue-400 mt-0.5">Verified</p>
              </div>
              <ZapIcon className="w-5 h-5 text-blue-400" />
            </div>
            {stats.validation_streak > 0 && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mt-2 inline-flex items-center gap-1 text-xs bg-blue-500/20 rounded-full px-2 py-1"
              >
                <FlameIcon className="w-3 h-3 text-blue-400" />
                <span className="text-blue-400">{stats.validation_streak} streak</span>
              </motion.div>
            )}
          </motion.div>
            
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-br from-green-500/10 to-emerald-600/5 rounded-2xl p-4 border border-green-500/20 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">${stats.earnings_today.toFixed(2)}</p>
                <p className="text-xs text-green-400 mt-0.5">Earned</p>
              </div>
              <DollarSignIcon className="w-5 h-5 text-green-400" />
            </div>
            {performanceMetrics && performanceMetrics.paymentMultiplier !== 1 && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mt-2 inline-flex items-center gap-1 text-xs bg-green-500/20 rounded-full px-2 py-1"
              >
                <span className="text-green-400">{performanceMetrics.paymentMultiplier}x multiplier</span>
              </motion.div>
            )}
          </motion.div>
            
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-br from-purple-500/10 to-pink-600/5 rounded-2xl p-4 border border-purple-500/20 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{stats.accuracy_score.toFixed(0)}%</p>
                <p className="text-xs text-purple-400 mt-0.5">Accuracy</p>
              </div>
              <TrophyIcon className="w-5 h-5 text-purple-400" />
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-br from-amber-500/10 to-orange-600/5 rounded-2xl p-4 border border-amber-500/20 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">
                  {(stats.validation_reputation * 100).toFixed(0)}
                </p>
                <p className="text-xs text-amber-400 mt-0.5">Reputation</p>
              </div>
              <ShieldIcon className="w-5 h-5 text-amber-400" />
            </div>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Trend Card */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
            {currentTrend && currentIndex < trends.length ? (
              <motion.div 
                key={currentTrend.id}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-gray-900/60 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-800/50"
              >
                {/* Payment Indicator */}
                <div className="absolute top-4 right-4 z-10">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-green-500/20 backdrop-blur-sm rounded-2xl px-4 py-2 border border-green-500/30"
                  >
                    <p className="text-xs text-green-400">Potential Earning</p>
                    <p className="text-lg font-bold text-green-400">${estimatedPayment.toFixed(3)}</p>
                  </motion.div>
                </div>

                {/* Image Section */}
                {(currentTrend.thumbnail_url || currentTrend.screenshot_url) && (
                  <div className="relative h-64 sm:h-80 overflow-hidden bg-gray-800">
                    <img
                      src={currentTrend.thumbnail_url || currentTrend.screenshot_url}
                      alt="Trend"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                    
                    {/* Engagement Overlay */}
                    {(currentTrend.likes_count || currentTrend.views_count) && (
                      <div className="absolute bottom-4 left-4 flex gap-3">
                        {currentTrend.likes_count !== undefined && (
                          <motion.div 
                            whileHover={{ scale: 1.05 }}
                            className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5"
                          >
                            <HeartIcon className="w-4 h-4 text-red-400" />
                            <span className="text-sm font-medium text-white">
                              {formatEngagementCount(currentTrend.likes_count)}
                            </span>
                          </motion.div>
                        )}
                        {currentTrend.views_count !== undefined && (
                          <motion.div 
                            whileHover={{ scale: 1.05 }}
                            className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5"
                          >
                            <EyeIcon className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-medium text-white">
                              {formatEngagementCount(currentTrend.views_count)}
                            </span>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="p-6">
                  {/* Trend Info */}
                  <div className="mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                      {currentTrend.evidence?.title || currentTrend.description}
                    </h2>
                    
                    {currentTrend.creator_handle && (
                      <p className="text-sm text-gray-400">
                        By @{currentTrend.creator_handle} • {currentTrend.platform || 'Social Media'}
                      </p>
                    )}
                  </div>

                  {/* Confidence Slider */}
                  <div className="mb-8 p-4 bg-gray-800/50 rounded-2xl border border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-base font-semibold text-white flex items-center gap-2">
                        <ShieldIcon className="w-4 h-4 text-blue-400" />
                        How confident are you?
                      </label>
                      <motion.div 
                        key={confidenceScore}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-2"
                      >
                        <span className="text-3xl font-bold text-white">
                          {(confidenceScore * 100).toFixed(0)}%
                        </span>
                        {confidenceScore >= 0.9 && <SparklesIcon className="w-5 h-5 text-yellow-400" />}
                        {confidenceScore <= 0.1 && <AlertCircleIcon className="w-5 h-5 text-blue-400" />}
                      </motion.div>
                    </div>
                    
                    <div className="relative mb-6">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={confidenceScore}
                        onChange={(e) => setConfidenceScore(parseFloat(e.target.value))}
                        className="w-full h-4 bg-gray-700 rounded-full appearance-none cursor-pointer slider-thumb"
                        style={{
                          background: `linear-gradient(to right, #3B82F6 0%, #8B5CF6 ${confidenceScore * 100}%, #374151 ${confidenceScore * 100}%, #374151 100%)`
                        }}
                      />
                      <div className="absolute -bottom-5 left-0 right-0 flex justify-between text-xs text-gray-400">
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>100%</span>
                      </div>
                    </div>
                    
                    {/* Confidence level indicator */}
                    <div className="flex justify-center">
                      <div className={`text-sm font-medium px-3 py-1 rounded-full ${
                        confidenceScore >= 0.8 ? 'bg-green-500/20 text-green-400' :
                        confidenceScore >= 0.6 ? 'bg-blue-500/20 text-blue-400' :
                        confidenceScore >= 0.4 ? 'bg-yellow-500/20 text-yellow-400' :
                        confidenceScore >= 0.2 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {confidenceScore >= 0.8 ? 'Very Confident' :
                         confidenceScore >= 0.6 ? 'Confident' :
                         confidenceScore >= 0.4 ? 'Somewhat Confident' :
                         confidenceScore >= 0.2 ? 'Unsure' :
                         'Very Unsure'}
                      </div>
                    </div>
                  </div>

                  {/* Reasoning Toggle */}
                  <div className="mt-8">
                    <button
                      onClick={() => setShowReasoningInput(!showReasoningInput)}
                      className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-colors"
                    >
                      <InfoIcon className="w-4 h-4" />
                      {showReasoningInput ? 'Hide reasoning' : 'Add reasoning'} (optional)
                    </button>
                    
                    <AnimatePresence>
                      {showReasoningInput && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <textarea
                            value={reasoning}
                            onChange={(e) => setReasoning(e.target.value)}
                            placeholder="Why do you think this is or isn't trending?"
                            className="mt-3 w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                            rows={3}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gray-900/60 backdrop-blur-xl rounded-3xl shadow-2xl p-12 text-center border border-gray-800/50"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <CheckIcon className="w-24 h-24 text-green-500 mx-auto mb-4" />
                </motion.div>
                <h3 className="text-3xl font-bold text-white mb-3">All Caught Up!</h3>
                <p className="text-gray-400 text-lg">Great job! Check back later for more trends to verify.</p>
                
                {performanceMetrics && performanceMetrics.nextTierThreshold && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl border border-blue-500/20"
                  >
                    <p className="text-blue-400 font-medium">
                      You're on your way to {performanceMetrics.nextTierThreshold.tier} tier!
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Keep up the great work to unlock higher rewards.
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Rate Limit */}
            {rateLimit && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-5 border border-gray-800"
              >
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" />
                  Validation Limits
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Hourly</span>
                      <span className="text-white font-medium">
                        {rateLimit.validations_remaining_hour} left
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                      <motion.div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2"
                        initial={{ width: 0 }}
                        animate={{ width: `${(rateLimit.validations_remaining_hour / 10) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Daily</span>
                      <span className="text-white font-medium">
                        {rateLimit.validations_remaining_today} left
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                      <motion.div 
                        className="bg-gradient-to-r from-green-500 to-emerald-600 h-2"
                        initial={{ width: 0 }}
                        animate={{ width: `${(rateLimit.validations_remaining_today / 50) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Consensus Visualization */}
            {currentTrend && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <ConsensusVisualization 
                  trendId={currentTrend.id}
                  onConsensusReached={(consensus) => {
                    console.log('Consensus reached:', consensus);
                  }}
                />
              </motion.div>
            )}

            {/* Session Progress */}
            {trends.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-5 border border-gray-800"
              >
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Session Progress</h3>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">Trends Reviewed</span>
                  <span className="font-medium text-white">{currentIndex + 1} / {trends.length}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / trends.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
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
            transition={{ delay: 0.2 }}
            className="mt-6"
          >
            {/* Suspension Warning */}
            {performanceMetrics?.currentTier === 'suspended' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-4 flex items-start gap-3"
              >
                <AlertCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-400">
                  <p className="font-semibold">Account Suspended</p>
                  <p className="mt-1">Your votes help improve your score but won't earn rewards during suspension.</p>
                </div>
              </motion.div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <motion.button
                whileHover={{ scale: 1.02, x: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleVerify(false)}
                disabled={verifying || !rateLimit?.can_validate}
                className={`flex-1 py-4 px-6 rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 ${
                  lastAction === 'not-trending' 
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                <XIcon className="w-5 h-5" />
                <span>Not Trending</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02, y: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSkip}
                disabled={verifying}
                className="sm:w-auto px-6 py-4 rounded-2xl font-semibold bg-gray-800/50 hover:bg-gray-800 text-gray-400 transition-all flex items-center justify-center gap-2 border border-gray-700"
              >
                <SkipForwardIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Skip</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleVerify(true)}
                disabled={verifying || !rateLimit?.can_validate}
                className={`flex-1 py-4 px-6 rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 ${
                  lastAction === 'trending'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/25'
                }`}
              >
                <CheckIcon className="w-5 h-5" />
                <span>Yes, Trending</span>
              </motion.button>
            </div>
            
            {/* Keyboard Shortcuts */}
            <div className="mt-4 text-center text-xs text-gray-500">
              <p>Use keyboard shortcuts: 
                <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300 mx-1">←/A</kbd> Not Trending
                <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300 mx-1">→/D</kbd> Trending
                <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300 mx-1">↓/S</kbd> Skip
                <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300 mx-1">1-5</kbd> Set confidence
              </p>
            </div>
          </motion.div>
        )}

      </div>
      
      {/* Tutorial Modal */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowTutorial(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gray-900 rounded-3xl p-6 max-w-md w-full border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-4">How to Verify Trends</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-400">1</span>
                  </div>
                  <div>
                    <p className="font-semibold">Review the trend</p>
                    <p className="text-sm text-gray-400">Look at the content and engagement metrics</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-purple-400">2</span>
                  </div>
                  <div>
                    <p className="font-semibold">Set your confidence</p>
                    <p className="text-sm text-gray-400">Adjust the slider based on how sure you are</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-green-400">3</span>
                  </div>
                  <div>
                    <p className="font-semibold">Make your decision</p>
                    <p className="text-sm text-gray-400">Click the buttons to verify, reject, or skip</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
                <p className="text-sm font-semibold mb-2">Pro Tips:</p>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Higher confidence on correct votes = more earnings</li>
                  <li>• Use keyboard shortcuts for faster verification</li>
                  <li>• Add reasoning to help improve the system</li>
                </ul>
              </div>
              
              <button
                onClick={() => setShowTutorial(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 font-semibold hover:shadow-lg transition-all"
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Stats Modal */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowStats(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gray-900 rounded-3xl p-6 max-w-md w-full border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-6">Your Performance</h2>
              
              {user && performanceMetrics && (
                <PerformanceTierDisplay 
                  userId={user.id} 
                  showDetails={true}
                />
              )}
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-blue-400">{stats.verified_today}</p>
                  <p className="text-sm text-gray-400 mt-1">Verified Today</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-400">${stats.earnings_today.toFixed(2)}</p>
                  <p className="text-sm text-gray-400 mt-1">Earned Today</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-purple-400">{stats.accuracy_score.toFixed(0)}%</p>
                  <p className="text-sm text-gray-400 mt-1">Accuracy</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-amber-400">{stats.validation_streak}</p>
                  <p className="text-sm text-gray-400 mt-1">Streak</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowStats(false)}
                className="w-full mt-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 font-semibold transition-all"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}