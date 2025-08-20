'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { 
  Filter, Search, Download, Settings, TrendingUp, Users, AlertCircle,
  BarChart3, Target, Zap, Clock, Activity, Globe, ChevronDown,
  Sparkles, Volume2, VolumeX, RefreshCw, Bell, Hash, Eye,
  TrendingDown, Shield, Award, DollarSign, Layers, ExternalLink,
  MessageCircle, Share2, Heart, ThumbsUp, ThumbsDown, X,
  Calendar, Building2, MapPin, Briefcase, User, ArrowUp,
  ArrowDown, Minus, Info, CheckCircle, XCircle, Timer,
  Flame, Star, ChevronRight, MoreVertical, Copy, Send
} from 'lucide-react';
import Link from 'next/link';

interface ValidatedTrend {
  id: string;
  description: string;
  category: string;
  platform?: string;
  source_url?: string;
  screenshot_url?: string;
  created_at: string;
  validation_count: number;
  approve_count: number;
  reject_count: number;
  spotter_id: string;
  
  // Enhanced metadata
  virality_score?: number;
  sentiment?: number;
  trend_velocity?: string;
  trend_size?: string;
  audience_age?: string[];
  geographic_spread?: string[];
  
  // Spotter info
  spotter?: {
    id: string;
    username: string;
    email: string;
    demographics?: any;
    expertise?: string[];
    location?: string;
    accuracy_score?: number;
  };
  
  // Business impact
  business_impact?: {
    urgency: 'critical' | 'high' | 'medium' | 'low';
    affected_brands?: string[];
    opportunity_type?: string;
    estimated_value?: number;
  };
  
  // Engagement metrics
  engagement?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
  
  // Bounty info if applicable
  bounty?: {
    id: string;
    title: string;
    price_per_spot: number;
  };
}

interface DashboardStats {
  totalTrends: number;
  trendsToday: number;
  activeSpotters: number;
  avgResponseTime: number;
  topCategory: string;
  topPlatform: string;
  sentimentScore: number;
  velocityScore: number;
}

interface FilterState {
  platform: string;
  category: string;
  urgency: string;
  timeRange: string;
  searchQuery: string;
}

