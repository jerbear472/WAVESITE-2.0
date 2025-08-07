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
  X,
  User,
  Globe,
  Hash,
  MessageCircle,
  Share2,
  Eye,
  Heart,
  Bookmark,
  AlertCircle,
  ChevronRight,
  LineChart,
  CandlestickChart,
  Coins,
  Banknote,
  PiggyBank,
  Wallet,
  CreditCard,
  Receipt,
  Calculator,
  Percent,
  Activity
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

// Platform icons mapping
const PLATFORM_ICONS = {
  tiktok: '🎵',
  instagram: '📸', 
  twitter: '𝕏',
  reddit: '🔥',
  youtube: '📺',
  linkedin: '💼',
  facebook: '👤',
  discord: '💬',
  telegram: '✈️',
  stocktwits: '📈'
};

// Finance-specific categories
const FINANCE_CATEGORIES = [
  'meme_stocks',
  'crypto',
  'forex',
  'options',
  'day_trading',
  'wallstreetbets',
  'penny_stocks',
  'short_squeeze',
  'technical_analysis',
  'fundamental_analysis',
  'defi',
  'nft',
  'altcoins',
  'market_sentiment'
];

// Finance sentiment indicators
const FINANCE_SENTIMENTS = [
  { value: 'bullish', label: '🚀 Bullish', color: 'text-green-400' },
  { value: 'bearish', label: '🐻 Bearish', color: 'text-red-400' },
  { value: 'neutral', label: '😐 Neutral', color: 'text-gray-400' },
  { value: 'fomo', label: '😱 FOMO', color: 'text-yellow-400' },
  { value: 'fud', label: '😰 FUD', color: 'text-orange-400' },
  { value: 'diamond_hands', label: '💎 Diamond Hands', color: 'text-blue-400' },
  { value: 'paper_hands', label: '🧻 Paper Hands', color: 'text-pink-400' },
  { value: 'to_the_moon', label: '🌙 To The Moon', color: 'text-purple-400' }
];

interface TrendData {
  url: string;
  platform: string;
  title: string;
  description?: string;
  category: string;
  subcategories?: string[];
  
  // Engagement metrics
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  
  // Creator info
  creator_handle?: string;
  creator_followers?: number;
  
  // Demographic data
  age_ranges?: string[];
  genders?: string[];
  locations?: string[];
  interests?: string[];
  income_brackets?: string[];
  education_levels?: string[];
  
  // Finance specific
  ticker_symbols?: string[];
  price_targets?: number[];
  sentiment?: string;
  volume_mentioned?: number;
  market_cap?: number;
  short_interest?: number;
  options_activity?: string;
  
  // User's persona data
  user_age?: number;
  user_gender?: string;
  user_location?: string;
  user_interests?: string[];
  user_investment_experience?: string;
  user_risk_tolerance?: string;
  
  // Media
  screenshot?: File | null;
  video_url?: string;
  
  // Timing
  first_seen?: Date;
  posted_at?: Date;
  
  // Virality prediction
  spread_speed?: 'viral' | 'picking_up' | 'steady' | 'declining';
  predicted_peak?: Date;
}

