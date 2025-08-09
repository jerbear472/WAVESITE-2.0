'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  Star,
  Lock,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

interface TierRequirement {
  label: string;
  current: number;
  required: number;
  met: boolean;
  icon: React.ReactNode;
}

interface SpotterTierProgressProps {
  currentTier: 'elite' | 'verified' | 'learning' | 'restricted';
  approvalRate: number;
  totalTrends30d: number;
  qualityScore: number;
  viralTrends: number;
  nextTier?: {
    tier: 'elite' | 'verified' | 'learning';
    requirements: TierRequirement[];
    progress: number; // 0-100
  };
}

export const SpotterTierProgress: React.FC<SpotterTierProgressProps> = ({
  currentTier,
  approvalRate,
  totalTrends30d,
  qualityScore,
  viralTrends,
  nextTier
}) => {
  const tiers = [
    {
      name: 'restricted',
      label: 'Restricted',
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: '⚠️',
      multiplier: '0.3x',
      description: 'Limited earnings - improve performance'
    },
    {
      name: 'learning',
      label: 'Learning',
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      icon: '📚',
      multiplier: '0.7x',
      description: 'Building skills and reputation'
    },
    {
      name: 'verified',
      label: 'Verified',
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: '✅',
      multiplier: '1.0x',
      description: 'Trusted trend spotter'
    },
    {
      name: 'elite',
      label: 'Elite',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      icon: '🏆',
      multiplier: '1.5x',
      description: 'Top performer with maximum earnings'
    }
  ];

  const currentTierIndex = tiers.findIndex(t => t.name === currentTier);
  const currentTierInfo = tiers[currentTierIndex];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Spotter Tier Progress</h3>
          <p className="text-sm text-gray-500 mt-1">Level up to increase your earnings multiplier</p>
        </div>
        <div className={`px-4 py-2 rounded-lg ${currentTierInfo.bgColor} border-2 border-current ${currentTierInfo.textColor}`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currentTierInfo.icon}</span>
            <div>
              <p className="font-semibold">{currentTierInfo.label}</p>
              <p className="text-xs opacity-75">{currentTierInfo.multiplier} earnings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tier Progress Bar */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          {tiers.map((tier, index) => (
            <div
              key={tier.name}
              className={`flex flex-col items-center ${
                index <= currentTierIndex ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl
                  ${index <= currentTierIndex 
                    ? `${tier.color} text-white` 
                    : 'bg-gray-200 text-gray-400'
                  }
                  ${index === currentTierIndex ? 'ring-4 ring-offset-2 ' + tier.color + ' ring-opacity-30' : ''}
                `}
              >
                {index < currentTierIndex ? (
                  <CheckCircle className="w-6 h-6" />
                ) : index === currentTierIndex ? (
                  tier.icon
                ) : (
                  <Lock className="w-5 h-5" />
                )}
              </div>
              <p className="text-xs mt-2 font-medium">{tier.label}</p>
              <p className="text-xs text-gray-500">{tier.multiplier}</p>
            </div>
          ))}
        </div>
        
        {/* Progress Line */}
        <div className="absolute top-6 left-6 right-6 h-1 bg-gray-200 rounded-full -z-10">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(currentTierIndex / (tiers.length - 1)) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Current Performance */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <PerformanceMetric
          label="Approval Rate"
          value={`${(approvalRate * 100).toFixed(1)}%`}
          icon={<CheckCircle className="w-4 h-4" />}
          good={approvalRate >= 0.5}
        />
        <PerformanceMetric
          label="30-Day Trends"
          value={totalTrends30d.toString()}
          icon={<TrendingUp className="w-4 h-4" />}
          good={totalTrends30d >= 20}
        />
        <PerformanceMetric
          label="Quality Score"
          value={qualityScore.toFixed(1)}
          icon={<Star className="w-4 h-4" />}
          good={qualityScore >= 6}
        />
        <PerformanceMetric
          label="Viral Trends"
          value={viralTrends.toString()}
          icon={<Trophy className="w-4 h-4" />}
          good={viralTrends >= 1}
        />
      </div>

      {/* Next Tier Requirements */}
      {nextTier && currentTier !== 'elite' && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">
              Requirements for {tiers.find(t => t.name === nextTier.tier)?.label}
            </h4>
            <span className="text-xs text-gray-500">
              {nextTier.progress.toFixed(0)}% complete
            </span>
          </div>
          
          {/* Overall Progress */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${nextTier.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Individual Requirements */}
          <div className="space-y-2">
            {nextTier.requirements.map((req, index) => (
              <RequirementRow key={index} requirement={req} />
            ))}
          </div>
        </div>
      )}

      {/* Tips Section */}
      {currentTier !== 'elite' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Tips to level up:</p>
              <ul className="space-y-1 text-xs">
                {currentTier === 'restricted' && (
                  <>
                    <li>• Focus on quality over quantity</li>
                    <li>• Add detailed descriptions and evidence</li>
                    <li>• Include screenshots or videos</li>
                  </>
                )}
                {currentTier === 'learning' && (
                  <>
                    <li>• Submit at least 20 trends in 30 days</li>
                    <li>• Maintain 50%+ approval rate</li>
                    <li>• Focus on trending categories</li>
                  </>
                )}
                {currentTier === 'verified' && (
                  <>
                    <li>• Achieve 80%+ approval rate</li>
                    <li>• Submit 50+ quality trends monthly</li>
                    <li>• Get at least 2 viral trends</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PerformanceMetric: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  good: boolean;
}> = ({ label, value, icon, good }) => {
  return (
    <div className={`rounded-lg p-3 ${good ? 'bg-green-50' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={good ? 'text-green-600' : 'text-gray-400'}>
          {icon}
        </div>
        <p className="text-xs text-gray-600">{label}</p>
      </div>
      <p className={`text-lg font-bold ${good ? 'text-green-700' : 'text-gray-700'}`}>
        {value}
      </p>
    </div>
  );
};

const RequirementRow: React.FC<{ requirement: TierRequirement }> = ({ requirement }) => {
  const progress = Math.min((requirement.current / requirement.required) * 100, 100);
  
  return (
    <div className="flex items-center gap-3">
      <div className={`${requirement.met ? 'text-green-600' : 'text-gray-400'}`}>
        {requirement.icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-gray-700">{requirement.label}</p>
          <p className="text-xs text-gray-500">
            {requirement.current}/{requirement.required}
          </p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-full rounded-full transition-all ${
              requirement.met ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      {requirement.met && (
        <CheckCircle className="w-4 h-4 text-green-600" />
      )}
    </div>
  );
};