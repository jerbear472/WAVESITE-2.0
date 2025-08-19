'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Zap, Clock, DollarSign, Users, Play, 
  Bookmark, Share2, Copy, ArrowRight, Bell, Star,
  Video, Image, Music, Hash, Globe, Target, Rocket,
  CheckCircle, AlertCircle, Sparkles, Crown, Flame,
  BarChart3, Eye, Heart, MessageCircle, Send,
  ChevronRight, Timer, Trophy, Gauge, TrendingDown, X,
  Search, Filter, Settings, Menu, Home, Waves,
  MoreHorizontal, ExternalLink, Download, RefreshCw
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface CreatorTrend {
  id: string;
  title: string;
  description: string;
  category: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'all';
  virality_score: number;
  urgency: 'act_now' | 'rising' | 'steady' | 'declining';
  time_to_peak: number; // hours
  current_creators: number;
  potential_views: string;
  engagement_rate: number;
  difficulty: 'easy' | 'medium' | 'hard';
  content_ideas: string[];
  hooks: string[];
  hashtags: string[];
  best_time_to_post: string;
  example_url?: string;
  thumbnail_url?: string;
  created_at: string;
  audio_url?: string;
  validation_count: number;
  success_rate: number;
}

interface ContentTemplate {
  id: string;
  trend_id: string;
  format: string;
  script?: string;
  shots?: string[];
  duration?: string;
  equipment?: string[];
  editing_tips?: string[];
}

const PLATFORM_COLORS = {
  tiktok: 'bg-slate-50 border-slate-200',
  instagram: 'bg-rose-50 border-rose-200', 
  youtube: 'bg-red-50 border-red-200',
  twitter: 'bg-blue-50 border-blue-200',
  all: 'bg-indigo-50 border-indigo-200'
};

const URGENCY_BADGES = {
  act_now: { color: 'bg-red-100 text-red-700 border border-red-200', text: 'High Priority', pulse: true },
  rising: { color: 'bg-orange-100 text-orange-700 border border-orange-200', text: 'Rising', pulse: false },
  steady: { color: 'bg-blue-100 text-blue-700 border border-blue-200', text: 'Steady', pulse: false },
  declining: { color: 'bg-gray-100 text-gray-700 border border-gray-200', text: 'Declining', pulse: false }
};

