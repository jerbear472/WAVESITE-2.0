'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
  Settings, UserPlus, TrendingDown, Cpu, History, PieChart,
  LineChart, Map, Bell, Layers, Network, Gauge, ChevronRight
} from 'lucide-react';
import { format, formatDistanceToNow, subDays, subHours } from 'date-fns';
import dynamic from 'next/dynamic';

// Dynamic imports for performance
const MLAnalytics = dynamic(() => import('@/components/enterprise/MLAnalytics').then(mod => ({ default: mod.MLAnalytics })), { ssr: false });
const TrendIntelligenceHub = dynamic(() => import('@/components/enterprise/TrendIntelligenceHub'), { ssr: false });
const IndustryDashboard = dynamic(() => import('@/components/enterprise/IndustryDashboard'), { ssr: false });

// Chart components for data visualization
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface UltimateTrend {
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
    tier?: string;
    accuracy_rate?: number;
  };
  ai_insights?: {
    virality_score: number;
    predicted_peak: string;
    expected_duration: number;
    confidence: number;
    market_impact: string;
    recommended_actions: string[];
    similar_historical_trends: Array<{
      id: string;
      description: string;
      peak_reached: any;
      roi: number;
    }>;
  };
  financial_metrics?: {
    potential_revenue: number;
    market_cap_impact: number;
    investment_opportunity: boolean;
    risk_level: 'low' | 'medium' | 'high';
  };
  geographic_distribution?: Array<{
    region: string;
    engagement: number;
    growth_rate: number;
  }>;
  demographic_insights?: {
    age_groups: Record<string, number>;
    interests: string[];
    income_brackets: Record<string, number>;
  };
}

interface RealTimeMetrics {
  active_trends: number;
  trends_per_minute: number;
  validation_velocity: number;
  spotter_activity: number;
  geographic_hotspots: Array<{
    location: string;
    intensity: number;
  }>;
  sentiment_index: number;
  market_momentum: number;
}

interface PredictiveAlert {
  id: string;
  type: 'viral' | 'declining' | 'emerging' | 'opportunity';
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  trend_ids: string[];
  recommended_action: string;
  potential_impact: string;
  created_at: string;
}

