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
  Share2,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Menu,
  Award,
  Coins,
  Shield,
  AlertCircle,
  Star,
  ThumbsUp,
  ThumbsDown,
  Flag,
  CheckSquare,
  Square,
  Sparkles,
  Target,
  TrendingUp
} from 'lucide-react';
import { SUSTAINABLE_EARNINGS } from '@/lib/SUSTAINABLE_EARNINGS';

interface TrendToVerify {
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
  evidence?: any;
  virality_prediction?: number;
  quality_score?: number;
  hours_since_post?: number;
  wave_score?: number;
  growth_rate?: number;
  engagement_rate?: number;
}

interface QualityCriteria {
  id: string;
  label: string;
  description: string;
  met: boolean;
}

export default function QualityControlVerifyPage() {
  const { user, refreshUser } = useAuth();
  const [trends, setTrends] = useState<TrendToVerify[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showCriteriaHelp, setShowCriteriaHelp] = useState(false);
  const [stats, setStats] = useState({
    verified_today: 0,
    earnings_today: 0,
    verified_total: 0,
    earnings_total: 0,
    remaining_today: 100,
    remaining_hour: 20,
    quality_accuracy: 0
  });
  const [showEarningsAnimation, setShowEarningsAnimation] = useState(false);
  const [sessionEarnings, setSessionEarnings] = useState(0);
  const [consecutiveApprovals, setConsecutiveApprovals] = useState(0);
  const [qualityCriteria, setQualityCriteria] = useState<QualityCriteria[]>([]);

  const formatCount = (count?: number): string => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const evaluateQualityCriteria = (trend: TrendToVerify): QualityCriteria[] => {
    return [
      {
        id: 'clear_content',
        label: 'Clear & Visible Content',
        description: 'Screenshot/image is clear and content is easily readable',
        met: !!trend.screenshot_url || !!trend.thumbnail_url
      },
      {
        id: 'accurate_description',
        label: 'Accurate Description',
        description: 'Description accurately represents the content',
        met: trend.description && trend.description.length > 10
      },
      {
        id: 'proper_category',
        label: 'Properly Categorized',
        description: 'Content matches the selected category',
        met: !!trend.category && trend.category !== 'other'
      },
      {
        id: 'authentic_metrics',
        label: 'Authentic Engagement',
        description: 'Engagement metrics appear genuine and not inflated',
        met: true // This would need more complex logic in production
      },
      {
        id: 'recent_content',
        label: 'Recent Content',
        description: 'Content is from the last 48 hours',
        met: trend.hours_since_post ? trend.hours_since_post <= 48 : true
      },
      {
        id: 'no_spam',
        label: 'Not Spam/Duplicate',
        description: 'Content is not spam or a duplicate submission',
        met: true // Would check against database in production
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
        console.warn('No user ID available for loading trends');
        setLoading(false);
        return;
      }

      // Get trends user has already validated
      const { data: validatedTrends } = await supabase
        .from('trend_validations')
        .select('trend_submission_id')
        .eq('validator_id', user.id);

      const validatedIds = validatedTrends?.map(v => v.trend_submission_id) || [];
      
      // Also get trends user has skipped in this session
      const skippedKey = `skipped_trends_${user.id}_${new Date().toDateString()}`;
      const skippedTrends = JSON.parse(localStorage.getItem(skippedKey) || '[]');
      
      const excludeIds = [...validatedIds, ...skippedTrends];

      // Build query
      let query = supabase
        .from('trend_submissions')
        .select('*')
        .in('status', ['submitted', 'validating'])
        .neq('spotter_id', user.id);
      
      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }
      
      const { data: trendsData } = await query
        .order('created_at', { ascending: false })
        .limit(20);

      // Process trends
      const processedTrends = (trendsData || []).map(trend => {
        const hoursAgo = (Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60);
        
        return {
          ...trend,
          hours_since_post: Math.round(hoursAgo),
          wave_score: trend.quality_score || 5,
          growth_rate: 0,
          engagement_rate: trend.views_count ? 
            ((trend.likes_count || 0) + (trend.comments_count || 0)) / trend.views_count * 100 : 0
        };
      });

      setTrends(processedTrends);
      
      // Set initial quality criteria if trends are available
      if (processedTrends.length > 0) {
        setQualityCriteria(evaluateQualityCriteria(processedTrends[0]));
      }
    } catch (error) {
      console.error('Error loading trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: validations } = await supabase
        .from('trend_validations')
        .select('*')
        .eq('validator_id', user?.id)
        .gte('created_at', today.toISOString());

      const { data: allValidations } = await supabase
        .from('trend_validations')
        .select('*')
        .eq('validator_id', user?.id);

      // Calculate quality accuracy (mock calculation)
      const approvedCount = validations?.filter(v => v.vote === 'verify').length || 0;
      const totalCount = validations?.length || 1;
      const accuracy = Math.round((approvedCount / totalCount) * 100);

      setStats({
        verified_today: validations?.length || 0,
        earnings_today: parseFloat(((validations?.length || 0) * EARNINGS_CONFIG.VALIDATION_REWARDS.CORRECT_VALIDATION).toFixed(2)),
        verified_total: allValidations?.length || 0,
        earnings_total: parseFloat(((allValidations?.length || 0) * EARNINGS_CONFIG.VALIDATION_REWARDS.CORRECT_VALIDATION).toFixed(2)),
        remaining_today: 100 - (validations?.length || 0),
        remaining_hour: Math.max(0, 20 - (validations?.length || 0)),
        quality_accuracy: accuracy
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        verified_today: 0,
        earnings_today: 0,
        verified_total: 0,
        earnings_total: 0,
        remaining_today: 100,
        remaining_hour: 20,
        quality_accuracy: 0
      });
    }
  };

  const nextTrend = () => {
    if (currentIndex < trends.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setQualityCriteria(evaluateQualityCriteria(trends[nextIdx]));
    } else {
      setCurrentIndex(trends.length);
    }
  };

  const handleVote = async (vote: 'verify' | 'reject' | 'skip') => {
    if (!trends[currentIndex]) return;

    const trendId = trends[currentIndex].id;

    if (vote === 'skip') {
      const skippedKey = `skipped_trends_${user?.id}_${new Date().toDateString()}`;
      const existingSkipped = JSON.parse(localStorage.getItem(skippedKey) || '[]');
      
      if (!existingSkipped.includes(trendId)) {
        existingSkipped.push(trendId);
        localStorage.setItem(skippedKey, JSON.stringify(existingSkipped));
      }
      
      nextTrend();
      return;
    }

    setVerifying(true);
    try {
      // Check for existing vote
      const { data: existingVote } = await supabase
        .from('trend_validations')
        .select('id')
        .eq('trend_submission_id', trendId)
        .eq('validator_id', user?.id)
        .single();
      
      if (existingVote) {
        nextTrend();
        return;
      }

      // Submit vote via RPC
      const { data: voteResult, error: voteError } = await supabase
        .rpc('cast_trend_vote', {
          trend_id: trendId,
          vote_type: vote
        });

      if (voteError) throw new Error(voteError.message || 'Failed to submit vote');
      if (voteResult && !voteResult.success) throw new Error(voteResult.error || 'Failed to submit vote');

      // Update earnings and stats
      if (vote === 'verify') {
        setConsecutiveApprovals(prev => prev + 1);
      } else {
        setConsecutiveApprovals(0);
      }
      
      setSessionEarnings(prev => prev + EARNINGS_CONFIG.VALIDATION_REWARDS.CORRECT_VALIDATION);
      setShowEarningsAnimation(true);
      setTimeout(() => setShowEarningsAnimation(false), 3000);
      
      // Refresh user data
      if (refreshUser) await refreshUser();
      
      await loadStats();
      
      // Remove voted trend and move to next
      setTrends(prev => prev.filter(t => t.id !== trendId));
      if (currentIndex >= trends.length - 1) {
        setCurrentIndex(trends.length - 1);
      }
    } catch (error: any) {
      console.error('Error submitting vote:', error);
      alert(error.message || 'Failed to submit vote. Please try again.');
    } finally {
      setVerifying(false);
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
    if (!currentTrend || verifying) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (verifying || !currentTrend) return;
      
      switch(e.key.toLowerCase()) {
        case 'a':
        case '1':
          handleVote('verify');
          break;
        case 'd':
        case '2':
          handleVote('reject');
          break;
        case 's':
        case '3':
          handleVote('skip');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [trends, currentIndex, verifying]);

  const currentTrend = trends[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading quality control queue...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Shield className="w-20 h-20 text-purple-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access the quality control dashboard.</p>
          <a href="/login" className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors">
            Go to Login
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
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Quality Check Complete!</h2>
          <p className="text-gray-600 text-lg mb-6">
            All submissions have been reviewed. Check back later for more.
          </p>
          
          <div className="space-y-4">
            {/* Today's Performance */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wide">Quality Control Stats</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.verified_today}</p>
                  <p className="text-xs text-gray-500 mt-1">Reviewed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{stats.quality_accuracy}%</p>
                  <p className="text-xs text-gray-500 mt-1">Accuracy</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">${stats.earnings_today.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">Earned</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const qualityScore = calculateQualityScore(qualityCriteria);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-purple-600" />
              <h1 className="text-lg font-semibold text-gray-900">Quality Control Dashboard</h1>
              <div className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-1 rounded-full">
                {currentIndex + 1} / {trends.length}
              </div>
            </div>
            
            {/* Earnings Display */}
            <div className="flex items-center gap-3">
              <motion.div
                className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-lg flex items-center gap-2 border border-green-200"
                animate={showEarningsAnimation ? { scale: [1, 1.05, 1] } : {}}
              >
                <Coins className="w-5 h-5 text-green-600" />
                <div>
                  <span className="font-bold text-green-800">${stats.earnings_today.toFixed(2)}</span>
                  <span className="text-xs text-green-600 ml-1">Today</span>
                </div>
              </motion.div>
              
              <button
                onClick={() => setShowStats(!showStats)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showStats ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

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
              <h3 className="font-bold text-gray-900 text-lg">Performance Metrics</h3>
              
              <div className="space-y-3">
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-purple-600">Quality Accuracy</span>
                    <span className="text-2xl font-bold text-purple-800">{stats.quality_accuracy}%</span>
                  </div>
                  <div className="h-2 bg-purple-200 rounded-full">
                    <div className="h-full bg-purple-600 rounded-full" style={{ width: `${stats.quality_accuracy}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-blue-800">{stats.verified_today}</p>
                    <p className="text-xs text-blue-600">Reviewed Today</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-green-800">${stats.earnings_today.toFixed(2)}</p>
                    <p className="text-xs text-green-600">Earned Today</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700 font-medium mb-2">Keyboard Shortcuts</p>
                <div className="space-y-1 text-xs text-gray-600">
                  <div>A or 1: Approve (High Quality)</div>
                  <div>D or 2: Reject (Low Quality)</div>
                  <div>S or 3: Skip (Need More Info)</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTrend.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            {/* Content Review Section */}
            <div className="grid md:grid-cols-2 gap-0">
              {/* Left: Image/Screenshot */}
              <div className="bg-gray-100 relative">
                {(currentTrend.thumbnail_url || currentTrend.screenshot_url) ? (
                  <img
                    src={currentTrend.thumbnail_url || currentTrend.screenshot_url}
                    alt="Submission"
                    className="w-full h-full object-contain bg-black"
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
                
                {/* Engagement Metrics Overlay */}
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

              {/* Right: Quality Assessment */}
              <div className="p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{currentTrend.description || 'No description provided'}</h2>
                  
                  {currentTrend.post_caption && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                      {currentTrend.post_caption}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs">
                    {currentTrend.platform && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {currentTrend.platform}
                      </span>
                    )}
                    {currentTrend.category && (
                      <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded">
                        {currentTrend.category.replace(/_/g, ' ')}
                      </span>
                    )}
                    {currentTrend.creator_handle && (
                      <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded">
                        @{currentTrend.creator_handle}
                      </span>
                    )}
                    {currentTrend.hours_since_post && (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                        {currentTrend.hours_since_post}h ago
                      </span>
                    )}
                  </div>
                </div>

                {/* Quality Score Indicator */}
                <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Quality Score</span>
                    <span className={`text-2xl font-bold ${
                      qualityScore >= 80 ? 'text-green-600' :
                      qualityScore >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {qualityScore}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        qualityScore >= 80 ? 'bg-green-500' :
                        qualityScore >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${qualityScore}%` }}
                    />
                  </div>
                </div>

                {/* Quality Criteria Checklist */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">Quality Criteria</h3>
                    <button
                      onClick={() => setShowCriteriaHelp(!showCriteriaHelp)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {qualityCriteria.map(criterion => (
                    <div key={criterion.id} className="flex items-start gap-2">
                      {criterion.met ? (
                        <CheckSquare className="w-4 h-4 text-green-600 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm ${criterion.met ? 'text-gray-700' : 'text-gray-500'}`}>
                          {criterion.label}
                        </p>
                        {showCriteriaHelp && (
                          <p className="text-xs text-gray-500 mt-0.5">{criterion.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-gray-50 p-6 border-t border-gray-200">
              <div className="mb-4">
                <p className="text-center text-sm text-gray-600 mb-2">
                  Does this submission meet our quality standards?
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <motion.button
                  onClick={() => handleVote('reject')}
                  disabled={verifying}
                  className="flex flex-col items-center justify-center py-4 px-3 bg-red-50 hover:bg-red-100 border-2 border-red-200 text-red-700 rounded-xl transition-all disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ThumbsDown className="w-6 h-6 mb-2" />
                  <span className="text-sm font-semibold">Reject</span>
                  <span className="text-xs text-red-500 mt-1">Low Quality</span>
                  <span className="text-xs text-red-400 mt-0.5">Press D or 2</span>
                </motion.button>

                <motion.button
                  onClick={() => handleVote('skip')}
                  className="flex flex-col items-center justify-center py-4 px-3 bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 text-gray-700 rounded-xl transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <SkipForward className="w-6 h-6 mb-2" />
                  <span className="text-sm font-semibold">Skip</span>
                  <span className="text-xs text-gray-500 mt-1">Need More Info</span>
                  <span className="text-xs text-gray-400 mt-0.5">Press S or 3</span>
                </motion.button>

                <motion.button
                  onClick={() => handleVote('verify')}
                  disabled={verifying}
                  className="flex flex-col items-center justify-center py-4 px-3 bg-green-50 hover:bg-green-100 border-2 border-green-200 text-green-700 rounded-xl transition-all disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ThumbsUp className="w-6 h-6 mb-2" />
                  <span className="text-sm font-semibold">Approve</span>
                  <span className="text-xs text-green-500 mt-1">High Quality</span>
                  <span className="text-xs text-green-400 mt-0.5">Press A or 1</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Info Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quality Standards */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex gap-3">
              <Target className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-gray-800 mb-1">Quality Standards</p>
                <ul className="space-y-0.5 text-xs text-gray-600">
                  <li>• Clear, visible content</li>
                  <li>• Accurate descriptions</li>
                  <li>• Proper categorization</li>
                  <li>• Authentic engagement metrics</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Reward System */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
            <div className="flex gap-3">
              <Award className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-800 mb-1">Quality Control Rewards</p>
                <div className="space-y-0.5 text-xs text-green-700">
                  <div className="flex justify-between">
                    <span>Per review:</span>
                    <span className="font-bold">$0.01</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Daily limit:</span>
                    <span className="font-bold">100 reviews</span>
                  </div>
                  {consecutiveApprovals >= 5 && (
                    <div className="mt-2 p-1.5 bg-green-100 rounded text-green-800 font-medium text-center">
                      🔥 {consecutiveApprovals} quality approvals in a row!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings Animation */}
      <AnimatePresence>
        {showEarningsAnimation && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-6 z-50"
          >
            <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-medium">+${EARNINGS_CONFIG.VALIDATION_REWARDS.CORRECT_VALIDATION.toFixed(2)} Quality Review Complete!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}