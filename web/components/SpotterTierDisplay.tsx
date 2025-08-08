'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy,
  CheckCircle,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  Star,
  Zap,
  Target,
  DollarSign,
  Award,
  Clock,
  ChevronRight,
  Info,
  Sparkles,
  Flame
} from 'lucide-react';
import { 
  TrendSpotterPerformanceService, 
  SpotterPerformanceMetrics,
  SpotterTier,
  CategoryExpertise
} from '@/lib/trendSpotterPerformanceService';

interface Props {
  userId: string;
  compact?: boolean;
  showDetails?: boolean;
  onTierChange?: (newTier: SpotterTier) => void;
}

export const SpotterTierDisplay: React.FC<Props> = ({ 
  userId, 
  compact = false,
  showDetails = true,
  onTierChange 
}) => {
  const [metrics, setMetrics] = useState<SpotterPerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const performanceService = TrendSpotterPerformanceService.getInstance();

  useEffect(() => {
    loadPerformanceData();
    const interval = setInterval(loadPerformanceData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadPerformanceData = async () => {
    try {
      const data = await performanceService.getSpotterPerformanceMetrics(userId);
      setMetrics(data);
      
      if (data && metrics && data.currentTier !== metrics.currentTier) {
        onTierChange?.(data.currentTier);
      }
    } catch (error) {
      console.error('Error loading spotter performance:', error);
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
  const tierBenefits = performanceService.getTierBenefits(metrics.currentTier);

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative"
      >
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className={`flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white shadow-sm border-2 transition-all duration-200 hover:shadow-md hover:scale-105 ${
            metrics.currentTier === 'elite' ? 'border-yellow-400 hover:border-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50' :
            metrics.currentTier === 'verified' ? 'border-green-400 hover:border-green-500 bg-gradient-to-r from-green-50 to-emerald-50' :
            metrics.currentTier === 'learning' ? 'border-blue-400 hover:border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50' :
            'border-orange-400 hover:border-orange-500 bg-gradient-to-r from-orange-50 to-red-50'
          }`}
        >
          <span className="text-xl filter drop-shadow-sm">{tierDisplay.badge}</span>
          <div className="flex flex-col items-start">
            <span className={`text-sm font-semibold leading-none ${
              metrics.currentTier === 'elite' ? 'text-yellow-700' :
              metrics.currentTier === 'verified' ? 'text-green-700' :
              metrics.currentTier === 'learning' ? 'text-blue-700' :
              'text-orange-700'
            }`}>
              {tierDisplay.name}
            </span>
            {metrics.paymentMultiplier !== 1 && (
              <span className="text-xs text-gray-500 leading-none mt-0.5">
                {metrics.paymentMultiplier}x multiplier
              </span>
            )}
          </div>
          <div className={`ml-1 w-2 h-2 rounded-full ${
            metrics.currentTier === 'elite' ? 'bg-yellow-400 animate-pulse' :
            metrics.currentTier === 'verified' ? 'bg-green-400' :
            metrics.currentTier === 'learning' ? 'bg-blue-400' :
            'bg-orange-400'
          }`} />
        </button>

        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full mt-3 right-0 z-50 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 p-5"
            >
              <SpotterPerformanceDetailsLight metrics={metrics} benefits={tierBenefits} tierDisplay={tierDisplay} />
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
            metrics.currentTier === 'elite' ? 'from-yellow-500/20 to-orange-600/20' :
            metrics.currentTier === 'verified' ? 'from-green-500/20 to-emerald-600/20' :
            metrics.currentTier === 'learning' ? 'from-blue-500/20 to-sky-600/20' :
            'from-orange-500/20 to-red-600/20'
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
        
        {metrics.consecutiveApprovedTrends > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-lg">
            <Flame className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-400">
              {metrics.consecutiveApprovedTrends} streak
            </span>
          </div>
        )}
      </div>

      {showDetails && <SpotterPerformanceDetails metrics={metrics} benefits={tierBenefits} />}
    </motion.div>
  );
};

const SpotterPerformanceDetailsLight: React.FC<{ 
  metrics: SpotterPerformanceMetrics;
  benefits: any;
  tierDisplay: any;
}> = ({ metrics, benefits, tierDisplay }) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            metrics.currentTier === 'elite' ? 'bg-gradient-to-br from-yellow-100 to-orange-100' :
            metrics.currentTier === 'verified' ? 'bg-gradient-to-br from-green-100 to-emerald-100' :
            metrics.currentTier === 'learning' ? 'bg-gradient-to-br from-blue-100 to-indigo-100' :
            'bg-gradient-to-br from-orange-100 to-red-100'
          }`}>
            <span className="text-lg">{tierDisplay.badge}</span>
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${tierDisplay.color}`}>
              {tierDisplay.name}
            </h3>
            <p className="text-sm text-gray-600">{tierDisplay.description}</p>
          </div>
        </div>
        
        {metrics.consecutiveApprovedTrends > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 rounded-lg">
            <Flame className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-purple-600 font-medium">
              {metrics.consecutiveApprovedTrends} streak
            </span>
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCardLight
          label="Approval Rate"
          value={`${(metrics.trendApprovalRate30d * 100).toFixed(1)}%`}
          icon={<CheckCircle className="w-5 h-5" />}
          trend={metrics.trendApprovalRate30d >= 0.5 ? 'up' : 'down'}
        />
        <MetricCardLight
          label="Viral Rate"
          value={`${(metrics.trendViralRate30d * 100).toFixed(1)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={metrics.trendViralRate30d >= 0.1 ? 'up' : 'down'}
        />
      </div>

      {/* Quality Score */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Submission Quality</span>
          <span className="text-lg font-bold text-gray-900">
            {(metrics.submissionQualityScore * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
            initial={{ width: 0 }}
            animate={{ width: `${metrics.submissionQualityScore * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Based on metadata completeness, media quality, and trend detail
        </p>
      </div>

      {/* Benefits Summary */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
          <span className="text-gray-600">Payment Rate</span>
          <span className="font-semibold text-gray-900">
            ${benefits.basePaymentRange.min.toFixed(2)}-${benefits.basePaymentRange.max.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
          <span className="text-gray-600">Multiplier</span>
          <span className="font-semibold text-gray-900">{metrics.paymentMultiplier}x</span>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="pt-3 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Last 30 days:</span>
          <span className="font-medium text-gray-700">
            {metrics.totalTrendsSubmitted30d} submitted, {metrics.totalApprovedTrends30d} approved
          </span>
        </div>
      </div>
    </div>
  );
};

const SpotterPerformanceDetails: React.FC<{ 
  metrics: SpotterPerformanceMetrics;
  benefits: any;
}> = ({ metrics, benefits }) => {
  return (
    <div className="space-y-4">
      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Approval Rate"
          value={`${(metrics.trendApprovalRate30d * 100).toFixed(1)}%`}
          icon={<CheckCircle className="w-5 h-5" />}
          trend={metrics.trendApprovalRate30d >= 0.5 ? 'up' : 'down'}
        />
        <MetricCard
          label="Viral Rate"
          value={`${(metrics.trendViralRate30d * 100).toFixed(1)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={metrics.trendViralRate30d >= 0.1 ? 'up' : 'down'}
        />
      </div>

      {/* Quality Score */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Submission Quality</span>
          <span className="text-lg font-semibold text-white">
            {(metrics.submissionQualityScore * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
            initial={{ width: 0 }}
            animate={{ width: `${metrics.submissionQualityScore * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Based on metadata completeness, media quality, and trend detail
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
              <span className="text-gray-400">Approval rate needed</span>
              <span className="text-white">
                {(metrics.nextTierThreshold.requiredApprovalRate * 100).toFixed(0)}%
              </span>
            </div>
            
            {metrics.nextTierThreshold.trendsNeeded > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">More trends needed</span>
                <span className="text-white">{metrics.nextTierThreshold.trendsNeeded}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Daily Challenge */}
      {metrics.dailyChallengeProgress && (
        <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium text-purple-400">Daily Challenge</span>
            </div>
            <span className="text-xs text-purple-300">
              +${metrics.dailyChallengeProgress.reward.toFixed(2)}
            </span>
          </div>
          <p className="text-sm text-gray-300 mb-2">
            {metrics.dailyChallengeProgress.description}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${(metrics.dailyChallengeProgress.progress / metrics.dailyChallengeProgress.target) * 100}%` 
                  }}
                />
              </div>
            </div>
            <span className="text-xs text-gray-400">
              {metrics.dailyChallengeProgress.progress}/{metrics.dailyChallengeProgress.target}
            </span>
          </div>
        </div>
      )}

      {/* Category Expertise */}
      {metrics.categoryExpertise.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Star className="w-4 h-4" />
            Category Expertise
          </h4>
          {metrics.categoryExpertise.slice(0, 3).map((expertise) => (
            <CategoryExpertiseCard key={expertise.category} expertise={expertise} />
          ))}
        </div>
      )}

      {/* Benefits Summary */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Payment Rate</span>
          <span className="font-semibold text-white">
            ${benefits.basePaymentRange.min.toFixed(2)}-${benefits.basePaymentRange.max.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Multiplier</span>
          <span className="font-semibold text-white">{metrics.paymentMultiplier}x</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Daily Limit</span>
          <span className="font-semibold text-white">
            {benefits.dailyTrendLimit === -1 ? 'Unlimited' : benefits.dailyTrendLimit}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Early Bonus</span>
          <span className="font-semibold text-white">
            +{(benefits.earlyDetectionBonusRate * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="pt-3 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex justify-between">
          <span>Last 30 days:</span>
          <span>
            {metrics.totalTrendsSubmitted30d} submitted, {metrics.totalApprovedTrends30d} approved
          </span>
        </div>
      </div>
    </div>
  );
};

const MetricCardLight: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
}> = ({ label, value, icon, trend }) => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-gray-600">{icon}</div>
        {trend && (
          <div className={trend === 'up' ? 'text-green-600' : 'text-red-600'}>
            {trend === 'up' ? '↑' : '↓'}
          </div>
        )}
      </div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-600">{label}</p>
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
            {trend === 'up' ? '↑' : '↓'}
          </div>
        )}
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
};

const CategoryExpertiseCard: React.FC<{ expertise: CategoryExpertise }> = ({ expertise }) => {
  const levelColors = {
    master: 'text-yellow-400 bg-yellow-500/20',
    expert: 'text-purple-400 bg-purple-500/20',
    intermediate: 'text-blue-400 bg-blue-500/20',
    novice: 'text-gray-400 bg-gray-700/50'
  };

  const levelIcons = {
    master: '👑',
    expert: '⭐',
    intermediate: '📈',
    novice: '🌱'
  };

  return (
    <div className="flex items-center justify-between bg-gray-800/30 rounded-lg p-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">{levelIcons[expertise.level]}</span>
        <span className="text-sm text-gray-300">{expertise.category}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded ${levelColors[expertise.level]}`}>
          {expertise.level}
        </span>
        {expertise.bonusMultiplier > 0 && (
          <span className="text-xs text-green-400">
            +{(expertise.bonusMultiplier * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
};

const formatTierName = (tier: SpotterTier): string => {
  const names = {
    elite: 'Elite Spotter',
    verified: 'Verified Spotter',
    learning: 'Learning Spotter',
    restricted: 'Restricted'
  };
  return names[tier] || tier;
};