'use client';

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
  Clock,
  Trophy,
  Target,
  CheckCircle,
  X,
  Globe,
  Sparkles,
  AlertCircle,
  ChevronRight,
  Coins,
  Activity,
  Zap,
  Eye,
  Heart,
  MessageCircle,
  Share2
} from 'lucide-react';
import { ScrollSession } from '@/components/ScrollSession';
import { FloatingTrendLogger } from '@/components/FloatingTrendLogger';
import { SpotterTierDisplay } from '@/components/SpotterTierDisplay';
import TrendSubmissionFormMerged from '@/components/TrendSubmissionFormMerged';
import { useAuth } from '@/contexts/AuthContext';
import WaveLogo from '@/components/WaveLogo';
import { formatCurrency } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import { getSafeCategory, getSafeStatus } from '@/lib/safeCategory';

// Primary platforms only - no second tier
const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', icon: '🎵', color: 'from-black to-gray-900', url: 'https://www.tiktok.com/foryou' },
  { id: 'instagram', label: 'Instagram', icon: '📸', color: 'from-purple-600 to-pink-600', url: 'https://www.instagram.com' },
  { id: 'twitter', label: 'X', icon: '𝕏', color: 'from-gray-900 to-black', url: 'https://twitter.com/home' },
  { id: 'reddit', label: 'Reddit', icon: '🔥', color: 'from-orange-600 to-red-600', url: 'https://www.reddit.com/r/popular' },
  { id: 'youtube', label: 'YouTube', icon: '📺', color: 'from-red-600 to-red-700', url: 'https://www.youtube.com/feed/trending' }
];

// Finance-specific subreddits and communities
const FINANCE_COMMUNITIES = [
  'r/wallstreetbets',
  'r/stocks', 
  'r/cryptocurrency',
  'r/superstonk',
  'StockTwits'
];

