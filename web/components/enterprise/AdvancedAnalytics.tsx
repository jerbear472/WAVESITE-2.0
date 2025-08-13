'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { Calendar, TrendingUp, Users, Globe, Briefcase, Filter } from 'lucide-react';

interface AnalyticsData {
  trendVelocity: Array<{ date: string; velocity: number; category: string }>;
  categoryDistribution: Array<{ category: string; value: number; growth: number }>;
  sentimentAnalysis: Array<{ date: string; positive: number; negative: number; neutral: number }>;
  geographicData: Array<{ region: string; trends: number; engagement: number }>;
  competitorAnalysis: Array<{ competitor: string; metrics: { [key: string]: number } }>;
  roiProjections: Array<{ trend: string; currentROI: number; projectedROI: number; confidence: number }>;
}

export function AdvancedAnalytics() {
  const supabase = createClientComponentClient();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('velocity');
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      // Mock data for demonstration
      const mockData: AnalyticsData = {
        trendVelocity: generateTrendVelocityData(),
        categoryDistribution: [
          { category: 'Technology', value: 35, growth: 12.5 },
          { category: 'Finance', value: 28, growth: 8.3 },
          { category: 'Fashion', value: 20, growth: 15.7 },
          { category: 'Entertainment', value: 12, growth: -2.1 },
          { category: 'Health', value: 5, growth: 22.4 }
        ],
        sentimentAnalysis: generateSentimentData(),
        geographicData: [
          { region: 'North America', trends: 450, engagement: 2500000 },
          { region: 'Europe', trends: 380, engagement: 1800000 },
          { region: 'Asia Pacific', trends: 620, engagement: 3200000 },
          { region: 'Latin America', trends: 180, engagement: 900000 },
          { region: 'Middle East', trends: 120, engagement: 600000 }
        ],
        competitorAnalysis: [
          { competitor: 'Your Company', metrics: { trends: 85, accuracy: 92, speed: 88, coverage: 90 } },
          { competitor: 'Competitor A', metrics: { trends: 70, accuracy: 85, speed: 82, coverage: 75 } },
          { competitor: 'Competitor B', metrics: { trends: 60, accuracy: 80, speed: 90, coverage: 65 } },
          { competitor: 'Industry Avg', metrics: { trends: 50, accuracy: 75, speed: 70, coverage: 60 } }
        ],
        roiProjections: generateROIProjections()
      };

      setAnalyticsData(mockData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    }
  };

  const generateTrendVelocityData = () => {
    const categories = ['Technology', 'Finance', 'Fashion', 'Entertainment', 'Health'];
    const data: Array<{ date: string; velocity: number; category: string }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      categories.forEach(category => {
        data.push({
          date: date.toISOString().split('T')[0],
          velocity: Math.random() * 100,
          category
        });
      });
    }
    return data;
  };

  const generateSentimentData = () => {
    const data: Array<{ date: string; positive: number; negative: number; neutral: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        positive: Math.random() * 60 + 20,
        negative: Math.random() * 30 + 10,
        neutral: Math.random() * 40 + 10
      });
    }
    return data;
  };

  const generateROIProjections = () => {
    const trends = ['AI Productivity Tools', 'Sustainable Fashion', 'Web3 Gaming', 'Health Tech Wearables', 'Creator Economy'];
    return trends.map(trend => ({
      trend,
      currentROI: Math.random() * 100 + 50,
      projectedROI: Math.random() * 300 + 150,
      confidence: Math.random() * 30 + 70
    }));
  };

  const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold">Advanced Analytics</h2>
        <div className="flex items-center gap-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Custom Range</span>
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Trends', value: '1,234', change: '+12.5%', icon: TrendingUp },
          { label: 'Total Engagement', value: '8.2M', change: '+18.3%', icon: Users },
          { label: 'Geographic Reach', value: '127', change: '+5 countries', icon: Globe },
          { label: 'Avg. ROI', value: '287%', change: '+23.1%', icon: Briefcase }
        ].map((metric, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800"
          >
            <div className="flex items-center justify-between mb-4">
              <metric.icon className="w-8 h-8 text-cyan-400" />
              <span className={`text-sm ${metric.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                {metric.change}
              </span>
            </div>
            <div className="text-2xl font-bold">{metric.value}</div>
            <div className="text-sm text-gray-400">{metric.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Velocity Chart */}
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
          <h3 className="text-xl font-semibold mb-4">Trend Velocity Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData?.trendVelocity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Legend />
              {['Technology', 'Finance', 'Fashion'].map((category, idx) => (
                <Line
                  key={category}
                  type="monotone"
                  dataKey="velocity"
                  data={analyticsData?.trendVelocity.filter(d => d.category === category)}
                  name={category}
                  stroke={COLORS[idx]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
          <h3 className="text-xl font-semibold mb-4">Category Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData?.categoryDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, value }) => `${category}: ${value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analyticsData?.categoryDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Sentiment Analysis */}
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
          <h3 className="text-xl font-semibold mb-4">Sentiment Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData?.sentimentAnalysis}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Legend />
              <Area type="monotone" dataKey="positive" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              <Area type="monotone" dataKey="neutral" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
              <Area type="monotone" dataKey="negative" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Competitor Analysis Radar */}
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
          <h3 className="text-xl font-semibold mb-4">Competitive Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={analyticsData?.competitorAnalysis}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="competitor" stroke="#9ca3af" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#9ca3af" />
              <Radar name="Trends" dataKey="metrics.trends" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} />
              <Radar name="Accuracy" dataKey="metrics.accuracy" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
              <Radar name="Speed" dataKey="metrics.speed" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ROI Projections */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
        <h3 className="text-xl font-semibold mb-4">ROI Projections - Top Opportunities</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="pb-2">Trend</th>
                <th className="pb-2">Current ROI</th>
                <th className="pb-2">Projected ROI</th>
                <th className="pb-2">Confidence</th>
                <th className="pb-2">Potential Gain</th>
              </tr>
            </thead>
            <tbody>
              {analyticsData?.roiProjections.map((projection, idx) => (
                <tr key={idx} className="border-b border-gray-800/50">
                  <td className="py-3">{projection.trend}</td>
                  <td className="py-3">{projection.currentROI.toFixed(0)}%</td>
                  <td className="py-3 text-green-400 font-semibold">{projection.projectedROI.toFixed(0)}%</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-cyan-500 h-2 rounded-full"
                          style={{ width: `${projection.confidence}%` }}
                        />
                      </div>
                      <span className="text-sm">{projection.confidence.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-3 text-cyan-400">
                    +{(projection.projectedROI - projection.currentROI).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}