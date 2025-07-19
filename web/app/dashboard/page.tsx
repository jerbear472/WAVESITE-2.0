'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendRadar } from '@/components/TrendRadar';
import { InsightsFeed } from '@/components/InsightsFeed';
import { CompetitorTracker } from '@/components/CompetitorTracker';
import { PredictiveAlerts } from '@/components/PredictiveAlerts';
import { api } from '@/lib/api';
import { DebugSupabase } from './debug';

export default function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeframe, setTimeframe] = useState('week');

  const { data: trendData, isLoading: trendsLoading } = useQuery({
    queryKey: ['trends', selectedCategory, timeframe],
    queryFn: () => api.getTrends({ category: selectedCategory, timeframe }),
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: insights } = useQuery({
    queryKey: ['insights', timeframe],
    queryFn: () => api.getInsights({ timeframe }),
  });

  const { data: competitors } = useQuery({
    queryKey: ['competitors'],
    queryFn: () => api.getCompetitors(),
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">Trend Intelligence</h1>
          <p className="text-gray-400">
            Real-time insights from {trendData?.participantCount || '0'} trend spotters
          </p>
        </motion.div>

        {/* Debug Component */}
        <DebugSupabase />

        {/* Filters */}
        <div className="flex gap-4 mb-8">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2"
          >
            <option value="all">All Categories</option>
            <option value="visual_style">Visual Style</option>
            <option value="audio_music">Audio/Music</option>
            <option value="creator_technique">Creator Technique</option>
            <option value="meme_format">Meme Format</option>
            <option value="product_brand">Product/Brand</option>
            <option value="behavior_pattern">Behavior Pattern</option>
          </select>

          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2"
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Radar */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-900 rounded-xl p-6 border border-gray-800"
            >
              <h2 className="text-xl font-semibold mb-4">Trend Radar</h2>
              {trendsLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                </div>
              ) : (
                <TrendRadar data={trendData?.trends || []} />
              )}
            </motion.div>
          </div>

          {/* Predictive Alerts */}
          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900 rounded-xl p-6 border border-gray-800"
            >
              <h2 className="text-xl font-semibold mb-4">Predictive Alerts</h2>
              <PredictiveAlerts alerts={trendData?.alerts || []} />
            </motion.div>
          </div>

          {/* Insights Feed */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-900 rounded-xl p-6 border border-gray-800"
            >
              <h2 className="text-xl font-semibold mb-4">Latest Insights</h2>
              <InsightsFeed insights={insights || []} />
            </motion.div>
          </div>

          {/* Competitor Tracker */}
          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-900 rounded-xl p-6 border border-gray-800"
            >
              <h2 className="text-xl font-semibold mb-4">Competitor Activity</h2>
              <CompetitorTracker competitors={competitors || []} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}