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
import WaveLogo from '@/components/WaveLogo';

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
    <div className="min-h-screen text-white">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <WaveLogo size={50} animated={true} />
            <div>
              <h1 className="text-4xl font-bold wave-text-gradient">WAVESITE Dashboard</h1>
              <p className="text-wave-300">
                Tracking {trendData?.length || '0'} live trends
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-wave-400">
              Wave Score: {Math.round((trendData?.[0]?.waveScore || 0) * 10) / 10}
            </div>
            <p className="text-sm text-wave-200">Global Average</p>
          </div>
        </motion.div>

        {/* Debug Component */}
        <DebugSupabase />

        {/* Filters */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="wave-card px-6 py-3 rounded-xl bg-opacity-50 border-wave-700/30 text-wave-100 focus:border-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500/20"
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
            className="wave-card px-6 py-3 rounded-xl bg-opacity-50 border-wave-700/30 text-wave-100 focus:border-wave-500 focus:outline-none focus:ring-2 focus:ring-wave-500/20"
          >
            <option value="day">⚡ Last 24 Hours</option>
            <option value="week">📅 Last Week</option>
            <option value="month">📆 Last Month</option>
          </select>
          
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex h-3 w-3 rounded-full bg-wave-500 animate-pulse"></span>
            <span className="text-wave-300 text-sm">Live Updates</span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Radar */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="wave-card p-6"
            >
              <h2 className="text-xl font-semibold mb-4">Trend Radar</h2>
              {trendsLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wave-500"></div>
                </div>
              ) : (
                <TrendRadar data={trendData?.map((t: any) => ({
                  id: t.id,
                  title: t.name,
                  category: t.category,
                  viralityScore: t.waveScore || 0,
                  qualityScore: t.waveScore || 0,
                  validationCount: 0,
                  createdAt: new Date().toISOString()
                })) || []} />
              )}
            </motion.div>
          </div>

          {/* Predictive Alerts */}
          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="wave-card p-6"
            >
              <h2 className="text-xl font-semibold mb-4">Predictive Alerts</h2>
              <PredictiveAlerts alerts={[]} />
            </motion.div>
          </div>

          {/* Insights Feed */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="wave-card p-6"
            >
              <h2 className="text-xl font-semibold mb-4">Latest Insights</h2>
              <InsightsFeed insights={insights?.map((i: any) => ({
                ...i,
                impact: (i.impact === 'high' || i.impact === 'medium' || i.impact === 'low') ? i.impact : 'medium'
              })) || []} />
            </motion.div>
          </div>

          {/* Competitor Tracker */}
          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="wave-card p-6"
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