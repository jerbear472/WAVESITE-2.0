'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  Trophy,
  ArrowLeft,
  Link,
  Send,
  Loader2,
  Flame,
  Clock,
  CheckCircle,
  X,
  Globe,
  Sparkles,
  AlertCircle,
  Coins,
  Zap,
  Timer,
  TrendingDown,
  Award,
  Play,
  Pause
} from 'lucide-react';
// ScrollSession component removed - using session context directly
import { SpotterTierDisplay } from '@/components/SpotterTierDisplay';
import SmartTrendSubmission from '@/components/SmartTrendSubmission';
import StreakDisplay from '@/components/StreakDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/contexts/SessionContext';
import WaveLogo from '@/components/WaveLogo';
import { supabase } from '@/lib/supabase';
import { getSafeCategory, getSafeStatus } from '@/lib/safeCategory';
import { submitTrend } from '@/lib/submitTrend';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { calculateQualityScore } from '@/lib/calculateQualityScore';
import { calculateAudienceSize } from '@/lib/calculateAudienceSize';

// Primary platforms with better colors
const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', icon: '🎵', color: 'bg-black', url: 'https://www.tiktok.com/foryou' },
  { id: 'instagram', label: 'Instagram', icon: '📸', color: 'bg-gradient-to-br from-purple-600 to-pink-600', url: 'https://www.instagram.com' },
  { id: 'twitter', label: 'X', icon: '𝕏', color: 'bg-black', url: 'https://twitter.com/home' },
  { id: 'reddit', label: 'Reddit', icon: '🔥', color: 'bg-orange-600', url: 'https://www.reddit.com/r/popular' },
  { id: 'youtube', label: 'YouTube', icon: '📺', color: 'bg-red-600', url: 'https://www.youtube.com/feed/trending' }
];


