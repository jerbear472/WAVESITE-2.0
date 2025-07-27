'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Globe, Users, MapPin, Hash, Share2, 
  ArrowUp, ArrowDown, Clock, Activity, BarChart3,
  Twitter, Instagram, Youtube, Facebook, Linkedin,
  ChevronRight, X, Sparkles, Target, AlertCircle
} from 'lucide-react';
import { Line, Area, Bar, Radar, Scatter } from 'recharts';
import { 
  LineChart, AreaChart, BarChart, RadarChart, ScatterChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Cell, ReferenceLine
} from 'recharts';

interface TrendData {
  id: string;
  name: string;
  category: string;
  velocity: number;
  engagement: {
    total: number;
    growth: number;
    byPlatform: {
      twitter: number;
      tiktok: number;
      instagram: number;
      youtube: number;
      reddit: number;
    };
  };
  demographics: {
    age: { '13-17': number; '18-24': number; '25-34': number; '35-44': number; '45+': number };
    gender: { male: number; female: number; other: number };
    interests: string[];
  };
  geographic: {
    countries: Array<{ code: string; name: string; intensity: number }>;
    cities: Array<{ name: string; country: string; intensity: number }>;
  };
  timeline: Array<{ date: string; engagement: number; sentiment: number }>;
  relatedTrends: Array<{ id: string; name: string; similarity: number }>;
  culturalPosition: { x: number; y: number }; // x: subculture(-1) to mass(1), y: positive(-1) to polarizing(1)
}

interface Props {
  trendId: string;
  onClose: () => void;
}