export default function EnhancedScrollPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollSessionRef = useRef<any>();
  
  // Core states
  const [trendUrl, setTrendUrl] = useState('');
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Stats
  const [todaysEarnings, setTodaysEarnings] = useState(0);
  const [todaysPendingEarnings, setTodaysPendingEarnings] = useState(0);
  const [trendsLoggedToday, setTrendsLoggedToday] = useState(0);
  const [recentTickers, setRecentTickers] = useState<string[]>([]);
  
  // Session tracking
  const [sessionStats, setSessionStats] = useState({
    duration: 0,
    trendsLogged: 0,
    platformsVisited: new Set<string>(),
    financeTagged: 0
  });
  
  // Streak system
  const [streak, setStreak] = useState(0);
  const [streakMultiplier, setStreakMultiplier] = useState(1);

  // Load today's stats on mount
  useEffect(() => {
    if (user) {
      loadTodaysStats();
      loadRecentTickers();
    }
  }, [user]);

  const loadTodaysStats = async () => {
    if (!user) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    try {
      // Load earnings
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
      
      // Count trends
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

  // Handle URL paste - immediately open form
  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (isValidUrl(pastedText)) {
      setTrendUrl(pastedText);
      // Immediately open the 3-step form
      setTimeout(() => {
        setShowSubmissionForm(true);
      }, 100);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTrendUrl(e.target.value);
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
    // Track platform visit
    setSessionStats(prev => ({
      ...prev,
      platformsVisited: new Set([...prev.platformsVisited, platform.id])
    }));
    
    // Open in new window
    window.open(platform.url, platform.id, 'width=1200,height=800,left=200,top=100');
  };

  const handleTrendSubmit = async (formData: any) => {
    if (!user || !profile) {
      setSubmitMessage({ type: 'error', text: 'Please log in to submit trends' });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Handle screenshot upload if present
      let screenshotUrl = formData.thumbnail_url; // Use auto-captured thumbnail as fallback
      if (formData.screenshot && formData.screenshot instanceof File) {
        const fileExt = formData.screenshot.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('trend-images')
          .upload(fileName, formData.screenshot);

        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('trend-images')
            .getPublicUrl(fileName);
          screenshotUrl = publicUrl;
        }
      }
      
      // Extract finance tickers from all text fields
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
      
      // Calculate payment
      let payment = calculatePayment(formData, isFinanceTrend);
      payment *= streakMultiplier;
      
      // Prepare submission data
      const submissionData = {
        spotter_id: user.id,
        category: getSafeCategory(formData.categories?.[0] || 'other'),
        description: formData.trendName || formData.explanation || 'Untitled Trend',
        status: getSafeStatus('submitted'),
        evidence: {
          ...formData,
          user_profile: {
            age: profile?.age,
            gender: profile?.gender,
            location: profile?.location,
            interests: profile?.interests
          }
        },
        
        // Structured fields for queries
        platform: formData.platform,
        engagement_score: calculateEngagementScore(formData),
        virality_prediction: mapSpreadSpeedToScore(formData.spreadSpeed),
        payment_amount: payment,
        
        // Demographics
        demographic_data: {
          age_ranges: formData.ageRanges,
          subcultures: formData.subcultures,
          region: formData.region,
          moods: formData.moods
        },
        
        // Finance data if applicable
        finance_data: isFinanceTrend ? {
          tickers,
          sentiment: detectSentiment(allText),
          categories: formData.categories?.filter((c: string) => 
            c.toLowerCase().includes('stock') || 
            c.toLowerCase().includes('coin')
          )
        } : null,
        
        // Auto-captured fields
        creator_handle: formData.creator_handle,
        creator_name: formData.creator_name,
        post_caption: formData.post_caption,
        likes_count: formData.likes_count || 0,
        comments_count: formData.comments_count || 0,
        shares_count: formData.shares_count || 0,
        views_count: formData.views_count || 0,
        hashtags: formData.hashtags || [],
        thumbnail_url: formData.thumbnail_url,
        screenshot_url: screenshotUrl, // Add uploaded screenshot
        wave_score: formData.wave_score || 50,
        
        created_at: new Date().toISOString()
      };
      
      // Submit to database
      const { data, error } = await supabase
        .from('trend_submissions')
        .insert(submissionData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Create earnings entry
      await supabase
        .from('earnings_ledger')
        .insert({
          user_id: user.id,
          trend_id: data.id,
          amount: payment,
          type: 'trend_submission',
          status: 'pending',
          description: `Trend: ${formData.trendName} (${formData.platform})`,
          metadata: {
            is_finance: isFinanceTrend,
            tickers,
            wave_score: formData.wave_score
          }
        });
      
      // Update local stats
      setTodaysPendingEarnings(prev => prev + payment);
      setTrendsLoggedToday(prev => prev + 1);
      setStreak(prev => prev + 1);
      setStreakMultiplier(calculateMultiplier(streak + 1));
      
      if (isFinanceTrend) {
        setSessionStats(prev => ({
          ...prev,
          trendsLogged: prev.trendsLogged + 1,
          financeTagged: prev.financeTagged + 1
        }));
      }
      
      // Success message
      const bonuses = [];
      if (isFinanceTrend) bonuses.push('📈 Finance');
      if (formData.wave_score > 70) bonuses.push('🌊 High Wave');
      if (formData.creator_handle) bonuses.push('✨ Auto-captured');
      
      setSubmitMessage({ 
        type: 'success', 
        text: `Trend submitted! +${formatCurrency(payment)}${bonuses.length ? ` (${bonuses.join(' ')})` : ''}` 
      });
      
      // Reset and close
      setTrendUrl('');
      setShowSubmissionForm(false);
      
      // Reload stats
      loadTodaysStats();
      if (isFinanceTrend) loadRecentTickers();
      
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitMessage({ type: 'error', text: 'Failed to submit trend. Please try again.' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSubmitMessage(null), 5000);
    }
  };

  const calculatePayment = (data: any, isFinance: boolean): number => {
    let payment = 0.08; // Base
    
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

  const calculateMultiplier = (streakCount: number): number => {
    if (streakCount < 3) return 1;
    if (streakCount < 5) return 1.2;
    if (streakCount < 10) return 1.5;
    if (streakCount < 20) return 2;
    return 2.5;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-black">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between"
        >
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all backdrop-blur-sm"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          
          <div className="flex items-center gap-3">
            <WaveLogo size={32} animated={true} showTitle={false} />
            <h1 className="text-xl font-bold text-white">Trend Scanner</h1>
          </div>

          {user && (
            <SpotterTierDisplay userId={user.id} compact={true} />
          )}
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 backdrop-blur-sm rounded-xl p-4 border border-green-500/20">
            <div className="flex items-center justify-between mb-1">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400/70">Today</span>
            </div>
            <p className="text-xl font-bold text-white">{formatCurrency(todaysEarnings)}</p>
            <p className="text-xs text-green-400/70">Confirmed</p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/10 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/20">
            <div className="flex items-center justify-between mb-1">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-yellow-400/70">Pending</span>
            </div>
            <p className="text-xl font-bold text-white">{formatCurrency(todaysPendingEarnings)}</p>
            <p className="text-xs text-yellow-400/70">Verification</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/10 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20">
            <div className="flex items-center justify-between mb-1">
              <Flame className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-purple-400/70">{streakMultiplier}x</span>
            </div>
            <p className="text-xl font-bold text-white">{streak}</p>
            <p className="text-xs text-purple-400/70">Streak</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 backdrop-blur-sm rounded-xl p-4 border border-blue-500/20">
            <div className="flex items-center justify-between mb-1">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-blue-400/70">Logged</span>
            </div>
            <p className="text-xl font-bold text-white">{trendsLoggedToday}</p>
            <p className="text-xs text-blue-400/70">Today</p>
          </div>
        </motion.div>

        {/* Recent Tickers (if any) */}
        {recentTickers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 flex items-center gap-2 p-3 bg-white/5 backdrop-blur-sm rounded-xl overflow-x-auto"
          >
            <Coins className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <span className="text-xs text-gray-400 flex-shrink-0">Recent:</span>
            {recentTickers.map(ticker => (
              <span key={ticker} className="px-2 py-1 bg-blue-500/20 rounded-lg text-xs font-mono text-blue-400 whitespace-nowrap">
                ${ticker}
              </span>
            ))}
          </motion.div>
        )}

        {/* Main Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-gradient-to-br from-purple-600/5 via-pink-600/5 to-blue-600/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Link className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Submit a Trend</h2>
              <p className="text-sm text-gray-400">Paste a URL to start the 3-step submission</p>
            </div>
          </div>

          <form onSubmit={handleUrlSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="url"
                value={trendUrl}
                onChange={handleUrlChange}
                onPaste={handleUrlPaste}
                placeholder="Paste trend URL here..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                autoFocus
              />
              {trendUrl && (
                <button
                  type="button"
                  onClick={() => setTrendUrl('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            
            <button
              type="submit"
              disabled={!trendUrl}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 disabled:opacity-50 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Start Submission
            </button>
          </form>

          <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
            <Sparkles className="w-3 h-3" />
            <span>Auto-captures creator info, captions, and engagement metrics</span>
          </div>
        </motion.div>

        {/* Platform Quick Access */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Quick Platform Access
          </h3>
          
          <div className="grid grid-cols-5 gap-2">
            {PLATFORMS.map(platform => (
              <button
                key={platform.id}
                onClick={() => handlePlatformClick(platform)}
                className={`p-3 bg-gradient-to-br ${platform.color} rounded-xl transition-all transform hover:scale-105 hover:shadow-lg border border-white/10`}
              >
                <div className="text-2xl mb-1">{platform.icon}</div>
                <div className="text-xs text-white/80">{platform.label}</div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Finance Communities */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 backdrop-blur-sm rounded-xl border border-white/10"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white">Finance Trends = Higher Pay</span>
            </div>
            <span className="text-xs text-green-400">+$0.03 bonus</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {FINANCE_COMMUNITIES.map(community => (
              <span key={community} className="px-3 py-1 bg-white/5 rounded-lg text-xs text-gray-300">
                {community}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Session Control */}
        <ScrollSession
          ref={scrollSessionRef}
          onSessionStateChange={setIsScrolling}
          onTrendLogged={() => {
            setSessionStats(prev => ({
              ...prev,
              trendsLogged: prev.trendsLogged + 1
            }));
          }}
          streak={streak}
          streakMultiplier={streakMultiplier}
        />

        {/* Success/Error Messages */}
        <AnimatePresence>
          {submitMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50"
            >
              <div className={`px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2 ${
                submitMessage.type === 'success'
                  ? 'bg-green-500/90 text-white'
                  : 'bg-red-500/90 text-white'
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
        <TrendSubmissionFormMerged
          onClose={() => {
            setShowSubmissionForm(false);
            setTrendUrl('');
          }}
          onSubmit={handleTrendSubmit}
          initialUrl={trendUrl}
        />
      )}
    </div>
  );
}