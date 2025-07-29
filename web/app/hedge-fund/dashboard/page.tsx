'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, BarChart3, Activity, DollarSign, AlertCircle,
  ArrowUpRight, ArrowDownRight, Clock, Filter, Search,
  RefreshCw, Download, Volume2, VolumeX, Play, Pause,
  Building2, Zap, Shield, Target, ChevronRight, Globe,
  Eye, Brain, Briefcase, LineChart, PieChart
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface StockSignal {
  ticker: string;
  company: string;
  sector: string;
  signal_count: number;
  average_strength: number;
  max_urgency: string;
  latest_signal: string;
  trend_descriptions: string[];
  signal_types: string[];
}

interface Alert {
  id: string;
  type: string;
  urgency: string;
  title: string;
  message: string;
  relevance_score: number;
  trend: {
    description: string;
    category: string;
    validation_count: number;
  };
  affected_stocks?: {
    ticker: string;
    company: string;
    signal_type: string;
    direction: string;
  }[];
  created_at: string;
}

interface SectorMomentum {
  sector: string;
  signal_count: number;
  average_strength: number;
  bullish_signals: number;
  bearish_signals: number;
  momentum_direction: string;
  momentum_score: number;
}

export default function HedgeFundDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trendingStocks, setTrendingStocks] = useState<StockSignal[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sectorMomentum, setSectorMomentum] = useState<SectorMomentum[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      
      if (isLive) {
        intervalRef.current = setInterval(() => {
          refreshData();
        }, 30000); // Refresh every 30 seconds
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, selectedTimeframe, selectedSector, isLive]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Get API key for the user
      const apiKeyResponse = await fetch('/api/v1/hedge-fund/get-api-key', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`
        }
      });
      
      if (apiKeyResponse.ok) {
        const { api_key } = await apiKeyResponse.json();
        setApiKey(api_key);
        
        // Load all data in parallel
        await Promise.all([
          loadTrendingStocks(api_key),
          loadAlerts(api_key),
          loadSectorMomentum(api_key)
        ]);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingStocks = async (apiKey: string) => {
    const params = new URLSearchParams({
      timeframe: selectedTimeframe,
      limit: '20',
      min_relevance: '70'
    });
    
    if (selectedSector) {
      params.append('sector', selectedSector);
    }

    const response = await fetch(`/api/v1/hedge-fund/trending-stocks?${params}`, {
      headers: {
        'X-API-Key': apiKey
      }
    });

    if (response.ok) {
      const data = await response.json();
      setTrendingStocks(data.trending_stocks);
    }
  };

  const loadAlerts = async (apiKey: string) => {
    const response = await fetch('/api/v1/hedge-fund/live-alerts?min_urgency=medium', {
      headers: {
        'X-API-Key': apiKey
      }
    });

    if (response.ok) {
      const data = await response.json();
      setAlerts(data.alerts);
      
      // Play sound for new critical alerts
      if (soundEnabled && data.alerts.some((a: Alert) => a.urgency === 'critical')) {
        audioRef.current?.play();
      }
    }
  };

  const loadSectorMomentum = async (apiKey: string) => {
    const response = await fetch(`/api/v1/hedge-fund/sectors/momentum?timeframe=${selectedTimeframe}`, {
      headers: {
        'X-API-Key': apiKey
      }
    });

    if (response.ok) {
      const data = await response.json();
      setSectorMomentum(data.sector_momentum);
    }
  };

  const refreshData = () => {
    if (apiKey) {
      loadTrendingStocks(apiKey);
      loadAlerts(apiKey);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDirectionIcon = (direction: string) => {
    if (direction === 'bullish') return <ArrowUpRight className="w-4 h-4 text-green-600" />;
    if (direction === 'bearish') return <ArrowDownRight className="w-4 h-4 text-red-600" />;
    return <span className="w-4 h-4 text-gray-400">—</span>;
  };

  const filteredStocks = trendingStocks.filter(stock => 
    searchQuery === '' || 
    stock.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-t-2 border-b-2 border-cyan-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hidden audio for alerts */}
      <audio ref={audioRef} src="/alert-sound.mp3" preload="auto" />

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-cyan-500" />
                <div>
                  <h1 className="text-2xl font-bold">Hedge Fund Intelligence</h1>
                  <p className="text-sm text-gray-400">AI-Powered Social Trend Analysis</p>
                </div>
              </div>
              
              {/* Live indicator */}
              <div className="flex items-center gap-2 px-4 py-2 bg-green-900/30 rounded-full border border-green-700">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-400">Live Feed</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Controls */}
              <button
                onClick={() => setIsLive(!isLive)}
                className={`p-2 rounded-lg transition-colors ${
                  isLive ? 'bg-cyan-900/30 text-cyan-400' : 'bg-gray-700 text-gray-400'
                }`}
              >
                {isLive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg transition-colors ${
                  soundEnabled ? 'bg-cyan-900/30 text-cyan-400' : 'bg-gray-700 text-gray-400'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              
              <button
                onClick={refreshData}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              
              <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-medium flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-cyan-500" />
              <span className="text-2xl font-bold">{trendingStocks.length}</span>
            </div>
            <p className="text-gray-400">Active Signals</p>
            <p className="text-sm text-green-400 mt-1">+12% from yesterday</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <AlertCircle className="w-8 h-8 text-orange-500" />
              <span className="text-2xl font-bold">{alerts.filter(a => a.urgency === 'high' || a.urgency === 'critical').length}</span>
            </div>
            <p className="text-gray-400">High Priority Alerts</p>
            <p className="text-sm text-orange-400 mt-1">Requires attention</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <BarChart3 className="w-8 h-8 text-green-500" />
              <span className="text-2xl font-bold">{sectorMomentum.filter(s => s.momentum_direction === 'bullish').length}</span>
            </div>
            <p className="text-gray-400">Bullish Sectors</p>
            <p className="text-sm text-green-400 mt-1">Positive momentum</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-purple-500" />
              <span className="text-2xl font-bold">$2.4M</span>
            </div>
            <p className="text-gray-400">Est. Market Impact</p>
            <p className="text-sm text-purple-400 mt-1">Last 24 hours</p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search tickers or companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <select 
              value={selectedTimeframe} 
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7 Days</option>
            </select>

            <select 
              value={selectedSector || ''} 
              onChange={(e) => setSelectedSector(e.target.value || null)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Sectors</option>
              <option value="Technology">Technology</option>
              <option value="Consumer Discretionary">Consumer Discretionary</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Financials">Financials</option>
              <option value="Communication Services">Communication Services</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trending Stocks */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-cyan-500" />
                  Trending Stock Signals
                </h2>
              </div>
              
              <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {filteredStocks.map((stock, index) => (
                    <motion.div
                      key={stock.ticker}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold">{stock.ticker}</h3>
                            <span className="text-sm text-gray-400">{stock.company}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getUrgencyColor(stock.max_urgency)}`}>
                              {stock.max_urgency.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mb-3">
                            <div>
                              <p className="text-xs text-gray-400">Signals</p>
                              <p className="text-lg font-semibold">{stock.signal_count}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Avg Strength</p>
                              <p className="text-lg font-semibold">{stock.average_strength}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Sector</p>
                              <p className="text-sm">{stock.sector}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-xs text-gray-400">Recent Trends:</p>
                            {stock.trend_descriptions.slice(0, 2).map((desc, i) => (
                              <p key={i} className="text-sm text-gray-300 truncate">• {desc}</p>
                            ))}
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <button className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors opacity-0 group-hover:opacity-100">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Alerts & Sector Momentum */}
          <div className="space-y-6">
            {/* Live Alerts */}
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-orange-500" />
                  Live Alerts
                </h2>
              </div>
              
              <div className="p-6 space-y-3 max-h-[300px] overflow-y-auto">
                {alerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-4 rounded-lg border ${
                      alert.urgency === 'critical' ? 'border-red-600 bg-red-900/20' :
                      alert.urgency === 'high' ? 'border-orange-600 bg-orange-900/20' :
                      'border-gray-600 bg-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{alert.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${getUrgencyColor(alert.urgency)}`}>
                        {alert.urgency}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{alert.message}</p>
                    {alert.affected_stocks && (
                      <div className="flex flex-wrap gap-2">
                        {alert.affected_stocks.map((stock) => (
                          <span key={stock.ticker} className="text-xs px-2 py-1 bg-gray-600 rounded-full">
                            {stock.ticker} {getDirectionIcon(stock.direction)}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Sector Momentum */}
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <PieChart className="w-6 h-6 text-purple-500" />
                  Sector Momentum
                </h2>
              </div>
              
              <div className="p-6 space-y-3">
                {sectorMomentum.slice(0, 5).map((sector) => (
                  <div key={sector.sector} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{sector.sector}</span>
                      <div className="flex items-center gap-2">
                        {sector.momentum_direction === 'bullish' ? 
                          <ArrowUpRight className="w-4 h-4 text-green-500" /> :
                          sector.momentum_direction === 'bearish' ?
                          <ArrowDownRight className="w-4 h-4 text-red-500" /> :
                          <span className="w-4 h-4 text-gray-500">—</span>
                        }
                        <span className={`text-sm font-semibold ${
                          sector.momentum_direction === 'bullish' ? 'text-green-500' :
                          sector.momentum_direction === 'bearish' ? 'text-red-500' :
                          'text-gray-500'
                        }`}>
                          {(sector.momentum_score * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="flex h-full rounded-full overflow-hidden">
                        <div 
                          className="bg-green-500" 
                          style={{ width: `${(sector.bullish_signals / sector.signal_count) * 100}%` }}
                        />
                        <div 
                          className="bg-red-500" 
                          style={{ width: `${(sector.bearish_signals / sector.signal_count) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{sector.bullish_signals} bullish</span>
                      <span>{sector.bearish_signals} bearish</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}