export function TrendAnalyticsDrilldown({ trendId, onClose }: Props) {
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [selectedView, setSelectedView] = useState<'overview' | 'geographic' | 'demographic' | 'cultural'>('overview');

  useEffect(() => {
    // Simulate fetching detailed trend data
    const mockData: TrendData = {
      id: trendId,
      name: 'AI-Generated Fashion',
      category: 'Technology x Fashion',
      velocity: 287,
      engagement: {
        total: 4500000,
        growth: 156,
        byPlatform: {
          twitter: 1200000,
          tiktok: 2100000,
          instagram: 800000,
          youtube: 300000,
          reddit: 100000
        }
      },
      demographics: {
        age: { '13-17': 8, '18-24': 42, '25-34': 31, '35-44': 14, '45+': 5 },
        gender: { male: 35, female: 60, other: 5 },
        interests: ['Fashion', 'Technology', 'Art', 'Sustainability', 'Design']
      },
      geographic: {
        countries: [
          { code: 'US', name: 'United States', intensity: 92 },
          { code: 'UK', name: 'United Kingdom', intensity: 78 },
          { code: 'JP', name: 'Japan', intensity: 85 },
          { code: 'KR', name: 'South Korea', intensity: 88 },
          { code: 'FR', name: 'France', intensity: 72 }
        ],
        cities: [
          { name: 'New York', country: 'US', intensity: 95 },
          { name: 'Los Angeles', country: 'US', intensity: 88 },
          { name: 'Tokyo', country: 'JP', intensity: 92 },
          { name: 'Seoul', country: 'KR', intensity: 90 },
          { name: 'London', country: 'UK', intensity: 85 }
        ]
      },
      timeline: generateTimelineData(30),
      relatedTrends: [
        { id: '1', name: 'Virtual Fashion Shows', similarity: 0.89 },
        { id: '2', name: 'AI Art Generators', similarity: 0.82 },
        { id: '3', name: 'Sustainable Tech Fashion', similarity: 0.76 },
        { id: '4', name: 'Digital Clothing NFTs', similarity: 0.71 },
        { id: '5', name: 'Metaverse Wearables', similarity: 0.68 }
      ],
      culturalPosition: { x: -0.3, y: 0.6 } // Slightly subcultural, moderately polarizing
    };
    setTrendData(mockData);
  }, [trendId]);

  function generateTimelineData(days: number) {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        engagement: Math.floor(Math.random() * 200000 + 100000),
        sentiment: Math.random() * 2 - 1
      });
    }
    return data;
  }

  const platformIcons = {
    twitter: <Twitter className="w-4 h-4" />,
    tiktok: <Hash className="w-4 h-4" />,
    instagram: <Instagram className="w-4 h-4" />,
    youtube: <Youtube className="w-4 h-4" />,
    reddit: <Share2 className="w-4 h-4" />
  };

  const platformColors = {
    twitter: '#1DA1F2',
    tiktok: '#000000',
    instagram: '#E4405F',
    youtube: '#FF0000',
    reddit: '#FF4500'
  };

  if (!trendData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Growth Sparkline */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-800/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Engagement Over Time</h3>
          <div className="flex gap-2">
            {['24h', '7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-3 py-1 rounded-lg text-sm transition-all ${
                  selectedTimeRange === range
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData.timeline}>
            <defs>
              <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Area 
              type="monotone" 
              dataKey="engagement" 
              stroke="#06b6d4" 
              fillOpacity={1} 
              fill="url(#engagementGradient)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Platform Breakdown */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-800/50">
        <h3 className="text-xl font-semibold mb-4">Engagement by Platform</h3>
        <div className="space-y-4">
          {Object.entries(trendData.engagement.byPlatform).map(([platform, engagement]) => {
            const percentage = (engagement / trendData.engagement.total) * 100;
            return (
              <div key={platform} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-32">
                  <div style={{ color: platformColors[platform as keyof typeof platformColors] }}>
                    {platformIcons[platform as keyof typeof platformIcons]}
                  </div>
                  <span className="capitalize">{platform}</span>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-800 rounded-full h-8 relative overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="absolute inset-y-0 left-0 rounded-full flex items-center justify-end px-3"
                      style={{ backgroundColor: platformColors[platform as keyof typeof platformColors] }}
                    >
                      <span className="text-xs font-medium text-white">
                        {(engagement / 1000000).toFixed(1)}M
                      </span>
                    </motion.div>
                  </div>
                </div>
                <div className="text-sm text-gray-400 w-16 text-right">
                  {percentage.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Related Trends Clustering */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-800/50">
        <h3 className="text-xl font-semibold mb-4">Related Trends (Cosine Similarity)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {trendData.relatedTrends.map((trend) => (
            <motion.div
              key={trend.id}
              whileHover={{ scale: 1.02 }}
              className="bg-gray-800/50 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800/70 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                <span className="font-medium">{trend.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-400">Similarity:</div>
                <div className="text-sm font-medium text-cyan-400">{(trend.similarity * 100).toFixed(0)}%</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderGeographic = () => (
    <div className="space-y-6">
      {/* World Map Visualization */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-800/50">
        <h3 className="text-xl font-semibold mb-4">Geographic Virality Map</h3>
        
        {/* Country Intensity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm text-gray-400 mb-3">Top Countries</h4>
            <div className="space-y-3">
              {trendData.geographic.countries.map((country) => (
                <div key={country.code} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-6 bg-gray-700 rounded flex items-center justify-center text-xs">
                      {country.code}
                    </div>
                    <span>{country.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-800 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${country.intensity}%` }}
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
                      />
                    </div>
                    <span className="text-sm text-gray-400 w-12 text-right">{country.intensity}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm text-gray-400 mb-3">Top Cities</h4>
            <div className="space-y-3">
              {trendData.geographic.cities.map((city, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>{city.name}</span>
                    <span className="text-xs text-gray-500">({city.country})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-800 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${city.intensity}%` }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                      />
                    </div>
                    <span className="text-sm text-gray-400 w-12 text-right">{city.intensity}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Regional Velocity */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-800/50">
        <h3 className="text-xl font-semibold mb-4">Regional Velocity Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={[
            { region: 'North America', velocity: 85 },
            { region: 'Europe', velocity: 72 },
            { region: 'Asia Pacific', velocity: 90 },
            { region: 'Latin America', velocity: 45 },
            { region: 'Middle East', velocity: 38 },
            { region: 'Africa', velocity: 25 }
          ]}>
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis dataKey="region" stroke="#9ca3af" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#9ca3af" />
            <Radar name="Velocity" dataKey="velocity" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderDemographic = () => (
    <div className="space-y-6">
      {/* Age Distribution Heatmap */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-800/50">
        <h3 className="text-xl font-semibold mb-4">Demographic Heatmap</h3>
        
        {/* Age Groups */}
        <div className="mb-6">
          <h4 className="text-sm text-gray-400 mb-3">Age Distribution</h4>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(trendData.demographics.age).map(([age, percentage]) => {
              const intensity = percentage / 50; // Normalize to 0-1
              return (
                <div
                  key={age}
                  className="relative rounded-lg p-4 text-center transition-all hover:scale-105"
                  style={{
                    backgroundColor: `rgba(6, 182, 212, ${intensity})`,
                    border: '1px solid rgba(6, 182, 212, 0.3)'
                  }}
                >
                  <div className="text-2xl font-bold mb-1">{percentage}%</div>
                  <div className="text-xs text-gray-300">{age}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gender Distribution */}
        <div className="mb-6">
          <h4 className="text-sm text-gray-400 mb-3">Gender Distribution</h4>
          <div className="flex gap-4">
            {Object.entries(trendData.demographics.gender).map(([gender, percentage]) => (
              <div key={gender} className="flex-1">
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold mb-1 text-cyan-400">{percentage}%</div>
                  <div className="text-sm capitalize">{gender}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interest Tags */}
        <div>
          <h4 className="text-sm text-gray-400 mb-3">Primary Interests</h4>
          <div className="flex flex-wrap gap-2">
            {trendData.demographics.interests.map((interest) => (
              <span
                key={interest}
                className="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full text-sm border border-purple-500/30"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Engagement by Demographics */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-800/50">
        <h3 className="text-xl font-semibold mb-4">Engagement Patterns by Age</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={Object.entries(trendData.demographics.age).map(([age, value]) => ({
            age,
            morning: value * 0.7 + Math.random() * 20,
            afternoon: value * 1.2 + Math.random() * 20,
            evening: value * 1.5 + Math.random() * 20,
            night: value * 0.9 + Math.random() * 20
          }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="age" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Legend />
            <Bar dataKey="morning" fill="#fbbf24" />
            <Bar dataKey="afternoon" fill="#34d399" />
            <Bar dataKey="evening" fill="#60a5fa" />
            <Bar dataKey="night" fill="#a78bfa" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderCultural = () => (
    <div className="space-y-6">
      {/* Cultural Compass */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-800/50">
        <h3 className="text-xl font-semibold mb-4">Cultural Compass Position</h3>
        
        <div className="relative aspect-square max-w-2xl mx-auto">
          {/* Quadrant Background */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            <div className="bg-gradient-to-br from-purple-500/10 to-transparent rounded-tl-2xl border-r border-b border-gray-800"></div>
            <div className="bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-tr-2xl border-l border-b border-gray-800"></div>
            <div className="bg-gradient-to-tr from-pink-500/10 to-transparent rounded-bl-2xl border-r border-t border-gray-800"></div>
            <div className="bg-gradient-to-tl from-emerald-500/10 to-transparent rounded-br-2xl border-l border-t border-gray-800"></div>
          </div>

          {/* Axes */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute w-full h-px bg-gray-700"></div>
            <div className="absolute h-full w-px bg-gray-700"></div>
          </div>

          {/* Labels */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-sm text-gray-400">Positive</div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-gray-400">Polarizing</div>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">Subculture</div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">Mainstream</div>

          {/* Trend Position */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute w-4 h-4 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50"
            style={{
              left: `${50 + trendData.culturalPosition.x * 40}%`,
              top: `${50 - trendData.culturalPosition.y * 40}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="absolute inset-0 bg-cyan-400 rounded-full animate-ping opacity-75"></div>
          </motion.div>

          {/* Other Example Trends */}
          {[
            { name: 'NPC TikTok', x: -0.7, y: 0.8, color: 'bg-red-400' },
            { name: 'Barbiecore', x: 0.8, y: -0.6, color: 'bg-pink-400' },
            { name: 'Quiet Luxury', x: 0.3, y: -0.3, color: 'bg-gray-400' },
            { name: 'AI Art', x: -0.4, y: 0.4, color: 'bg-purple-400' }
          ].map((trend, idx) => (
            <div
              key={idx}
              className={`absolute w-3 h-3 ${trend.color} rounded-full opacity-50`}
              style={{
                left: `${50 + trend.x * 40}%`,
                top: `${50 - trend.y * 40}%`,
                transform: 'translate(-50%, -50%)'
              }}
              title={trend.name}
            ></div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Cultural Position</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">X-Axis:</span>
                <span>{trendData.culturalPosition.x > 0 ? 'Mainstream' : 'Subculture'} ({Math.abs(trendData.culturalPosition.x * 100).toFixed(0)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Y-Axis:</span>
                <span>{trendData.culturalPosition.y > 0 ? 'Polarizing' : 'Positive'} ({Math.abs(trendData.culturalPosition.y * 100).toFixed(0)}%)</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Movement Prediction</h4>
            <div className="flex items-center gap-2">
              <ArrowUp className="w-4 h-4 text-green-400" />
              <span className="text-sm">Moving towards mainstream</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">Est. 2-3 weeks to cross threshold</div>
          </div>
        </div>
      </div>

      {/* Cultural Shift Timeline */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-800/50">
        <h3 className="text-xl font-semibold mb-4">Cultural Position Shift</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={[
            { week: 'W-4', x: -0.8, y: 0.2 },
            { week: 'W-3', x: -0.6, y: 0.3 },
            { week: 'W-2', x: -0.5, y: 0.4 },
            { week: 'W-1', x: -0.4, y: 0.5 },
            { week: 'Now', x: -0.3, y: 0.6 }
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="week" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" domain={[-1, 1]} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Legend />
            <Line type="monotone" dataKey="x" stroke="#06b6d4" name="Mainstream Score" strokeWidth={2} />
            <Line type="monotone" dataKey="y" stroke="#a78bfa" name="Polarization Score" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 overflow-y-auto"
    >
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-gray-800/50">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">{trendData.name}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="px-3 py-1 bg-gray-800 rounded-lg">{trendData.category}</span>
                  <div className="flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    <span>Velocity: {trendData.velocity}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">+{trendData.engagement.growth}%</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* View Tabs */}
            <div className="flex gap-2 mt-6 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
                { id: 'geographic', label: 'Geographic', icon: <Globe className="w-4 h-4" /> },
                { id: 'demographic', label: 'Demographics', icon: <Users className="w-4 h-4" /> },
                { id: 'cultural', label: 'Cultural Compass', icon: <Target className="w-4 h-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedView(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                    selectedView === tab.id
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedView}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {selectedView === 'overview' && renderOverview()}
              {selectedView === 'geographic' && renderGeographic()}
              {selectedView === 'demographic' && renderDemographic()}
              {selectedView === 'cultural' && renderCultural()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}