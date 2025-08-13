'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { subscriptionService } from '@/lib/subscriptionService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Filter, Download, Eye, BarChart, Bell,
  Globe, Tag, AlertCircle, FileText, MapPin, RefreshCw,
  Users, Clock, ChevronRight, Sparkles, Activity,
  Calendar, Target, Zap, ArrowUpRight, Plus, Settings
} from 'lucide-react';
import { format, formatDistanceToNow, subWeeks } from 'date-fns';
import Link from 'next/link';
import WaveSightLogo from '@/components/WaveSightLogo';

interface ProTrend {
  id: string;
  description: string;
  category: string;
  validation_ratio: number;
  validation_count: number;
  created_at: string;
  region?: string;
  persona_segments?: string[];
  screenshot_url?: string;
  predicted_mainstream_date?: string;
  velocity?: number;
  momentum_score?: number;
}

interface PersonaSegment {
  id: string;
  name: string;
  adoption_rate: number;
  trend_affinity: number;
}

interface PredictiveAlert {
  id: string;
  trend_id: string;
  alert_type: 'mainstream_prediction' | 'velocity_spike' | 'persona_shift';
  message: string;
  confidence: number;
  predicted_date?: string;
}

export default function ProfessionalDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<ProTrend[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [updateFrequency, setUpdateFrequency] = useState<'daily' | 'weekly'>('daily');
  const [personaSegments, setPersonaSegments] = useState<PersonaSegment[]>([]);
  const [predictiveAlerts, setPredictiveAlerts] = useState<PredictiveAlert[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['us', 'uk', 'jp']);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout>();

  const PRO_CATEGORIES = [
    'fashion', 'food', 'memes', 'music', 'tech',
    'sports', 'beauty', 'automotive', 'wellness',
    'entertainment', 'finance', 'health', 'travel', 'lifestyle'
  ];

  useEffect(() => {
    if (user) {
      checkSubscription();
      fetchProData();
      
      if (isLiveMode && updateFrequency === 'daily') {
        intervalRef.current = setInterval(() => {
          fetchNewTrends();
        }, 60000); // Update every minute for "daily" mode
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, selectedCategory, updateFrequency, isLiveMode]);

  const checkSubscription = async () => {
    if (!user) return;
    
    const tier = await subscriptionService.getUserTier(user.id);
    if (tier !== 'professional' && tier !== 'enterprise') {
      window.location.href = '/pricing';
      return;
    }
  };

  const fetchProData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch trends with advanced filters
      let query = supabase
        .from('trend_submissions')
        .select('*')
        .gt('validation_ratio', 0.6)
        .order('created_at', { ascending: false })
        .limit(100);

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      } else {
        query = query.in('category', PRO_CATEGORIES);
      }

      const { data: trendsData, error } = await query;

      if (error) throw error;

      // Calculate advanced metrics for each trend
      const enhancedTrends = (trendsData || []).map(trend => {
        const hoursSinceCreation = (Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60);
        const velocity = trend.validation_count / Math.max(1, hoursSinceCreation);
        
        // Predict mainstream date based on velocity
        const weeksToMainstream = Math.max(1, Math.round(10 / velocity));
        const predictedDate = new Date();
        predictedDate.setDate(predictedDate.getDate() + (weeksToMainstream * 7));
        
        return {
          ...trend,
          velocity,
          momentum_score: velocity * trend.validation_ratio,
          predicted_mainstream_date: predictedDate.toISOString()
        };
      });

      setTrends(enhancedTrends);

      // Generate predictive alerts
      const alerts: PredictiveAlert[] = enhancedTrends
        .filter(t => t.velocity > 5 || t.validation_ratio > 0.8)
        .slice(0, 5)
        .map(trend => ({
          id: `alert-${trend.id}`,
          trend_id: trend.id,
          alert_type: trend.velocity > 10 ? 'velocity_spike' : 'mainstream_prediction',
          message: trend.velocity > 10 
            ? `"${trend.description}" showing explosive growth - ${trend.velocity.toFixed(1)} validations/hour`
            : `"${trend.description}" likely to cross into mainstream in ${Math.round((new Date(trend.predicted_mainstream_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`,
          confidence: trend.validation_ratio,
          predicted_date: trend.predicted_mainstream_date
        }));

      setPredictiveAlerts(alerts);

      // Fetch persona segments
      fetchPersonaSegments();

      // Log feature access
      await subscriptionService.logFeatureAccess(user.id, 'professional_dashboard', 'view', {
        category: selectedCategory,
        update_frequency: updateFrequency
      });

    } catch (error) {
      console.error('Error fetching pro data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonaSegments = async () => {
    // Simulate persona segment data
    const segments: PersonaSegment[] = [
      { id: '1', name: 'Early Adopters', adoption_rate: 0.85, trend_affinity: 0.92 },
      { id: '2', name: 'Tech Enthusiasts', adoption_rate: 0.78, trend_affinity: 0.88 },
      { id: '3', name: 'Fashion Forward', adoption_rate: 0.72, trend_affinity: 0.85 },
      { id: '4', name: 'Mainstream Users', adoption_rate: 0.45, trend_affinity: 0.60 },
      { id: '5', name: 'Late Majority', adoption_rate: 0.25, trend_affinity: 0.35 }
    ];
    setPersonaSegments(segments);
  };

  const fetchNewTrends = async () => {
    if (!user) return;
    
    try {
      const { data: newTrends } = await supabase
        .from('trend_submissions')
        .select('*')
        .gt('validation_ratio', 0.6)
        .order('created_at', { ascending: false })
        .limit(10);

      if (newTrends && newTrends.length > 0) {
        const enhancedNewTrends = newTrends.map(trend => {
          const hoursSinceCreation = (Date.now() - new Date(trend.created_at).getTime()) / (1000 * 60 * 60);
          const velocity = trend.validation_count / Math.max(1, hoursSinceCreation);
          
          return {
            ...trend,
            velocity,
            momentum_score: velocity * trend.validation_ratio
          };
        });

        setTrends(prevTrends => {
          const combined = [...enhancedNewTrends, ...prevTrends];
          const unique = Array.from(new Map(combined.map(t => [t.id, t])).values());
          return unique.slice(0, 100);
        });
      }
    } catch (error) {
      console.error('Error fetching new trends:', error);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'xlsx' | 'json') => {
    if (!user) return;

    try {
      await subscriptionService.logFeatureAccess(user.id, 'export_report', 'export', {
        format,
        trend_count: trends.length
      });

      if (format === 'json') {
        const jsonData = JSON.stringify(trends, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wavesight-pro-trends-${format(new Date(), 'yyyy-MM-dd')}.json`;
        a.click();
      } else if (format === 'csv') {
        const csvContent = [
          ['Trend', 'Category', 'Confidence', 'Validations', 'Velocity', 'Predicted Mainstream', 'Date'],
          ...trends.map(t => [
            t.description,
            t.category,
            `${(t.validation_ratio * 100).toFixed(1)}%`,
            t.validation_count.toString(),
            t.velocity?.toFixed(1) || '0',
            t.predicted_mainstream_date ? format(new Date(t.predicted_mainstream_date), 'yyyy-MM-dd') : 'N/A',
            format(new Date(t.created_at), 'yyyy-MM-dd')
          ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wavesight-pro-trends-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const getCategoryEmoji = (category: string) => {
    const emojiMap: { [key: string]: string } = {
      'fashion': '👗', 'food': '🍔', 'memes': '😂', 'music': '🎵', 'tech': '💻',
      'sports': '⚽', 'beauty': '💄', 'automotive': '🚗', 'wellness': '🧘',
      'entertainment': '🎭', 'finance': '💳', 'health': '💪', 'travel': '✈️', 'lifestyle': '🌟'
    };
    return emojiMap[category] || '📊';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <motion.div className="text-center">
          <WaveSightLogo size="lg"  />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-t-2 border-purple-500 rounded-full mx-auto mt-6"
          />
          <p className="text-gray-600 mt-4">Loading Professional Dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <WaveSightLogo size="md"  />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">WaveSight Pro</h1>
                <p className="text-sm text-gray-600">Real-time trend intelligence & predictive analytics</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">Pro Plan</span>
              </div>
              <Link href="/enterprise/dashboard" className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                Upgrade to Apex <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Predictive Alerts */}
        {predictiveAlerts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <Bell className="w-5 h-5" />
                <h3 className="font-bold">Predictive Alerts</h3>
              </div>
              <div className="space-y-2">
                {predictiveAlerts.slice(0, 3).map(alert => (
                  <motion.div 
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white/20 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {alert.alert_type === 'velocity_spike' ? (
                        <Zap className="w-4 h-4 text-yellow-300" />
                      ) : (
                        <Target className="w-4 h-4 text-green-300" />
                      )}
                      <p className="text-sm">{alert.message}</p>
                    </div>
                    <span className="text-xs bg-white/30 px-2 py-1 rounded">
                      {(alert.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Controls Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Category Filter */}
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories</option>
              {PRO_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {getCategoryEmoji(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>

            {/* Update Frequency */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <select 
                value={updateFrequency} 
                onChange={(e) => setUpdateFrequency(e.target.value as 'daily' | 'weekly')}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="daily">Daily Updates</option>
                <option value="weekly">Weekly Updates</option>
              </select>
            </div>

            {/* Custom Tags */}
            <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Custom Tag
            </button>

            {/* Export Options */}
            <div className="flex gap-2 ml-auto">
              {['csv', 'xlsx', 'json', 'pdf'].map(format => (
                <button
                  key={format}
                  onClick={() => handleExport(format as any)}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trends Stream */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Real-Time Trend Feed</h3>
                <div className="flex items-center gap-2">
                  {isLiveMode && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm text-gray-600">Live</span>
                    </div>
                  )}
                  <button
                    onClick={() => fetchProData()}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {trends.slice(0, 20).map((trend, index) => (
                  <motion.div
                    key={trend.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xl">{getCategoryEmoji(trend.category)}</span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium capitalize">
                            {trend.category}
                          </span>
                          {trend.velocity && trend.velocity > 5 && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                              🔥 Hot
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-2">{trend.description}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{(trend.validation_ratio * 100).toFixed(0)}% confidence</span>
                          <span>{trend.validation_count} validations</span>
                          {trend.velocity && (
                            <span>{trend.velocity.toFixed(1)}/hr velocity</span>
                          )}
                          {trend.predicted_mainstream_date && (
                            <span>
                              Mainstream in {Math.round((new Date(trend.predicted_mainstream_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Persona Deep Dives */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Persona Deep Dives
              </h3>
              <div className="space-y-3">
                {personaSegments.map(segment => (
                  <div key={segment.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{segment.name}</span>
                      <span className="text-xs text-gray-600">
                        {(segment.trend_affinity * 100).toFixed(0)}% affinity
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${segment.adoption_rate * 100}%` }}
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {(segment.adoption_rate * 100).toFixed(0)}% adoption rate
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Regional Comparison */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                Regional Comparison
              </h3>
              <div className="space-y-3">
                {[
                  { region: 'United States', emoji: '🇺🇸', trends: 45, growth: 12 },
                  { region: 'United Kingdom', emoji: '🇬🇧', trends: 32, growth: 8 },
                  { region: 'Japan', emoji: '🇯🇵', trends: 28, growth: 15 },
                  { region: 'Germany', emoji: '🇩🇪', trends: 21, growth: 6 },
                  { region: 'Brazil', emoji: '🇧🇷', trends: 19, growth: 18 }
                ].map(region => (
                  <div key={region.region} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{region.emoji}</span>
                      <div>
                        <p className="font-medium text-gray-900">{region.region}</p>
                        <p className="text-xs text-gray-600">{region.trends} active trends</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${region.growth > 10 ? 'text-green-600' : 'text-gray-600'}`}>
                        +{region.growth}%
                      </p>
                      <p className="text-xs text-gray-500">growth</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}