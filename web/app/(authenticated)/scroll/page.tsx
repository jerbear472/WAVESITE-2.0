'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  DollarSign, 
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
import { ScrollSession } from '@/components/ScrollSession';
import { SpotterTierDisplay } from '@/components/SpotterTierDisplay';
import TrendSubmissionFormMerged from '@/components/TrendSubmissionFormMerged';
import { useAuth } from '@/contexts/AuthContext';
import WaveLogo from '@/components/WaveLogo';
import { formatCurrency } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import { getSafeCategory, getSafeStatus } from '@/lib/safeCategory';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Primary platforms with better colors
const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', icon: '🎵', color: 'bg-black', url: 'https://www.tiktok.com/foryou' },
  { id: 'instagram', label: 'Instagram', icon: '📸', color: 'bg-gradient-to-br from-purple-600 to-pink-600', url: 'https://www.instagram.com' },
  { id: 'twitter', label: 'X', icon: '𝕏', color: 'bg-black', url: 'https://twitter.com/home' },
  { id: 'reddit', label: 'Reddit', icon: '🔥', color: 'bg-orange-600', url: 'https://www.reddit.com/r/popular' },
  { id: 'youtube', label: 'YouTube', icon: '📺', color: 'bg-red-600', url: 'https://www.youtube.com/feed/trending' }
];

// Streak configuration
const STREAK_CONFIG = {
  WINDOW_DURATION: 5 * 60 * 1000, // 5 minutes to maintain streak
  TRENDS_FOR_MULTIPLIER: {
    1: 1.0,   // No multiplier for first trend
    2: 1.2,   // 20% bonus for 2 trends
    3: 1.5,   // 50% bonus for 3 trends
    5: 2.0,   // 2x for 5 trends
    10: 2.5,  // 2.5x for 10 trends
    15: 3.0   // 3x for 15+ trends
  }
};

