'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { subscriptionService } from '@/lib/subscriptionService';
import EnterpriseViewSwitcher from '@/components/EnterpriseViewSwitcher';
import WaveSightLogo from '@/components/WaveSightLogo';
import ExportReportModal from '@/components/enterprise/ExportReportModal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, CheckCircle, XCircle, Clock, Users, BarChart, 
  Filter, Calendar, Download, Eye, Activity, Zap, ArrowUp,
  Building2, Globe, Tag, Database, AlertCircle, FileText,
  Sparkles, Shield, Target, Rocket, Brain, Award, DollarSign,
  ArrowUpRight, MessageSquare, Share2, Bookmark, MoreVertical,
  Play, Pause, RefreshCw, Volume2, VolumeX, Search, Code,
  Settings, UserPlus, TrendingDown, Cpu, History, PieChart
} from 'lucide-react';
import { format, formatDistanceToNow, subYears } from 'date-fns';

interface ApexTrend {
  id: string;
  description: string;
  category: string;
  status: string;
  validation_count: number;
  positive_validations: number;
  negative_validations: number;
  validation_ratio: number;
  created_at: string;
  spotter_id: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  evidence?: any;
  spotter?: {
    username: string;
  };
  ai_prediction?: {
    mainstream_probability: number;
    peak_date: string;
    decline_date: string;
    lifecycle_stage: string;
    recommended_action: string;
  };
  custom_persona_scores?: Record<string, number>;
  regional_data?: Record<string, any>;
}

interface CustomPersonaCluster {
  id: string;
  name: string;
  description: string;
  criteria: any;
  trend_affinity: number;
  size: number;
}

interface ScoutCommission {
  id: string;
  title: string;
  description: string;
  category: string;
  reward: number;
  deadline: string;
  submissions: number;
  status: 'active' | 'completed' | 'cancelled';
}

