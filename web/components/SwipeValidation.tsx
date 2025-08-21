'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { UnifiedValidationService } from '@/services/UnifiedValidationService';
import { formatCurrency } from '@/lib/SUSTAINABLE_EARNINGS';
import { 
  Check, X, ChevronLeft, ChevronRight, TrendingUp, 
  Eye, Heart, MessageCircle, Share2, DollarSign,
  Clock, Award, Zap, Info
} from 'lucide-react';

interface Trend {
  id: string;
  title: string;
  description?: string;
  url: string;
  platform: string;
  category: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  creator_info?: any;
  metadata?: any;
  wave_score?: number;
  user_profiles?: {
    username: string;
    avatar_url?: string;
  };
  created_at: string;
}

export default function SwipeValidation() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    validated: 0,
    approved: 0,
    rejected: 0,
    earnings: 0,
    streak: 0,
  });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [batchMode, setBatchMode] = useState(false);
  const [validationQueue, setValidationQueue] = useState<Array<{trendId: string, vote: 'approve' | 'reject'}>>([]);

  const validationService = new UnifiedValidationService();

  useEffect(() => {
    loadTrends();
    loadStats();
    checkTutorialStatus();
  }, []);

  const loadTrends = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (user) {
        const trendsData = await validationService.getTrendsToValidate(user.id, 20);
        setTrends(trendsData);
      }
    } catch (error) {
      console.error('Failed to load trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        const statsData = await validationService.getUserValidationStats(user.id);
        setStats(prev => ({
          ...prev,
          validated: statsData.totalValidations,
          approved: statsData.approvals,
          rejected: statsData.rejections,
          earnings: statsData.earningsFromValidation,
        }));
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const getCurrentUser = async () => {
    const { createClientComponentClient } = await import('@supabase/auth-helpers-nextjs');
    const supabase = createClientComponentClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  };

  const checkTutorialStatus = () => {
    const hasSeenTutorial = localStorage.getItem('swipeValidationTutorial');
    if (hasSeenTutorial) {
      setShowTutorial(false);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right', info?: PanInfo) => {
    if (isSubmitting || currentIndex >= trends.length) return;

    const currentTrend = trends[currentIndex];
    const vote = direction === 'right' ? 'approve' : 'reject';

    setSwipeDirection(direction);
    setIsSubmitting(true);

    try {
      if (batchMode) {
        // Add to queue for batch processing
        setValidationQueue(prev => [...prev, { trendId: currentTrend.id, vote }]);
        
        // Update local stats optimistically
        setStats(prev => ({
          ...prev,
          validated: prev.validated + 1,
          approved: vote === 'approve' ? prev.approved + 1 : prev.approved,
          rejected: vote === 'reject' ? prev.rejected + 1 : prev.rejected,
          earnings: prev.earnings + 0.02,
          streak: prev.streak + 1,
        }));

        // Move to next trend
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
          setSwipeDirection(null);
          setIsSubmitting(false);
        }, 300);

        // Process batch when queue reaches 5
        if (validationQueue.length >= 4) {
          processBatch();
        }
      } else {
        // Immediate validation
        const result = await validationService.submitVote({
          trendId: currentTrend.id,
          vote,
          quality_score: calculateQualityScore(currentTrend),
        });

        if (result.success) {
          setStats(prev => ({
            ...prev,
            validated: prev.validated + 1,
            approved: vote === 'approve' ? prev.approved + 1 : prev.approved,
            rejected: vote === 'reject' ? prev.rejected + 1 : prev.rejected,
            earnings: prev.earnings + (result.earnings || 0.02),
            streak: prev.streak + 1,
          }));

          // Show success animation
          setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
            setSwipeDirection(null);
          }, 300);
        }
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const processBatch = async () => {
    if (validationQueue.length === 0) return;

    const batch = [...validationQueue];
    setValidationQueue([]);

    try {
      const results = await validationService.batchValidate(
        batch.map(item => ({
          trendId: item.trendId,
          vote: item.vote,
        }))
      );

      // Update stats with actual results
      if (results.successful > 0) {
        setStats(prev => ({
          ...prev,
          earnings: prev.earnings + results.totalEarnings - (batch.length * 0.02), // Adjust for optimistic update
        }));
      }
    } catch (error) {
      console.error('Batch validation error:', error);
    }
  };

  const calculateQualityScore = (trend: Trend): number => {
    let score = 50;
    if (trend.screenshot_url) score += 15;
    if (trend.description && trend.description.length > 50) score += 10;
    if (trend.metadata?.view_count > 100000) score += 15;
    if (trend.wave_score && trend.wave_score > 70) score += 10;
    return Math.min(score, 100);
  };

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (isSubmitting) return;
    
    if (e.key === 'ArrowLeft') {
      handleSwipe('left');
    } else if (e.key === 'ArrowRight') {
      handleSwipe('right');
    } else if (e.key === ' ') {
      e.preventDefault();
      // Skip trend
      setCurrentIndex(prev => prev + 1);
    }
  }, [isSubmitting, currentIndex, trends]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const currentTrend = trends[currentIndex];
  const progress = trends.length > 0 ? ((currentIndex + 1) / trends.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading trends to validate...</p>
        </div>
      </div>
    );
  }

  if (showTutorial) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
          <h2 className="text-2xl font-bold">How to Validate Trends</h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <ChevronRight className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Swipe Right to Approve</p>
                <p className="text-sm text-gray-600">High quality, relevant trends</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <ChevronLeft className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium">Swipe Left to Reject</p>
                <p className="text-sm text-gray-600">Low quality or irrelevant</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Earn $0.02 per validation</p>
                <p className="text-sm text-gray-600">Accuracy affects your tier</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-3 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Pro tip:</strong> Use arrow keys for faster validation!
              Press Space to skip a trend.
            </p>
          </div>
          
          <button
            onClick={() => {
              setShowTutorial(false);
              localStorage.setItem('swipeValidationTutorial', 'true');
            }}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            Start Validating
          </button>
        </div>
      </div>
    );
  }

  if (!currentTrend) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <Award className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">All Caught Up!</h2>
          <p className="text-gray-600 mb-4">
            You've validated all available trends. Check back soon for more!
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-600">Session Stats</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                <p className="text-xs text-gray-500">Approved</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                <p className="text-xs text-gray-500">Rejected</p>
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(stats.earnings)} earned
              </p>
            </div>
          </div>
          
          <button
            onClick={() => {
              setCurrentIndex(0);
              loadTrends();
            }}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Refresh Trends
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 min-h-screen">
      {/* Header Stats */}
      <div className="mb-4 bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">Validate Trends</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBatchMode(!batchMode)}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                batchMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {batchMode ? 'Batch Mode ON' : 'Batch Mode OFF'}
            </button>
            {validationQueue.length > 0 && (
              <button
                onClick={processBatch}
                className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium"
              >
                Submit {validationQueue.length} votes
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-5 gap-2 text-center">
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-lg font-bold">{stats.validated}</p>
            <p className="text-xs text-gray-600">Total</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2">
            <p className="text-lg font-bold text-green-600">{stats.approved}</p>
            <p className="text-xs text-gray-600">Approved</p>
          </div>
          <div className="bg-red-50 rounded-lg p-2">
            <p className="text-lg font-bold text-red-600">{stats.rejected}</p>
            <p className="text-xs text-gray-600">Rejected</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-2">
            <p className="text-lg font-bold text-blue-600">{formatCurrency(stats.earnings)}</p>
            <p className="text-xs text-gray-600">Earned</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-2">
            <p className="text-lg font-bold text-yellow-600">
              <Zap className="w-5 h-5 inline" /> {stats.streak}
            </p>
            <p className="text-xs text-gray-600">Streak</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>{currentIndex + 1} of {trends.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Swipe Card */}
      <div className="relative h-[600px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTrend.id}
            className="absolute w-full max-w-md cursor-grab active:cursor-grabbing"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              rotate: swipeDirection === 'left' ? -30 : swipeDirection === 'right' ? 30 : 0,
              x: swipeDirection === 'left' ? -300 : swipeDirection === 'right' ? 300 : 0,
            }}
            exit={{ 
              opacity: 0,
              scale: 0.8,
              transition: { duration: 0.2 }
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, info) => {
              if (info.offset.x > 150) {
                handleSwipe('right', info);
              } else if (info.offset.x < -150) {
                handleSwipe('left', info);
              }
            }}
          >
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Trend Image/Screenshot */}
              {(currentTrend.screenshot_url || currentTrend.thumbnail_url) && (
                <div className="relative h-64 bg-gray-100">
                  <img
                    src={currentTrend.screenshot_url || currentTrend.thumbnail_url}
                    alt={currentTrend.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg">
                    <span className="text-xs font-medium">{currentTrend.platform}</span>
                  </div>
                </div>
              )}
              
              {/* Trend Content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold flex-1">{currentTrend.title}</h3>
                  {currentTrend.wave_score && (
                    <div className="ml-2 bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">
                      <span className="text-sm font-medium">{currentTrend.wave_score}</span>
                    </div>
                  )}
                </div>
                
                {currentTrend.description && currentTrend.description !== '0' && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {currentTrend.description}
                  </p>
                )}
                
                {/* Metadata */}
                <div className="space-y-2">
                  {currentTrend.metadata?.view_count && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Eye className="w-4 h-4" />
                      <span>{(currentTrend.metadata.view_count / 1000).toFixed(1)}K views</span>
                    </div>
                  )}
                  
                  {currentTrend.metadata?.engagement_rate && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Heart className="w-4 h-4" />
                      <span>{(currentTrend.metadata.engagement_rate * 100).toFixed(1)}% engagement</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(currentTrend.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  {currentTrend.user_profiles && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Spotted by @{currentTrend.user_profiles.username}</span>
                    </div>
                  )}
                </div>
                
                {/* Category Badge */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                    {currentTrend.category}
                  </span>
                </div>
              </div>
              
              {/* Action Hints */}
              <div className="flex justify-between items-center px-6 py-3 bg-gray-50 border-t">
                <div className="flex items-center gap-2 text-red-600">
                  <X className="w-5 h-5" />
                  <span className="text-sm font-medium">Reject</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <span className="text-sm font-medium">Approve</span>
                  <Check className="w-5 h-5" />
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        
        {/* Swipe Indicators */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 pointer-events-none">
          <div className={`
            bg-red-500 text-white p-4 rounded-full transition-opacity
            ${swipeDirection === 'left' ? 'opacity-100' : 'opacity-0'}
          `}>
            <X className="w-8 h-8" />
          </div>
          <div className={`
            bg-green-500 text-white p-4 rounded-full transition-opacity
            ${swipeDirection === 'right' ? 'opacity-100' : 'opacity-0'}
          `}>
            <Check className="w-8 h-8" />
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={() => handleSwipe('left')}
          disabled={isSubmitting}
          className="bg-red-500 text-white p-4 rounded-full hover:bg-red-600 disabled:opacity-50 transition-all"
        >
          <X className="w-6 h-6" />
        </button>
        
        <button
          onClick={() => setCurrentIndex(prev => prev + 1)}
          disabled={isSubmitting}
          className="bg-gray-500 text-white p-4 rounded-full hover:bg-gray-600 disabled:opacity-50 transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        
        <button
          onClick={() => handleSwipe('right')}
          disabled={isSubmitting}
          className="bg-green-500 text-white p-4 rounded-full hover:bg-green-600 disabled:opacity-50 transition-all"
        >
          <Check className="w-6 h-6" />
        </button>
      </div>
      
      {/* Keyboard Shortcuts */}
      <div className="mt-4 flex justify-center gap-4 text-xs text-gray-500">
        <span>← Reject</span>
        <span>Space to Skip</span>
        <span>→ Approve</span>
      </div>
    </div>
  );
}