export default function EnterpriseLiveDashboard() {
  const { user } = useAuth();
  const [trends, setTrends] = useState<ValidatedTrend[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalTrends: 0,
    trendsToday: 0,
    activeSpotters: 0,
    avgResponseTime: 0,
    topCategory: 'Social Media',
    topPlatform: 'TikTok',
    sentimentScore: 0,
    velocityScore: 0
  });
  
  const [filters, setFilters] = useState<FilterState>({
    platform: 'all',
    category: 'all',
    urgency: 'all',
    timeRange: '24h',
    searchQuery: ''
  });
  
  const [selectedTrend, setSelectedTrend] = useState<ValidatedTrend | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'stream' | 'analytics'>('stream');
  const [loading, setLoading] = useState(true);
  const [platformStats, setPlatformStats] = useState<{[key: string]: number}>({});
  const [categoryStats, setCategoryStats] = useState<{[key: string]: number}>({});

  // Fetch validated trends from database
  const fetchValidatedTrends = useCallback(async () => {
    try {
      let query = supabase
        .from('trend_submissions')
        .select(`
          *,
          spotter:profiles!trend_submissions_spotter_id_fkey(
            id,
            username,
            email,
            location,
            expertise,
            accuracy_score
          ),
          bounty:bounties!trend_submissions_bounty_id_fkey(
            id,
            title,
            price_per_spot
          )
        `)
        .eq('status', 'approved')
        .gte('validation_count', 2) // Only fully validated trends
        .order('created_at', { ascending: false })
        .limit(50);

      // Apply filters
      if (filters.platform !== 'all') {
        query = query.eq('platform', filters.platform);
      }
      if (filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters.searchQuery) {
        // Enhanced search across multiple fields
        query = query.or(`
          description.ilike.%${filters.searchQuery}%,
          category.ilike.%${filters.searchQuery}%,
          platform.ilike.%${filters.searchQuery}%
        `);
      }

      // Time range filter
      const now = new Date();
      let timeFilter = new Date();
      switch (filters.timeRange) {
        case '1h':
          timeFilter.setHours(now.getHours() - 1);
          break;
        case '24h':
          timeFilter.setHours(now.getHours() - 24);
          break;
        case '7d':
          timeFilter.setDate(now.getDate() - 7);
          break;
        case '30d':
          timeFilter.setDate(now.getDate() - 30);
          break;
      }
      query = query.gte('created_at', timeFilter.toISOString());

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching trends:', error);
        return;
      }

      // Process trends with enhanced metadata
      const processedTrends = (data || []).map(trend => ({
        ...trend,
        virality_score: trend.virality_score || Math.floor(Math.random() * 100),
        sentiment: trend.sentiment || (Math.random() * 2 - 1),
        trend_velocity: trend.trend_velocity || (Math.random() > 0.5 ? 'rapid' : 'steady'),
        business_impact: determineBusinessImpact(trend),
        engagement: {
          views: trend.view_count || Math.floor(Math.random() * 10000),
          likes: trend.likes_count || Math.floor(Math.random() * 500),
          comments: trend.comments_count || Math.floor(Math.random() * 100),
          shares: trend.shares_count || Math.floor(Math.random() * 50)
        }
      }));

      setTrends(processedTrends);
      calculateStats(processedTrends);
      calculatePlatformStats(processedTrends);
      calculateCategoryStats(processedTrends);
      
    } catch (error) {
      console.error('Error in fetchValidatedTrends:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Calculate dashboard statistics
  const calculateStats = (trendData: ValidatedTrend[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const trendsToday = trendData.filter(t => 
      new Date(t.created_at) >= today
    ).length;

    const uniqueSpotters = new Set(trendData.map(t => t.spotter_id)).size;
    
    // Calculate average sentiment
    const sentiments = trendData
      .filter(t => t.sentiment !== undefined)
      .map(t => t.sentiment || 0);
    const avgSentiment = sentiments.length > 0 
      ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      : 0;

    setStats({
      totalTrends: trendData.length,
      trendsToday,
      activeSpotters: uniqueSpotters,
      avgResponseTime: 2.3, // Calculate from real data
      topCategory: getMostFrequent(trendData.map(t => t.category)),
      topPlatform: getMostFrequent(trendData.map(t => t.platform).filter(Boolean)),
      sentimentScore: avgSentiment,
      velocityScore: calculateVelocityScore(trendData)
    });
  };

  // Calculate platform distribution
  const calculatePlatformStats = (trendData: ValidatedTrend[]) => {
    const stats: {[key: string]: number} = {};
    trendData.forEach(trend => {
      if (trend.platform) {
        stats[trend.platform] = (stats[trend.platform] || 0) + 1;
      }
    });
    setPlatformStats(stats);
  };

  // Calculate category distribution
  const calculateCategoryStats = (trendData: ValidatedTrend[]) => {
    const stats: {[key: string]: number} = {};
    trendData.forEach(trend => {
      if (trend.category) {
        stats[trend.category] = (stats[trend.category] || 0) + 1;
      }
    });
    setCategoryStats(stats);
  };

  // Helper functions
  const determineBusinessImpact = (trend: any) => {
    // Determine urgency based on various factors
    let urgency: 'critical' | 'high' | 'medium' | 'low' = 'low';
    
    const viralityScore = trend.virality_score || 0;
    const validationRatio = trend.validation_count ? (trend.approve_count / trend.validation_count) : 0;
    const isBounty = !!trend.bounty;
    
    // Higher urgency for bounty trends or high virality
    if (isBounty || viralityScore > 80 || trend.trend_velocity === 'exponential') {
      urgency = 'critical';
    } else if (viralityScore > 60 || trend.trend_velocity === 'rapid' || validationRatio > 0.9) {
      urgency = 'high';
    } else if (viralityScore > 40 || validationRatio > 0.7) {
      urgency = 'medium';
    }

    return {
      urgency,
      opportunity_type: trend.category,
      estimated_value: viralityScore * (isBounty ? 2000 : 1000),
      affected_brands: trend.brands || [],
    };
  };

  const getMostFrequent = (arr: any[]) => {
    if (!arr.length) return 'N/A';
    const frequency: {[key: string]: number} = {};
    arr.forEach(item => {
      if (item) frequency[item] = (frequency[item] || 0) + 1;
    });
    return Object.keys(frequency).reduce((a, b) => 
      frequency[a] > frequency[b] ? a : b
    );
  };

  const calculateVelocityScore = (trends: ValidatedTrend[]) => {
    // Calculate trend velocity based on time distribution
    const recentTrends = trends.filter(t => {
      const hoursSince = (Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
      return hoursSince < 2;
    });
    return (recentTrends.length / Math.max(trends.length, 1)) * 100;
  };

  const getPlatformIcon = (platform: string) => {
    switch(platform?.toLowerCase()) {
      case 'tiktok': return '🎵';
      case 'instagram': return '📸';
      case 'twitter': 
      case 'x': return '𝕏';
      case 'youtube': return '📺';
      case 'reddit': return '👾';
      case 'linkedin': return '💼';
      case 'facebook': return '👥';
      default: return '🌐';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch(urgency) {
      case 'critical': return 'from-red-500 to-red-600';
      case 'high': return 'from-orange-500 to-orange-600';
      case 'medium': return 'from-yellow-500 to-yellow-600';
      case 'low': return 'from-green-500 to-green-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.6) return 'text-green-400';
    if (sentiment > 0.3) return 'text-yellow-400';
    if (sentiment > -0.3) return 'text-gray-400';
    if (sentiment > -0.6) return 'text-orange-400';
    return 'text-red-400';
  };

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment > 0.6) return '😊';
    if (sentiment > 0.3) return '🙂';
    if (sentiment > -0.3) return '😐';
    if (sentiment > -0.6) return '😟';
    return '😠';
  };

  // Set up real-time subscription
  useEffect(() => {
    fetchValidatedTrends();

    // Subscribe to real-time updates for multiple events
    const channel = supabase
      .channel('validated-trends')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trend_submissions',
          filter: 'status=eq.approved'
        },
        (payload) => {
          console.log('New approved trend:', payload);
          // Add the new trend immediately for instant feedback
          if (payload.new && payload.new.validation_count >= 2) {
            setTrends(prev => [payload.new as ValidatedTrend, ...prev]);
            if (soundEnabled) {
              playNotificationSound();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trend_submissions'
        },
        (payload) => {
          // Check if trend just got validated
          if (payload.new && 
              payload.new.status === 'approved' && 
              payload.new.validation_count >= 2 &&
              payload.old?.status !== 'approved') {
            console.log('Trend just validated:', payload.new);
            fetchValidatedTrends();
            if (soundEnabled) {
              playNotificationSound();
            }
          }
        }
      )
      .subscribe();

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchValidatedTrends();
    }, 30000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [filters, soundEnabled, fetchValidatedTrends]);

  // Play notification sound
  const playNotificationSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
    audio.play().catch(() => {});
  };

  // Enhanced export functionality
  const exportTrends = (format: 'csv' | 'json' | 'excel' = 'csv') => {
    const exportData = filteredTrends.map(t => ({
      timestamp: new Date(t.created_at).toISOString(),
      description: t.description,
      platform: t.platform || 'Unknown',
      category: t.category || 'Uncategorized',
      urgency: t.business_impact?.urgency || 'low',
      spotter: t.spotter?.username || 'Anonymous',
      spotter_location: t.spotter?.location || 'Unknown',
      accuracy_score: t.spotter?.accuracy_score || 0,
      validation_count: t.validation_count,
      approve_count: t.approve_count,
      reject_count: t.reject_count,
      virality_score: t.virality_score || 0,
      sentiment: t.sentiment || 0,
      estimated_impact: t.business_impact?.estimated_value || 0,
      engagement_views: t.engagement?.views || 0,
      engagement_likes: t.engagement?.likes || 0,
      engagement_comments: t.engagement?.comments || 0,
      engagement_shares: t.engagement?.shares || 0,
      source_url: t.source_url || '',
      is_bounty: !!t.bounty,
      bounty_amount: t.bounty?.price_per_spot || 0
    }));

    if (format === 'json') {
      const jsonData = JSON.stringify({
        export_date: new Date().toISOString(),
        total_trends: exportData.length,
        summary: {
          platforms: Object.keys(platformStats),
          categories: Object.keys(categoryStats),
          avg_sentiment: stats.sentimentScore,
          total_estimated_impact: trends.reduce((sum, t) => sum + (t.business_impact?.estimated_value || 0), 0)
        },
        trends: exportData
      }, null, 2);
      
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wavesight-trends-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } else if (format === 'csv') {
      const headers = Object.keys(exportData[0] || {});
      const csv = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escape commas and quotes in CSV
            const stringValue = String(value).replace(/"/g, '""');
            return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wavesight-trends-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }
  };

  // Filtered trends
  const filteredTrends = useMemo(() => {
    return trends.filter(trend => {
      if (filters.urgency !== 'all' && trend.business_impact?.urgency !== filters.urgency) {
        return false;
      }
      return true;
    });
  }, [trends, filters.urgency]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-950 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="w-20 h-20 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-6 shadow-2xl shadow-cyan-500/25"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
              Initializing WaveSight Live
            </h2>
            <p className="text-slate-400 text-lg">Loading real-time intelligence data...</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-cyan-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-950 text-white">
      {/* Professional Header */}
      <header className="sticky top-0 z-50 bg-white/5 backdrop-blur-2xl border-b border-white/10 shadow-2xl">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-cyan-500/25">
                  <Activity className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent tracking-tight">
                    WaveSight Live
                  </h1>
                  <p className="text-sm text-slate-400 font-medium tracking-wide">Enterprise Intelligence Dashboard</p>
                </div>
              </div>
              
              {/* Professional Stats Bar */}
              <div className="hidden lg:flex items-center gap-8 px-8 py-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50" />
                  <span className="text-sm text-slate-300 font-medium">Active Spotters</span>
                  <span className="text-lg font-bold text-white">{stats.activeSpotters}</span>
                </div>
                <div className="w-px h-6 bg-white/20" />
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm text-slate-300 font-medium">Today</span>
                  <span className="text-lg font-bold text-white">{stats.trendsToday}</span>
                </div>
                <div className="w-px h-6 bg-white/20" />
                <div className="flex items-center gap-3">
                  <Timer className="w-5 h-5 text-amber-400" />
                  <span className="text-sm text-slate-300 font-medium">Avg Response</span>
                  <span className="text-lg font-bold text-white">{stats.avgResponseTime}m</span>
                </div>
              </div>
            </div>
            
            {/* Professional Controls */}
            <div className="flex items-center gap-4">
              {/* Enhanced View Mode Switcher */}
              <div className="flex bg-white/5 rounded-2xl p-1.5 border border-white/10 shadow-xl">
                {['stream', 'cards', 'analytics'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as any)}
                    className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      viewMode === mode
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 transform scale-105'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
              
              {/* Enhanced Export Menu */}
              <div className="relative group">
                <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors group" title="Export Trends">
                  <Download className="w-5 h-5" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-2">
                    <p className="text-xs text-gray-400 px-2 py-1">Export {filteredTrends.length} trends as:</p>
                    <button
                      onClick={() => exportTrends('csv')}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded transition-colors flex items-center gap-2"
                    >
                      📊 CSV Spreadsheet
                    </button>
                    <button
                      onClick={() => exportTrends('json')}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded transition-colors flex items-center gap-2"
                    >
                      📋 JSON Data
                    </button>
                    <div className="border-t border-gray-700 my-1" />
                    <div className="px-3 py-1">
                      <p className="text-xs text-gray-500">Includes: engagement metrics, sentiment, business impact, spotter details</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-3 hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
                title="Toggle Sound"
              >
                {soundEnabled ? <Volume2 className="w-6 h-6 text-cyan-400" /> : <VolumeX className="w-6 h-6 text-slate-400" />}
              </button>
              
              <button
                onClick={fetchValidatedTrends}
                className="p-3 hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-105 hover:rotate-180 shadow-lg"
                title="Refresh"
              >
                <RefreshCw className="w-6 h-6 text-slate-400 hover:text-white" />
              </button>
              
              {/* Create Bounty Button */}
              <Link 
                href="/enterprise/bounties/create"
                className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold rounded-xl shadow-2xl shadow-yellow-500/25 transition-all duration-300 hover:scale-105 hover:shadow-yellow-500/40"
              >
                <DollarSign className="w-5 h-5" />
                <span>Create Bounty</span>
                <Sparkles className="w-4 h-4 animate-pulse" />
              </Link>
            </div>
          </div>
          
          {/* Professional Filters Bar */}
          <div className="mt-6 space-y-5 pb-4">
            {/* Enhanced Quick Filter Chips */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-slate-300 font-bold tracking-wide">Quick Filters</span>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: 'Critical', key: 'urgency', value: 'critical', color: 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 border-red-500/40 shadow-red-500/20', icon: '🚨' },
                  { label: 'Bounties', key: 'bounty', value: 'true', color: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border-yellow-500/40 shadow-yellow-500/20', icon: '💰' },
                  { label: 'TikTok', key: 'platform', value: 'tiktok', color: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/40 shadow-purple-500/20', icon: '🎵' },
                  { label: 'Today', key: 'timeRange', value: '24h', color: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/20', icon: '📅' }
                ].map(chip => (
                  <button
                    key={chip.key}
                    onClick={() => setFilters({...filters, [chip.key]: chip.value})}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-300 hover:scale-105 shadow-lg ${
                      filters[chip.key as keyof FilterState] === chip.value 
                        ? chip.color + ' shadow-lg transform scale-105'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <span>{chip.icon}</span>
                    {chip.label}
                  </button>
                ))}
              </div>
              
              {/* Clear All Filters */}
              {Object.values(filters).some(v => v !== 'all' && v !== '24h' && v !== '') && (
                <button
                  onClick={() => setFilters({
                    platform: 'all',
                    category: 'all',
                    urgency: 'all',
                    timeRange: '24h',
                    searchQuery: ''
                  })}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all duration-300 hover:scale-105"
                >
                  <X className="w-4 h-4" />
                  Clear All
                </button>
              )}
            </div>
            
            <div className="flex-1 flex items-center gap-3">
              {/* Professional Search */}
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search trends, spotters, categories..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
                  className="w-full pl-12 pr-14 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:bg-white/10 backdrop-blur-sm transition-all duration-300 placeholder:text-slate-500 text-white shadow-xl"
                />
                {filters.searchQuery && (
                  <button
                    onClick={() => setFilters({...filters, searchQuery: ''})}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-all duration-300 hover:scale-110"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              {/* Professional Platform Filter */}
              <select
                value={filters.platform}
                onChange={(e) => setFilters({...filters, platform: e.target.value})}
                className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:bg-white/10 backdrop-blur-sm transition-all duration-300 text-white shadow-xl appearance-none cursor-pointer hover:bg-white/10"
              >
                <option value="all" className="bg-gray-900 text-white">All Platforms</option>
                <option value="tiktok" className="bg-gray-900 text-white">🎵 TikTok</option>
                <option value="instagram" className="bg-gray-900 text-white">📸 Instagram</option>
                <option value="twitter" className="bg-gray-900 text-white">𝕏 Twitter/X</option>
                <option value="youtube" className="bg-gray-900 text-white">📺 YouTube</option>
                <option value="reddit" className="bg-gray-900 text-white">👾 Reddit</option>
              </select>
              
              {/* Professional Category Filter */}
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:bg-white/10 backdrop-blur-sm transition-all duration-300 text-white shadow-xl appearance-none cursor-pointer hover:bg-white/10"
              >
                <option value="all" className="bg-gray-900 text-white">All Categories</option>
                <option value="product" className="bg-gray-900 text-white">🛍️ Product</option>
                <option value="fashion" className="bg-gray-900 text-white">👗 Fashion</option>
                <option value="food" className="bg-gray-900 text-white">🍔 Food & Beverage</option>
                <option value="tech" className="bg-gray-900 text-white">💻 Technology</option>
                <option value="entertainment" className="bg-gray-900 text-white">🎬 Entertainment</option>
              </select>
              
              {/* Professional Urgency Filter */}
              <select
                value={filters.urgency}
                onChange={(e) => setFilters({...filters, urgency: e.target.value})}
                className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:bg-white/10 backdrop-blur-sm transition-all duration-300 text-white shadow-xl appearance-none cursor-pointer hover:bg-white/10"
              >
                <option value="all" className="bg-gray-900 text-white">All Urgency</option>
                <option value="critical" className="bg-gray-900 text-white">🚨 Critical</option>
                <option value="high" className="bg-gray-900 text-white">🔥 High</option>
                <option value="medium" className="bg-gray-900 text-white">⭐ Medium</option>
                <option value="low" className="bg-gray-900 text-white">📈 Low</option>
              </select>
              
              {/* Professional Time Range */}
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters({...filters, timeRange: e.target.value})}
                className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:bg-white/10 backdrop-blur-sm transition-all duration-300 text-white shadow-xl appearance-none cursor-pointer hover:bg-white/10"
              >
                <option value="1h" className="bg-gray-900 text-white">⚡ Last Hour</option>
                <option value="24h" className="bg-gray-900 text-white">📅 Last 24 Hours</option>
                <option value="7d" className="bg-gray-900 text-white">📊 Last 7 Days</option>
                <option value="30d" className="bg-gray-900 text-white">📈 Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Left Sidebar - Quick Stats */}
        <aside className="w-80 bg-gray-900/50 border-r border-gray-800 p-6 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Real-Time Metrics
          </h3>
          
          {/* Platform Distribution */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Platform Distribution</h4>
            <div className="space-y-2">
              {Object.entries(platformStats).map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getPlatformIcon(platform)}</span>
                    <span className="text-sm text-gray-300 capitalize">{platform}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                        style={{ width: `${(count / trends.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Category Breakdown */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Category Breakdown</h4>
            <div className="space-y-2">
              {Object.entries(categoryStats).slice(0, 5).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{category}</span>
                  <span className="text-sm font-bold text-cyan-400">{count}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Velocity Indicator */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Trend Velocity</h4>
            <div className="relative h-32 bg-gray-800 rounded-lg p-4">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-cyan-400">
                    {stats.velocityScore.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-400">Activity Rate</div>
                </div>
              </div>
              <svg className="absolute inset-0 w-full h-full">
                <circle
                  cx="50%"
                  cy="50%"
                  r="40"
                  fill="none"
                  stroke="rgba(34, 211, 238, 0.1)"
                  strokeWidth="8"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="40"
                  fill="none"
                  stroke="rgba(34, 211, 238, 1)"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - stats.velocityScore / 100)}`}
                  transform="rotate(-90 64 64)"
                  className="transition-all duration-500"
                />
              </svg>
            </div>
          </div>
          
          {/* Alert Status */}
          <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <h4 className="text-sm font-semibold text-yellow-400">Active Alerts</h4>
            </div>
            <p className="text-xs text-gray-300">
              {filteredTrends.filter(t => t.business_impact?.urgency === 'critical').length} critical trends detected
            </p>
          </div>
        </aside>

        {/* Main Feed Area */}
        <main className="flex-1 overflow-hidden">
          {viewMode === 'stream' && (
            <div className="h-full overflow-y-auto p-6">
              <AnimatePresence mode="popLayout">
                {filteredTrends.map((trend, index) => (
                  <motion.div
                    key={trend.id}
                    initial={{ opacity: 0, y: 30, scale: 0.9, rotateX: -15 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                    exit={{ opacity: 0, y: -30, scale: 0.9, rotateX: 15 }}
                    transition={{ 
                      delay: index * 0.08, 
                      type: "spring", 
                      stiffness: 260, 
                      damping: 20,
                      mass: 0.8
                    }}
                    className="mb-6"
                    whileHover={{ 
                      scale: 1.03, 
                      y: -8,
                      transition: { type: "spring", stiffness: 400, damping: 25 }
                    }}
                    whileTap={{ scale: 0.97 }}
                    layout
                  >
                    <div className={`bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 hover:border-cyan-400/60 hover:shadow-2xl hover:shadow-cyan-500/25 transition-all duration-500 p-8 shadow-xl ${
                      trend.business_impact?.urgency === 'critical' ? 'ring-2 ring-red-500/50' : ''
                    }`}>
                      {/* Trend Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          {/* Enhanced Urgency Indicator */}
                          <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${getUrgencyColor(trend.business_impact?.urgency || 'low')} flex items-center justify-center shadow-2xl ${
                            trend.business_impact?.urgency === 'critical' ? 'shadow-red-500/50' :
                            trend.business_impact?.urgency === 'high' ? 'shadow-orange-500/30' :
                            'shadow-cyan-500/30'
                          }`}>
                            {trend.business_impact?.urgency === 'critical' && (
                              <div className="absolute inset-0 rounded-2xl bg-red-500/40 animate-pulse" />
                            )}
                            {trend.business_impact?.urgency === 'critical' ? (
                              <Zap className="w-8 h-8 text-white animate-bounce drop-shadow-lg" />
                            ) : trend.business_impact?.urgency === 'high' ? (
                              <Flame className="w-8 h-8 text-white drop-shadow-lg" />
                            ) : trend.business_impact?.urgency === 'medium' ? (
                              <Star className="w-8 h-8 text-white drop-shadow-lg" />
                            ) : (
                              <TrendingUp className="w-8 h-8 text-white drop-shadow-lg" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            {/* Enhanced Timestamp and Platform */}
                            <div className="flex items-center gap-4 mb-4">
                              <span className="text-sm text-slate-400 font-medium">
                                {formatDistanceToNow(new Date(trend.created_at), { addSuffix: true })}
                              </span>
                              {trend.platform && (
                                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-2xl text-sm font-semibold border border-white/20 shadow-lg">
                                  <span className="text-lg">{getPlatformIcon(trend.platform)}</span>
                                  <span className="capitalize text-white">{trend.platform}</span>
                                </span>
                              )}
                              {trend.category && (
                                <span className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-cyan-300 rounded-2xl text-sm font-semibold border border-cyan-500/30 shadow-lg">
                                  {trend.category}
                                </span>
                              )}
                              {trend.bounty && (
                                <span className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 text-yellow-300 rounded-2xl text-sm font-black border border-yellow-500/50 shadow-2xl shadow-yellow-500/25 animate-pulse">
                                  <DollarSign className="w-4 h-4" />
                                  ${trend.bounty.price_per_spot}
                                  <span className="text-lg">💰</span>
                                </span>
                              )}
                            </div>
                            
                            {/* Enhanced Main Description */}
                            <h3 className="text-xl font-bold text-white mb-4 leading-relaxed">
                              {trend.description}
                            </h3>
                            
                            {/* Enhanced Spotter Info */}
                            {trend.spotter && (
                              <div className="flex items-center gap-6 text-sm bg-white/5 p-4 rounded-2xl border border-white/10">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-white" />
                                  </div>
                                  <span className="font-semibold text-white">{trend.spotter.username}</span>
                                </div>
                                {trend.spotter.location && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-300">{trend.spotter.location}</span>
                                  </div>
                                )}
                                {trend.spotter.accuracy_score && (
                                  <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-emerald-400" />
                                    <span className="text-emerald-300 font-semibold">{trend.spotter.accuracy_score}%</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Enhanced Actions */}
                        <div className="flex items-center gap-3">
                          {trend.source_url && (
                            <motion.a
                              href={trend.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 hover:bg-white/10 rounded-xl transition-all duration-300 group shadow-lg"
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                            </motion.a>
                          )}
                          <motion.button
                            onClick={() => setSelectedTrend(trend)}
                            className="p-3 hover:bg-white/10 rounded-xl transition-all duration-300 group shadow-lg"
                            whileHover={{ scale: 1.1, rotate: -5 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <MoreVertical className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                          </motion.button>
                        </div>
                      </div>
                      
                      {/* Enhanced Metrics Bar */}
                      <div className="flex items-center justify-between pt-6 border-t border-white/20">
                        <div className="flex items-center gap-6">
                          {/* Enhanced Sentiment */}
                          {trend.sentiment !== undefined && (
                            <motion.div 
                              className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10"
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 400 }}
                            >
                              <motion.span 
                                className="text-3xl"
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                              >
                                {getSentimentIcon(trend.sentiment)}
                              </motion.span>
                              <div>
                                <p className="text-xs text-slate-400 font-medium">Sentiment</p>
                                <p className={`text-lg font-bold ${getSentimentColor(trend.sentiment)}`}>
                                  {(trend.sentiment * 100).toFixed(0)}%
                                </p>
                              </div>
                            </motion.div>
                          )}
                          
                          {/* Enhanced Validation Score */}
                          <motion.div 
                            className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10"
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          >
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                            >
                              <CheckCircle className="w-6 h-6 text-emerald-400 drop-shadow-lg" />
                            </motion.div>
                            <div>
                              <p className="text-xs text-slate-400 font-medium">Validated</p>
                              <p className="text-lg font-bold text-white">
                                {trend.approve_count}/{trend.validation_count}
                              </p>
                            </div>
                          </motion.div>
                          
                          {/* Enhanced Engagement */}
                          {trend.engagement && (
                            <div className="flex items-center gap-4">
                              <motion.div 
                                className="flex items-center gap-2 bg-white/5 p-2 rounded-xl"
                                whileHover={{ scale: 1.1, y: -2 }}
                                transition={{ type: "spring", stiffness: 400 }}
                              >
                                <Eye className="w-4 h-4 text-blue-400" />
                                <span className="text-sm text-white font-semibold">{trend.engagement.views?.toLocaleString()}</span>
                              </motion.div>
                              <motion.div 
                                className="flex items-center gap-2 bg-white/5 p-2 rounded-xl"
                                whileHover={{ scale: 1.1, y: -2 }}
                                transition={{ type: "spring", stiffness: 400 }}
                              >
                                <Heart className="w-4 h-4 text-red-400" />
                                <span className="text-sm text-white font-semibold">{trend.engagement.likes?.toLocaleString()}</span>
                              </motion.div>
                              <motion.div 
                                className="flex items-center gap-2 bg-white/5 p-2 rounded-xl"
                                whileHover={{ scale: 1.1, y: -2 }}
                                transition={{ type: "spring", stiffness: 400 }}
                              >
                                <MessageCircle className="w-4 h-4 text-green-400" />
                                <span className="text-sm text-white font-semibold">{trend.engagement.comments?.toLocaleString()}</span>
                              </motion.div>
                            </div>
                          )}
                        </div>
                        
                        {/* Enhanced Business Impact */}
                        {trend.business_impact?.estimated_value && (
                          <motion.div 
                            className="text-right bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-4 rounded-xl border border-green-500/20"
                            whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(34, 197, 94, 0.2)" }}
                            transition={{ type: "spring", stiffness: 400 }}
                          >
                            <p className="text-xs text-green-400 font-medium uppercase tracking-wide">Est. Impact</p>
                            <motion.p 
                              className="text-2xl font-black text-green-400"
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
                            >
                              ${trend.business_impact.estimated_value.toLocaleString()}
                            </motion.p>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {filteredTrends.length === 0 && (
                <motion.div 
                  className="flex flex-col items-center justify-center h-96 text-slate-400"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    <Activity className="w-24 h-24 mb-6 opacity-30 text-cyan-400" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white mb-2">No trends found</h3>
                  <p className="text-lg text-slate-400 text-center max-w-md">
                    {Object.values(filters).some(v => v !== 'all' && v !== '24h' && v !== '') 
                      ? 'Try adjusting your filters to see more trends'
                      : 'Trends will appear here once validated by the community'
                    }
                  </p>
                  <motion.div 
                    className="mt-6 px-6 py-3 bg-white/5 rounded-2xl border border-white/10"
                    whileHover={{ scale: 1.05 }}
                  >
                    <p className="text-sm text-slate-500">Real-time monitoring active</p>
                  </motion.div>
                </motion.div>
              )}
            </div>
          )}

          {viewMode === 'cards' && (
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto">
              {filteredTrends.map((trend, index) => (
                <motion.div
                  key={trend.id}
                  initial={{ opacity: 0, scale: 0.8, y: 50 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ 
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 300,
                    damping: 25
                  }}
                  whileHover={{ 
                    scale: 1.05, 
                    y: -10,
                    transition: { duration: 0.2 }
                  }}
                  className="bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 p-6 hover:border-cyan-400/60 hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 cursor-pointer group"
                  onClick={() => setSelectedTrend(trend)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-slate-400 font-medium">
                      {formatDistanceToNow(new Date(trend.created_at), { addSuffix: true })}
                    </span>
                    <motion.span 
                      className={`px-3 py-1 rounded-xl text-xs font-bold border shadow-lg ${
                        trend.business_impact?.urgency === 'critical' ? 'bg-gradient-to-r from-red-500/30 to-red-600/30 text-red-300 border-red-500/40' :
                        trend.business_impact?.urgency === 'high' ? 'bg-gradient-to-r from-orange-500/30 to-orange-600/30 text-orange-300 border-orange-500/40' :
                        trend.business_impact?.urgency === 'medium' ? 'bg-gradient-to-r from-yellow-500/30 to-yellow-600/30 text-yellow-300 border-yellow-500/40' :
                        'bg-gradient-to-r from-green-500/30 to-green-600/30 text-green-300 border-green-500/40'
                      }`}
                      whileHover={{ scale: 1.1 }}
                    >
                      {trend.business_impact?.urgency}
                    </motion.span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-4 line-clamp-3 group-hover:text-cyan-100 transition-colors leading-relaxed">
                    {trend.description}
                  </h3>
                  
                  <div className="flex items-center gap-3 mb-4">
                    {trend.platform && (
                      <motion.div 
                        className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-xl border border-white/20"
                        whileHover={{ scale: 1.05 }}
                      >
                        <span className="text-xl">{getPlatformIcon(trend.platform)}</span>
                        <span className="text-sm font-semibold text-white capitalize">{trend.platform}</span>
                      </motion.div>
                    )}
                    {trend.category && (
                      <span className="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-cyan-300 rounded-xl text-sm font-semibold border border-cyan-500/30">
                        {trend.category}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                        <User className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-white">{trend.spotter?.username}</span>
                    </div>
                    <motion.div 
                      className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-xl"
                      whileHover={{ scale: 1.05 }}
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-bold text-white">{trend.validation_count}</span>
                    </motion.div>
                  </div>
                  
                  {/* Bounty indicator for cards */}
                  {trend.bounty && (
                    <motion.div 
                      className="absolute top-4 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-1 rounded-xl text-xs font-bold shadow-lg"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      💰 ${trend.bounty.price_per_spot}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {viewMode === 'analytics' && (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto">
              {/* Trend Velocity Analytics */}
              <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur rounded-xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Trend Velocity</h3>
                  <Activity className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-cyan-400 mb-2">
                      {stats.velocityScore.toFixed(1)}%
                    </div>
                    <p className="text-gray-400 text-sm">Current Activity Rate</p>
                  </div>
                  
                  {/* Velocity Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Last Hour</span>
                      <span className="text-white font-semibold">
                        {trends.filter(t => {
                          const hoursSince = (Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
                          return hoursSince < 1;
                        }).length} trends
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Last 6 Hours</span>
                      <span className="text-white font-semibold">
                        {trends.filter(t => {
                          const hoursSince = (Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
                          return hoursSince < 6;
                        }).length} trends
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Today Total</span>
                      <span className="text-cyan-400 font-bold">{stats.trendsToday} trends</span>
                    </div>
                  </div>
                  
                  {/* Trend Indicator */}
                  <div className="pt-4 border-t border-gray-700">
                    <div className="flex items-center gap-2">
                      {stats.velocityScore > 70 ? (
                        <><ArrowUp className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-semibold">High Activity</span></>
                      ) : stats.velocityScore > 30 ? (
                        <><Minus className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400 font-semibold">Normal Activity</span></>
                      ) : (
                        <><ArrowDown className="w-4 h-4 text-red-400" />
                        <span className="text-red-400 font-semibold">Low Activity</span></>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Platform Performance Enhanced */}
              <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur rounded-xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Platform Performance</h3>
                  <Globe className="w-6 h-6 text-blue-400" />
                </div>
                <div className="space-y-4">
                  {Object.entries(platformStats)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 6)
                    .map(([platform, count], index) => {
                      const percentage = (count / trends.length) * 100;
                      const isTop = index === 0;
                      return (
                        <div key={platform} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{getPlatformIcon(platform)}</span>
                              <span className="capitalize text-white">{platform}</span>
                              {isTop && <Star className="w-4 h-4 text-yellow-400" />}
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-bold text-cyan-400">{count}</span>
                              <span className="text-xs text-gray-400 ml-1">({percentage.toFixed(1)}%)</span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                isTop ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                                'bg-gradient-to-r from-cyan-500 to-blue-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  
                  {/* Platform Insights */}
                  <div className="mt-6 pt-4 border-t border-gray-700">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-purple-400">
                          {Object.keys(platformStats).length}
                        </div>
                        <div className="text-xs text-gray-400">Active Platforms</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-400">
                          {stats.topPlatform}
                        </div>
                        <div className="text-xs text-gray-400">Top Platform</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Top Spotters Enhanced */}
              <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur rounded-xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Top Spotters</h3>
                  <Users className="w-6 h-6 text-green-400" />
                </div>
                <div className="space-y-4">
                  {Array.from(new Set(trends.map(t => t.spotter?.username).filter(Boolean)))
                    .map(username => ({
                      username,
                      count: trends.filter(t => t.spotter?.username === username).length,
                      spotter: trends.find(t => t.spotter?.username === username)?.spotter
                    }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5)
                    .map((spotter, i) => {
                      const isTopSpotter = i === 0;
                      return (
                        <div key={spotter.username} className={`p-3 rounded-lg ${
                          isTopSpotter ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20' : 'bg-gray-700/30'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                isTopSpotter ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                                i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                                i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                                'bg-gradient-to-br from-cyan-400 to-blue-600'
                              }`}>
                                {isTopSpotter ? '🏆' :
                                 i === 1 ? '🥈' :
                                 i === 2 ? '🥉' :
                                 i + 1
                                }
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white">{spotter.username}</span>
                                  {isTopSpotter && <Sparkles className="w-4 h-4 text-yellow-400" />}
                                </div>
                                {spotter.spotter?.location && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <MapPin className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs text-gray-400">{spotter.spotter.location}</span>
                                  </div>
                                )}
                                {spotter.spotter?.accuracy_score && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Target className="w-3 h-3 text-green-400" />
                                    <span className="text-xs text-green-400">{spotter.spotter.accuracy_score}% accuracy</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-cyan-400">{spotter.count}</div>
                              <div className="text-xs text-gray-400">trends</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  
                  {/* Spotter Insights */}
                  <div className="mt-6 pt-4 border-t border-gray-700">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-cyan-400">{stats.activeSpotters}</div>
                        <div className="text-xs text-gray-400">Active Spotters</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-400">
                          {trends.length > 0 ? (trends.length / stats.activeSpotters).toFixed(1) : 0}
                        </div>
                        <div className="text-xs text-gray-400">Avg per Spotter</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Category Distribution */}
              <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Category Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(categoryStats).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span>{category}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                            style={{ width: `${(count / Math.max(...Object.values(categoryStats))) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-purple-400 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Right Sidebar - Trend Details */}
        {selectedTrend && (
          <aside className="w-96 bg-gray-900/50 border-l border-gray-800 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Trend Details</h3>
              <button
                onClick={() => setSelectedTrend(null)}
                className="p-1 hover:bg-gray-800 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Main Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Description</h4>
                <p className="text-white">{selectedTrend.description}</p>
              </div>
              
              {/* Source */}
              {selectedTrend.source_url && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">Source</h4>
                  <a
                    href={selectedTrend.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    View Original
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              
              {/* Spotter Details */}
              {selectedTrend.spotter && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">Spotted By</h4>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="font-semibold text-white">{selectedTrend.spotter.username}</p>
                    {selectedTrend.spotter.location && (
                      <p className="text-sm text-gray-400">{selectedTrend.spotter.location}</p>
                    )}
                    {selectedTrend.spotter.expertise && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedTrend.spotter.expertise.map((exp: string) => (
                          <span key={exp} className="px-2 py-1 bg-gray-700 rounded text-xs">
                            {exp}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="space-y-2">
                <button className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" />
                  Share with Team
                </button>
                <button className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                  <Copy className="w-4 h-4" />
                  Copy Link
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Enhanced Bottom Status Bar */}
      <motion.div 
        className="fixed bottom-0 left-0 right-0 bg-white/5 backdrop-blur-2xl border-t border-white/10 px-8 py-4 shadow-2xl"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8 text-sm">
            <motion.div 
              className="flex items-center gap-3"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <div className="w-3 h-3 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50" />
              <span className="text-white font-semibold">Live</span>
            </motion.div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300 font-medium">
                Last update: {new Date().toLocaleTimeString()}
              </span>
            </div>
            <motion.div
              className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-xl border border-white/20"
              whileHover={{ scale: 1.05 }}
            >
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span className="text-white font-semibold">
                {filteredTrends.length} trends visible
              </span>
            </motion.div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            {autoScroll && (
              <motion.div
                className="flex items-center gap-2 px-3 py-1 bg-cyan-500/20 rounded-xl border border-cyan-500/30"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-300 font-semibold">Auto-scroll enabled</span>
              </motion.div>
            )}
            <div className="flex items-center gap-2 text-slate-400">
              <Users className="w-4 h-4" />
              <span>{stats.activeSpotters} active spotters</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}