export default function CreatorDashboard() {
  const [trends, setTrends] = useState<CreatorTrend[]>([]);
  const [filteredTrends, setFilteredTrends] = useState<CreatorTrend[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTrend, setSelectedTrend] = useState<CreatorTrend | null>(null);
  const [savedTrends, setSavedTrends] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const notificationSound = useRef<HTMLAudioElement>(null);

  // Mock subscription check (replace with real Stripe integration)
  useEffect(() => {
    console.log('Creator Dashboard initializing...');
    checkSubscription();
    fetchCreatorTrends();
  }, []);

  const checkSubscription = () => {
    // Mock - replace with real subscription check
    const subscribed = localStorage.getItem('creator_subscribed') === 'true';
    setIsSubscribed(subscribed);
    if (!subscribed) {
      setShowPaywall(true);
    }
  };

  const fetchCreatorTrends = async () => {
    try {
      console.log('Loading validated trends from WaveSight spotter network...');
      
      // Fetch all trend submissions from WaveSight spotter network
      const { data: dbTrends, error } = await supabase
        .from('trend_submissions')
        .select(`
          id,
          spotter_id,
          category,
          description,
          screenshot_url,
          thumbnail_url,
          post_url,
          platform,
          views_count,
          likes_count,
          creator_handle,
          validation_count,
          approve_count,
          quality_score,
          virality_prediction,
          wave_score,
          status,
          created_at,
          evidence,
          trend_name,
          title
        `)
        .gte('quality_score', 60) // Only decent quality submissions
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Database error:', error);
        setTrends([]);
        setFilteredTrends([]);
        setLoading(false);
        return;
      }

      if (!dbTrends || dbTrends.length === 0) {
        console.log('No validated trends found');
        setTrends([]);
        setFilteredTrends([]);
        setLoading(false);
        return;
      }

      // Transform database trends into creator-optimized format
      const creatorTrends: CreatorTrend[] = dbTrends.map(trend => ({
        id: trend.id,
        title: trend.title || trend.trend_name || generateCatchyTitle(trend.description),
        description: trend.description,
        category: trend.category,
        platform: trend.platform || detectPlatform(trend),
        virality_score: Math.round((trend.wave_score || trend.virality_prediction || 50)),
        urgency: determineUrgency(trend),
        time_to_peak: calculateTimeToPeak(trend),
        current_creators: Math.floor((trend.validation_count || 0) * 5), // Estimate based on validators
        potential_views: formatViews((trend.views_count || 0) + ((trend.validation_count || 0) * 10000)), // Use actual views + estimate
        engagement_rate: Math.max(5, Math.min(15, 5 + ((trend.quality_score || 50) - 50) / 10)), // 5-15% based on quality
        difficulty: determineDifficulty(trend.category),
        content_ideas: generateContentIdeas(trend),
        hooks: generateHooks(trend),
        hashtags: generateHashtags(trend),
        best_time_to_post: generateBestTime(),
        example_url: trend.post_url,
        thumbnail_url: trend.thumbnail_url || trend.screenshot_url,
        created_at: trend.created_at,
        audio_url: undefined, // No audio_url in current schema
        validation_count: trend.validation_count || 0,
        success_rate: Math.round(((trend.approve_count || 0) / Math.max(1, (trend.validation_count || 1))) * 100)
      }));

      setTrends(creatorTrends);
      setFilteredTrends(creatorTrends);
      setLoading(false);
      
      console.log(`Loaded ${creatorTrends.length} validated trends for creators`);

      // Play notification for urgent trends
      const urgentTrends = creatorTrends.filter(t => t.urgency === 'act_now');
      if (urgentTrends.length > 0 && notificationSound.current) {
        notificationSound.current.play().catch(() => {
          // Ignore audio play errors (browser policy)
        });
      }
    } catch (error) {
      console.error('Error loading trends:', error);
      setTrends([]);
      setFilteredTrends([]);
      setLoading(false);
    }
  };

  const generateCatchyTitle = (description: string): string => {
    const templates = [
      `This ${description.split(' ')[0]} Trend is Going VIRAL`,
      `Why Everyone's Doing ${description.substring(0, 30)}...`,
      `The ${description.split(' ')[0]} Challenge Taking Over`,
      `Jump on This: ${description.substring(0, 40)}`,
      `${description.substring(0, 30)} = Instant Views`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  };

  const calculateViralityScore = (trend: any): number => {
    const score = trend.validation_ratio * 0.4 + 
                  Math.min(trend.validation_count / 100, 1) * 0.3 +
                  (trend.screenshot_url ? 0.2 : 0) +
                  0.1;
    return Math.min(Math.round(score * 100), 99);
  };

  const determineUrgency = (trend: any): 'act_now' | 'rising' | 'steady' | 'declining' => {
    const hoursSinceCreation = (Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation < 6 && trend.validation_ratio > 0.8) return 'act_now';
    if (hoursSinceCreation < 24 && trend.validation_ratio > 0.7) return 'rising';
    if (hoursSinceCreation > 72) return 'declining';
    return 'steady';
  };

  const calculateTimeToPeak = (trend: any): number => {
    if (trend.predicted_peak_date) {
      const peakTime = new Date(trend.predicted_peak_date).getTime();
      const now = Date.now();
      const hoursUntilPeak = Math.max(0, Math.round((peakTime - now) / (1000 * 60 * 60)));
      return hoursUntilPeak;
    }
    
    // Fallback calculation based on trend characteristics
    const hoursSinceCreation = (Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60);
    const estimatedLifespan = 48 + (trend.validation_ratio * 24); // 48-72 hours based on confidence
    return Math.max(0, Math.round(estimatedLifespan - hoursSinceCreation));
  };

  const detectPlatform = (trend: any): 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'all' => {
    const desc = trend.description.toLowerCase();
    if (desc.includes('tiktok') || desc.includes('dance')) return 'tiktok';
    if (desc.includes('reel') || desc.includes('instagram')) return 'instagram';
    if (desc.includes('youtube') || desc.includes('video')) return 'youtube';
    if (desc.includes('tweet') || desc.includes('twitter')) return 'twitter';
    return 'all';
  };

  const determineDifficulty = (category: string): 'easy' | 'medium' | 'hard' => {
    const easyCategories = ['meme_format', 'audio_music', 'behavior_pattern'];
    const hardCategories = ['creator_technique', 'visual_style'];
    if (easyCategories.includes(category)) return 'easy';
    if (hardCategories.includes(category)) return 'hard';
    return 'medium';
  };

  const generateContentIdeas = (trend: any): string[] => {
    const category = trend.category;
    const ideas: Record<string, string[]> = {
      'visual_style': [
        'Create a transition video using this effect',
        'Show a before/after transformation',
        'Make a tutorial teaching the technique',
        'Do a "Pinterest vs Reality" version'
      ],
      'audio_music': [
        'Lip sync with a creative twist',
        'Create a POV story with the sound',
        'Dance challenge with your own moves',
        'Use it for a day-in-my-life montage'
      ],
      'meme_format': [
        'Put your own spin on the format',
        'Make it niche-specific for your audience',
        'Create a series using the format',
        'Collaborate with others on the trend'
      ],
      'product_brand': [
        'Honest review with pros and cons',
        'Creative unboxing or haul',
        '"X days using only Y" challenge',
        'Comparison with alternatives'
      ],
      'behavior_pattern': [
        'Document yourself trying it',
        'React to others doing it',
        'Create a compilation',
        'Add commentary or tips'
      ]
    };
    
    return ideas[category] || [
      'Put your unique spin on it',
      'Combine with another trending topic',
      'Create a series around this trend',
      'Collaborate with other creators'
    ];
  };

  const generateHooks = (trend: any): string[] => {
    return [
      `Wait for it... 🤯`,
      `POV: You discover ${trend.description.substring(0, 30)}...`,
      `The ${trend.category.replace('_', ' ')} everyone's talking about`,
      `I tried the viral ${trend.description.split(' ')[0]} trend and...`,
      `You've been doing ${trend.category.replace('_', ' ')} wrong this whole time`,
      `Why is nobody talking about this?!`,
      `This changed everything for me...`,
      `I can't believe this actually worked`
    ].slice(0, 4);
  };

  const generateHashtags = (trend: any): string[] => {
    const base = ['fyp', 'viral', 'trending', 'foryou', 'foryoupage'];
    const specific = trend.description
      .split(' ')
      .filter((word: string) => word.length > 4)
      .slice(0, 3)
      .map((word: string) => word.toLowerCase());
    
    return [...base, ...specific, `${trend.category.replace('_', '')}`, '2024trends']
      .map(tag => `#${tag}`);
  };

  const generateBestTime = (): string => {
    const times = [
      '6-9 AM: Early birds',
      '12-1 PM: Lunch break',
      '5-7 PM: After work',
      '8-10 PM: Prime time',
      '10 PM-12 AM: Night owls'
    ];
    return times[Math.floor(Math.random() * times.length)];
  };

  const formatViews = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  // Note: No mock data - all trends come from validated WaveSight spotter submissions

  const handleSaveTrend = (trendId: string) => {
    setSavedTrends(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trendId)) {
        newSet.delete(trendId);
      } else {
        newSet.add(trendId);
      }
      return newSet;
    });
  };

  const handleCopyIdea = (text: string) => {
    navigator.clipboard.writeText(text);
    // Show toast notification
  };

  const subscribeToPro = () => {
    // Implement Stripe checkout
    localStorage.setItem('creator_subscribed', 'true');
    setIsSubscribed(true);
    setShowPaywall(false);
  };

  useEffect(() => {
    // Filter trends based on selected filters
    let filtered = trends;
    
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(t => t.platform === selectedPlatform);
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    
    setFilteredTrends(filtered);
  }, [selectedPlatform, selectedCategory, trends]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        {/* Loading Header */}
        <div className="border-b border-gray-800/50 sticky top-0 z-40 bg-black/95 backdrop-blur-2xl">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl animate-pulse">
                <Waves className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  WaveSight Creator
                </h1>
                <p className="text-xs text-gray-500">Loading trend intelligence...</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Loading Content */}
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col items-center justify-center text-center space-y-8">
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 border-4 border-gray-800 border-t-pink-500 rounded-full"
              />
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-2 border-2 border-gray-700 border-t-purple-500 rounded-full"
              />
            </div>
            
            <div className="space-y-4">
              <motion.h2 
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent"
              >
                Analyzing Viral Trends
              </motion.h2>
              <div className="space-y-2">
                <motion.p 
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 0 }}
                  className="text-gray-400"
                >
                  🔍 Scanning WaveSight spotter network...
                </motion.p>
                <motion.p 
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                  className="text-gray-400"
                >
                  📊 Processing trend intelligence...
                </motion.p>
                <motion.p 
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 2 }}
                  className="text-gray-400"
                >
                  ✨ Generating content ideas...
                </motion.p>
              </div>
            </div>
            
            {/* Loading Progress */}
            <div className="w-full max-w-md">
              <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-500 w-1/3"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">This usually takes 2-3 seconds</p>
            </div>
            
            <button 
              onClick={() => {
                console.log('Force loading trends...');
                setLoading(false);
                fetchCreatorTrends();
              }}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-xl text-sm hover:from-pink-500/30 hover:to-purple-500/30 transition-all backdrop-blur-sm"
            >
              Skip Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Hidden audio for notifications */}
      <audio ref={notificationSound} src="/notification.mp3" />

      {/* Paywall Modal */}
      <AnimatePresence>
        {showPaywall && !isSubscribed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-3xl p-8 max-w-2xl w-full relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20" />
              
              <div className="relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full">
                    <Crown className="w-12 h-12 text-white" />
                  </div>
                </div>

                <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Get Trends Before They Go Viral
                </h2>
                
                <p className="text-xl text-center text-gray-300 mb-8">
                  Join 10,000+ creators getting ahead of the algorithm
                </p>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <span>Daily trending content ideas delivered to you</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <span>48-72 hours before trends peak</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <span>Content templates, hooks, and hashtags included</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <span>Platform-specific optimization tips</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <span>Real-time trend alerts</span>
                  </div>
                </div>

                <div className="text-center mb-6">
                  <div className="text-5xl font-bold mb-2">$49/month</div>
                  <p className="text-gray-400">Cancel anytime • 7-day free trial</p>
                </div>

                <button
                  onClick={subscribeToPro}
                  className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl font-bold text-xl hover:from-pink-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-2xl"
                >
                  Start Free Trial
                </button>

                <button
                  onClick={() => setShowPaywall(false)}
                  className="w-full mt-4 py-3 text-gray-400 hover:text-white transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Professional Header */}
      <div className="border-b border-slate-200 sticky top-0 z-40 bg-white backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl">
                  <Waves className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                    WaveSight Creator
                  </h1>
                  <p className="text-xs text-gray-500">Real-time trend intelligence</p>
                </div>
              </div>
              
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-400">Live Data</span>
                <span className="text-xs text-green-300/70">{filteredTrends.length} trends</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-2">
                <button className="p-2.5 hover:bg-gray-800/50 rounded-xl transition-all duration-200 group relative">
                  <Search className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Search
                  </div>
                </button>
                <button className="p-2.5 hover:bg-gray-800/50 rounded-xl transition-all duration-200 group relative">
                  <Bell className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  <div className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Alerts
                  </div>
                </button>
                <button className="p-2.5 hover:bg-gray-800/50 rounded-xl transition-all duration-200 group relative">
                  <Settings className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Settings
                  </div>
                </button>
              </div>
              
              {!isSubscribed ? (
                <button
                  onClick={() => setShowPaywall(true)}
                  className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-pink-500/25"
                >
                  <Crown className="w-4 h-4 inline mr-2" />
                  Upgrade Pro
                </button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-400">Pro Member</span>
                </div>
              )}
              
              <button className="md:hidden p-2.5 hover:bg-gray-800/50 rounded-xl transition-colors">
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Bar */}
      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-b border-gray-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-2xl p-6 border border-red-500/30 backdrop-blur-sm group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <Flame className="w-8 h-8 text-red-400 group-hover:text-red-300 transition-colors" />
                <span className="text-xs px-2 py-1 bg-red-500/30 rounded-full text-red-300 font-medium">URGENT</span>
              </div>
              <div className="text-3xl font-bold text-red-400 mb-1 group-hover:text-red-300 transition-colors">
                {filteredTrends.filter(t => t.urgency === 'act_now').length}
              </div>
              <div className="text-sm text-red-300/70 group-hover:text-red-300 transition-colors">Hot Trends</div>
              <div className="text-xs text-red-400/50 mt-1">Act within 6 hours</div>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-2xl p-6 border border-purple-500/30 backdrop-blur-sm group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="w-8 h-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
                <span className="text-xs px-2 py-1 bg-purple-500/30 rounded-full text-purple-300 font-medium">LIVE</span>
              </div>
              <div className="text-3xl font-bold text-purple-400 mb-1 group-hover:text-purple-300 transition-colors">
                {filteredTrends.length}
              </div>
              <div className="text-sm text-purple-300/70 group-hover:text-purple-300 transition-colors">Active Trends</div>
              <div className="text-xs text-purple-400/50 mt-1">Updated live</div>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl p-6 border border-blue-500/30 backdrop-blur-sm group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <Eye className="w-8 h-8 text-blue-400 group-hover:text-blue-300 transition-colors" />
                <span className="text-xs px-2 py-1 bg-blue-500/30 rounded-full text-blue-300 font-medium">REACH</span>
              </div>
              <div className="text-3xl font-bold text-blue-400 mb-1 group-hover:text-blue-300 transition-colors">
                {Math.round(filteredTrends.reduce((acc, t) => {
                  const views = parseInt(t.potential_views.replace(/[KM]/, '')) || 0;
                  return acc + (t.potential_views.includes('M') ? views : views / 1000);
                }, 0))}M
              </div>
              <div className="text-sm text-blue-300/70 group-hover:text-blue-300 transition-colors">Potential Reach</div>
              <div className="text-xs text-blue-400/50 mt-1">Combined potential</div>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-6 border border-green-500/30 backdrop-blur-sm group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <Bookmark className="w-8 h-8 text-green-400 group-hover:text-green-300 transition-colors" />
                <span className="text-xs px-2 py-1 bg-green-500/30 rounded-full text-green-300 font-medium">SAVED</span>
              </div>
              <div className="text-3xl font-bold text-green-400 mb-1 group-hover:text-green-300 transition-colors">
                {savedTrends.size}
              </div>
              <div className="text-sm text-green-300/70 group-hover:text-green-300 transition-colors">Saved Ideas</div>
              <div className="text-xs text-green-400/50 mt-1">Your collection</div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="container mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="appearance-none px-4 py-3 pr-10 bg-gray-900/50 border border-gray-700/50 rounded-xl focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20 transition-all backdrop-blur-sm"
              >
                <option value="all">🌐 All Platforms</option>
                <option value="tiktok">📱 TikTok</option>
                <option value="instagram">📸 Instagram</option>
                <option value="youtube">🎥 YouTube</option>
                <option value="twitter">🐦 Twitter</option>
              </select>
              <ChevronRight className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none px-4 py-3 pr-10 bg-gray-900/50 border border-gray-700/50 rounded-xl focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all backdrop-blur-sm"
              >
                <option value="all">🎯 All Categories</option>
                <option value="visual_style">🎨 Visual Style</option>
                <option value="audio_music">🎵 Audio/Music</option>
                <option value="meme_format">😂 Meme Format</option>
                <option value="creator_technique">🎬 Creator Technique</option>
                <option value="product_brand">🛍️ Product/Brand</option>
                <option value="behavior_pattern">🧠 Behavior Pattern</option>
              </select>
              <ChevronRight className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl hover:border-blue-500 hover:bg-blue-500/10 transition-all flex items-center gap-2 backdrop-blur-sm group"
            >
              <Timer className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
              <span className="text-sm font-medium">Time to Peak</span>
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl hover:border-green-500 hover:bg-green-500/10 transition-all flex items-center gap-2 backdrop-blur-sm group"
            >
              <Gauge className="w-4 h-4 text-green-400 group-hover:text-green-300" />
              <span className="text-sm font-medium">Virality Score</span>
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl hover:border-orange-500 hover:bg-orange-500/10 transition-all flex items-center gap-2 backdrop-blur-sm group"
            >
              <RefreshCw className="w-4 h-4 text-orange-400 group-hover:text-orange-300" />
              <span className="text-sm font-medium">Refresh</span>
            </motion.button>
          </div>
        </div>
        
        {/* Quick Filter Pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-sm text-gray-400 mr-2">Quick filters:</span>
          <button className="px-3 py-1.5 text-xs bg-red-500/20 text-red-300 rounded-full border border-red-500/30 hover:bg-red-500/30 transition-colors">
            🔥 Trending Now
          </button>
          <button className="px-3 py-1.5 text-xs bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30 hover:bg-blue-500/30 transition-colors">
            📈 Rising Fast
          </button>
          <button className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30 hover:bg-purple-500/30 transition-colors">
            ⭐ High Quality
          </button>
          <button className="px-3 py-1.5 text-xs bg-green-500/20 text-green-300 rounded-full border border-green-500/30 hover:bg-green-500/30 transition-colors">
            ✅ Easy to Create
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredTrends.map((trend, index) => (
            <motion.div
              key={trend.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 rounded-3xl overflow-hidden border border-gray-700/50 hover:border-pink-500/50 transition-all duration-300 group backdrop-blur-sm shadow-2xl hover:shadow-pink-500/10"
            >
              {/* Enhanced Trend Header */}
              <div className={`p-6 bg-gradient-to-br ${PLATFORM_COLORS[trend.platform]} relative overflow-hidden`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <motion.span 
                          animate={URGENCY_BADGES[trend.urgency].pulse ? { scale: [1, 1.05, 1] } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                          className={`px-3 py-1.5 text-xs font-bold rounded-full ${URGENCY_BADGES[trend.urgency].color} text-white shadow-lg`}
                        >
                          {URGENCY_BADGES[trend.urgency].text}
                        </motion.span>
                        <div className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full backdrop-blur-sm">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs font-medium">
                            {trend.time_to_peak}h to peak
                          </span>
                        </div>
                      </div>
                      <h3 className="font-bold text-xl mb-2 leading-tight">{trend.title}</h3>
                      <p className="text-sm text-white/90 line-clamp-2">{trend.description}</p>
                    </div>
                    <div className="text-center ml-4">
                      <div className="relative">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845
                              a 15.9155 15.9155 0 0 1 0 31.831
                              a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="2"
                          />
                          <path
                            d="M18 2.0845
                              a 15.9155 15.9155 0 0 1 0 31.831
                              a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeDasharray={`${trend.virality_score}, 100`}
                            className="drop-shadow-sm"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-xl font-bold">{trend.virality_score}%</div>
                            <div className="text-xs text-white/80">viral</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Quick Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10 hover:border-white/30 transition-all"
                    >
                      <Eye className="w-4 h-4 mx-auto mb-1 text-white/80" />
                      <div className="text-lg font-bold">{trend.potential_views}</div>
                      <div className="text-xs text-white/70">potential</div>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10 hover:border-white/30 transition-all"
                    >
                      <Heart className="w-4 h-4 mx-auto mb-1 text-white/80" />
                      <div className="text-lg font-bold">{trend.engagement_rate}%</div>
                      <div className="text-xs text-white/70">engagement</div>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10 hover:border-white/30 transition-all"
                    >
                      <Users className="w-4 h-4 mx-auto mb-1 text-white/80" />
                      <div className="text-lg font-bold">{trend.current_creators}</div>
                      <div className="text-xs text-white/70">creators</div>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Enhanced Trend Content */}
              <div className="p-6 space-y-6">
                {/* Content Ideas */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    Content Ideas
                  </h4>
                  <div className="space-y-3">
                    {trend.content_ideas.slice(0, 2).map((idea, idx) => (
                      <motion.div 
                        key={idx} 
                        whileHover={{ x: 4 }}
                        className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-pink-500/30 transition-all group cursor-pointer"
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-white">{idx + 1}</span>
                        </div>
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{idea}</span>
                        <Copy className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100 ml-auto flex-shrink-0" />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Best Hook */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <span className="text-base">🎣</span>
                    Best Hook
                  </h4>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-r from-gray-800/80 to-gray-700/50 rounded-xl p-4 border border-gray-700/50 hover:border-blue-500/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm text-gray-300 italic group-hover:text-white transition-colors">
                          "{trend.hooks[0]}"
                        </p>
                      </div>
                      <Copy className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0" />
                    </div>
                  </motion.div>
                </div>

                {/* Hashtags */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-blue-400" />
                    Trending Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {trend.hashtags.slice(0, 5).map((tag, idx) => (
                      <motion.span 
                        key={idx} 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="text-xs px-3 py-1.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-full text-blue-300 hover:text-blue-200 transition-colors cursor-pointer"
                      >
                        {tag}
                      </motion.span>
                    ))}
                  </div>
                </div>

                {/* Best Time & Difficulty */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-green-400" />
                      <span className="text-xs font-medium text-green-300">Optimal Time</span>
                    </div>
                    <p className="text-sm text-green-200">{trend.best_time_to_post}</p>
                  </div>
                  <div className={`border rounded-xl p-3 ${
                    trend.difficulty === 'easy' ? 'bg-green-500/10 border-green-500/30' :
                    trend.difficulty === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' :
                    'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Target className={`w-4 h-4 ${
                        trend.difficulty === 'easy' ? 'text-green-400' :
                        trend.difficulty === 'medium' ? 'text-yellow-400' :
                        'text-red-400'
                      }`} />
                      <span className={`text-xs font-medium ${
                        trend.difficulty === 'easy' ? 'text-green-300' :
                        trend.difficulty === 'medium' ? 'text-yellow-300' :
                        'text-red-300'
                      }`}>Difficulty</span>
                    </div>
                    <p className={`text-sm capitalize ${
                      trend.difficulty === 'easy' ? 'text-green-200' :
                      trend.difficulty === 'medium' ? 'text-yellow-200' :
                      'text-red-200'
                    }`}>{trend.difficulty}</p>
                  </div>
                </div>

                {/* Enhanced Actions */}
                <div className="flex gap-3 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedTrend(trend)}
                    className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-pink-500/25 flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Full Brief</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSaveTrend(trend.id)}
                    className={`p-3 rounded-xl transition-all ${
                      savedTrends.has(trend.id) 
                        ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/25' 
                        : 'bg-gray-800/50 text-white hover:bg-gray-700/50 border border-gray-700/50'
                    }`}
                  >
                    <Bookmark className={`w-5 h-5 ${savedTrends.has(trend.id) ? 'fill-current' : ''}`} />
                  </motion.button>
                  
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl hover:bg-gray-700/50 transition-all group"
                  >
                    <Share2 className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
                  </motion.button>
                  
                  {trend.example_url && (
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => window.open(trend.example_url, '_blank')}
                      className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-xl hover:bg-blue-500/30 transition-all group"
                    >
                      <Play className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Empty State */}
        {filteredTrends.length === 0 && (
          <div className="text-center py-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="relative mx-auto w-32 h-32">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-4 border-gray-800 border-t-pink-500/30 rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-4 border-2 border-gray-700 border-t-purple-500/30 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Search className="w-12 h-12 text-gray-600" />
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-300">No Trends Found</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {selectedPlatform !== 'all' || selectedCategory !== 'all' 
                    ? 'Try adjusting your filters to see more trends.'
                    : 'We\'re currently updating our trend database. Check back in a few minutes.'}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedPlatform('all');
                    setSelectedCategory('all');
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-xl hover:from-pink-500/30 hover:to-purple-500/30 transition-all"
                >
                  Clear Filters
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fetchCreatorTrends()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl hover:from-blue-500/30 hover:to-cyan-500/30 transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Trends
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
        
        {/* Load More Section */}
        {filteredTrends.length > 0 && (
          <div className="text-center mt-12">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600/50 rounded-xl hover:from-gray-700/50 hover:to-gray-600/50 transition-all backdrop-blur-sm group"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                <span className="text-gray-300 group-hover:text-white transition-colors font-medium">Load More Trends</span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              </div>
            </motion.button>
          </div>
        )}
      </div>

      {/* Trend Detail Modal */}
      <AnimatePresence>
        {selectedTrend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 overflow-y-auto"
            onClick={() => setSelectedTrend(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="min-h-screen py-8 px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-w-4xl mx-auto bg-gray-900 rounded-3xl overflow-hidden">
                {/* Header */}
                <div className={`p-6 bg-gradient-to-r ${PLATFORM_COLORS[selectedTrend.platform]}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1.5 text-sm font-bold rounded-full ${URGENCY_BADGES[selectedTrend.urgency].color} text-white`}>
                          {URGENCY_BADGES[selectedTrend.urgency].text}
                        </span>
                        <span className="text-white/80">
                          ⏰ {selectedTrend.time_to_peak} hours to peak
                        </span>
                      </div>
                      <h2 className="text-3xl font-bold mb-2">{selectedTrend.title}</h2>
                      <p className="text-lg text-white/90">{selectedTrend.description}</p>
                    </div>
                    <button
                      onClick={() => setSelectedTrend(null)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold">{selectedTrend.virality_score}%</div>
                      <div className="text-sm text-white/80">Virality Score</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold">{selectedTrend.potential_views}</div>
                      <div className="text-sm text-white/80">Potential Views</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold">{selectedTrend.engagement_rate}%</div>
                      <div className="text-sm text-white/80">Engagement Rate</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold capitalize">{selectedTrend.difficulty}</div>
                      <div className="text-sm text-white/80">Difficulty</div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Content Ideas */}
                  <div>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-yellow-400" />
                      Content Ideas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedTrend.content_ideas.map((idea, idx) => (
                        <div key={idx} className="bg-gray-800 rounded-xl p-4 flex items-start justify-between group">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-pink-400 font-bold">{idx + 1}.</span>
                            <span className="text-gray-300">{idea}</span>
                          </div>
                          <button
                            onClick={() => handleCopyIdea(idea)}
                            className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Copy className="w-4 h-4 text-gray-500 hover:text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hooks */}
                  <div>
                    <h3 className="text-xl font-bold mb-4">🎣 Viral Hooks</h3>
                    <div className="space-y-3">
                      {selectedTrend.hooks.map((hook, idx) => (
                        <div key={idx} className="bg-gray-800 rounded-xl p-4 flex items-center justify-between group">
                          <span className="text-gray-300 italic">"{hook}"</span>
                          <button
                            onClick={() => handleCopyIdea(hook)}
                            className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Copy className="w-4 h-4 text-gray-500 hover:text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hashtags */}
                  <div>
                    <h3 className="text-xl font-bold mb-4">🏷️ Recommended Hashtags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTrend.hashtags.map((tag, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleCopyIdea(tag)}
                          className="px-4 py-2 bg-gray-800 rounded-full text-blue-400 hover:bg-gray-700 transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Platform Tips */}
                  <div>
                    <h3 className="text-xl font-bold mb-4">📱 Platform-Specific Tips</h3>
                    <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/30">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Target className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-purple-400">Format: </span>
                            <span className="text-gray-300">9:16 vertical video, 15-60 seconds</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-pink-400">Best Time: </span>
                            <span className="text-gray-300">{selectedTrend.best_time_to_post}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Music className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-blue-400">Audio: </span>
                            <span className="text-gray-300">Use trending sounds for 30% more reach</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Eye className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-green-400">First 3 Seconds: </span>
                            <span className="text-gray-300">Hook viewers immediately or lose 80% of audience</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl font-bold hover:from-pink-600 hover:to-purple-600 transition-all">
                      Start Creating
                    </button>
                    <button
                      onClick={() => handleSaveTrend(selectedTrend.id)}
                      className={`px-6 py-3 rounded-xl font-bold transition-colors ${
                        savedTrends.has(selectedTrend.id)
                          ? 'bg-yellow-500 text-black'
                          : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                    >
                      {savedTrends.has(selectedTrend.id) ? 'Saved' : 'Save'}
                    </button>
                    <button className="px-6 py-3 bg-gray-800 rounded-xl font-bold hover:bg-gray-700 transition-colors">
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}