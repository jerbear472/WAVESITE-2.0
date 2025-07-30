'use client';
import { getSafeCategory, getSafeStatus } from '@/lib/safeCategory';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  DollarSign, 
  ArrowLeft,
  Link,
  Send,
  Loader2,
  Camera,
  Flame,
  Zap,
  Clock,
  Info,
  Trophy,
  Target,
  Star,
  TrendingDown,
  Award,
  BarChart3,
  Sparkles,
  CheckCircle,
  X
} from 'lucide-react';
import { ScrollSession } from '@/components/ScrollSession';
import { FloatingTrendLogger } from '@/components/FloatingTrendLogger';
import TrendSubmissionFormMerged from '@/components/TrendSubmissionFormMerged';
import TrendScreenshotUpload from '@/components/TrendScreenshotUpload';
import SubmissionHistory from '@/components/SubmissionHistory';
import { SpotterTierDisplay } from '@/components/SpotterTierDisplay';
import { TrendQualityIndicator } from '@/components/TrendQualityIndicator';
import { useAuth } from '@/contexts/AuthContext';
import WaveLogo from '@/components/WaveLogo';
import { formatCurrency } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import { 
  TrendSpotterPerformanceService, 
  SpotterPerformanceMetrics,
  TrendQualityMetrics 
} from '@/lib/trendSpotterPerformanceService';

