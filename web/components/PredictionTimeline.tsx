'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, Users, Target, Zap, Trophy, AlertTriangle } from 'lucide-react';

interface TimelineProps {
  selectedPeak: string;
  onPeakSelect: (peak: string) => void;
  otherPredictions?: { peak_time: string; count: number }[];
  currentTrendAge?: number; // Days since trend was submitted
  confidenceLevel?: number; // User's confidence level 0-100
}

// XP rewards based on accuracy and timing
const XP_REWARDS = {
  '24hrs': { 
    exact: 500,      // If correct within 24hrs
    close: 200,      // If off by 1 day
    base: 100,       // If off by 2-3 days
    risk: 'Very High',
    difficulty: 'Expert'
  },
  '48hrs': { 
    exact: 400,
    close: 150,
    base: 75,
    risk: 'High',
    difficulty: 'Hard'
  },
  '1week': { 
    exact: 300,
    close: 100,
    base: 50,
    risk: 'Medium',
    difficulty: 'Medium'
  },
  '2weeks': { 
    exact: 200,
    close: 75,
    base: 25,
    risk: 'Low',
    difficulty: 'Easy'
  },
  'peaked': { 
    exact: 150,
    close: 50,
    base: 25,
    risk: 'Lowest',
    difficulty: 'Safe'
  }
};

const TIMELINE_OPTIONS = [
  { value: '24hrs', label: '24 Hours', days: 1, color: 'from-red-500 to-orange-500' },
  { value: '48hrs', label: '48 Hours', days: 2, color: 'from-orange-500 to-yellow-500' },
  { value: '1week', label: '1 Week', days: 7, color: 'from-yellow-500 to-green-500' },
  { value: '2weeks', label: '2 Weeks', days: 14, color: 'from-green-500 to-blue-500' },
  { value: 'peaked', label: 'Already Peaked', days: 0, color: 'from-gray-400 to-gray-600' }
];