export default function UltimateEnterpriseDashboard() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'overview' | 'analytics' | 'predictions' | 'network'>('overview');
  const [timeframe, setTimeframe] = useState('realtime');
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<UltimateTrend[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLive, setIsLive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedTrend, setSelectedTrend] = useState<UltimateTrend | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [predictiveAlerts, setPredictiveAlerts] = useState<PredictiveAlert[]>([]);
  const [showMLPanel, setShowMLPanel] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const audioRef = useRef<HTMLAudioElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Enhanced stats with financial metrics
  const [advancedStats, setAdvancedStats] = useState({
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
    roi_percentage: 0,
    market_value: 0,
    viral_probability: 0,
    network_growth: 0,
    prediction_success_rate: 0,
    total_revenue_generated: 0,
    active_industries: 0,
    global_coverage: 0
  });

  // Initialize WebSocket connection for real-time data
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      // Connect to real-time trend stream
      const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/trends');
      
      ws.onopen = () => {
        console.log('Connected to real-time trend stream');
        ws.send(JSON.stringify({ type: 'subscribe', user_id: user.id }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleRealTimeUpdate(data);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;

      return () => {
        ws.close();
      };
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchEnhancedData();
      fetchPredictiveAlerts();
      
      if (isLive) {
        intervalRef.current = setInterval(() => {
          fetchRealTimeMetrics();
          checkForAlerts();
        }, 5000); // Update every 5 seconds
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, timeframe, selectedCategory, isLive]);

  const handleRealTimeUpdate = (data: any) => {
    if (data.type === 'new_trend') {
      setTrends(prev => [data.trend, ...prev].slice(0, 100));
      if (soundEnabled && audioRef.current) {
        audioRef.current.play();
      }
    } else if (data.type === 'trend_update') {
      setTrends(prev => prev.map(t => t.id === data.trend.id ? data.trend : t));
    } else if (data.type === 'alert') {
      setPredictiveAlerts(prev => [data.alert, ...prev].slice(0, 10));
    }
  };

  const fetchEnhancedData = async () => {
    setLoading(true);
    try {
      // Fetch trends with AI insights
      const { data: trendsData, error: trendsError } = await supabase
        .rpc('get_enterprise_trends_with_insights', {
          p_timeframe: timeframe,
          p_category: selectedCategory === 'all' ? null : selectedCategory,
          p_user_id: user?.id
        });

      if (trendsError) throw trendsError;

      // Enhance trends with ML predictions
      const enhancedTrends = await enhanceTrendsWithML(trendsData || []);
      setTrends(enhancedTrends);

      // Calculate advanced statistics
      calculateAdvancedStats(enhancedTrends);
    } catch (error) {
      console.error('Error fetching enhanced data:', error);
    } finally {
      setLoading(false);
    }
  };

  const enhanceTrendsWithML = async (trends: any[]): Promise<UltimateTrend[]> => {
    // Call ML service to enhance trends with predictions
    try {
      const response = await fetch('/api/enterprise/ml/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trends })
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('ML enhancement error:', error);
    }
    
    return trends;
  };

  const fetchRealTimeMetrics = async () => {
    try {
      const { data } = await supabase
        .rpc('get_real_time_metrics');
      
      setRealTimeMetrics(data);
    } catch (error) {
      console.error('Error fetching real-time metrics:', error);
    }
  };

  const fetchPredictiveAlerts = async () => {
    try {
      const { data } = await supabase
        .from('predictive_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      setPredictiveAlerts(data || []);
    } catch (error) {
      console.error('Error fetching predictive alerts:', error);
    }
  };

  const checkForAlerts = async () => {
    // Check for new viral opportunities, declining trends, etc.
    try {
      const response = await fetch('/api/enterprise/alerts/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user?.id,
          categories: selectedCategory === 'all' ? [] : [selectedCategory]
        })
      });
      
      if (response.ok) {
        const alerts = await response.json();
        if (alerts.length > 0) {
          setPredictiveAlerts(prev => [...alerts, ...prev].slice(0, 10));
        }
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  };

  const calculateAdvancedStats = (trendsData: UltimateTrend[]) => {
    const categoryMap = new Map();
    const spotterSet = new Set();
    const industrySet = new Set();
    let totalScore = 0;
    let totalRevenue = 0;
    let totalMarketValue = 0;
    let viralCount = 0;
    
    trendsData.forEach(trend => {
      categoryMap.set(trend.category, (categoryMap.get(trend.category) || 0) + 1);
      spotterSet.add(trend.spotter_id);
      
      if (trend.category) {
        industrySet.add(trend.category.split('_')[0]);
      }
      
      totalScore += trend.validation_ratio;
      
      if (trend.financial_metrics) {
        totalRevenue += trend.financial_metrics.potential_revenue || 0;
        totalMarketValue += trend.financial_metrics.market_cap_impact || 0;
      }
      
      if (trend.ai_insights && trend.ai_insights.virality_score > 0.7) {
        viralCount++;
      }
    });

    const topCategory = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])[0];

    setAdvancedStats({
      total_validated_trends: trendsData.length,
      avg_validation_score: trendsData.length > 0 ? (totalScore / trendsData.length) * 100 : 0,
      total_categories: categoryMap.size,
      top_category: topCategory ? topCategory[0] : 'N/A',
      trends_today: trendsData.filter(t => new Date(t.created_at) >= subDays(new Date(), 1)).length,
      trends_this_week: trendsData.filter(t => new Date(t.created_at) >= subDays(new Date(), 7)).length,
      trends_this_month: trendsData.filter(t => new Date(t.created_at) >= subDays(new Date(), 30)).length,
      total_spotters: spotterSet.size,
      trend_velocity: trendsData.filter(t => new Date(t.created_at) >= subHours(new Date(), 1)).length,
      estimated_reach: trendsData.reduce((sum, t) => sum + (t.validation_count * 1000), 0),
      ai_accuracy: 87.3, // Mock for now
      roi_percentage: totalRevenue > 0 ? ((totalRevenue - 1999) / 1999 * 100) : 0,
      market_value: totalMarketValue,
      viral_probability: (viralCount / Math.max(1, trendsData.length)) * 100,
      network_growth: 12.5, // Mock for now
      prediction_success_rate: 91.2, // Mock for now
      total_revenue_generated: totalRevenue,
      active_industries: industrySet.size,
      global_coverage: 73 // Mock percentage
    });
  };

  // Memoized chart data for performance
  const chartData = useMemo(() => ({
    trendVelocityChart: {
      options: {
        chart: {
          type: 'area',
          toolbar: { show: false },
          background: 'transparent'
        },
        stroke: { curve: 'smooth', width: 2 },
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.7,
            opacityTo: 0.2
          }
        },
        colors: ['#3B82F6', '#10B981', '#F59E0B'],
        xaxis: {
          categories: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
          labels: { style: { colors: '#9CA3AF' } }
        },
        yaxis: { labels: { style: { colors: '#9CA3AF' } } },
        grid: { borderColor: '#374151' },
        theme: { mode: 'dark' }
      },
      series: [
        { name: 'New Trends', data: [30, 40, 35, 50, 49, 60, 70] },
        { name: 'Validations', data: [120, 150, 140, 180, 170, 190, 210] },
        { name: 'Viral Alerts', data: [5, 8, 6, 12, 10, 15, 18] }
      ]
    },
    categoryDistribution: {
      options: {
        chart: {
          type: 'donut',
          background: 'transparent'
        },
        labels: ['Tech', 'Fashion', 'Finance', 'Health', 'Entertainment', 'Other'],
        colors: ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#6B7280'],
        plotOptions: {
          pie: {
            donut: {
              size: '65%',
              labels: {
                show: true,
                name: { color: '#fff' },
                value: { color: '#9CA3AF' }
              }
            }
          }
        },
        legend: {
          position: 'bottom',
          labels: { colors: '#9CA3AF' }
        },
        theme: { mode: 'dark' }
      },
      series: [25, 20, 18, 15, 12, 10]
    }
  }), []);

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* AI-Powered Insights Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Brain className="w-10 h-10" />
                WaveSight Intelligence Engine™
              </h2>
              <p className="text-xl text-white/90">Real-time trend analytics powered by advanced ML algorithms</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold">{advancedStats.ai_accuracy.toFixed(1)}%</div>
              <div className="text-sm text-white/70">AI Accuracy Rate</div>
            </div>
          </div>
          
          {/* Key Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/30"
            >
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8" />
                <span className="text-3xl font-bold">{advancedStats.total_validated_trends}</span>
              </div>
              <p className="text-sm">Active Trends</p>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUp className="w-3 h-3 text-green-300" />
                <span className="text-xs text-green-300">+{advancedStats.trends_today} today</span>
              </div>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/30"
            >
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8" />
                <span className="text-3xl font-bold">${(advancedStats.market_value / 1000000).toFixed(1)}M</span>
              </div>
              <p className="text-sm">Market Value</p>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUp className="w-3 h-3 text-green-300" />
                <span className="text-xs text-green-300">{advancedStats.roi_percentage.toFixed(0)}% ROI</span>
              </div>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/30"
            >
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-8 h-8" />
                <span className="text-3xl font-bold">{advancedStats.viral_probability.toFixed(0)}%</span>
              </div>
              <p className="text-sm">Viral Probability</p>
              <div className="flex items-center gap-1 mt-1">
                <Activity className="w-3 h-3 text-yellow-300" />
                <span className="text-xs text-yellow-300">{advancedStats.trend_velocity}/hr</span>
              </div>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/30"
            >
              <div className="flex items-center justify-between mb-2">
                <Globe className="w-8 h-8" />
                <span className="text-3xl font-bold">{advancedStats.global_coverage}%</span>
              </div>
              <p className="text-sm">Global Coverage</p>
              <div className="flex items-center gap-1 mt-1">
                <Users className="w-3 h-3 text-blue-300" />
                <span className="text-xs text-blue-300">{advancedStats.active_industries} industries</span>
              </div>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/30"
            >
              <div className="flex items-center justify-between mb-2">
                <Network className="w-8 h-8" />
                <span className="text-3xl font-bold">{advancedStats.total_spotters}</span>
              </div>
              <p className="text-sm">Active Spotters</p>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUp className="w-3 h-3 text-green-300" />
                <span className="text-xs text-green-300">+{advancedStats.network_growth}%</span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Predictive Alerts Section */}
      {predictiveAlerts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gray-900 rounded-xl p-6 border border-gray-800"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-yellow-500" />
              Predictive Alerts
            </h3>
            <span className="text-sm text-gray-500">AI-Generated Insights</span>
          </div>
          
          <div className="space-y-3">
            {predictiveAlerts.slice(0, 3).map((alert) => (
              <motion.div 
                key={alert.id}
                whileHover={{ x: 5 }}
                className={`p-4 rounded-lg border ${
                  alert.urgency === 'critical' ? 'bg-red-900/20 border-red-800' :
                  alert.urgency === 'high' ? 'bg-orange-900/20 border-orange-800' :
                  alert.urgency === 'medium' ? 'bg-yellow-900/20 border-yellow-800' :
                  'bg-blue-900/20 border-blue-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {alert.type === 'viral' && <Rocket className="w-4 h-4 text-green-500" />}
                      {alert.type === 'declining' && <TrendingDown className="w-4 h-4 text-red-500" />}
                      {alert.type === 'emerging' && <Sparkles className="w-4 h-4 text-yellow-500" />}
                      {alert.type === 'opportunity' && <Target className="w-4 h-4 text-blue-500" />}
                      <span className="font-semibold">{alert.title}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        alert.urgency === 'critical' ? 'bg-red-800 text-red-200' :
                        alert.urgency === 'high' ? 'bg-orange-800 text-orange-200' :
                        alert.urgency === 'medium' ? 'bg-yellow-800 text-yellow-200' :
                        'bg-blue-800 text-blue-200'
                      }`}>
                        {alert.urgency.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{alert.description}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-500">Impact: {alert.potential_impact}</span>
                      <button className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        Take Action <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Live Trend Stream with ML Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Intelligence Feed</h2>
                    <p className="text-sm text-gray-600">ML-Enhanced Trend Analysis</p>
                  </div>
                </div>
                
                {isLive && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-600">Live Analysis</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 space-y-4 max-h-[800px] overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {trends.slice(0, 10).map((trend, index) => (
                  <motion.div
                    key={trend.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => setSelectedTrend(trend)}
                  >
                    <div className="flex gap-4">
                      {(trend.thumbnail_url || trend.screenshot_url) && (
                        <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                          <img 
                            src={trend.thumbnail_url || trend.screenshot_url} 
                            alt="Trend"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full text-xs font-medium capitalize">
                                {trend.category.replace('_', ' ')}
                              </span>
                              {trend.ai_insights && trend.ai_insights.virality_score > 0.8 && (
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
                                  <Rocket className="w-3 h-3" />
                                  High Viral Potential
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(trend.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                              {trend.description}
                            </h3>
                          </div>
                        </div>
                        
                        {/* AI Insights Panel */}
                        {trend.ai_insights && (
                          <div className="bg-white rounded-lg p-3 mb-3">
                            <div className="grid grid-cols-4 gap-3">
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Virality Score</p>
                                <div className="flex items-center gap-1">
                                  <Gauge className="w-4 h-4 text-purple-500" />
                                  <span className="text-lg font-bold text-gray-900">
                                    {(trend.ai_insights.virality_score * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Confidence</p>
                                <div className="flex items-center gap-1">
                                  <Brain className="w-4 h-4 text-blue-500" />
                                  <span className="text-lg font-bold text-gray-900">
                                    {(trend.ai_insights.confidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Peak Date</p>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4 text-green-500" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {format(new Date(trend.ai_insights.predicted_peak), 'MMM d')}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Market Impact</p>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4 text-green-500" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {trend.ai_insights.market_impact}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Recommended Actions */}
                            {trend.ai_insights.recommended_actions && trend.ai_insights.recommended_actions.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <p className="text-xs text-gray-600 mb-1">AI Recommendations:</p>
                                <div className="flex flex-wrap gap-2">
                                  {trend.ai_insights.recommended_actions.slice(0, 3).map((action, idx) => (
                                    <span key={idx} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                      {action}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Financial Metrics */}
                        {trend.financial_metrics && (
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-green-600" />
                              <span className="font-medium">${(trend.financial_metrics.potential_revenue / 1000).toFixed(0)}K</span>
                              <span className="text-gray-500">potential</span>
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded ${
                              trend.financial_metrics.risk_level === 'low' ? 'bg-green-100 text-green-700' :
                              trend.financial_metrics.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              <Shield className="w-3 h-3" />
                              <span className="text-xs">{trend.financial_metrics.risk_level} risk</span>
                            </div>
                            {trend.financial_metrics.investment_opportunity && (
                              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                Investment Opp
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Real-Time Analytics Sidebar */}
        <div className="space-y-6">
          {/* Real-Time Metrics */}
          {realTimeMetrics && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Live Metrics
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Trends/Min</span>
                    <span className="text-2xl font-bold text-gray-900">{realTimeMetrics.trends_per_minute}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, realTimeMetrics.trends_per_minute * 10)}%` }}
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Validation Velocity</span>
                    <span className="text-2xl font-bold text-gray-900">{realTimeMetrics.validation_velocity}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, realTimeMetrics.validation_velocity)}%` }}
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Market Momentum</span>
                    <span className="text-2xl font-bold text-gray-900">{realTimeMetrics.market_momentum.toFixed(1)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, realTimeMetrics.market_momentum * 10)}%` }}
                      className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-purple-600" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowMLPanel(true)}
                className="w-full p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5" />
                  <span className="font-medium">ML Analytics</span>
                </div>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button
                onClick={() => setShowExportModal(true)}
                className="w-full p-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5" />
                  <span className="font-medium">Export Report</span>
                </div>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <Link
                href="/enterprise/api"
                className="w-full p-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <Code className="w-5 h-5" />
                  <span className="font-medium">API Access</span>
                </div>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>

          {/* Trend Velocity Chart */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <LineChart className="w-5 h-5 text-green-600" />
              24h Velocity
            </h3>
            {typeof window !== 'undefined' && (
              <Chart
                options={chartData.trendVelocityChart.options}
                series={chartData.trendVelocityChart.series}
                type="area"
                height={200}
              />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <motion.div className="text-center">
          <WaveSightLogo size="lg" />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-t-2 border-b-2 border-blue-500 rounded-full mx-auto mt-8"
          />
          <p className="text-white mt-4">Initializing Intelligence Engine...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Hidden audio element for notifications */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />
      
      {/* Premium Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <WaveSightLogo size="md" />
              <div className="hidden lg:block">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Enterprise Intelligence Suite
                </h1>
                <p className="text-sm text-gray-600">Powered by Advanced Machine Learning</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Live Status Indicator */}
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-full border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-700">System Active</span>
                <span className="text-xs text-green-600">{advancedStats.ai_accuracy}% accuracy</span>
              </div>
              
              <EnterpriseViewSwitcher />
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowExportModal(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Intelligence
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: PieChart },
              { id: 'analytics', label: 'ML Analytics', icon: Brain },
              { id: 'predictions', label: 'Predictions', icon: Sparkles },
              { id: 'network', label: 'Spotter Network', icon: Network }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`px-6 py-3 flex items-center gap-2 border-b-2 transition-all ${
                  activeView === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Controls Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Advanced Search */}
            <div className="flex-1 min-w-[400px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search trends, categories, AI insights, or predictions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors">
                  Advanced
                </button>
              </div>
            </div>
            
            {/* Time Range Selector */}
            <select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="realtime">Real-Time</option>
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24h</option>
              <option value="7d">Last Week</option>
              <option value="30d">Last Month</option>
              <option value="all">All Time</option>
            </select>

            {/* Category Filter with ML Suggestions */}
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="tech">Technology</option>
              <option value="fashion">Fashion</option>
              <option value="finance">Finance</option>
              <option value="health">Health & Wellness</option>
              <option value="entertainment">Entertainment</option>
              <option value="food">Food & Beverage</option>
              <option value="sports">Sports</option>
              <option value="travel">Travel</option>
            </select>
            
            {/* Live Controls */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setIsLive(!isLive)}
                className={`p-2 rounded-lg transition-colors ${
                  isLive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {isLive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg transition-colors ${
                  soundEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              
              <button
                onClick={fetchEnhancedData}
                className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowMLPanel(!showMLPanel)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2"
              >
                <Brain className="w-4 h-4" />
                ML Panel
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Based on Active View */}
        {activeView === 'overview' && renderOverviewTab()}
        {activeView === 'analytics' && showMLPanel && <MLAnalytics />}
        {activeView === 'predictions' && <TrendIntelligenceHub />}
        {activeView === 'network' && <IndustryDashboard />}
      </div>

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <ExportReportModal 
            onClose={() => setShowExportModal(false)}
            trends={trends}
            stats={advancedStats}
            timeframe={timeframe}
          />
        )}
      </AnimatePresence>

      {/* Selected Trend Detail Modal */}
      <AnimatePresence>
        {selectedTrend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedTrend(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedTrend.description}</h2>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {selectedTrend.category}
                    </span>
                    <span className="text-sm text-gray-500">
                      Spotted {formatDistanceToNow(new Date(selectedTrend.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTrend(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              {/* Detailed Analytics */}
              {selectedTrend.ai_insights && (
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      AI Predictions
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Virality Score</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {(selectedTrend.ai_insights.virality_score * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Predicted Peak</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {format(new Date(selectedTrend.ai_insights.predicted_peak), 'MMMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Expected Duration</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedTrend.ai_insights.expected_duration} days
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedTrend.financial_metrics && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        Financial Impact
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600">Potential Revenue</p>
                          <p className="text-2xl font-bold text-green-600">
                            ${(selectedTrend.financial_metrics.potential_revenue / 1000).toFixed(0)}K
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Market Cap Impact</p>
                          <p className="text-lg font-semibold text-gray-900">
                            ${(selectedTrend.financial_metrics.market_cap_impact / 1000000).toFixed(1)}M
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Risk Level</p>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            selectedTrend.financial_metrics.risk_level === 'low' ? 'bg-green-100 text-green-700' :
                            selectedTrend.financial_metrics.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {selectedTrend.financial_metrics.risk_level.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Similar Historical Trends */}
              {selectedTrend.ai_insights?.similar_historical_trends && 
               selectedTrend.ai_insights.similar_historical_trends.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" />
                    Similar Historical Trends
                  </h3>
                  <div className="space-y-3">
                    {selectedTrend.ai_insights.similar_historical_trends.map((trend, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-900 mb-2">{trend.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>ROI: {trend.roi}%</span>
                          <span>Peak: {trend.peak_reached}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all">
                  Create Campaign
                </button>
                <button className="flex-1 py-3 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                  Add to Watchlist
                </button>
                <button className="flex-1 py-3 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                  Share Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}