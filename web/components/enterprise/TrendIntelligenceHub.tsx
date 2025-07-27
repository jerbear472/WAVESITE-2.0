'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Flame, Zap, Globe, Filter, RefreshCw, ArrowUp, ArrowDown, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { TrendAnalyticsDrilldown } from './TrendAnalyticsDrilldown';

interface Trend {
  id: string;
  title: string;
  description: string;
  category: string;
  velocity: number;
  sentiment: number;
  geographic_origin: string;
  first_spotted: string;
  current_phase: 'emerging' | 'growing' | 'viral' | 'declining';
  validation_score: number;
  engagement_count: number;
  predicted_peak: string;
  sources: Array<{
    platform: string;
    url: string;
    engagement: number;
  }>;
}

interface TrendFilter {
  category: string;
  phase: string;
  minVelocity: number;
  timeRange: string;
}

export function TrendIntelligenceHub() {
  const supabase = createClientComponentClient();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
  const [selectedTrendId, setSelectedTrendId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TrendFilter>({
    category: 'all',
    phase: 'all',
    minVelocity: 0,
    timeRange: '24h'
  });
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchTrends();
    
    if (autoRefresh) {
      const interval = setInterval(fetchTrends, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [filters, autoRefresh]);

  const fetchTrends = async () => {
    try {
      let query = supabase
        .from('enterprise_trends')
        .select('*')
        .gte('velocity', filters.minVelocity)
        .order('velocity', { ascending: false })
        .limit(50);

      if (filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters.phase !== 'all') {
        query = query.eq('current_phase', filters.phase);
      }

      // Apply time range filter
      const now = new Date();
      let startDate = new Date();
      switch (filters.timeRange) {
        case '1h':
          startDate.setHours(now.getHours() - 1);
          break;
        case '24h':
          startDate.setHours(now.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
      }
      
      query = query.gte('first_spotted', startDate.toISOString());

      const { data, error } = await query;

      if (error) throw error;

      // Mock enhanced data for demonstration
      const enhancedTrends = (data || []).map(trend => ({
        ...trend,
        velocity: Math.random() * 100,
        sentiment: Math.random() * 2 - 1, // -1 to 1
        engagement_count: Math.floor(Math.random() * 1000000),
        validation_score: Math.random() * 100,
        predicted_peak: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        sources: [
          { platform: 'Twitter', url: '#', engagement: Math.floor(Math.random() * 100000) },
          { platform: 'TikTok', url: '#', engagement: Math.floor(Math.random() * 500000) },
          { platform: 'Reddit', url: '#', engagement: Math.floor(Math.random() * 50000) }
        ]
      }));

      setTrends(enhancedTrends);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'emerging':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'growing':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'viral':
        return <Flame className="w-4 h-4 text-red-400" />;
      case 'declining':
        return <ArrowDown className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.5) return 'text-green-400';
    if (sentiment < -0.5) return 'text-red-400';
    return 'text-yellow-400';
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold">Real-Time Trend Intelligence</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              autoRefresh
                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>{autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}</span>
          </button>
          <button
            onClick={fetchTrends}
            className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-4 border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold">Filters</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="all">All Categories</option>
            <option value="technology">Technology</option>
            <option value="finance">Finance</option>
            <option value="fashion">Fashion</option>
            <option value="entertainment">Entertainment</option>
            <option value="health">Health & Wellness</option>
          </select>

          <select
            value={filters.phase}
            onChange={(e) => setFilters({ ...filters, phase: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="all">All Phases</option>
            <option value="emerging">Emerging</option>
            <option value="growing">Growing</option>
            <option value="viral">Viral</option>
            <option value="declining">Declining</option>
          </select>

          <select
            value={filters.timeRange}
            onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Min Velocity:</label>
            <input
              type="number"
              value={filters.minVelocity}
              onChange={(e) => setFilters({ ...filters, minVelocity: parseInt(e.target.value) || 0 })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white w-20"
              min="0"
              max="100"
            />
          </div>
        </div>
      </div>

      {/* Trends Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-900/50 rounded-xl p-6 animate-pulse">
              <div className="h-6 bg-gray-800 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-800 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-800 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence>
            {trends.map((trend) => (
              <motion.div
                key={trend.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedTrend(trend)}
                className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800 hover:border-cyan-500/50 cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getPhaseIcon(trend.current_phase)}
                      <span className="text-xs text-gray-400 uppercase">{trend.current_phase}</span>
                      <span className="text-xs bg-gray-800 px-2 py-1 rounded">{trend.category}</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{trend.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-2">{trend.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-cyan-400">{trend.velocity.toFixed(1)}</div>
                    <div className="text-xs text-gray-500">velocity</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className={`text-lg font-semibold ${getSentimentColor(trend.sentiment)}`}>
                      {trend.sentiment > 0 ? '+' : ''}{(trend.sentiment * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500">sentiment</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{(trend.engagement_count / 1000).toFixed(0)}K</div>
                    <div className="text-xs text-gray-500">engagements</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{trend.validation_score.toFixed(0)}%</div>
                    <div className="text-xs text-gray-500">validated</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    <span>{trend.geographic_origin}</span>
                  </div>
                  <div>First spotted {format(new Date(trend.first_spotted), 'MMM d, h:mm a')}</div>
                </div>

                {/* Source Indicators */}
                <div className="flex gap-2 mt-4">
                  {trend.sources.map((source, idx) => (
                    <div
                      key={idx}
                      className="text-xs bg-gray-800 px-2 py-1 rounded flex items-center gap-1"
                    >
                      <span>{source.platform}</span>
                      <ArrowUp className="w-3 h-3 text-green-400" />
                    </div>
                  ))}
                {/* Analytics Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTrendId(trend.id);
                  }}
                  className="absolute top-4 right-12 p-2 bg-gray-800/80 backdrop-blur rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Trend Analytics Drilldown */}
      {selectedTrendId && (
        <TrendAnalyticsDrilldown
          trendId={selectedTrendId}
          onClose={() => setSelectedTrendId(null)}
        />
      )}

      {/* Trend Detail Modal */}
      <AnimatePresence>
        {selectedTrend && !selectedTrendId && (
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
              className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-4">{selectedTrend.title}</h2>
              <p className="text-gray-400 mb-6">{selectedTrend.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Predicted Peak</h3>
                  <p className="text-2xl text-cyan-400">
                    {format(new Date(selectedTrend.predicted_peak), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">ROI Potential</h3>
                  <p className="text-2xl text-green-400">
                    {(Math.random() * 500 + 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTrend(null)}
                className="w-full py-3 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}