export default function PredictionTimeline({ 
  selectedPeak, 
  onPeakSelect, 
  otherPredictions = [],
  currentTrendAge = 0,
  confidenceLevel = 50 
}: TimelineProps) {
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const [showRewards, setShowRewards] = useState(false);

  // Calculate consensus from other predictions
  const getConsensus = () => {
    if (otherPredictions.length === 0) return null;
    
    const totalPredictions = otherPredictions.reduce((sum, p) => sum + p.count, 0);
    let maxCount = 0;
    let consensus = '';
    
    otherPredictions.forEach(p => {
      if (p.count > maxCount) {
        maxCount = p.count;
        consensus = p.peak_time;
      }
    });
    
    return { peak: consensus, percentage: Math.round((maxCount / totalPredictions) * 100) };
  };

  const consensus = getConsensus();

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          When Will This Peak?
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Click on the timeline to predict when this trend will reach maximum virality
        </p>
      </div>

      {/* Visual Timeline */}
      <div className="relative mb-6">
        {/* Timeline Base */}
        <div className="h-2 bg-gray-200 rounded-full relative overflow-hidden">
          {/* Current Progress Indicator */}
          {currentTrendAge > 0 && (
            <div 
              className="absolute top-0 left-0 h-full bg-blue-300 opacity-50"
              style={{ width: `${Math.min((currentTrendAge / 14) * 100, 100)}%` }}
            />
          )}
        </div>

        {/* Timeline Markers */}
        <div className="relative mt-4">
          <div className="flex justify-between">
            {TIMELINE_OPTIONS.map((option, index) => {
              const isSelected = selectedPeak === option.value;
              const isHovered = hoveredOption === option.value;
              const position = option.days === 0 ? 0 : (option.days / 14) * 100;

              return (
                <motion.div
                  key={option.value}
                  className="relative"
                  style={{ 
                    position: 'absolute',
                    left: option.value === 'peaked' ? '0%' : `${position}%`,
                    transform: 'translateX(-50%)'
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <button
                    onClick={() => onPeakSelect(option.value)}
                    onMouseEnter={() => setHoveredOption(option.value)}
                    onMouseLeave={() => setHoveredOption(null)}
                    className={`
                      relative w-12 h-12 rounded-full border-2 transition-all duration-200
                      ${isSelected 
                        ? 'bg-gradient-to-br ' + option.color + ' border-white shadow-lg scale-110' 
                        : 'bg-white border-gray-300 hover:border-gray-400'
                      }
                    `}
                  >
                    {/* Marker Dot */}
                    <div className={`
                      absolute inset-2 rounded-full
                      ${isSelected ? 'bg-white' : 'bg-gray-400'}
                    `} />
                    
                    {/* Prediction Count */}
                    {otherPredictions.find(p => p.peak_time === option.value) && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {otherPredictions.find(p => p.peak_time === option.value)?.count}
                      </div>
                    )}
                  </button>

                  {/* Label */}
                  <div className={`
                    absolute top-14 left-1/2 transform -translate-x-1/2 whitespace-nowrap
                    text-xs font-medium transition-all duration-200
                    ${isSelected ? 'text-gray-900 scale-110' : 'text-gray-600'}
                  `}>
                    {option.label}
                    {option.value !== 'peaked' && (
                      <div className="text-[10px] text-gray-500">
                        Day {currentTrendAge + option.days}
                      </div>
                    )}
                  </div>

                  {/* Hover Tooltip */}
                  {(isHovered || isSelected) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10"
                    >
                      {option.value === 'peaked' 
                        ? 'Trend has already reached its peak'
                        : `Peak in ${option.days} day${option.days > 1 ? 's' : ''}`
                      }
                      {otherPredictions.find(p => p.peak_time === option.value) && (
                        <div className="mt-1 text-blue-300">
                          {otherPredictions.find(p => p.peak_time === option.value)?.count} predictions
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Timeline Labels */}
      <div className="flex justify-between text-xs text-gray-500 mt-8 mb-4">
        <span>Now</span>
        <span>1 Week</span>
        <span>2 Weeks</span>
      </div>

      {/* Consensus Indicator */}
      {consensus && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Community Consensus
              </span>
            </div>
            <div className="text-sm font-semibold text-blue-600">
              {TIMELINE_OPTIONS.find(o => o.value === consensus.peak)?.label} ({consensus.percentage}%)
            </div>
          </div>
        </div>
      )}

      {/* Selection Display */}
      {selectedPeak && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-900">
                Your Prediction: <span className="font-semibold text-green-600">
                  {TIMELINE_OPTIONS.find(o => o.value === selectedPeak)?.label}
                </span>
              </span>
            </div>
            <button
              onClick={() => setShowRewards(!showRewards)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <Zap className="w-3 h-3" />
              {showRewards ? 'Hide' : 'Show'} Rewards
            </button>
          </div>
        </motion.div>
      )}

      {/* Rewards Preview */}
      {selectedPeak && showRewards && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
        >
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <h4 className="font-semibold text-gray-900">Potential XP Rewards</h4>
          </div>

          <div className="space-y-3">
            {/* Confidence Multiplier */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Base Confidence ({confidenceLevel}%)</span>
              <span className="font-medium text-gray-900">
                {(confidenceLevel / 100).toFixed(2)}x multiplier
              </span>
            </div>

            {/* Reward Tiers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-green-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm font-medium text-green-900">Perfect (exact day)</span>
                </div>
                <span className="text-sm font-bold text-green-600">
                  +{Math.round(XP_REWARDS[selectedPeak as keyof typeof XP_REWARDS].exact * (confidenceLevel / 100))} XP
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-blue-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-sm font-medium text-blue-900">Close (±1-2 days)</span>
                </div>
                <span className="text-sm font-bold text-blue-600">
                  +{Math.round(XP_REWARDS[selectedPeak as keyof typeof XP_REWARDS].close * (confidenceLevel / 100))} XP
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full" />
                  <span className="text-sm font-medium text-gray-700">Partial (±3-5 days)</span>
                </div>
                <span className="text-sm font-bold text-gray-600">
                  +{Math.round(XP_REWARDS[selectedPeak as keyof typeof XP_REWARDS].base * (confidenceLevel / 100))} XP
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-sm font-medium text-red-900">Wrong (>5 days off)</span>
                </div>
                <span className="text-sm font-bold text-red-600">
                  -{Math.round(25 * (confidenceLevel / 100))} XP
                </span>
              </div>
            </div>

            {/* Risk/Reward Indicator */}
            <div className="pt-3 border-t border-yellow-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-medium text-gray-700">
                    Risk Level: <span className={`font-bold ${
                      XP_REWARDS[selectedPeak as keyof typeof XP_REWARDS].risk === 'Very High' ? 'text-red-600' :
                      XP_REWARDS[selectedPeak as keyof typeof XP_REWARDS].risk === 'High' ? 'text-orange-600' :
                      XP_REWARDS[selectedPeak as keyof typeof XP_REWARDS].risk === 'Medium' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {XP_REWARDS[selectedPeak as keyof typeof XP_REWARDS].risk}
                    </span>
                  </span>
                </div>
                <span className="text-xs text-gray-600">
                  Difficulty: {XP_REWARDS[selectedPeak as keyof typeof XP_REWARDS].difficulty}
                </span>
              </div>
            </div>

            {/* Early Bird Bonus */}
            {currentTrendAge <= 1 && (
              <div className="mt-2 p-2 bg-purple-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-medium text-purple-900">Early Bird Bonus!</span>
                  </div>
                  <span className="text-xs font-bold text-purple-600">+50% XP</span>
                </div>
              </div>
            )}

            {/* Competition Warning */}
            {otherPredictions.length > 10 && (
              <div className="mt-2 p-2 bg-orange-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-600" />
                  <span className="text-xs text-orange-900">
                    High competition! {otherPredictions.reduce((sum, p) => sum + p.count, 0)} predictions already
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}