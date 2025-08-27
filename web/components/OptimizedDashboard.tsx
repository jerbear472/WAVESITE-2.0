'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useTrendSubmissions, useUserProfile, useEarnings } from '@/lib/hooks/useApi';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  TrendingUp, DollarSign, Award, Clock, BarChart3, 
  Eye, CheckCircle, Star, Zap 
} from 'lucide-react';

export default function OptimizedDashboard() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'all'>('week');
  
  // Use React Query hooks for cached data
  const { data: trends, isLoading: trendsLoading } = useTrendSubmissions(user?.id);
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);
  const { data: earnings, isLoading: earningsLoading } = useEarnings(user?.id);
  
  // Calculate stats
  const stats = {
    totalTrends: trends?.length || 0,
    totalEarnings: earnings?.total || 0,
    avgQuality: trends?.reduce((sum, t) => sum + (t.quality_score || 0), 0) / (trends?.length || 1),
    recentActivity: trends?.filter(t => {
      const date = new Date(t.created_at);
      const now = new Date();
      const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      
      switch(timeframe) {
        case 'today': return daysDiff < 1;
        case 'week': return daysDiff < 7;
        case 'month': return daysDiff < 30;
        default: return true;
      }
    }).length || 0
  };

  // Loading skeleton
  if (trendsLoading || profileLoading || earningsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-300 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {profile?.username || 'Spotter'}!
        </h1>
        <p className="text-gray-600 mt-2">
          Level {profile?.current_level || 1} {profile?.performance_tier || 'Observer'} • 
          {profile?.current_streak || 0} day streak 🔥
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Trends</p>
              <p className="text-3xl font-bold">{stats.totalTrends}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-200" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total XP</p>
              <p className="text-3xl font-bold">{earnings?.total || 0}</p>
            </div>
            <Award className="w-8 h-8 text-green-200" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Avg Quality</p>
              <p className="text-3xl font-bold">{Math.round(stats.avgQuality)}%</p>
            </div>
            <Star className="w-8 h-8 text-purple-200" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">This {timeframe}</p>
              <p className="text-3xl font-bold">{stats.recentActivity}</p>
            </div>
            <Zap className="w-8 h-8 text-orange-200" />
          </div>
        </motion.div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex space-x-2 mb-6">
        {(['today', 'week', 'month', 'all'] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              timeframe === tf
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tf.charAt(0).toUpperCase() + tf.slice(1)}
          </button>
        ))}
      </div>

      {/* Recent Trends */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Submissions</h2>
        
        {trends && trends.length > 0 ? (
          <div className="space-y-4">
            {trends.slice(0, 5).map((trend) => (
              <motion.div
                key={trend.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  {trend.thumbnail_url && (
                    <img
                      src={trend.thumbnail_url}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {trend.title || trend.description || 'Untitled Trend'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(trend.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-green-600">
                    +{trend.payment_amount || 0} XP
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    trend.status === 'approved' ? 'bg-green-100 text-green-800' :
                    trend.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {trend.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Eye className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No trends spotted yet</p>
            <Link
              href="/spot"
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Start Spotting Trends
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Link
          href="/spot"
          prefetch
          className="group bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <Eye className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />
            <span className="text-sm text-gray-500">Quick Action</span>
          </div>
          <h3 className="font-bold text-gray-900">Spot New Trend</h3>
          <p className="text-sm text-gray-600 mt-2">Find and submit the next viral trend</p>
        </Link>

        <Link
          href="/validate"
          prefetch
          className="group bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform" />
            <span className="text-sm text-gray-500">Earn XP</span>
          </div>
          <h3 className="font-bold text-gray-900">Validate Trends</h3>
          <p className="text-sm text-gray-600 mt-2">Review and validate community submissions</p>
        </Link>

        <Link
          href="/predictions"
          prefetch
          className="group bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="w-8 h-8 text-purple-500 group-hover:scale-110 transition-transform" />
            <span className="text-sm text-gray-500">Predict</span>
          </div>
          <h3 className="font-bold text-gray-900">Make Predictions</h3>
          <p className="text-sm text-gray-600 mt-2">Predict when trends will peak</p>
        </Link>
      </div>
    </div>
  );
}