export default function ApexDashboard() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('all');
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<ApexTrend[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLive, setIsLive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [customPersonas, setCustomPersonas] = useState<CustomPersonaCluster[]>([]);
  const [scoutCommissions, setScoutCommissions] = useState<ScoutCommission[]>([]);
  const [showAPIPanel, setShowAPIPanel] = useState(false);
  const [historicalView, setHistoricalView] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [stats, setStats] = useState({
    total_validated_trends: 0,
    avg_validation_score: 0,
    total_categories: 0,
    top_category: 'N/A',
    trends_today: 0,
    trends_this_week: 0,
    trends_this_month: 0,
    total_spotters: 0,
    trend_velocity: 0,
    estimated_reach: 0,
    ai_accuracy: 0,
    roi_percentage: 0
  });

  useEffect(() => {
    if (user) {
      checkSubscription();
      fetchApexData();
      
      if (isLive) {
        intervalRef.current = setInterval(() => {
          fetchNewTrends();
        }, 5000); // Real-time updates every 5 seconds for Apex
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, timeframe, selectedCategory, isLive, historicalView]);

  const checkSubscription = async () => {
    if (!user) return;
    
    const tier = await subscriptionService.getUserTier(user.id);
    if (tier !== 'enterprise') {
      window.location.href = '/pricing';
      return;
    }
  };

  const fetchApexData = async () => {
    setLoading(true);
    try {
      let startDate = new Date();
      
      if (historicalView) {
        // Full historical access for Apex
        startDate = subYears(new Date(), 5);
      } else {
        switch (timeframe) {
          case 'live':
            startDate = new Date(Date.now() - 60 * 60 * 1000); // Last hour
            break;
          case 'day':
            startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            break;
          case 'week':
            startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'all':
            startDate = subYears(new Date(), 1);
            break;
        }
      }

      let query = supabase
        .from('trend_submissions')
        .select(`
          *,
          spotter:profiles!spotter_id (username)
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data: trendsData, error } = await query;

      if (error) throw error;

      // Enhance trends with AI predictions
      const enhancedTrends = (trendsData || []).map(trend => {
        const hoursSinceCreation = (Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60);
        const velocity = trend.validation_count / Math.max(1, hoursSinceCreation);
        
        // AI prediction modeling
        const mainstreamProbability = Math.min(0.95, trend.validation_ratio * 1.2 + (velocity / 100));
        const weeksToPeak = Math.max(2, Math.round(20 / (velocity + 1)));
        const peakDate = new Date();
        peakDate.setDate(peakDate.getDate() + (weeksToPeak * 7));
        
        const declineDate = new Date(peakDate);
        declineDate.setDate(declineDate.getDate() + 60);
        
        let lifecycleStage = 'emerging';
        if (velocity > 20) lifecycleStage = 'explosive';
        else if (velocity > 10) lifecycleStage = 'growing';
        else if (velocity > 5) lifecycleStage = 'trending';
        
        const recommendedAction = 
          lifecycleStage === 'explosive' ? 'Immediate campaign activation recommended' :
          lifecycleStage === 'growing' ? 'Prepare content strategy for peak' :
          lifecycleStage === 'trending' ? 'Monitor closely for acceleration' :
          'Track for early signals';
        
        return {
          ...trend,
          ai_prediction: {
            mainstream_probability: mainstreamProbability,
            peak_date: peakDate.toISOString(),
            decline_date: declineDate.toISOString(),
            lifecycle_stage: lifecycleStage,
            recommended_action: recommendedAction
          }
        };
      });

      setTrends(enhancedTrends);

      // Calculate advanced stats
      if (enhancedTrends.length > 0) {
        const categoryMap = new Map();
        const spotterSet = new Set();
        let totalScore = 0;
        let hourlyTrends = 0;
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

        enhancedTrends.forEach(trend => {
          categoryMap.set(trend.category, (categoryMap.get(trend.category) || 0) + 1);
          spotterSet.add(trend.spotter_id);
          totalScore += trend.validation_ratio;
          
          const trendDate = new Date(trend.created_at);
          if (trendDate >= hourAgo) hourlyTrends++;
        });

        const topCategory = Array.from(categoryMap.entries())
          .sort((a, b) => b[1] - a[1])[0];

        const estimatedReach = enhancedTrends.reduce((sum, t) => sum + (t.validation_count * 1000), 0);
        const subscriptionCost = 15000; // $15,000/month
        const estimatedValue = estimatedReach * 0.10; // Higher value multiplier for enterprise
        const roi = ((estimatedValue - subscriptionCost) / subscriptionCost * 100);

        setStats({
          total_validated_trends: enhancedTrends.length,
          avg_validation_score: enhancedTrends.length > 0 ? (totalScore / enhancedTrends.length * 100) : 0,
          total_categories: categoryMap.size,
          top_category: topCategory ? topCategory[0] : 'N/A',
          trends_today: enhancedTrends.filter(t => {
            const trendDate = new Date(t.created_at);
            return trendDate >= new Date(Date.now() - 24 * 60 * 60 * 1000);
          }).length,
          trends_this_week: enhancedTrends.filter(t => {
            const trendDate = new Date(t.created_at);
            return trendDate >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          }).length,
          trends_this_month: enhancedTrends.length,
          total_spotters: spotterSet.size,
          trend_velocity: hourlyTrends,
          estimated_reach: estimatedReach,
          ai_accuracy: 92.5, // Simulated AI accuracy
          roi_percentage: roi
        });
      }

      // Fetch custom personas
      fetchCustomPersonas();
      
      // Fetch scout commissions
      fetchScoutCommissions();

      // Log feature access
      await subscriptionService.logFeatureAccess(user.id, 'apex_dashboard', 'view', {
        category: selectedCategory,
        timeframe,
        historical: historicalView
      });

    } catch (error) {
      console.error('Error fetching apex data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNewTrends = async () => {
    try {
      const { data: newTrends } = await supabase
        .from('trend_submissions')
        .select(`
          *,
          spotter:profiles!spotter_id (username)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (newTrends && newTrends.length > 0) {
        const newTrendIds = newTrends.map(t => t.id);
        const existingIds = trends.map(t => t.id);
        const hasNewTrends = newTrendIds.some(id => !existingIds.includes(id));
        
        if (hasNewTrends && soundEnabled && audioRef.current) {
          audioRef.current.play();
        }
        
        setTrends(prevTrends => {
          const combined = [...newTrends, ...prevTrends];
          const unique = Array.from(new Map(combined.map(t => [t.id, t])).values());
          return unique.slice(0, 500); // Keep more trends for enterprise
        });
      }
    } catch (error) {
      console.error('Error fetching new trends:', error);
    }
  };

  const fetchCustomPersonas = async () => {
    // Simulate custom persona clusters
    const personas: CustomPersonaCluster[] = [
      { id: '1', name: 'Luxury Millennials', description: 'High-income millennials interested in premium products', criteria: {}, trend_affinity: 0.88, size: 2500000 },
      { id: '2', name: 'Eco-Conscious Gen Z', description: 'Environmentally aware young consumers', criteria: {}, trend_affinity: 0.92, size: 3200000 },
      { id: '3', name: 'Tech Early Adopters', description: 'First to try new technology products', criteria: {}, trend_affinity: 0.95, size: 1800000 },
      { id: '4', name: 'Suburban Families', description: 'Family-oriented suburban demographics', criteria: {}, trend_affinity: 0.65, size: 5400000 }
    ];
    setCustomPersonas(personas);
  };

  const fetchScoutCommissions = async () => {
    // Simulate scout commissions
    const commissions: ScoutCommission[] = [
      { 
        id: '1', 
        title: 'Find Emerging Fashion Trends in Tokyo', 
        description: 'Looking for street fashion trends in Harajuku and Shibuya',
        category: 'fashion',
        reward: 500,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        submissions: 12,
        status: 'active'
      },
      { 
        id: '2', 
        title: 'Tech Product Launch Reactions', 
        description: 'Monitor social media reactions to new Apple/Samsung launches',
        category: 'tech',
        reward: 750,
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        submissions: 28,
        status: 'active'
      }
    ];
    setScoutCommissions(commissions);
  };

  const getCategoryEmoji = (category: string) => {
    const emojiMap: { [key: string]: string } = {
      'visual_style': '🎨', 'audio_music': '🎵', 'creator_technique': '🎬',
      'meme_format': '😂', 'product_brand': '🛍️', 'behavior_pattern': '👥',
      'tech': '💻', 'fashion': '👗', 'food': '🍔', 'entertainment': '🎭',
      'finance': '💳', 'health': '💪', 'sports': '⚽', 'travel': '✈️',
      'lifestyle': '🌟', 'gaming': '🎮', 'education': '📚', 'real_estate': '🏠',
      'crypto': '₿', 'sustainability': '🌱', 'politics': '🏛️', 'art': '🎨',
      'science': '🔬', 'business': '💼', 'social_causes': '🤝'
    };
    return emojiMap[category?.toLowerCase()] || '📊';
  };

  const filteredTrends = trends.filter(trend => 
    searchQuery === '' || 
    trend.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trend.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div className="text-center">
          <WaveSightLogo size="lg" showText={true} />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-t-2 border-b-2 border-gold-500 rounded-full mx-auto mt-8"
          />
          <p className="text-gray-400 mt-4">Initializing Apex Intelligence...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900">
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />
      
      {/* Premium Header */}
      <div className="bg-black/80 backdrop-blur-xl border-b border-gold-500/20 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <WaveSightLogo size="md" showText={true} />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent">
                  WaveSight Apex
                </h1>
                <p className="text-sm text-gray-400">Enterprise Intelligence Command Center</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold-500/20 to-gold-600/20 rounded-full border border-gold-500/50">
                <Shield className="w-4 h-4 text-gold-400" />
                <span className="text-sm font-medium text-gold-400">Apex Access</span>
              </div>
              
              <button
                onClick={() => setShowAPIPanel(!showAPIPanel)}
                className="p-2 bg-purple-500/20 rounded-lg hover:bg-purple-500/30 transition-colors"
              >
                <Code className="w-5 h-5 text-purple-400" />
              </button>
              
              <EnterpriseViewSwitcher />
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowExportModal(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-bold rounded-lg hover:from-gold-600 hover:to-gold-700 transition-all shadow-lg flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Intelligence
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* AI Intelligence Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-xl rounded-2xl p-8 mb-8 border border-purple-500/30 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">AI-Powered Predictive Intelligence</h2>
                <p className="text-gray-300">Real-time analysis • Historical insights • Custom modeling • API integration</p>
              </div>
              <Brain className="w-24 h-24 text-purple-400/30" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-purple-500/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-purple-400" />
                  <span className="text-3xl font-bold text-white">{stats.total_validated_trends}</span>
                </div>
                <p className="text-sm text-gray-400">Active Trends</p>
                <p className="text-xs text-green-400 mt-1">All-time access</p>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-purple-500/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <Cpu className="w-8 h-8 text-blue-400" />
                  <span className="text-3xl font-bold text-white">{stats.ai_accuracy.toFixed(1)}%</span>
                </div>
                <p className="text-sm text-gray-400">AI Accuracy</p>
                <p className="text-xs text-green-400 mt-1">ML-powered</p>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-purple-500/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-green-400" />
                  <span className="text-3xl font-bold text-white">{stats.estimated_reach.toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-400">Total Reach</p>
                <p className="text-xs text-green-400 mt-1">Global coverage</p>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-purple-500/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <Zap className="w-8 h-8 text-yellow-400" />
                  <span className="text-3xl font-bold text-white">{stats.trend_velocity}/hr</span>
                </div>
                <p className="text-sm text-gray-400">Velocity</p>
                <p className="text-xs text-green-400 mt-1">Real-time</p>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-gold-500/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 text-gold-400" />
                  <span className="text-3xl font-bold text-gold-400">{stats.roi_percentage.toFixed(0)}%</span>
                </div>
                <p className="text-sm text-gray-400">ROI</p>
                <p className="text-xs text-gold-400 mt-1">${(stats.estimated_reach * 0.10).toLocaleString()}</p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Advanced Controls */}
        <div className="bg-black/60 backdrop-blur-xl rounded-xl p-4 mb-6 border border-gray-800">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[400px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search trends, categories, AI predictions, or custom personas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            
            <select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="live">Live (1hr)</option>
              <option value="day">24 Hours</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="all">Year</option>
            </select>

            <button
              onClick={() => setHistoricalView(!historicalView)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                historicalView 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-900 text-gray-400 border border-gray-700'
              }`}
            >
              <History className="w-4 h-4" />
              Historical Data
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setIsLive(!isLive)}
                className={`p-2 rounded-lg transition-colors ${
                  isLive ? 'bg-green-500/20 text-green-400' : 'bg-gray-900 text-gray-400'
                }`}
              >
                {isLive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              
              <button
                onClick={fetchApexData}
                className="p-2 rounded-lg bg-gray-900 text-gray-400 hover:bg-gray-800 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Trends with AI Analysis */}
          <div className="lg:col-span-3">
            <div className="bg-black/60 backdrop-blur-xl rounded-xl border border-gray-800">
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Brain className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">AI-Enhanced Trend Stream</h2>
                      <p className="text-sm text-gray-400">{filteredTrends.length} trends with predictive modeling</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4 max-h-[800px] overflow-y-auto">
                {filteredTrends.slice(0, 50).map((trend, index) => (
                  <motion.div
                    key={trend.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="bg-gray-900/50 rounded-xl p-6 hover:bg-gray-900/70 transition-all border border-gray-800 group"
                  >
                    <div className="flex gap-4">
                      {trend.thumbnail_url && (
                        <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                          <img 
                            src={trend.thumbnail_url} 
                            alt="Trend"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl">{getCategoryEmoji(trend.category)}</span>
                              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium capitalize">
                                {trend.category.replace('_', ' ')}
                              </span>
                              {trend.ai_prediction && trend.ai_prediction.lifecycle_stage === 'explosive' && (
                                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium flex items-center gap-1">
                                  <Zap className="w-3 h-3" />
                                  Explosive Growth
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                              {trend.description}
                            </h3>
                          </div>
                        </div>
                        
                        {/* AI Prediction Panel */}
                        {trend.ai_prediction && (
                          <div className="bg-purple-900/20 rounded-lg p-4 mb-4 border border-purple-500/30">
                            <div className="flex items-center gap-2 mb-2">
                              <Brain className="w-4 h-4 text-purple-400" />
                              <span className="text-sm font-medium text-purple-400">AI Analysis</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500">Mainstream Probability</p>
                                <p className="text-white font-bold">
                                  {(trend.ai_prediction.mainstream_probability * 100).toFixed(0)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Peak Date</p>
                                <p className="text-white font-bold">
                                  {format(new Date(trend.ai_prediction.peak_date), 'MMM dd')}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Lifecycle</p>
                                <p className="text-white font-bold capitalize">
                                  {trend.ai_prediction.lifecycle_stage}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 p-2 bg-black/30 rounded">
                              <p className="text-xs text-gold-400">
                                💡 {trend.ai_prediction.recommended_action}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Metrics */}
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-400">{trend.validation_count} validations</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BarChart className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-400">{(trend.validation_ratio * 100).toFixed(0)}% confidence</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-400">
                              {formatDistanceToNow(new Date(trend.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Apex Sidebar */}
          <div className="space-y-6">
            {/* Custom Persona Clusters */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-black/60 backdrop-blur-xl rounded-xl p-6 border border-gray-800"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-gold-400" />
                Custom Persona Clusters
              </h3>
              <div className="space-y-3">
                {customPersonas.map(persona => (
                  <div key={persona.id} className="p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">{persona.name}</span>
                      <button className="text-xs text-purple-400 hover:text-purple-300">
                        Edit
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{persona.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Size: {(persona.size / 1000000).toFixed(1)}M</span>
                      <span className="text-green-400">{(persona.trend_affinity * 100).toFixed(0)}% affinity</span>
                    </div>
                  </div>
                ))}
                <button className="w-full p-3 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg text-purple-400 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Create New Cluster
                </button>
              </div>
            </motion.div>

            {/* Scout Commissions */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-black/60 backdrop-blur-xl rounded-xl p-6 border border-gray-800"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-gold-400" />
                Active Scout Commissions
              </h3>
              <div className="space-y-3">
                {scoutCommissions.map(commission => (
                  <div key={commission.id} className="p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white text-sm">{commission.title}</span>
                      <span className="text-gold-400 font-bold">${commission.reward}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{commission.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{commission.submissions} submissions</span>
                      <span className="text-orange-400">
                        {formatDistanceToNow(new Date(commission.deadline), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
                <button className="w-full p-3 bg-gold-500/20 hover:bg-gold-500/30 rounded-lg text-gold-400 text-sm font-medium transition-colors">
                  Commission New Research
                </button>
              </div>
            </motion.div>

            {/* API Access Panel */}
            {showAPIPanel && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-black/60 backdrop-blur-xl rounded-xl p-6 border border-purple-500/50"
              >
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Code className="w-5 h-5 text-purple-400" />
                  API Integration
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                    <p className="text-xs text-gray-400 mb-1">Endpoint</p>
                    <code className="text-xs text-purple-400">
                      https://api.wavesight.com/v1/trends
                    </code>
                  </div>
                  <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                    <p className="text-xs text-gray-400 mb-1">Rate Limit</p>
                    <p className="text-sm text-white">10,000 requests/hour</p>
                  </div>
                  <button className="w-full p-3 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg text-purple-400 text-sm font-medium transition-colors">
                    Generate API Key
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <ExportReportModal 
            onClose={() => setShowExportModal(false)}
            trends={trends}
            stats={stats}
            timeframe={timeframe}
          />
        )}
      </AnimatePresence>
    </div>
  );
}