'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { TrendRadar } from '@/components/TrendRadar';
import { TrendTimeline } from '@/components/TrendTimeline';
import { InsightsFeed } from '@/components/InsightsFeed';
import { CompetitorTracker } from '@/components/CompetitorTracker';
import { PredictiveAlerts } from '@/components/PredictiveAlerts';
import MobilePersonaBuilder from '@/components/MobilePersonaBuilder';
import MobileTrendSubmission from '@/components/MobileTrendSubmission';
import { api } from '@/lib/api';
import WaveLogo from '@/components/WaveLogo';
import { useAuth } from '@/contexts/AuthContext';
import { usePersona } from '@/hooks/usePersona';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp as TrendingUpIcon, 
  Users as UsersIcon, 
  Sparkles as SparklesIcon, 
  Bell as BellIcon,
  BarChart as ChartBarIcon,
  Clock as ClockIcon,
  Filter as FilterIcon,
  RefreshCw as RefreshCwIcon,
  LogOut as LogOutIcon,
  ChevronDown as ChevronDownIcon,
  Plus as PlusIcon
} from 'lucide-react';

// Stats Card Component
const StatsCard = ({ title, value, change, icon: Icon, color }: any) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    className={`wave-card p-6 relative overflow-hidden ${color} border-2 border-transparent hover:border-wave-500/30 transition-all duration-300`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-wave-300 text-sm font-medium mb-2 uppercase tracking-wider">{title}</p>
        <p className="text-4xl font-black text-white mb-1">{value}</p>
        {change && (
          <p className={`text-sm font-semibold mt-3 flex items-center gap-1 ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
            <span className="text-lg">{change > 0 ? '↑' : '↓'}</span>
            <span>{Math.abs(change)}%</span>
            <span className="text-xs opacity-70 ml-1">vs last period</span>
          </p>
        )}
      </div>
      <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
        <Icon className="w-7 h-7 text-white" />
      </div>
    </div>
    <div className="absolute -bottom-10 -right-10 opacity-5">
      <Icon className="w-40 h-40" />
    </div>
  </motion.div>
);

// Notification Badge
const NotificationBadge = ({ count }: { count: number }) => (
  <AnimatePresence>
    {count > 0 && (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold"
      >
        {count > 9 ? '9+' : count}
      </motion.div>
    )}
  </AnimatePresence>
);

export default function ImprovedDashboard() {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  const { savePersonaData, personaData } = usePersona();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeframe, setTimeframe] = useState('week');
  const [showFilters, setShowFilters] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobilePersonaBuilder, setShowMobilePersonaBuilder] = useState(false);
  const [showMobileTrendSubmission, setShowMobileTrendSubmission] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Generate dummy social media trend data
  const generateDummyTrends = () => {
    const trends = [
      // Visual Style Trends
      { 
        id: '1', 
        title: 'Neon Gradient Transitions', 
        category: 'visual_style',
        viralityScore: 0.92,
        qualityScore: 0.88,
        validationCount: 245,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Smooth neon color gradients in video transitions',
        waveScore: 8.8
      },
      { 
        id: '2', 
        title: 'Y2K Chrome Effects', 
        category: 'visual_style',
        viralityScore: 0.78,
        qualityScore: 0.82,
        validationCount: 189,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Metallic chrome textures and reflections',
        waveScore: 7.9
      },
      { 
        id: '3', 
        title: 'Split Screen Storytelling', 
        category: 'visual_style',
        viralityScore: 0.65,
        qualityScore: 0.75,
        validationCount: 98,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Multiple perspectives shown simultaneously',
        waveScore: 6.8
      },
      
      // Audio/Music Trends
      { 
        id: '4', 
        title: 'Sped Up Classical Remixes', 
        category: 'audio_music',
        viralityScore: 0.89,
        qualityScore: 0.78,
        validationCount: 312,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Classical music sped up with bass drops',
        waveScore: 8.2
      },
      { 
        id: '5', 
        title: 'Whisper Pop ASMR', 
        category: 'audio_music',
        viralityScore: 0.72,
        qualityScore: 0.69,
        validationCount: 156,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Soft whispered vocals over pop beats',
        waveScore: 7.0
      },
      
      // Creator Technique Trends
      { 
        id: '6', 
        title: 'POV Camera Flips', 
        category: 'creator_technique',
        viralityScore: 0.94,
        qualityScore: 0.91,
        validationCount: 423,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Quick perspective changes mid-video',
        waveScore: 9.2
      },
      { 
        id: '7', 
        title: 'Time Warp Transitions', 
        category: 'creator_technique',
        viralityScore: 0.81,
        qualityScore: 0.85,
        validationCount: 267,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Speed ramping for dramatic effect',
        waveScore: 8.3
      },
      
      // Meme Format Trends
      { 
        id: '8', 
        title: 'She\'s a 10 but...', 
        category: 'meme_format',
        viralityScore: 0.96,
        qualityScore: 0.72,
        validationCount: 589,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Rating people with funny contradictions',
        waveScore: 8.5
      },
      { 
        id: '9', 
        title: 'NPC Streaming Parodies', 
        category: 'meme_format',
        viralityScore: 0.87,
        qualityScore: 0.65,
        validationCount: 445,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Robotic responses to viewer actions',
        waveScore: 7.8
      },
      { 
        id: '10', 
        title: 'Wrong Answers Only', 
        category: 'meme_format',
        viralityScore: 0.68,
        qualityScore: 0.73,
        validationCount: 123,
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Intentionally incorrect responses to questions',
        waveScore: 6.9
      },
      
      // Product/Brand Trends
      { 
        id: '11', 
        title: 'Stanley Cup Accessories', 
        category: 'product_brand',
        viralityScore: 0.91,
        qualityScore: 0.79,
        validationCount: 378,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Customizing Stanley tumblers',
        waveScore: 8.4
      },
      { 
        id: '12', 
        title: 'Duolingo Streak Flex', 
        category: 'product_brand',
        viralityScore: 0.74,
        qualityScore: 0.68,
        validationCount: 201,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Showing off language learning streaks',
        waveScore: 7.1
      },
      
      // Behavior Pattern Trends
      { 
        id: '13', 
        title: 'Silent Walking', 
        category: 'behavior_pattern',
        viralityScore: 0.83,
        qualityScore: 0.87,
        validationCount: 289,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Walking without music or podcasts',
        waveScore: 8.5
      },
      { 
        id: '14', 
        title: 'Deinfluencing Reviews', 
        category: 'behavior_pattern',
        viralityScore: 0.76,
        qualityScore: 0.83,
        validationCount: 167,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Telling people what NOT to buy',
        waveScore: 7.9
      },
      { 
        id: '15', 
        title: 'Morning Shed Tours', 
        category: 'behavior_pattern',
        viralityScore: 0.69,
        qualityScore: 0.71,
        validationCount: 134,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Showing morning skincare routines',
        waveScore: 7.0
      }
    ];

    // Filter by selected category if not 'all'
    const filteredTrends = selectedCategory === 'all' 
      ? trends 
      : trends.filter(t => t.category === selectedCategory);

    // Filter by timeframe
    const now = Date.now();
    const timeframeDays = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30;
    const cutoffDate = now - (timeframeDays * 24 * 60 * 60 * 1000);
    
    return filteredTrends.filter(t => new Date(t.createdAt).getTime() > cutoffDate);
  };

  // Use dummy data instead of API call
  const trendData = generateDummyTrends();
  const trendsLoading = false;
  const trendsError = null;
  const refetchTrends = () => {
    // Simulate refetch by re-rendering
    setLastRefresh(new Date());
  };

  // Generate timeline data for trend visualization - memoized to prevent constant regeneration
  const timelineData = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    // If no trend data, use default trends
    const dataToUse = trendData.length > 0 ? trendData : generateDummyTrends();
    
    // Select top trends for timeline
    const topTrends = dataToUse.slice(0, 6).map((trend, trendIndex) => {
      const data = [];
      // Use trend index as seed for consistent peak day
      const peakDay = 2 + (trendIndex % 4); // Peak between day 2-5 based on trend index
      
      // Generate daily virality data with wave pattern
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        let virality = 0;
        
        if (i < peakDay) {
          // Rising phase
          virality = (trend.viralityScore * 100) * (i / peakDay) * 0.9;
        } else if (i === peakDay) {
          // Peak
          virality = trend.viralityScore * 100;
        } else {
          // Falling phase
          const falloff = (i - peakDay) / (7 - peakDay);
          virality = (trend.viralityScore * 100) * (1 - falloff * 0.7);
        }
        
        // Add small consistent variation based on day and trend
        const variation = Math.sin(i * 0.5 + trendIndex) * 5;
        
        data.push({
          date,
          virality: Math.max(5, Math.min(100, virality + variation))
        });
      }
      
      return {
        id: trend.id,
        title: trend.title,
        category: trend.category,
        data
      };
    });
    
    return {
      trends: topTrends,
      dateRange: { start: startDate, end: endDate }
    };
  }, [trendData.length, selectedCategory, timeframe]); // Only regenerate when filters change

  // Update last refresh on successful fetch
  useEffect(() => {
    if (trendData) {
      setLastRefresh(new Date());
    }
  }, [trendData]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate dummy insights data
  const generateDummyInsights = () => {
    return [
      {
        id: '1',
        title: 'POV Camera Flips showing explosive growth',
        description: 'This creator technique has grown 450% in the last 48 hours across TikTok and Instagram Reels',
        impact: 'high' as const,
        category: 'creator_technique',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        title: 'Y2K aesthetics reaching saturation point',
        description: 'After 3 months of growth, Y2K chrome effects are showing signs of plateau',
        impact: 'medium' as const,
        category: 'visual_style',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        title: 'Silent Walking trend spreading to wellness influencers',
        description: 'Originally started in productivity circles, now being adopted by major wellness accounts',
        impact: 'high' as const,
        category: 'behavior_pattern',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        title: 'Sped up classical music seeing cross-platform adoption',
        description: 'Started on TikTok, now appearing in YouTube Shorts and Instagram Reels',
        impact: 'medium' as const,
        category: 'audio_music',
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '5',
        title: 'Stanley Cup accessories becoming mainstream retail',
        description: 'Major retailers now stocking Stanley-specific accessories sections',
        impact: 'low' as const,
        category: 'product_brand',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      }
    ];
  };

  // Generate dummy competitors data
  const generateDummyCompetitors = () => {
    return [
      {
        id: '1',
        name: 'TrendHunter_Sarah',
        avatar: '👩‍💻',
        score: 94,
        trendsSpotted: 156,
        accuracy: 0.89,
        streak: 23
      },
      {
        id: '2',
        name: 'ViralScout_Mike',
        avatar: '🕵️',
        score: 91,
        trendsSpotted: 143,
        accuracy: 0.87,
        streak: 19
      },
      {
        id: '3',
        name: 'WaveRider_Emma',
        avatar: '🏄‍♀️',
        score: 88,
        trendsSpotted: 132,
        accuracy: 0.85,
        streak: 15
      },
      {
        id: '4',
        name: 'TrendMaster_Alex',
        avatar: '🎯',
        score: 85,
        trendsSpotted: 128,
        accuracy: 0.83,
        streak: 12
      },
      {
        id: '5',
        name: 'ViralVision_Zoe',
        avatar: '👁️',
        score: 82,
        trendsSpotted: 119,
        accuracy: 0.81,
        streak: 10
      }
    ];
  };

  const insights = generateDummyInsights();
  const insightsLoading = false;
  const competitors = generateDummyCompetitors();

  // Calculate stats
  const stats = {
    totalTrends: trendData?.length || 0,
    avgWaveScore: trendData?.length > 0 
      ? Math.round((trendData.reduce((acc: number, t: any) => acc + (t.waveScore || 0), 0) / trendData.length) * 10) / 10
      : 0,
    activeInsights: insights?.filter((i: any) => i.impact === 'high').length || 0,
    topCompetitors: competitors?.length || 0,
  };

  // Time since last refresh
  const timeSinceRefresh = () => {
    const seconds = Math.floor((new Date().getTime() - lastRefresh.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  // Handle sign out
  const handleSignOut = async () => {
    await logout();
    router.push('/login');
  };

  // Handle mobile persona completion
  const handleMobilePersonaComplete = async (data: any) => {
    try {
      await savePersonaData(data);
      setShowMobilePersonaBuilder(false);
    } catch (error) {
      console.error('Error saving persona:', error);
    }
  };

  // Handle mobile trend submission
  const handleMobileTrendSubmit = async (trendData: any) => {
    try {
      // Upload image if present
      let imageUrl = null;
      if (trendData.image && trendData.image instanceof File) {
        const fileExt = trendData.image.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('trend-images')
          .upload(fileName, trendData.image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('trend-images')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      // Save trend to database
      const { data, error } = await supabase
        .from('trend_submissions')
        .insert({
          spotter_id: user?.id,
          category: trendData.category,
          description: `${trendData.title}\n\n${trendData.description}\n\nURL: ${trendData.url}\nPlatform: ${trendData.platform}`,
          screenshot_url: imageUrl,
          evidence: {
            url: trendData.url,
            title: trendData.title,
            platform: trendData.platform,
            submitted_by: user?.username || user?.email
          },
          virality_prediction: 5, // Default middle score
          status: 'submitted'
        })
        .select()
        .single();

      if (error) throw error;
      setShowMobileTrendSubmission(false);
    } catch (error) {
      console.error('Error submitting trend:', error);
      throw error;
    }
  };

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wave-500 mx-auto mb-4"></div>
          <p className="text-wave-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <WaveLogo size={60} animated={true} showTitle={false} />
              <div>
                <h1 className="text-4xl font-light tracking-[0.3em] bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent uppercase futuristic-title">
                  WAVESITE
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-wave-300 text-sm font-light">Real-time trend monitoring active</span>
                  <span className="text-wave-500 text-sm">•</span>
                  <span className="text-wave-400 text-sm">
                    {stats.totalTrends} trends across {Object.keys(trendData?.reduce((acc: any, t: any) => ({ ...acc, [t.category]: true }), {}) || {}).length} categories
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Refresh Button */}
              <button
                onClick={() => refetchTrends()}
                className="p-3 rounded-xl bg-wave-800/50 hover:bg-wave-700/50 transition-all flex items-center gap-2"
              >
                <RefreshCwIcon className="w-5 h-5" />
                <span className="text-sm text-wave-300">{timeSinceRefresh()}</span>
              </button>
              
              {/* Notifications */}
              <button className="relative p-3 rounded-xl bg-wave-800/50 hover:bg-wave-700/50 transition-all">
                <BellIcon className="w-5 h-5" />
                <NotificationBadge count={notifications} />
              </button>
              
              {/* User Profile Dropdown */}
              <div className="relative user-menu-container">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 px-4 py-2 rounded-xl bg-wave-800/50 hover:bg-wave-700/50 transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-wave-400 to-wave-600 flex items-center justify-center font-bold text-white">
                    {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium">{user?.username || user?.email?.split('@')[0] || 'User'}</p>
                    <p className="text-xs text-wave-400 group-hover:text-wave-300">
                      {user?.role === 'admin' ? 'Admin' : 'Scout'} • Score: {user?.accuracy_score || 0}
                    </p>
                  </div>
                  <ChevronDownIcon className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-64 bg-wave-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-wave-700/30 overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-wave-700/30">
                        <p className="font-medium text-white">{user?.username || 'User'}</p>
                        <p className="text-sm text-wave-400">{user?.email}</p>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div className="text-center">
                            <p className="text-xs text-wave-500">Trends Spotted</p>
                            <p className="text-lg font-bold text-wave-200">{user?.trends_spotted || 0}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-wave-500">Accuracy Score</p>
                            <p className="text-lg font-bold text-wave-200">{user?.accuracy_score || 0}%</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            router.push('/profile');
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-wave-800/50 rounded-lg transition-all"
                        >
                          My Profile
                        </button>
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            router.push('/persona');
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-wave-800/50 rounded-lg transition-all"
                        >
                          Edit Persona
                        </button>
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            router.push('/settings');
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-wave-800/50 rounded-lg transition-all"
                        >
                          Settings
                        </button>
                      </div>
                      
                      <div className="p-2 border-t border-wave-700/30">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            handleSignOut();
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/20 rounded-lg transition-all flex items-center gap-2 text-red-400"
                        >
                          <LogOutIcon className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatsCard
            title="Active Trends"
            value={stats.totalTrends}
            change={12}
            icon={TrendingUpIcon}
            color="bg-gradient-to-br from-blue-600/30 to-blue-800/10 backdrop-blur-xl"
          />
          <StatsCard
            title="Avg Wave Score"
            value={stats.avgWaveScore}
            change={5}
            icon={ChartBarIcon}
            color="bg-gradient-to-br from-purple-600/30 to-purple-800/10 backdrop-blur-xl"
          />
          <StatsCard
            title="High Impact Insights"
            value={stats.activeInsights}
            change={-3}
            icon={SparklesIcon}
            color="bg-gradient-to-br from-green-600/30 to-green-800/10 backdrop-blur-xl"
          />
          <StatsCard
            title="Top Spotters"
            value={stats.topCompetitors}
            change={8}
            icon={UsersIcon}
            color="bg-gradient-to-br from-orange-600/30 to-orange-800/10 backdrop-blur-xl"
          />
        </div>

        {/* Enhanced Filters */}
        <motion.div
          initial={false}
          animate={{ height: showFilters ? 'auto' : '65px' }}
          className="mb-10 overflow-hidden bg-wave-900/20 backdrop-blur-sm rounded-2xl border border-wave-700/20 p-4"
        >
          <div className="flex gap-4 items-center flex-wrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-wave-800/70 hover:bg-wave-700/70 transition-all font-medium border border-wave-600/20 hover:border-wave-500/40"
            >
              <FilterIcon className="w-4 h-4" />
              <span>Filters</span>
            </button>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-5 py-2.5 rounded-xl bg-wave-800/70 border border-wave-600/30 text-wave-100 focus:border-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500/30 font-medium transition-all hover:bg-wave-700/70"
            >
              <option value="all">🌊 All Categories</option>
              <option value="visual_style">🎨 Visual Style</option>
              <option value="audio_music">🎵 Audio/Music</option>
              <option value="creator_technique">🎬 Creator Technique</option>
              <option value="meme_format">😂 Meme Format</option>
              <option value="product_brand">🛍️ Product/Brand</option>
              <option value="behavior_pattern">📊 Behavior Pattern</option>
            </select>

            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-5 py-2.5 rounded-xl bg-wave-800/70 border border-wave-600/30 text-wave-100 focus:border-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500/30 font-medium transition-all hover:bg-wave-700/70"
            >
              <option value="day">⚡ Last 24 Hours</option>
              <option value="week">📅 Last Week</option>
              <option value="month">📆 Last Month</option>
            </select>
            
            <div className="ml-auto flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-wave-400" />
              <span className="text-wave-300 text-sm">Auto-refresh in 60s</span>
            </div>
          </div>

          {/* Additional Filters (shown when expanded) */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-4 bg-wave-900/30 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              <div>
                <label className="block text-sm text-wave-400 mb-2">Min Wave Score</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-wave-400 mb-2">Sort By</label>
                <select className="w-full px-3 py-2 rounded-lg bg-wave-800/50 border border-wave-700/30">
                  <option>Wave Score</option>
                  <option>Date Created</option>
                  <option>Validation Count</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-wave-400 mb-2">View Mode</label>
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 rounded-lg bg-wave-700/50">Grid</button>
                  <button className="flex-1 px-3 py-2 rounded-lg bg-wave-800/50">List</button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Wave Score Explanation */}
        <div className="mb-8 p-4 bg-wave-900/20 backdrop-blur-sm rounded-2xl border border-wave-700/20">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-wave-600/20 rounded-lg">
              <SparklesIcon className="w-5 h-5 text-wave-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-wave-200 mb-1">Understanding Wave Scores</h3>
              <p className="text-xs text-wave-400 leading-relaxed">
                Wave Score (0-10) measures a trend's viral potential based on velocity, engagement, and cross-platform momentum. 
                <span className="text-wave-300 font-medium"> 7+ = High potential</span>, 
                <span className="text-wave-300 font-medium"> 5-7 = Growing</span>, 
                <span className="text-wave-300 font-medium"> Below 5 = Early stage</span>. 
                Scores update in real-time as trends evolve.
              </p>
            </div>
          </div>
        </div>

        {/* Trend Timeline - New Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <div className="wave-card p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-wave-200 bg-clip-text text-transparent">
                  Trend Timeline
                </h2>
                <p className="text-wave-400 text-sm mt-1">
                  Watch trends rise and fall like waves over the past week
                </p>
              </div>
              <button className="text-sm text-wave-400 hover:text-wave-300">
                View Full History →
              </button>
            </div>
            <TrendTimeline 
              trends={timelineData.trends} 
              dateRange={timelineData.dateRange} 
            />
          </div>
        </motion.div>

        {/* Main Grid with improved layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Trend Radar - Spans 2 columns on XL */}
          <div className="xl:col-span-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="wave-card p-8 h-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-wave-200 bg-clip-text text-transparent">Trend Radar</h2>
                <button className="text-sm text-wave-400 hover:text-wave-300">
                  View Full Screen →
                </button>
              </div>
              {trendsLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wave-500"></div>
                    <p className="text-wave-400">Loading trends...</p>
                  </div>
                </div>
              ) : trendsError ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-red-400 mb-2">Failed to load trends</p>
                    <button
                      onClick={() => refetchTrends()}
                      className="px-4 py-2 bg-wave-700/50 rounded-lg hover:bg-wave-600/50"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <TrendRadar data={trendData || []} />
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Column - Predictive Alerts & Quick Actions */}
          <div className="space-y-8">
            {/* Predictive Alerts */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="wave-card p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold">Predictive Alerts</h2>
                <span className="text-xs text-wave-400">AI-Powered</span>
              </div>
              <PredictiveAlerts 
                alerts={[
                  {
                    id: '1',
                    type: 'trending',
                    title: 'POV Camera Flips breaking records',
                    description: 'Expected to peak in 2-3 days, 94% virality',
                    urgency: 'high',
                    predictedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
                  },
                  {
                    id: '2',
                    type: 'velocity',
                    title: 'She\'s a 10 but... format exploding',
                    description: '589 validations, 96% viral potential',
                    urgency: 'high'
                  },
                  {
                    id: '3',
                    type: 'emerging',
                    title: 'Silent Walking gaining traction',
                    description: '83% virality, spreading to wellness niche',
                    urgency: 'medium'
                  }
                ]} 
              />
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="wave-card p-6"
            >
              <h3 className="text-lg font-bold mb-5">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => isMobile ? setShowMobileTrendSubmission(true) : router.push('/submit')}
                  className="w-full px-5 py-4 bg-gradient-to-r from-wave-600 to-wave-700 rounded-xl hover:from-wave-500 hover:to-wave-600 transition-all text-left group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-wave-400 to-wave-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <span className="font-semibold">Submit New Trend</span>
                    <PlusIcon className="w-5 h-5" />
                  </div>
                </button>
                <button 
                  onClick={() => isMobile ? setShowMobilePersonaBuilder(true) : router.push('/persona')}
                  className="w-full px-5 py-4 bg-gradient-to-r from-purple-600/80 to-purple-700/80 rounded-xl hover:from-purple-500/80 hover:to-purple-600/80 transition-all text-left group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <span className="font-semibold">Build My Persona</span>
                    <UsersIcon className="w-5 h-5" />
                  </div>
                </button>
                <button className="w-full px-5 py-4 bg-wave-800/50 rounded-xl hover:bg-wave-700/50 transition-all text-left border border-wave-700/30 hover:border-wave-600/50">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Validate Trends</span>
                    <span className="bg-wave-600 text-xs px-3 py-1.5 rounded-full font-semibold">5 pending</span>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Bottom Row - Insights and Competitors */}
          <div className="xl:col-span-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="wave-card p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-wave-200 bg-clip-text text-transparent">Latest Insights</h2>
                <div className="flex gap-2">
                  <button className="text-xs px-3 py-1 rounded-full bg-wave-800/50 hover:bg-wave-700/50">
                    All
                  </button>
                  <button className="text-xs px-3 py-1 rounded-full bg-wave-800/50 hover:bg-wave-700/50">
                    High Impact
                  </button>
                </div>
              </div>
              {insightsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-wave-800/30 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <InsightsFeed insights={insights?.map((i: any) => ({
                  ...i,
                  impact: (i.impact === 'high' || i.impact === 'medium' || i.impact === 'low') ? i.impact : 'medium'
                })) || []} />
              )}
            </motion.div>
          </div>

          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="wave-card p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold">Top Spotters</h2>
                <button className="text-xs text-wave-400 hover:text-wave-300">
                  View All →
                </button>
              </div>
              <CompetitorTracker competitors={competitors || []} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Mobile Persona Builder Modal */}
      {showMobilePersonaBuilder && (
        <MobilePersonaBuilder
          onComplete={handleMobilePersonaComplete}
          onClose={() => setShowMobilePersonaBuilder(false)}
          initialData={personaData}
        />
      )}

      {/* Mobile Trend Submission Modal */}
      {showMobileTrendSubmission && (
        <MobileTrendSubmission
          onSubmit={handleMobileTrendSubmit}
          onClose={() => setShowMobileTrendSubmission(false)}
        />
      )}
    </div>
  );
}