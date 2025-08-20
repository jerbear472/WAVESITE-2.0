'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, TrendingUp, Zap, Star, Info, Target, Sparkles } from 'lucide-react';

interface TierInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: string;
  currentXP?: number;
}

export default function TierInfoModal({ isOpen, onClose, currentTier = 'novice', currentXP = 0 }: TierInfoModalProps) {
  const levels = [
    {
      name: 'Novice',
      id: 'novice',
      emoji: '🌱',
      minXP: 0,
      maxXP: 99,
      color: 'from-green-500 to-green-600',
      borderColor: 'border-green-500',
      benefits: [
        'Base XP rewards',
        'Access to all features',
        'Community support',
        'Learning resources'
      ]
    },
    {
      name: 'Scout',
      id: 'scout',
      emoji: '⚡',
      minXP: 100,
      maxXP: 499,
      color: 'from-yellow-500 to-yellow-600',
      borderColor: 'border-yellow-500',
      benefits: [
        '10% XP bonus',
        'Scout badge',
        'Priority in validation queue',
        'Weekly trend insights'
      ]
    },
    {
      name: 'Tracker',
      id: 'tracker',
      emoji: '🔍',
      minXP: 500,
      maxXP: 999,
      color: 'from-blue-500 to-blue-600',
      borderColor: 'border-blue-500',
      benefits: [
        '15% XP bonus',
        'Tracker badge',
        'Advanced analytics',
        'Trend prediction tools'
      ]
    },
    {
      name: 'Analyst',
      id: 'analyst',
      emoji: '📊',
      minXP: 1000,
      maxXP: 2499,
      color: 'from-indigo-500 to-indigo-600',
      borderColor: 'border-indigo-500',
      benefits: [
        '20% XP bonus',
        'Analyst badge',
        'Cultural trend reports',
        'Early trend alerts'
      ]
    },
    {
      name: 'Expert',
      id: 'expert',
      emoji: '🎯',
      minXP: 2500,
      maxXP: 4999,
      color: 'from-purple-500 to-purple-600',
      borderColor: 'border-purple-500',
      benefits: [
        '25% XP bonus',
        'Expert badge',
        'Trend validation weight 2x',
        'Monthly leaderboard rewards'
      ]
    },
    {
      name: 'Master',
      id: 'master',
      emoji: '🏆',
      minXP: 5000,
      maxXP: 9999,
      color: 'from-orange-500 to-red-500',
      borderColor: 'border-orange-500',
      benefits: [
        '30% XP bonus',
        'Master badge',
        'Trend validation weight 3x',
        'Exclusive trend channels'
      ]
    },
    {
      name: 'Elite',
      id: 'elite',
      emoji: '💎',
      minXP: 10000,
      maxXP: 24999,
      color: 'from-cyan-500 to-blue-600',
      borderColor: 'border-cyan-500',
      benefits: [
        '40% XP bonus',
        'Elite badge',
        'Trend validation weight 4x',
        'Elite spotter community'
      ]
    },
    {
      name: 'Legend',
      id: 'legend',
      emoji: '👑',
      minXP: 25000,
      maxXP: Infinity,
      color: 'from-yellow-400 to-yellow-600',
      borderColor: 'border-yellow-400',
      benefits: [
        '50% XP bonus',
        'Legendary badge',
        'Trend validation weight 5x',
        'Shape platform features'
      ]
    }
  ];

  const getCurrentLevel = (xp: number) => {
    return levels.find(level => xp >= level.minXP && xp <= level.maxXP) || levels[0];
  };

  const currentLevel = getCurrentLevel(currentXP || 0);

  const xpActivities = [
    { activity: 'Spot a trend', xp: '10-50 XP', description: 'Submit quality trends' },
    { activity: 'Validate trends', xp: '5-10 XP', description: 'Help verify trends' },
    { activity: 'Accurate prediction', xp: '50-500 XP', description: 'Predict trend trajectories' },
    { activity: 'Daily streak', xp: '2x multiplier', description: 'Maintain daily activity' },
    { activity: 'Lightning round', xp: '3x multiplier', description: 'Quick validation sessions' },
    { activity: 'Quality bonus', xp: '+25% XP', description: 'High accuracy trends' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">XP Level System</h2>
                      <p className="text-gray-600 mt-1">Progress through levels and unlock rewards</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-8">
                {/* Current Level Display */}
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Your Current Level</p>
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{currentLevel.emoji}</span>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">{currentLevel.name}</h3>
                          <p className="text-sm text-gray-600">{currentXP?.toLocaleString() || 0} XP</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Next Level</p>
                      <p className="text-lg font-bold text-blue-600">
                        {currentLevel.maxXP === Infinity 
                          ? 'Max Level!' 
                          : `${((currentLevel.maxXP + 1) - (currentXP || 0)).toLocaleString()} XP needed`}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  {currentLevel.maxXP !== Infinity && (
                    <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${((currentXP || 0) - currentLevel.minXP) / (currentLevel.maxXP - currentLevel.minXP + 1) * 100}%` 
                        }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full"
                      />
                    </div>
                  )}
                </div>

                {/* Levels Grid */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    All Levels
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {levels.map((level) => {
                      const isCurrent = level.id === currentLevel.id;
                      const isUnlocked = (currentXP || 0) >= level.minXP;
                      
                      return (
                        <motion.div
                          key={level.id}
                          whileHover={isUnlocked ? { scale: 1.02 } : {}}
                          className={`relative rounded-xl p-5 border-2 transition-all ${
                            isCurrent 
                              ? `bg-gradient-to-br ${level.color} border-transparent text-white` 
                              : isUnlocked
                              ? 'bg-white border-gray-200 hover:border-gray-300'
                              : 'bg-gray-50 border-gray-200 opacity-60'
                          }`}
                        >
                          {isCurrent && (
                            <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                              Current
                            </div>
                          )}
                          
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{level.emoji}</span>
                                <h4 className={`text-lg font-bold ${isCurrent ? 'text-white' : 'text-gray-900'}`}>
                                  {level.name}
                                </h4>
                              </div>
                              <p className={`text-sm mt-1 ${isCurrent ? 'text-white/90' : 'text-gray-600'}`}>
                                {level.minXP.toLocaleString()} - {level.maxXP === Infinity ? '∞' : level.maxXP.toLocaleString()} XP
                              </p>
                            </div>
                            {!isUnlocked && (
                              <span className="text-2xl opacity-50">🔒</span>
                            )}
                          </div>

                          <div className={`pt-3 border-t ${isCurrent ? 'border-white/20' : 'border-gray-200'}`}>
                            <p className={`text-xs font-semibold mb-2 ${isCurrent ? 'text-white/80' : 'text-gray-500'}`}>
                              BENEFITS
                            </p>
                            <ul className={`text-xs space-y-1 ${isCurrent ? 'text-white/80' : 'text-gray-600'}`}>
                              {level.benefits.map((benefit, idx) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <span>•</span>
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* XP Activities */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    How to Earn XP
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {xpActivities.map((item, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{item.activity}</span>
                          <span className="text-green-600 font-bold">{item.xp}</span>
                        </div>
                        <p className="text-xs text-gray-600">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                    Pro Tips for Leveling Up
                  </h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>Focus on quality trends that get validated for maximum XP</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>Participate in Lightning Rounds during peak hours for 3x XP</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>Make accurate predictions on validated trends for huge XP rewards</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>Maintain daily streaks to multiply all your XP earnings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>Higher levels unlock more weight in trend validation voting</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}