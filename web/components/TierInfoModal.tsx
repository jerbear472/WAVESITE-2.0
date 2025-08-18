'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, TrendingUp, Zap, Star, Info, DollarSign, Target } from 'lucide-react';
import { SUSTAINABLE_EARNINGS } from '@/lib/SUSTAINABLE_EARNINGS';

interface TierInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: string;
}

export default function TierInfoModal({ isOpen, onClose, currentTier = 'learning' }: TierInfoModalProps) {
  const tiers = [
    {
      name: 'Learning',
      id: 'learning',
      emoji: '📚',
      color: 'from-gray-500 to-gray-600',
      borderColor: 'border-gray-500',
      multiplier: 1.0,
      dailyCap: 50,
      requirements: {
        trends: 0,
        approvalRate: 0,
        qualityScore: 0
      },
      benefits: [
        'Base earnings rate',
        'Access to all features',
        'Community support',
        'Learning resources'
      ]
    },
    {
      name: 'Verified',
      id: 'verified',
      emoji: '✅',
      color: 'from-blue-500 to-blue-600',
      borderColor: 'border-blue-500',
      multiplier: 1.5,
      dailyCap: 75,
      requirements: {
        trends: 10,
        approvalRate: 60,
        qualityScore: 60
      },
      benefits: [
        '1.5x earnings multiplier',
        'Priority validation queue',
        'Advanced analytics',
        'Verified badge'
      ]
    },
    {
      name: 'Elite',
      id: 'elite',
      emoji: '⭐',
      color: 'from-purple-500 to-purple-600',
      borderColor: 'border-purple-500',
      multiplier: 2.0,
      dailyCap: 100,
      requirements: {
        trends: 50,
        approvalRate: 75,
        qualityScore: 75
      },
      benefits: [
        '2x earnings multiplier',
        'Elite spotter badge',
        'Trend insights access',
        'Monthly bonus pool'
      ]
    },
    {
      name: 'Master',
      id: 'master',
      emoji: '👑',
      color: 'from-yellow-500 to-orange-500',
      borderColor: 'border-yellow-500',
      multiplier: 3.0,
      dailyCap: 150,
      requirements: {
        trends: 100,
        approvalRate: 85,
        qualityScore: 85
      },
      benefits: [
        '3x earnings multiplier',
        'Master spotter badge',
        'Early access features',
        'Exclusive rewards'
      ]
    }
  ];

  const streakMultipliers = {
    session: [
      { range: '1st trend', multiplier: '1.0x', description: 'Base rate' },
      { range: '2nd trend', multiplier: '1.2x', description: '20% bonus' },
      { range: '3rd trend', multiplier: '1.5x', description: '50% bonus' },
      { range: '4th trend', multiplier: '2.0x', description: '100% bonus' },
      { range: '5+ trends', multiplier: '2.5x', description: '150% bonus' }
    ],
    daily: [
      { range: '0-1 days', multiplier: '1.0x', description: 'No streak yet' },
      { range: '2-6 days', multiplier: '1.2x', description: 'Building momentum' },
      { range: '7-13 days', multiplier: '1.5x', description: 'Getting consistent' },
      { range: '14-29 days', multiplier: '2.0x', description: 'On fire!' },
      { range: '30+ days', multiplier: '2.5x', description: 'Legendary!' }
    ]
  };

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
            <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto border border-gray-800">
              {/* Header */}
              <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Performance Tiers & Multipliers</h2>
                      <p className="text-gray-400 mt-1">Earn more as you level up your spotting skills</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-8">
                {/* Earnings Formula */}
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <h3 className="text-lg font-semibold text-white">Earnings Formula</h3>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 font-mono text-center">
                    <span className="text-gray-400">$0.25</span>
                    <span className="text-gray-500 mx-2">×</span>
                    <span className="text-blue-400">Tier</span>
                    <span className="text-gray-500 mx-2">×</span>
                    <span className="text-purple-400">Session</span>
                    <span className="text-gray-500 mx-2">×</span>
                    <span className="text-orange-400">Daily Streak</span>
                    <span className="text-gray-500 mx-2">=</span>
                    <span className="text-green-400 font-bold">Final Earnings</span>
                  </div>
                  <p className="text-gray-400 text-sm mt-3 text-center">
                    Stack multipliers to maximize your earnings per trend!
                  </p>
                </div>

                {/* Tiers Grid */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    Performance Tiers
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tiers.map((tier) => {
                      const isCurrent = tier.id === currentTier?.toLowerCase();
                      return (
                        <motion.div
                          key={tier.id}
                          whileHover={{ scale: 1.02 }}
                          className={`relative rounded-xl p-5 border-2 transition-all ${
                            isCurrent 
                              ? `bg-gradient-to-br ${tier.color} border-transparent` 
                              : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
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
                                <span className="text-2xl">{tier.emoji}</span>
                                <h4 className={`text-lg font-bold ${isCurrent ? 'text-white' : 'text-gray-200'}`}>
                                  {tier.name}
                                </h4>
                              </div>
                              <div className="flex items-center gap-3 mt-2">
                                <span className={`text-2xl font-bold ${isCurrent ? 'text-white' : 'text-green-400'}`}>
                                  {tier.multiplier}x
                                </span>
                                <span className={`text-sm ${isCurrent ? 'text-white/80' : 'text-gray-400'}`}>
                                  ${tier.dailyCap}/day cap
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className={`space-y-2 mb-3 text-sm ${isCurrent ? 'text-white/90' : 'text-gray-400'}`}>
                            <div className="flex items-center justify-between">
                              <span>Trends Required:</span>
                              <span className="font-semibold">{tier.requirements.trends}+</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Approval Rate:</span>
                              <span className="font-semibold">{tier.requirements.approvalRate}%+</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Quality Score:</span>
                              <span className="font-semibold">{tier.requirements.qualityScore}%+</span>
                            </div>
                          </div>

                          <div className={`pt-3 border-t ${isCurrent ? 'border-white/20' : 'border-gray-700'}`}>
                            <p className={`text-xs font-semibold mb-2 ${isCurrent ? 'text-white/80' : 'text-gray-500'}`}>
                              BENEFITS
                            </p>
                            <ul className={`text-xs space-y-1 ${isCurrent ? 'text-white/80' : 'text-gray-500'}`}>
                              {tier.benefits.map((benefit, idx) => (
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

                {/* Streak Multipliers */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Streak Multipliers
                  </h3>

                  {/* Session Streaks */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Session Streak (Within 5 minutes)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {streakMultipliers.session.map((item, idx) => (
                        <div key={idx} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                          <div className="text-yellow-400 font-bold text-lg">{item.multiplier}</div>
                          <div className="text-gray-300 text-sm font-medium">{item.range}</div>
                          <div className="text-gray-500 text-xs mt-1">{item.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Daily Streaks */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Daily Streak</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {streakMultipliers.daily.map((item, idx) => (
                        <div key={idx} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                          <div className="text-orange-400 font-bold text-lg">{item.multiplier}</div>
                          <div className="text-gray-300 text-sm font-medium">{item.range}</div>
                          <div className="text-gray-500 text-xs mt-1">{item.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Example Calculation */}
                <div className="bg-green-500/10 rounded-xl p-6 border border-green-500/20">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-green-400" />
                    Example Calculation
                  </h3>
                  <div className="space-y-3">
                    <p className="text-gray-300">
                      An <span className="text-purple-400 font-semibold">Elite</span> spotter with a{' '}
                      <span className="text-yellow-400 font-semibold">5-trend session streak</span> and a{' '}
                      <span className="text-orange-400 font-semibold">7-day daily streak</span>:
                    </p>
                    <div className="bg-gray-800/50 rounded-lg p-4 font-mono">
                      <div className="text-sm space-y-1">
                        <div>Base: <span className="text-green-400">$0.25</span></div>
                        <div>Elite Tier: <span className="text-purple-400">× 2.0</span></div>
                        <div>Session (5 trends): <span className="text-yellow-400">× 1.3</span></div>
                        <div>Daily (7 days): <span className="text-orange-400">× 1.5</span></div>
                        <div className="border-t border-gray-700 pt-2 mt-2">
                          <span className="text-gray-400">Total:</span>{' '}
                          <span className="text-green-400 font-bold text-lg">$0.98 per trend</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-blue-500/10 rounded-xl p-6 border border-blue-500/20">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-400" />
                    Pro Tips
                  </h3>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Submit trends in quick succession (within 5 minutes) to build session streaks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Maintain daily activity to maximize your daily streak multiplier</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Focus on quality over quantity to improve your approval rate</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Higher tiers unlock bigger multipliers and daily earning caps</span>
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