export default function ScrollDashboard() {
  const router = useRouter();
  const { user, updateUserEarnings } = useAuth();
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollSessionRef = useRef<any>();
  const performanceService = TrendSpotterPerformanceService.getInstance();
  
  // Form states
  const [trendLink, setTrendLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [loggedTrends, setLoggedTrends] = useState<string[]>([]);
  const [todaysEarnings, setTodaysEarnings] = useState(0);
  const [todaysPendingEarnings, setTodaysPendingEarnings] = useState(0);
  const [showTrendForm, setShowTrendForm] = useState(false);
  const [showScreenshotForm, setShowScreenshotForm] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showPaymentBreakdown, setShowPaymentBreakdown] = useState(false);
  
  // Performance states
  const [spotterMetrics, setSpotterMetrics] = useState<SpotterPerformanceMetrics | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<TrendQualityMetrics | null>(null);
  const [estimatedPayment, setEstimatedPayment] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  
  // Streak states
  const [streak, setStreak] = useState(0);
  const [streakMultiplier, setStreakMultiplier] = useState(1);
  const [lastTrendTime, setLastTrendTime] = useState<Date | null>(null);
  const [trendsInWindow, setTrendsInWindow] = useState<Date[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(180);
  const streakTimerRef = useRef<NodeJS.Timeout>();
  
  // Constants
  const STREAK_WINDOW = 180000; // 3 minutes in milliseconds
  const TRENDS_FOR_STREAK = 3;
  const STREAK_TIMEOUT = 60000;

  // Load performance metrics on mount
  useEffect(() => {
    if (user) {
      loadPerformanceMetrics();
      // Refresh metrics every 5 minutes
      const interval = setInterval(loadPerformanceMetrics, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadPerformanceMetrics = async () => {
    if (!user) return;
    
    setLoadingMetrics(true);
    try {
      const metrics = await performanceService.getSpotterPerformanceMetrics(user.id);
      setSpotterMetrics(metrics);
      
      // Load today's earnings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: earnings } = await supabase
        .from('earnings_ledger')
        .select('amount, status')
        .eq('user_id', user.id)
        .eq('type', 'trend_submission')
        .gte('created_at', today.toISOString());
      
      const confirmedEarnings = earnings?.filter(e => e.status === 'confirmed')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
      const pendingEarnings = earnings?.filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
      
      setTodaysEarnings(confirmedEarnings);
      setTodaysPendingEarnings(pendingEarnings);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Streak timer effect
  useEffect(() => {
    if (streak > 0 && lastTrendTime) {
      const timer = setInterval(() => {
        const timeSinceLastTrend = Date.now() - lastTrendTime.getTime();
        const remaining = Math.max(0, (STREAK_TIMEOUT - timeSinceLastTrend) / 1000);
        
        if (remaining === 0) {
          setStreak(0);
          setStreakMultiplier(1);
          setTrendsInWindow([]);
          clearInterval(timer);
        }
        
        setTimeRemaining(Math.floor(remaining));
      }, 1000);
      
      streakTimerRef.current = timer;
      
      return () => clearInterval(timer);
    }
  }, [streak, lastTrendTime]);

  const calculateMultiplier = (streakCount: number) => {
    if (streakCount === 0) return 1;
    if (streakCount < 3) return 1.5;
    if (streakCount < 5) return 2;
    if (streakCount < 10) return 3;
    return 5;
  };

  const handleTrendLogged = () => {
    if (!scrollSessionRef.current?.isActive) {
      setSubmitMessage({ type: 'error', text: 'Start a session to log trends!' });
      setTimeout(() => setSubmitMessage(null), 3000);
      return;
    }
    
    scrollSessionRef.current?.logTrend();
    updateStreakProgress();
  };

  const updateStreakProgress = () => {
    if (!scrollSessionRef.current?.isActive) return;
    
    const now = new Date();
    const updatedTrends = [...trendsInWindow, now];
    const recentTrends = updatedTrends.filter(
      time => now.getTime() - time.getTime() < STREAK_WINDOW
    );
    
    setTrendsInWindow(recentTrends);
    setLastTrendTime(now);
    
    if (recentTrends.length >= TRENDS_FOR_STREAK) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setStreakMultiplier(calculateMultiplier(newStreak));
      setTrendsInWindow([]);
    }
  };

  const handleSessionStateChange = (active: boolean) => {
    setIsScrolling(active);
    
    if (!active) {
      setStreak(0);
      setStreakMultiplier(1);
      setTrendsInWindow([]);
      setLastTrendTime(null);
      
      if (streakTimerRef.current) {
        clearInterval(streakTimerRef.current);
      }
    }
  };

  const normalizeUrl = (url: string) => {
    try {
      const urlObj = new URL(url.trim());
      urlObj.search = '';
      urlObj.hash = '';
      return urlObj.toString().toLowerCase();
    } catch {
      return url.trim().toLowerCase();
    }
  };

  // Calculate quality and payment when form is opened
  const handleFormOpen = async (url: string) => {
    if (!user || !spotterMetrics) return;
    
    // Calculate estimated quality for preview
    const mockTrendData = { url, platform: 'unknown' };
    const quality = performanceService.calculateTrendQuality(mockTrendData);
    setQualityMetrics(quality);
    
    // Calculate estimated payment
    const payment = await performanceService.calculateTrendPayment(
      user.id,
      mockTrendData,
      quality
    );
    setEstimatedPayment(payment);
  };

  const handleTrendSubmit = async (trendData: any) => {
    try {
      if (!user?.id) {
        setSubmitMessage({ type: 'error', text: 'Please log in to submit trends' });
        setTimeout(() => setSubmitMessage(null), 3000);
        return;
      }
      
      if (!scrollSessionRef.current?.isActive) {
        setSubmitMessage({ type: 'error', text: 'Start a scroll session to submit trends!' });
        setTimeout(() => setSubmitMessage(null), 3000);
        return;
      }

      // Check tier restrictions
      if (spotterMetrics?.currentTier === 'restricted') {
        const tierBenefits = performanceService.getTierBenefits('restricted');
        const { data: todayCount } = await supabase
          .from('trend_submissions')
          .select('id', { count: 'exact' })
          .eq('spotter_id', user.id)
          .gte('created_at', new Date().toISOString().split('T')[0]);
        
        if ((todayCount?.length || 0) >= tierBenefits.dailyTrendLimit) {
          setSubmitMessage({ 
            type: 'error', 
            text: `Daily limit reached (${tierBenefits.dailyTrendLimit} trends for restricted tier)` 
          });
          setTimeout(() => setSubmitMessage(null), 5000);
          return;
        }
      }

      // Calculate quality metrics
      const qualityMetrics = performanceService.calculateTrendQuality(trendData);
      setQualityMetrics(qualityMetrics);

      // Calculate payment
      const paymentInfo = await performanceService.calculateTrendPayment(
        user.id,
        trendData,
        qualityMetrics
      );
      setEstimatedPayment(paymentInfo);

      // Upload image if present
      let imageUrl = null;
      if (trendData.screenshot && trendData.screenshot instanceof File) {
        const fileExt = trendData.screenshot.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('trend-images')
          .upload(fileName, trendData.screenshot);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('trend-images')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      // Map category
      const mappedCategory = getSafeCategory(trendData.categories?.[0]);

      // Save trend to database with quality metrics
      const insertObject = {
        spotter_id: user?.id,
        category: mappedCategory,
        description: trendData.explanation || trendData.trendName || 'Untitled Trend',
        screenshot_url: imageUrl || trendData.thumbnail_url || null,
        evidence: {
          url: trendData.url || '',
          title: trendData.trendName || 'Untitled Trend',
          platform: trendData.platform || 'other',
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
          submitted_by: user?.username || user?.email
        },
        virality_prediction: trendData.spreadSpeed === 'viral' ? 8 : trendData.spreadSpeed === 'picking_up' ? 6 : 5,
        status: getSafeStatus('submitted'),
        quality_score: qualityMetrics.overallQuality,
        has_media: qualityMetrics.hasScreenshot || qualityMetrics.hasVideo,
        metadata_completeness: qualityMetrics.metadataCompleteness,
        validation_count: 0,
        creator_handle: trendData.creator_handle || null,
        creator_name: trendData.creator_name || null,
        post_caption: trendData.post_caption || null,
        likes_count: trendData.likes_count || 0,
        comments_count: trendData.comments_count || 0,
        shares_count: trendData.shares_count || 0,
        views_count: trendData.views_count || 0,
        hashtags: trendData.hashtags || [],
        post_url: trendData.url,
        thumbnail_url: trendData.thumbnail_url || imageUrl || null,
        posted_at: trendData.posted_at || new Date().toISOString(),
        created_at: new Date().toISOString(),
        payment_amount: paymentInfo.totalAmount,
        payment_breakdown: paymentInfo.breakdown
      };

      const { data, error } = await supabase
        .from('trend_submissions')
        .insert(insertObject)
        .select()
        .single();

      if (error) throw error;

      // Update spotter metrics
      await performanceService.updateSpotterMetrics(
        user.id,
        data.id,
        qualityMetrics.overallQuality
      );

      // Create earnings ledger entry
      const { error: earningsError } = await supabase
        .from('earnings_ledger')
        .insert({
          user_id: user.id,
          trend_id: data.id,
          amount: paymentInfo.totalAmount,
          type: 'trend_submission',
          status: 'pending',
          description: `Trend: ${trendData.trendName || 'Untitled'} (${spotterMetrics?.currentTier} tier)`,
          metadata: {
            quality_score: qualityMetrics.overallQuality,
            tier: spotterMetrics?.currentTier,
            payment_breakdown: paymentInfo.breakdown
          },
          created_at: new Date().toISOString()
        });

      if (earningsError) {
        console.error('Error creating earnings entry:', earningsError);
      }

      // Update user's pending earnings
      await supabase
        .from('profiles')
        .update({
          earnings_pending: supabase.raw(`earnings_pending + ${paymentInfo.totalAmount}`)
        })
        .eq('id', user.id);

      // Update local state
      const normalizedUrl = normalizeUrl(trendData.url);
      setLoggedTrends(prev => [...prev, normalizedUrl]);
      setTodaysPendingEarnings(prev => prev + paymentInfo.totalAmount);
      
      updateStreakProgress();
      
      setSubmitMessage({ 
        type: 'success', 
        text: `Trend submitted! +${formatCurrency(paymentInfo.totalAmount)} pending (Quality: ${(qualityMetrics.overallQuality * 100).toFixed(0)}%)` 
      });
      
      setTrendLink('');
      setShowPaymentBreakdown(true);
      
      setTimeout(() => {
        setSubmitMessage(null);
        setShowPaymentBreakdown(false);
      }, 5000);

      // Refresh metrics
      loadPerformanceMetrics();

    } catch (error) {
      console.error('Error submitting trend:', error);
      setSubmitMessage({ type: 'error', text: 'Failed to submit trend. Please try again.' });
      setTimeout(() => setSubmitMessage(null), 3000);
    }
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trendLink.trim()) return;
    
    const normalizedUrl = normalizeUrl(trendLink);
    if (loggedTrends.includes(normalizedUrl)) {
      setSubmitMessage({ type: 'error', text: 'Already logged!' });
      setTimeout(() => setSubmitMessage(null), 3000);
      return;
    }
    
    handleFormOpen(trendLink);
    setShowTrendForm(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/20 to-black">
      <div className="container mx-auto px-4 py-6 max-w-5xl safe-area-top safe-area-bottom">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <button
            onClick={() => router.push('/dashboard')}
            className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-all hover:scale-105"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          
          <div className="flex items-center gap-3">
            <WaveLogo size={36} animated={true} showTitle={false} />
            <h1 className="text-2xl font-bold text-white">Scroll & Earn</h1>
          </div>

          {/* Performance Tier Badge */}
          {user && !loadingMetrics && spotterMetrics && (
            <SpotterTierDisplay 
              userId={user.id} 
              compact={true}
              onTierChange={() => loadPerformanceMetrics()}
            />
          )}
        </motion.div>

        {/* Earnings Overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 grid grid-cols-2 gap-4"
        >
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
            <p className="text-xs text-gray-400 font-medium">Today's Confirmed</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(todaysEarnings)}</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
            <p className="text-xs text-gray-400 font-medium">Pending Verification</p>
            <p className="text-2xl font-bold text-yellow-400">{formatCurrency(todaysPendingEarnings)}</p>
          </div>
        </motion.div>

        {/* Daily Challenge */}
        {spotterMetrics?.dailyChallengeProgress && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-purple-500/10 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-purple-500/20 p-2 rounded-lg">
                  <Target className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Daily Challenge</p>
                  <p className="text-purple-200 text-sm">
                    {spotterMetrics.dailyChallengeProgress.description}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-purple-400">
                  +${spotterMetrics.dailyChallengeProgress.reward.toFixed(2)}
                </p>
                <p className="text-xs text-purple-300">reward</p>
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ 
                  width: `${(spotterMetrics.dailyChallengeProgress.progress / 
                    spotterMetrics.dailyChallengeProgress.target) * 100}%` 
                }}
              />
            </div>
          </motion.div>
        )}

        {/* Streak Status */}
        {streak > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-orange-500/20 backdrop-blur-sm rounded-xl p-4 border border-orange-500/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500/30 p-2 rounded-lg">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">
                    {streak} Streak Active
                  </p>
                  <p className="text-orange-200 text-sm">
                    {streakMultiplier}x speed multiplier
                  </p>
                </div>
              </div>
              <div className="text-right bg-black/30 px-3 py-2 rounded-lg">
                <p className="text-white font-semibold text-xl">{timeRemaining}s</p>
                <p className="text-orange-200 text-xs">left</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Session Required Notice */}
        {!isScrolling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 bg-blue-500/10 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium">Start a session to begin earning!</p>
                <p className="text-blue-200 text-sm">Trends can only be logged during active sessions</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Performance Stats */}
        {spotterMetrics && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-3 border border-gray-700/50">
              <div className="flex items-center justify-between mb-1">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-xs text-gray-400">30d</span>
              </div>
              <p className="text-lg font-bold text-white">
                {(spotterMetrics.trendApprovalRate30d * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-400">Approval Rate</p>
            </div>
            
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-3 border border-gray-700/50">
              <div className="flex items-center justify-between mb-1">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-400">30d</span>
              </div>
              <p className="text-lg font-bold text-white">
                {(spotterMetrics.trendViralRate30d * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-400">Viral Rate</p>
            </div>
            
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-3 border border-gray-700/50">
              <div className="flex items-center justify-between mb-1">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-gray-400">Quality</span>
              </div>
              <p className="text-lg font-bold text-white">
                {(spotterMetrics.submissionQualityScore * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-400">Avg Score</p>
            </div>
            
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-3 border border-gray-700/50">
              <div className="flex items-center justify-between mb-1">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-gray-400">Current</span>
              </div>
              <p className="text-lg font-bold text-white">
                {spotterMetrics.consecutiveApprovedTrends}
              </p>
              <p className="text-xs text-gray-400">Approved Streak</p>
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {/* Scroll Session Component */}
          <ScrollSession
            ref={scrollSessionRef}
            onSessionStateChange={handleSessionStateChange}
            onTrendLogged={handleTrendLogged}
            streak={streak}
            streakMultiplier={streakMultiplier}
            onStreakUpdate={(streakCount, multiplier) => {
              setStreak(streakCount);
              setStreakMultiplier(multiplier);
            }}
          />

          {/* Submit New Trend */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-indigo-600/10 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20 shadow-xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl"></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Submit New Trend</h3>
                  <p className="text-blue-200/80 font-medium">
                    Earn ${spotterMetrics ? 
                      `${performanceService.getTierBenefits(spotterMetrics.currentTier).basePaymentRange.min.toFixed(2)}-${performanceService.getTierBenefits(spotterMetrics.currentTier).basePaymentRange.max.toFixed(2)}` 
                      : '0.08-0.15'} per quality submission
                  </p>
                </div>
              </div>
              <div className="text-right bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/20">
                <p className="text-sm text-gray-300 font-medium">Today</p>
                <p className="text-xl font-bold text-white">{loggedTrends.length}</p>
              </div>
            </div>

            {/* Payment Breakdown Preview */}
            {showPaymentBreakdown && estimatedPayment && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20"
              >
                <p className="text-xs text-green-400 mb-2">Payment Breakdown:</p>
                {estimatedPayment.breakdown.map((item: string, index: number) => (
                  <p key={index} className="text-xs text-gray-300">{item}</p>
                ))}
              </motion.div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 relative z-10">
              <button
                onClick={() => setShowScreenshotForm(true)}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl transition-all hover:scale-105 shadow-lg border border-emerald-500/30 text-white font-semibold"
              >
                <Camera className="w-5 h-5" />
                Upload Screenshot
              </button>
              <button
                onClick={() => window.open('https://www.tiktok.com', 'tiktok', 'width=1200,height=800,left=200,top=100')}
                className="text-center py-3 px-4 bg-black hover:bg-gray-900 rounded-xl transition-all hover:scale-105 font-semibold border border-gray-700/50 text-white shadow-lg"
              >
                🎵 TikTok
              </button>
              <button
                onClick={() => window.open('https://www.instagram.com', 'instagram', 'width=1200,height=800,left=200,top=100')}
                className="text-center py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl transition-all hover:scale-105 font-semibold text-white shadow-lg"
              >
                📸 Instagram
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleQuickSubmit} className="space-y-4 relative z-10">
              <div className="relative">
                <input
                  type="url"
                  value={trendLink}
                  onChange={(e) => setTrendLink(e.target.value)}
                  placeholder="Paste trending link here..."
                  className="w-full px-5 py-4 bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/60 font-medium text-lg shadow-lg transition-all focus:bg-gray-700/50"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <Link className="w-5 h-5 text-gray-400" />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={!trendLink.trim()}
                className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-500 hover:via-purple-500 hover:to-indigo-500 disabled:bg-gray-600 disabled:opacity-50 rounded-xl font-bold text-lg transition-all hover:scale-[1.02] shadow-xl text-white border border-blue-400/40"
              >
                <Send className="w-5 h-5" />
                Add Trend Details
              </button>
            </form>

            {/* Feedback */}
            {submitMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-3 rounded-xl text-center ${
                  submitMessage.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                <p className="text-sm font-semibold">{submitMessage.text}</p>
              </motion.div>
            )}
          </motion.div>

          {/* Performance Overview Button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowPerformanceModal(true)}
            className="w-full bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:bg-gray-800/60 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/20 p-2 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold">Performance Overview</p>
                <p className="text-sm text-gray-400">View detailed stats and progress</p>
              </div>
            </div>
            <Info className="w-5 h-5 text-gray-400 group-hover:text-gray-300 transition-colors" />
          </motion.button>

          {/* Submission History */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-500/20 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Your Submission History</h3>
            </div>
            <SubmissionHistory />
          </motion.div>
        </div>
      </div>

      {/* Floating Trend Logger */}
      <FloatingTrendLogger 
        isVisible={isScrolling} 
        onTrendLogged={handleTrendLogged}
      />

      {/* Trend Submission Form Modal */}
      {showTrendForm && (
        <TrendSubmissionFormMerged
          onClose={() => {
            setShowTrendForm(false);
            setTrendLink('');
            setQualityMetrics(null);
            setEstimatedPayment(null);
          }}
          onSubmit={handleTrendSubmit}
          initialUrl={trendLink}
        />
      )}

      {/* Screenshot Upload Modal */}
      {showScreenshotForm && (
        <TrendScreenshotUpload
          onClose={() => setShowScreenshotForm(false)}
          onSubmit={() => {
            // Screenshot submissions get base rate
            const baseAmount = spotterMetrics ? 
              performanceService.getTierBenefits(spotterMetrics.currentTier).basePaymentRange.min : 0.08;
            setTodaysPendingEarnings(prev => prev + baseAmount);
            setSubmitMessage({ type: 'success', text: `Screenshot submitted! +${formatCurrency(baseAmount)}` });
            setTimeout(() => setSubmitMessage(null), 3000);
          }}
        />
      )}

      {/* Performance Modal */}
      <AnimatePresence>
        {showPerformanceModal && spotterMetrics && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowPerformanceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gray-900 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Performance Overview</h2>
                <button
                  onClick={() => setShowPerformanceModal(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <SpotterTierDisplay 
                userId={user!.id} 
                showDetails={true}
              />
              
              <button
                onClick={() => setShowPerformanceModal(false)}
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