export default function EnhancedScrollDashboard() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollSessionRef = useRef<any>();
  
  // UI states
  const [activeTab, setActiveTab] = useState<'quick' | 'detailed' | 'finance'>('quick');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [showTrendForm, setShowTrendForm] = useState(false);
  const [showDemographicForm, setShowDemographicForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Data states
  const [trendData, setTrendData] = useState<Partial<TrendData>>({});
  const [todaysEarnings, setTodaysEarnings] = useState(0);
  const [todaysPendingEarnings, setTodaysPendingEarnings] = useState(0);
  const [loggedTrends, setLoggedTrends] = useState<string[]>([]);
  const [recentTickers, setRecentTickers] = useState<string[]>([]);
  
  // Session & streak states
  const [streak, setStreak] = useState(0);
  const [streakMultiplier, setStreakMultiplier] = useState(1);
  const [sessionStats, setSessionStats] = useState({
    duration: 0,
    trendsLogged: 0,
    platformsVisited: new Set<string>(),
    categoriesCovered: new Set<string>(),
    financeTagged: 0
  });

  // Load user's recent activity
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
      
      // Load logged trends
      const { data: submissions } = await supabase
        .from('trend_submissions')
        .select('evidence')
        .eq('spotter_id', user.id)
        .gte('created_at', today.toISOString());
      
      const urls = submissions?.map(s => s.evidence?.url).filter(Boolean) || [];
      setLoggedTrends(urls);
      
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentTickers = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('trend_submissions')
        .select('evidence')
        .eq('spotter_id', user.id)
        .not('evidence->ticker_symbols', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);
      
      const tickers = new Set<string>();
      data?.forEach(item => {
        item.evidence?.ticker_symbols?.forEach((ticker: string) => tickers.add(ticker));
      });
      
      setRecentTickers(Array.from(tickers).slice(0, 5));
    } catch (error) {
      console.error('Error loading tickers:', error);
    }
  };

  const handlePlatformClick = (platform: string) => {
    setSelectedPlatform(platform);
    
    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      platformsVisited: new Set([...prev.platformsVisited, platform])
    }));
    
    // Open platform in popup
    const urls: Record<string, string> = {
      tiktok: 'https://www.tiktok.com/foryou',
      instagram: 'https://www.instagram.com',
      twitter: 'https://twitter.com/home',
      reddit: 'https://www.reddit.com/r/wallstreetbets',
      youtube: 'https://www.youtube.com/feed/trending',
      stocktwits: 'https://stocktwits.com/rankings/trending',
      discord: 'https://discord.com',
      telegram: 'https://web.telegram.org'
    };
    
    if (urls[platform]) {
      window.open(urls[platform], platform, 'width=1200,height=800,left=200,top=100');
    }
  };

  const handleQuickLog = async () => {
    if (!trendData.url) {
      setSubmitMessage({ type: 'error', text: 'Please paste a trend URL' });
      setTimeout(() => setSubmitMessage(null), 3000);
      return;
    }
    
    if (!selectedPlatform) {
      setSubmitMessage({ type: 'error', text: 'Please select a platform' });
      setTimeout(() => setSubmitMessage(null), 3000);
      return;
    }
    
    setShowTrendForm(true);
  };

  const handleTrendSubmit = async (formData: any) => {
    if (!user || !profile) {
      setSubmitMessage({ type: 'error', text: 'Please log in to submit trends' });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // The formData from TrendSubmissionFormMerged already has all the data we need
      // Just enrich with user profile data and finance-specific fields
      const enrichedData = {
        ...formData,
        platform: formData.platform || selectedPlatform,
        user_age: profile?.age,
        user_gender: profile?.gender,
        user_location: profile?.location,
        user_interests: profile?.interests,
        user_investment_experience: profile?.investment_experience,
        user_risk_tolerance: profile?.risk_tolerance,
        // Extract any ticker symbols from the content
        ticker_symbols: extractTickersFromText(
          formData.explanation + ' ' + 
          formData.post_caption + ' ' + 
          (formData.hashtags?.join(' ') || '')
        )
      };
      
      // Calculate payment based on data completeness and finance relevance
      let payment = 0.08; // Base payment
      
      // Quality bonuses from 3-step form
      if (enrichedData.trendName && enrichedData.explanation) payment += 0.01; // Complete description
      if (enrichedData.ticker_symbols?.length) payment += 0.02; // Finance content
      if (enrichedData.screenshot) payment += 0.02; // Visual evidence
      if (enrichedData.ageRanges?.length > 0) payment += 0.01; // Demographics
      if (enrichedData.subcultures?.length > 0) payment += 0.01; // Audience insights
      if (enrichedData.categories?.some((c: string) => 
        c.includes('Stock') || c.includes('Coin') || c.includes('Crypto')
      )) payment += 0.03; // Finance category
      if (enrichedData.views_count > 100000) payment += 0.02; // High engagement
      if (enrichedData.creator_handle && enrichedData.post_caption) payment += 0.01; // Auto-captured data
      if (enrichedData.hashtags?.length > 3) payment += 0.01; // Rich hashtags
      if (enrichedData.otherPlatforms?.length > 0) payment += 0.01; // Cross-platform trend
      if (enrichedData.wave_score && enrichedData.wave_score > 70) payment += 0.02; // High wave score
      
      // Apply streak multiplier
      payment *= streakMultiplier;
      
      // Save to database with all the rich data from the 3-step form
      const { data, error } = await supabase
        .from('trend_submissions')
        .insert({
          spotter_id: user.id,
          category: getSafeCategory(enrichedData.categories?.[0] || enrichedData.category),
          description: enrichedData.trendName || enrichedData.explanation || 'Untitled Trend',
          status: getSafeStatus('submitted'),
          evidence: enrichedData, // This contains ALL the rich data from the form
          virality_prediction: enrichedData.spreadSpeed === 'viral' ? 9 : 
                               enrichedData.spreadSpeed === 'picking_up' ? 7 : 
                               enrichedData.spreadSpeed === 'just_starting' ? 5 : 3,
          payment_amount: payment,
          created_at: new Date().toISOString(),
          
          // Additional structured fields for enterprise dashboard
          platform: enrichedData.platform,
          engagement_score: calculateEngagementScore(enrichedData),
          demographic_data: {
            age_ranges: enrichedData.ageRanges || enrichedData.age_ranges,
            genders: enrichedData.genders,
            locations: enrichedData.region ? [enrichedData.region] : enrichedData.locations,
            interests: enrichedData.subcultures || enrichedData.interests,
            moods: enrichedData.moods
          },
          finance_data: enrichedData.ticker_symbols?.length ? {
            tickers: enrichedData.ticker_symbols,
            sentiment: enrichedData.sentiment || detectFinanceSentiment(enrichedData),
            categories: enrichedData.categories?.filter((c: string) => 
              c.includes('Stock') || c.includes('Coin') || c.includes('Crypto')
            )
          } : null,
          
          // Auto-captured metadata fields
          creator_handle: enrichedData.creator_handle,
          creator_name: enrichedData.creator_name,
          post_caption: enrichedData.post_caption,
          likes_count: enrichedData.likes_count || 0,
          comments_count: enrichedData.comments_count || 0,
          shares_count: enrichedData.shares_count || 0,
          views_count: enrichedData.views_count || 0,
          hashtags: enrichedData.hashtags || [],
          thumbnail_url: enrichedData.thumbnail_url,
          wave_score: enrichedData.wave_score || 50
        })
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
          description: `Trend: ${enrichedData.title} (${enrichedData.platform})`,
          created_at: new Date().toISOString()
        });
      
      // Update local state
      setLoggedTrends(prev => [...prev, enrichedData.url!]);
      setTodaysPendingEarnings(prev => prev + payment);
      setSessionStats(prev => ({
        ...prev,
        trendsLogged: prev.trendsLogged + 1,
        categoriesCovered: new Set([...prev.categoriesCovered, enrichedData.category || '']),
        financeTagged: enrichedData.ticker_symbols ? prev.financeTagged + 1 : prev.financeTagged
      }));
      
      // Update streak
      setStreak(prev => prev + 1);
      setStreakMultiplier(calculateMultiplier(streak + 1));
      
      // Create detailed success message
      const bonusReasons = [];
      if (enrichedData.ticker_symbols?.length) bonusReasons.push('Finance');
      if (enrichedData.creator_handle) bonusReasons.push('Auto-captured');
      if (enrichedData.wave_score > 70) bonusReasons.push('High Wave Score');
      if (enrichedData.otherPlatforms?.length) bonusReasons.push('Cross-platform');
      
      setSubmitMessage({ 
        type: 'success', 
        text: `Trend submitted! +${formatCurrency(payment)} earned${bonusReasons.length ? ` (${bonusReasons.join(', ')})` : ''}` 
      });
      
      // Reset form
      setTrendData({});
      setSelectedPlatform('');
      setShowTrendForm(false);
      
    } catch (error) {
      console.error('Error submitting trend:', error);
      setSubmitMessage({ type: 'error', text: 'Failed to submit trend' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSubmitMessage(null), 5000);
    }
  };

  const calculateEngagementScore = (data: Partial<TrendData>): number => {
    let score = 0;
    const likes = data.likes || 0;
    const comments = data.comments || 0;
    const shares = data.shares || 0;
    const views = data.views || 1;
    
    // Engagement rate calculation
    const engagementRate = ((likes + comments + shares) / views) * 100;
    
    if (engagementRate > 10) score = 10;
    else if (engagementRate > 5) score = 8;
    else if (engagementRate > 2) score = 6;
    else if (engagementRate > 1) score = 4;
    else score = 2;
    
    return Math.min(10, score);
  };

  const calculateMultiplier = (streakCount: number): number => {
    if (streakCount < 3) return 1;
    if (streakCount < 5) return 1.2;
    if (streakCount < 10) return 1.5;
    if (streakCount < 20) return 2;
    return 2.5;
  };

  const extractTickersFromText = (text: string): string[] => {
    // Simple regex to find stock tickers (e.g., $GME, $AMC, TSLA)
    const tickerPattern = /\$?[A-Z]{1,5}\b/g;
    const matches = text.match(tickerPattern) || [];
    return [...new Set(matches.map(t => t.replace('$', '')))];
  };

  const detectFinanceSentiment = (data: any): string => {
    const content = (
      (data.explanation || '') + ' ' + 
      (data.post_caption || '') + ' ' + 
      (data.hashtags?.join(' ') || '')
    ).toLowerCase();
    
    if (content.includes('moon') || content.includes('rocket') || content.includes('bull')) {
      return 'bullish';
    }
    if (content.includes('bear') || content.includes('crash') || content.includes('dump')) {
      return 'bearish';
    }
    if (content.includes('fomo') || content.includes('fear')) {
      return 'fomo';
    }
    if (content.includes('diamond') || content.includes('hold')) {
      return 'diamond_hands';
    }
    return 'neutral';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-black">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between"
        >
          <button
            onClick={() => router.push('/dashboard')}
            className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          
          <div className="flex items-center gap-3">
            <WaveLogo size={36} animated={true} showTitle={false} />
            <h1 className="text-2xl font-bold text-white">Trend Scanner</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDemographicForm(true)}
              className="p-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-all"
              title="Update Profile"
            >
              <User className="w-5 h-5 text-purple-400" />
            </button>
            {profile && (
              <SpotterTierDisplay userId={user!.id} compact={true} />
            )}
          </div>
        </motion.div>

        {/* Earnings & Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-sm rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-xs text-green-300">Confirmed</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(todaysEarnings)}</p>
            <p className="text-xs text-green-300 mt-1">Today's Earnings</p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-600/20 to-amber-600/20 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/30">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <span className="text-xs text-yellow-300">Pending</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(todaysPendingEarnings)}</p>
            <p className="text-xs text-yellow-300 mt-1">Being Verified</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <Flame className="w-5 h-5 text-purple-400" />
              <span className="text-xs text-purple-300">{streakMultiplier}x</span>
            </div>
            <p className="text-2xl font-bold text-white">{streak}</p>
            <p className="text-xs text-purple-300 mt-1">Current Streak</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <span className="text-xs text-blue-300">Session</span>
            </div>
            <p className="text-2xl font-bold text-white">{sessionStats.trendsLogged}</p>
            <p className="text-xs text-blue-300 mt-1">Trends Logged</p>
          </div>
        </motion.div>

        {/* Finance Ticker Bar */}
        {recentTickers.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 bg-gray-800/40 backdrop-blur-sm rounded-xl p-3 border border-gray-700/50"
          >
            <div className="flex items-center gap-3 overflow-x-auto">
              <span className="text-xs text-gray-400 whitespace-nowrap">Recent:</span>
              {recentTickers.map(ticker => (
                <button
                  key={ticker}
                  onClick={() => setTrendData(prev => ({
                    ...prev,
                    ticker_symbols: [ticker]
                  }))}
                  className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg text-sm font-mono text-blue-400 whitespace-nowrap transition-all"
                >
                  ${ticker}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Platform Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-400" />
            Select Platform & Log Trends
          </h3>
          
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
            {Object.entries(PLATFORM_ICONS).map(([platform, icon]) => (
              <button
                key={platform}
                onClick={() => handlePlatformClick(platform)}
                className={`p-4 rounded-xl transition-all transform hover:scale-105 ${
                  selectedPlatform === platform
                    ? 'bg-gradient-to-br from-purple-600 to-pink-600 border-purple-400'
                    : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700'
                } border backdrop-blur-sm`}
              >
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-xs text-gray-300 capitalize">{platform}</div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Quick Log Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20"
        >
          {/* Tab Selector */}
          <div className="flex gap-2 mb-4">
            {['quick', 'detailed', 'finance'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                {tab === 'quick' && '⚡ Quick Log'}
                {tab === 'detailed' && '📝 Detailed'}
                {tab === 'finance' && '📈 Finance'}
              </button>
            ))}
          </div>

          {/* Quick Log Tab */}
          {activeTab === 'quick' && (
            <div className="space-y-4">
              <input
                type="url"
                value={trendData.url || ''}
                onChange={(e) => setTrendData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="Paste trend URL..."
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
              />
              
              {selectedPlatform && (
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span>Platform:</span>
                  <span className="px-3 py-1 bg-purple-600/20 rounded-lg">
                    {PLATFORM_ICONS[selectedPlatform]} {selectedPlatform}
                  </span>
                </div>
              )}
              
              <button
                onClick={handleQuickLog}
                disabled={!trendData.url || !selectedPlatform}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 rounded-xl font-bold text-white transition-all"
              >
                Continue to Details →
              </button>
            </div>
          )}

          {/* Finance Tab */}
          {activeTab === 'finance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Ticker symbols (e.g., GME, AMC)"
                  onChange={(e) => {
                    const tickers = extractTickersFromText(e.target.value);
                    setTrendData(prev => ({ ...prev, ticker_symbols: tickers }));
                  }}
                  className="px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
                />
                
                <select
                  onChange={(e) => setTrendData(prev => ({ ...prev, sentiment: e.target.value }))}
                  className="px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400/60"
                >
                  <option value="">Select Sentiment</option>
                  {FINANCE_SENTIMENTS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              
              <textarea
                placeholder="What's the buzz? (options activity, short squeeze, earnings, etc.)"
                onChange={(e) => setTrendData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 h-24 resize-none"
              />
              
              <div className="flex gap-2">
                {FINANCE_CATEGORIES.slice(0, 6).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setTrendData(prev => ({ ...prev, category: cat }))}
                    className={`px-3 py-1 rounded-lg text-xs transition-all ${
                      trendData.category === cat
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setShowTrendForm(true)}
                disabled={!trendData.ticker_symbols?.length}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-600 rounded-xl font-bold text-white transition-all"
              >
                <DollarSign className="inline w-5 h-5 mr-2" />
                Submit Finance Trend
              </button>
            </div>
          )}
        </motion.div>

        {/* Session Controls */}
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

        {/* Submit Message */}
        <AnimatePresence>
          {submitMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50"
            >
              <div className={`px-6 py-3 rounded-xl shadow-lg ${
                submitMessage.type === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-red-600 text-white'
              }`}>
                {submitMessage.text}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3-Step Trend Submission Form with Auto-Capture */}
      {showTrendForm && (
        <TrendSubmissionFormMerged
          onClose={() => {
            setShowTrendForm(false);
            setTrendData({});
            setSelectedPlatform('');
          }}
          onSubmit={handleTrendSubmit}
          initialUrl={trendData.url || ''}
        />
      )}
    </div>
  );
}