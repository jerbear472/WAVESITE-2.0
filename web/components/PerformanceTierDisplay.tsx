'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp,
  Award,
  AlertTriangle,
  Lock,
  ChevronRight,
  Info,
  Star,
  Zap,
  Target,
  TrendingDown
} from 'lucide-react';
import { 
  PerformanceManagementService, 
  UserPerformanceMetrics,
  PerformanceTier 
} from '@/lib/performanceManagementService';

interface Props {
  userId: string;
  compact?: boolean;
  showDetails?: boolean;
  onTierChange?: (newTier: PerformanceTier) => void;
}

export const PerformanceTierDisplay: React.FC<Props> = ({ 
  userId, 
  compact = false,
  showDetails = true,
  onTierChange 
}) => {
  const [metrics, setMetrics] = useState<UserPerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const performanceService = PerformanceManagementService.getInstance();

  useEffect(() => {
    loadPerformanceData();
    // Refresh every 5 minutes
    const interval = setInterval(loadPerformanceData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadPerformanceData = async () => {
    try {
      const data = await performanceService.getUserPerformanceMetrics(userId);
      setMetrics(data);
      
      // Check for tier change
      if (data && metrics && data.currentTier !== metrics.currentTier) {
        onTierChange?.(data.currentTier);
      }
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  const tierDisplay = performanceService.formatTierDisplay(metrics.currentTier);
  const progressToNext = metrics.nextTierThreshold 
    ? ((metrics.compositeScore - 0.45) / (metrics.nextTierThreshold.requiredScore - 0.45)) * 100
    : 100;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative"
      >
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 border ${
            metrics.currentTier === 'premium' ? 'border-yellow-500/30' :
            metrics.currentTier === 'standard' ? 'border-green-500/30' :
            metrics.currentTier === 'probation' ? 'border-orange-500/30' :
            'border-red-500/30'
          }`}
        >
          <span className="text-lg">{tierDisplay.badge}</span>
          <span className={`text-sm font-medium ${tierDisplay.color}`}>
            {tierDisplay.name}
          </span>
          {metrics.paymentMultiplier !== 1 && (
            <span className="text-xs text-gray-400">
              {metrics.paymentMultiplier}x
            </span>
          )}
        </button>

        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 left-0 z-50 w-80 bg-gray-900 rounded-xl shadow-xl border border-gray-700 p-4"
            >
              <PerformanceDetails metrics={metrics} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${
            metrics.currentTier === 'premium' ? 'from-yellow-500/20 to-orange-600/20' :
            metrics.currentTier === 'standard' ? 'from-green-500/20 to-emerald-600/20' :
            metrics.currentTier === 'probation' ? 'from-orange-500/20 to-red-600/20' :
            'from-red-500/20 to-red-800/20'
          }`}>
            <span className="text-2xl">{tierDisplay.badge}</span>
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${tierDisplay.color}`}>
              {tierDisplay.name}
            </h3>
            <p className="text-sm text-gray-400">{tierDisplay.description}</p>
          </div>
        </div>
        
        {metrics.streakBonus > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-lg">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-400">
              +{(metrics.streakBonus * 100).toFixed(0)}% streak
            </span>
          </div>
        )}
      </div>

      {showDetails && <PerformanceDetails metrics={metrics} />}
    </motion.div>
  );
};

const PerformanceDetails: React.FC<{ metrics: UserPerformanceMetrics }> = ({ metrics }) => {
  const performanceService = PerformanceManagementService.getInstance();

  return (
    <div className="space-y-4">
      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Verification Accuracy"
          value={`${(metrics.verificationAccuracy30d * 100).toFixed(1)}%`}
          icon={<Target className="w-5 h-5" />}
          trend={metrics.verificationAccuracy30d >= 0.7 ? 'up' : 'down'}
        />
        <MetricCard
          label="Trend Approval Rate"
          value={`${(metrics.trendApprovalRate30d * 100).toFixed(1)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={metrics.trendApprovalRate30d >= 0.5 ? 'up' : 'down'}
        />
      </div>

      {/* Composite Score */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Composite Score</span>
          <span className="text-lg font-semibold text-white">
            {(metrics.compositeScore * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
            initial={{ width: 0 }}
            animate={{ width: `${metrics.compositeScore * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          60% verification accuracy + 40% trend approval rate
        </p>
      </div>

      {/* Next Tier Progress */}
      {metrics.nextTierThreshold && (
        <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">
              Progress to {formatTierName(metrics.nextTierThreshold.tier)}
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Score needed</span>
              <span className="text-white">
                {(metrics.nextTierThreshold.requiredScore * 100).toFixed(0)}%
              </span>
            </div>
            
            {metrics.nextTierThreshold.activitiesNeeded > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">More activities needed</span>
                <span className="text-white">{metrics.nextTierThreshold.activitiesNeeded}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Benefits Summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400" />
          <span className="text-gray-400">Payment Rate</span>
        </div>
        <span className="font-semibold text-white">
          {metrics.paymentMultiplier}x
          {metrics.streakBonus > 0 && (
            <span className="text-purple-400 ml-1">
              +{(metrics.streakBonus * 100).toFixed(0)}%
            </span>
          )}
        </span>
      </div>

      {!metrics.canSubmitTrends && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
          <Lock className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400">
            Trend submission disabled during suspension
          </span>
        </div>
      )}

      {/* Activity Summary */}
      <div className="pt-3 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex justify-between">
          <span>Last 30 days:</span>
          <span>
            {metrics.totalVerifications30d} verifications, {metrics.totalTrends30d} trends
          </span>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
}> = ({ label, value, icon, trend }) => {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-gray-400">{icon}</div>
        {trend && (
          <div className={trend === 'up' ? 'text-green-400' : 'text-red-400'}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        )}
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
};

const formatTierName = (tier: PerformanceTier): string => {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
};