export default function LegibleScrollPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const scrollSessionRef = useRef<any>();
  
  // Core states
  const [trendUrl, setTrendUrl] = useState('');
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Session & Streak states
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [streakMultiplier, setStreakMultiplier] = useState(1.0);
  const [lastSubmissionTime, setLastSubmissionTime] = useState<Date | null>(null);
  const [streakTimeRemaining, setStreakTimeRemaining] = useState(0);
  const streakTimerRef = useRef<NodeJS.Timeout>();
  const sessionTimerRef = useRef<NodeJS.Timeout>();
  
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

  // Session timer
  useEffect(() => {
    if (isSessionActive && sessionStartTime) {
      sessionTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
        setSessionDuration(elapsed);
      }, 1000);
    } else {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    }
    
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [isSessionActive, sessionStartTime]);

  // Streak timer
  useEffect(() => {
    if (currentStreak > 0 && lastSubmissionTime) {
      const updateStreakTimer = () => {
        const elapsed = Date.now() - lastSubmissionTime.getTime();
        const remaining = Math.max(0, STREAK_CONFIG.WINDOW_DURATION - elapsed);
        
        if (remaining === 0) {
          // Streak expired
          setCurrentStreak(0);
          setStreakMultiplier(1.0);
          setLastSubmissionTime(null);
          setStreakTimeRemaining(0);
          if (streakTimerRef.current) {
            clearInterval(streakTimerRef.current);
          }
        } else {
          setStreakTimeRemaining(Math.ceil(remaining / 1000));
        }
      };
      
      updateStreakTimer();
      streakTimerRef.current = setInterval(updateStreakTimer, 1000);
      
      return () => {
        if (streakTimerRef.current) {
          clearInterval(streakTimerRef.current);
        }
      };
    }
  }, [currentStreak, lastSubmissionTime]);

  const loadTodaysStats = async () => {
    if (!user) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    try {
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

  const startSession = () => {
    setIsSessionActive(true);
    setSessionStartTime(new Date());
    setSessionDuration(0);
  };

  const endSession = () => {
    setIsSessionActive(false);
    setSessionStartTime(null);
    setSessionDuration(0);
    // Don't reset streak immediately - give them time to start a new session
  };

  const calculateMultiplier = (streakCount: number): number => {
    const thresholds = Object.keys(STREAK_CONFIG.TRENDS_FOR_MULTIPLIER)
      .map(Number)
      .sort((a, b) => b - a);
    
    for (const threshold of thresholds) {
      if (streakCount >= threshold) {
        return STREAK_CONFIG.TRENDS_FOR_MULTIPLIER[threshold];
      }
    }
    return 1.0;
  };

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (isValidUrl(pastedText)) {
      setTrendUrl(pastedText);
      // Immediately open the form - no session required
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
    if (!user || !profile) {
      setSubmitMessage({ type: 'error', text: 'Please log in to submit trends' });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Handle screenshot upload
      let screenshotUrl = formData.thumbnail_url;
      if (formData.screenshot && formData.screenshot instanceof File) {
        try {
          const fileExt = formData.screenshot.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('trend-images')
            .upload(fileName, formData.screenshot);

          if (uploadError) {
            console.error('Screenshot upload error:', uploadError);
          } else if (uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('trend-images')
              .getPublicUrl(fileName);
            screenshotUrl = publicUrl;
          }
        } catch (uploadErr) {
          console.error('Error handling screenshot:', uploadErr);
          // Continue without screenshot
        }
      }
      
      // Extract finance tickers
      const allText = [
        formData.trendName,
        formData.explanation,
        formData.post_caption,
        ...(formData.hashtags || [])
      ].join(' ');
      
      const tickers = extractTickers(allText);
      const isFinanceTrend = tickers.length > 0 || 
        formData.categories?.some((c: string) => 
          c.toLowerCase().includes('stock') || 
          c.toLowerCase().includes('coin') || 
          c.toLowerCase().includes('crypto')
        );
      
      // Calculate payment with streak multiplier (only if session is active)
      let basePayment = calculateBasePayment(formData, isFinanceTrend);
      let finalPayment = isSessionActive ? basePayment * streakMultiplier : basePayment;
      
      // Prepare submission - use basic fields that exist in database
      const submissionData: any = {
        spotter_id: user.id,
        category: getSafeCategory(formData.categories?.[0] || 'other'),
        description: formData.trendName || formData.explanation || 'Untitled Trend',
        status: getSafeStatus('submitted'),
        evidence: {
          ...formData,
          session_duration: sessionDuration,
          streak_count: isSessionActive ? currentStreak + 1 : 0,
          streak_multiplier: isSessionActive ? streakMultiplier : 1,
          user_profile: {
            age: profile?.age,
            gender: profile?.gender,
            location: profile?.location,
            interests: profile?.interests
          },
          payment_amount: finalPayment // Store payment in evidence instead
        },
        virality_prediction: mapSpreadSpeedToScore(formData.spreadSpeed),
        quality_score: 7, // Default quality score
        validation_count: 0,
        created_at: new Date().toISOString()
      };
      
      // Add optional fields that might exist in database
      if (formData.platform) submissionData.platform = formData.platform;
      if (formData.creator_handle) submissionData.creator_handle = formData.creator_handle;
      if (formData.creator_name) submissionData.creator_name = formData.creator_name;
      if (formData.post_caption) submissionData.post_caption = formData.post_caption;
      if (formData.likes_count) submissionData.likes_count = formData.likes_count;
      if (formData.comments_count) submissionData.comments_count = formData.comments_count;
      if (formData.shares_count) submissionData.shares_count = formData.shares_count;
      if (formData.views_count) submissionData.views_count = formData.views_count;
      if (formData.hashtags?.length) submissionData.hashtags = formData.hashtags;
      if (formData.thumbnail_url) submissionData.thumbnail_url = formData.thumbnail_url;
      if (screenshotUrl) submissionData.screenshot_url = screenshotUrl;
      
      console.log('Submitting to Supabase:', submissionData);
      
      const { data, error } = await supabase
        .from('trend_submissions')
        .insert(submissionData)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase submission error:', error);
        console.error('Error details:', error.message, error.details, error.hint);
        throw error;
      }
      
      // Create earnings entry
      const { error: earningsError } = await supabase
        .from('earnings_ledger')
        .insert({
          user_id: user.id,
          trend_id: data.id,
          amount: finalPayment,
          type: 'trend_submission',
          status: 'pending',
          description: `Trend: ${formData.trendName} (${formData.platform})`,
          metadata: {
            is_finance: isFinanceTrend,
            tickers,
            wave_score: formData.wave_score,
            streak_multiplier: isSessionActive ? streakMultiplier : 1,
            base_payment: basePayment
          }
        });
      
      if (earningsError) {
        console.error('Earnings ledger error:', earningsError);
        // Don't throw - trend was submitted successfully
      }
      
      // Update streak only if session is active
      if (isSessionActive) {
        const newStreak = currentStreak + 1;
        setCurrentStreak(newStreak);
        setStreakMultiplier(calculateMultiplier(newStreak));
        setLastSubmissionTime(new Date());
      }
      
      // Update stats
      setTodaysPendingEarnings(prev => prev + finalPayment);
      setTrendsLoggedToday(prev => prev + 1);
      
      // Success message
      const bonuses = [];
      if (isSessionActive && streakMultiplier > 1) bonuses.push(`${streakMultiplier}x Streak`);
      if (isFinanceTrend) bonuses.push('📈 Finance');
      if (formData.wave_score > 70) bonuses.push('🌊 High Wave');
      
      setSubmitMessage({ 
        type: 'success', 
        text: `Earned ${formatCurrency(finalPayment)}! ${bonuses.length ? `(${bonuses.join(', ')})` : ''}` 
      });
      
      // Reset form
      setTrendUrl('');
      setShowSubmissionForm(false);
      
      // Reload stats
      loadTodaysStats();
      if (isFinanceTrend) loadRecentTickers();
      
    } catch (error: any) {
      console.error('Submission error:', error);
      const errorMessage = error?.message || error?.error_description || 'Failed to submit trend';
      setSubmitMessage({ type: 'error', text: `Error: ${errorMessage}. Please check console for details.` });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSubmitMessage(null), 5000);
    }
  };

  const calculateBasePayment = (data: any, isFinance: boolean): number => {
    let payment = 0.08;
    if (data.trendName && data.explanation) payment += 0.01;
    if (data.screenshot) payment += 0.02;
    if (data.ageRanges?.length > 0) payment += 0.01;
    if (data.subcultures?.length > 0) payment += 0.01;
    if (isFinance) payment += 0.03;
    if (data.views_count > 100000) payment += 0.02;
    if (data.creator_handle) payment += 0.01;
    if (data.hashtags?.length > 3) payment += 0.01;
    if (data.otherPlatforms?.length > 0) payment += 0.01;
    if (data.wave_score > 70) payment += 0.02;
    return payment;
  };

  const calculateEngagementScore = (data: any): number => {
    if (!data.views_count) return 5;
    const engagementRate = ((data.likes_count + data.comments_count + data.shares_count) / data.views_count) * 100;
    return Math.min(10, Math.round(engagementRate));
  };

  const mapSpreadSpeedToScore = (speed: string): number => {
    const map: Record<string, number> = {
      'viral': 9,
      'picking_up': 7,
      'just_starting': 5,
      'saturated': 4,
      'declining': 2
    };
    return map[speed] || 5;
  };

  const extractTickers = (text: string): string[] => {
    const tickerPattern = /\$[A-Z]{1,5}\b/g;
    const matches = text.match(tickerPattern) || [];
    return [...new Set(matches.map(t => t.replace('$', '')))];
  };

  const detectSentiment = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes('moon') || lower.includes('rocket') || lower.includes('bull')) return 'bullish';
    if (lower.includes('bear') || lower.includes('crash') || lower.includes('dump')) return 'bearish';
    if (lower.includes('fomo')) return 'fomo';
    if (lower.includes('diamond') || lower.includes('hold')) return 'diamond_hands';
    return 'neutral';
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between bg-white rounded-2xl shadow-sm p-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex items-center gap-3">
            <WaveLogo size={32} animated={true} showTitle={false} />
            <h1 className="text-xl font-bold text-gray-900">Trend Scanner</h1>
          </div>

          {user && (
            <SpotterTierDisplay userId={user.id} compact={true} />
          )}
        </div>

        {/* Session Control & Streak Display */}
        <div className="mb-6 bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Scroll Session (Optional)</h2>
              <p className="text-sm text-gray-500">
                {isSessionActive ? 'Session active - submit trends quickly to build streak multipliers!' : 'Start a session to activate streak bonuses up to 3x earnings!'}
              </p>
            </div>
            
            <button
              onClick={isSessionActive ? endSession : startSession}
              className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                isSessionActive 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isSessionActive ? (
                <>
                  <Pause className="w-5 h-5" />
                  End Session
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Session
                </>
              )}
            </button>
          </div>

          {isSessionActive ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500">Duration</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{formatTime(sessionDuration)}</p>
              </div>
              
              <div className="bg-purple-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-purple-600">Streak</span>
                </div>
                <p className="text-xl font-bold text-purple-700">
                  {currentStreak} {currentStreak > 0 && `(${streakMultiplier}x)`}
                </p>
              </div>
              
              {currentStreak > 0 && (
                <div className="bg-orange-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Timer className="w-4 h-4 text-orange-500" />
                    <span className="text-xs text-orange-600">Time Left</span>
                  </div>
                  <p className="text-xl font-bold text-orange-700">{formatTime(streakTimeRemaining)}</p>
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
                  <h3 className="font-medium text-gray-900 mb-1">How Streak Bonuses Work</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Submit trends within 5-minute windows to build streaks</li>
                    <li>• Earn multipliers: 2 trends = 1.2x, 3 = 1.5x, 5 = 2x, 10 = 2.5x, 15+ = 3x</li>
                    <li>• Sessions are optional - you can submit trends anytime!</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-xs text-gray-500">Today</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(todaysEarnings)}</p>
            <p className="text-xs text-gray-500">Confirmed</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="text-xs text-gray-500">Pending</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(todaysPendingEarnings)}</p>
            <p className="text-xs text-gray-500">Verification</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <Flame className="w-5 h-5 text-purple-600" />
              <span className="text-xs text-gray-500">Multiplier</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{streakMultiplier}x</p>
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

        {/* Main Input Section */}
        <div className="mb-6 bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Link className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Submit a Trend</h2>
              <p className="text-sm text-gray-500">Paste a URL to start the 3-step submission</p>
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
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-lg"
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
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 text-lg"
            >
              <Send className="w-5 h-5" />
              Start Submission
            </button>
          </form>

          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <Sparkles className="w-4 h-4" />
            <span>Auto-captures creator info, captions, and engagement metrics</span>
          </div>
        </div>

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
                <h3 className="font-semibold text-gray-900">Finance Trends = Extra Cash</h3>
                <p className="text-sm text-gray-600">Track meme stocks & crypto for bonus payments</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg font-semibold">
              +$0.03 bonus
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

        {/* Success/Error Messages */}
        <AnimatePresence>
          {submitMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50"
            >
              <div className={`px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2 ${
                submitMessage.type === 'success'
                  ? 'bg-green-500 text-white'
                  : 'bg-red-500 text-white'
              }`}>
                {submitMessage.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="font-medium">{submitMessage.text}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3-Step Trend Submission Form */}
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
          <TrendSubmissionFormMerged
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