export default function SpotPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  
  // Default tier info for display (XP-based)
  const tierInfo = {
    name: 'Observer',
    level: 1,
    color: 'blue',
    baseXP: 100
  };
  const { session, startSession, endSession, logTrendSubmission } = useSession();
  
  // Core states
  const [trendUrl, setTrendUrl] = useState('');
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Stats
  const [todaysEarnings, setTodaysEarnings] = useState(0);
  const [todaysPendingEarnings, setTodaysPendingEarnings] = useState(0);
  const [trendsLoggedToday, setTrendsLoggedToday] = useState(0);
  const [recentTickers, setRecentTickers] = useState<string[]>([]);

  // Load stats on mount
  useEffect(() => {
    if (user) {
      loadTodaysStats();
      loadRecentTickers();
    }
  }, [user]);

  // Subscribe to real-time XP updates
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('spot-xp-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'xp_ledger',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('XP update on spot page:', payload);
          // Reload stats when XP changes
          loadTodaysStats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const loadTodaysStats = async () => {
    if (!user?.id) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    try {
      // Get pending XP from xp_ledger
      const { data: pendingTransactions } = await supabase
        .from('xp_ledger')
        .select('xp_amount, created_at')
        .eq('user_id', user.id)
        .eq('status', 'pending');
      
      // Calculate today's pending XP
      const todaysPending = pendingTransactions
        ?.filter(t => new Date(t.created_at) >= today)
        .reduce((sum, t) => sum + (t.xp_amount || 0), 0) || 0;
      
      // Calculate all pending XP
      const allPending = pendingTransactions
        ?.reduce((sum, t) => sum + (t.xp_amount || 0), 0) || 0;
      
      setTodaysPendingEarnings(allPending);
      
      // Get today's approved XP
      const { data: approvedToday } = await supabase
        .from('xp_ledger')
        .select('xp_amount')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .gte('created_at', today.toISOString());
      
      const todaysApproved = approvedToday
        ?.reduce((sum, t) => sum + (t.xp_amount || 0), 0) || 0;
      
      setTodaysEarnings(todaysApproved);
      
      const { count } = await supabase
        .from('trend_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('spotter_id', user.id)
        .gte('created_at', today.toISOString());
      
      setTrendsLoggedToday(count || 0);
      
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentTickers = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('trend_submissions')
        .select('finance_data')
        .eq('spotter_id', user.id)
        .not('finance_data', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);
      
      const tickers = new Set<string>();
      data?.forEach(item => {
        item.finance_data?.tickers?.forEach((ticker: string) => tickers.add(ticker));
      });
      
      setRecentTickers(Array.from(tickers).slice(0, 5));
    } catch (error) {
      console.error('Error loading tickers:', error);
    }
  };

  // Helper function to format time
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Streak multipliers for XP calculation
  const getStreakMultiplier = (streakCount: number): number => {
    if (streakCount >= 5) return 2.5;
    if (streakCount === 4) return 2.0;
    if (streakCount === 3) return 1.5;
    if (streakCount === 2) return 1.2;
    return 1.0;
  };

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (isValidUrl(pastedText)) {
      setTrendUrl(pastedText);
      setTimeout(() => {
        setShowSubmissionForm(true);
      }, 100);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (trendUrl && isValidUrl(trendUrl)) {
      setShowSubmissionForm(true);
    } else {
      setSubmitMessage({ type: 'error', text: 'Please enter a valid URL' });
      setTimeout(() => setSubmitMessage(null), 3000);
    }
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handlePlatformClick = (platform: typeof PLATFORMS[0]) => {
    window.open(platform.url, platform.id, 'width=1200,height=800,left=200,top=100');
  };

  const handleTrendSubmit = async (formData: any) => {
    if (!user || !user.id) {
      setSubmitMessage({ type: 'error', text: 'Please log in to submit trends' });
      return;
    }
    
    setIsSubmitting(true);
    setRetryStatus('');
    
    try {
      const result = await submitTrend(user.id, {
        url: formData.url,
        title: formData.trendName || formData.title,
        description: formData.explanation || formData.trendName,
        category: formData.categories?.[0] || formData.category,
        platform: formData.platform,
        trendVelocity: formData.trendVelocity,
        trendSize: formData.trendSize,
        sentiment: formData.sentiment || formData.wave_score,
        audienceAge: formData.audienceAge,
        categoryAnswers: formData.categoryAnswers,
        velocityMetrics: formData.velocityMetrics,
        aiAngle: formData.aiAngle,
        screenshot_url: formData.screenshot_url,
        thumbnail_url: formData.thumbnail_url,
        creator_handle: formData.creator_handle,
        views_count: formData.views_count,
        likes_count: formData.likes_count,
        comments_count: formData.comments_count,
        hashtags: formData.hashtags,
        wave_score: formData.wave_score || formData.sentiment
      });
      
      if (result.success) {
        setShowSubmissionForm(false);
        setTrendUrl('');
        
        const xpAmount = result.earnings || 100;
        
        await loadTodaysStats();
        await refreshUser();
        
        // Session tracking handled by context
        if (session.isActive) {
          logTrendSubmission();
        }
        
        const audienceSize = formData.trendSize ? 
          calculateAudienceSize(formData.trendSize) : 
          '0';
        
        setSubmitMessage({ 
          type: 'success', 
          text: `Trend submitted! You earned ${xpAmount} XP • Potential Audience: ${audienceSize}` 
        });
        
        setTimeout(() => setSubmitMessage(null), 5000);
        
        setTodaysPendingEarnings(prev => prev + xpAmount);
        setTrendsLoggedToday(prev => prev + 1);
        
        if (refreshUser) {
          await refreshUser();
        }
        
        await loadTodaysStats();
        
      } else {
        throw new Error(result.error || 'Submission failed');
      }
      
    } catch (error: any) {
      console.error('Submission error:', error);
      setShowSubmissionForm(false);
      setSubmitMessage({ 
        type: 'error', 
        text: `Error: ${error?.message || 'Failed to submit trend'}` 
      });
      setTimeout(() => setSubmitMessage(null), 5000);
    } finally {
      setIsSubmitting(false);
      setRetryStatus(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="mb-8 bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="w-12 flex justify-start">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <WaveLogo size={32} animated={true} showTitle={false} />
              <h1 className="text-xl font-bold text-gray-900">Trend Scanner</h1>
            </div>
            
            <div className="w-40 flex justify-end min-h-[44px] items-center">
              {user && (
                <SpotterTierDisplay userId={user.id} compact={true} />
              )}
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        <AnimatePresence>
          {submitMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="mb-6"
            >
              <div className={`px-5 py-4 rounded-xl shadow-lg flex items-start gap-3 ${
                submitMessage.type === 'success'
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300'
                  : 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-300'
              }`}>
                {submitMessage.type === 'success' ? (
                  <div className="flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                ) : (
                  <div className="flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                )}
                <div className="flex-1">
                  {submitMessage.type === 'success' ? (
                    <>
                      <div className="font-semibold text-green-800 mb-1">
                        Trend Successfully Submitted! 🎉
                      </div>
                      <div className="text-sm text-green-700">
                        {submitMessage.text}
                      </div>
                      <div className="mt-2 text-xs text-green-600 bg-green-100 inline-block px-2 py-1 rounded">
                        💡 XP will be confirmed after community validation
                      </div>
                    </>
                  ) : (
                    <div className="text-red-700">{submitMessage.text}</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Layout */}
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Submit a Trend Section */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <Link className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">Submit a Trend</h2>
                <p className="text-sm text-gray-500">Paste a URL to start the 3-step submission</p>
              </div>
            </div>
            
            {/* XP Info */}
            <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  Base: <span className="font-semibold">100 XP</span> per trend
                </span>
                <span className="text-green-700">
                  Awarded after 3 validations ✓
                </span>
              </div>
            </div>

            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="url"
                  value={trendUrl}
                  onChange={(e) => setTrendUrl(e.target.value)}
                  onPaste={handleUrlPaste}
                  placeholder="Paste trend URL here..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  autoFocus
                />
                {trendUrl && (
                  <button
                    type="button"
                    onClick={() => setTrendUrl('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
              
              <button
                type="submit"
                disabled={!trendUrl}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Start Submission
              </button>
            </form>

            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
              <Sparkles className="w-4 h-4" />
              <span>Auto-captures creator info & metrics</span>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            {/* Streak Display */}
            <StreakDisplay />
            
            {/* Scroll Session */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Scroll Session</h2>
                  <p className="text-sm text-gray-500">
                    {session.isActive ? 'Track your submission streak' : 'Optional: Track progress & streaks'}
                  </p>
                </div>
                
                <button
                  onClick={session.isActive ? endSession : startSession}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm ${
                    session.isActive 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {session.isActive ? (
                    <>
                      <Pause className="w-4 h-4" />
                      End
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Start
                    </>
                  )}
                </button>
              </div>

              {session.isActive ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-xs text-gray-500">Duration</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{formatTime(session.duration)}</p>
                  </div>
                  
                  <div className="bg-purple-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Flame className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-purple-600">Streak</span>
                    </div>
                    <p className="text-xl font-bold text-purple-700">
                      {session.currentStreak} {session.currentStreak > 0 && `(${session.streakMultiplier}x)`}
                    </p>
                  </div>
                  
                  {session.currentStreak > 0 && (
                    <div className="bg-orange-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Timer className="w-4 h-4 text-orange-500" />
                        <span className="text-xs text-orange-600">Time Left</span>
                      </div>
                      <p className="text-xl font-bold text-orange-700">{formatTime(session.streakTimeRemaining)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Zap className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-2">Streak Multipliers & Benefits</h3>
                      <ul className="text-sm text-gray-600 space-y-1.5">
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-500">⚡</span>
                          <span><strong>2 trends:</strong> 1.2x multiplier unlocked</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-500">🔥</span>
                          <span><strong>5+ trends:</strong> 2.5x multiplier (max reward)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500">⏱️</span>
                          <span><strong>5-min window:</strong> Submit within time to keep streak</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-500">📊</span>
                          <span><strong>Live tracking:</strong> See timer, XP & progress in real-time</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span className="text-xs text-gray-500">Today</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{Math.round(todaysEarnings || 0)} XP</p>
            <p className="text-xs text-gray-500">Confirmed</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="text-xs text-gray-500">Pending</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{Math.round(todaysPendingEarnings || 0)} XP</p>
            <p className="text-xs text-gray-500">Verification</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <Flame className="w-5 h-5 text-purple-600" />
              <span className="text-xs text-gray-500">Multiplier</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{getStreakMultiplier(session.currentStreak)}x</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="text-xs text-gray-500">Trends</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{trendsLoggedToday}</p>
            <p className="text-xs text-gray-500">Today</p>
          </div>
        </div>

        {/* Recent Tickers */}
        {recentTickers.length > 0 && (
          <div className="mb-6 bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <Coins className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-700">Recent Tickers:</span>
              <div className="flex gap-2">
                {recentTickers.map(ticker => (
                  <span key={ticker} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-mono">
                    ${ticker}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Platform Quick Access */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Quick Platform Access
          </h3>
          
          <div className="grid grid-cols-5 gap-3">
            {PLATFORMS.map(platform => (
              <button
                key={platform.id}
                onClick={() => handlePlatformClick(platform)}
                className={`p-4 ${platform.color} rounded-xl transition-all transform hover:scale-105 hover:shadow-lg text-white`}
              >
                <div className="text-3xl mb-2">{platform.icon}</div>
                <div className="text-xs font-medium">{platform.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Finance Bonus Section */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Finance Trends = Extra XP</h3>
                <p className="text-sm text-gray-600">Track meme stocks & crypto for bonus XP</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg font-semibold">
              +50 XP approval bonus
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {['r/wallstreetbets', 'r/stocks', 'r/cryptocurrency', 'r/superstonk', 'StockTwits'].map(community => (
              <span key={community} className="px-3 py-1 bg-white rounded-lg text-sm text-gray-700">
                {community}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* Trend Submission Form */}
      {showSubmissionForm && (
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 max-w-md w-full">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Form</h3>
                <p className="text-gray-600 mb-4">Unable to load the submission form. Please try refreshing the page.</p>
                <button
                  onClick={() => {
                    setShowSubmissionForm(false);
                    setTrendUrl('');
                  }}
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          <SmartTrendSubmission
            onClose={() => {
              setShowSubmissionForm(false);
              setTrendUrl('');
            }}
            onSubmit={handleTrendSubmit}
            initialUrl={trendUrl}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}