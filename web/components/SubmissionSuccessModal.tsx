'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Clock, 
  Zap,
  Trophy,
  Sparkles,
  ArrowRight,
  X,
  Star
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCurrency } from '@/lib/SUSTAINABLE_EARNINGS';

interface SubmissionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  earnings: {
    base: number;
    potential: number;
    tierMultiplier: number;
    sessionMultiplier: number;
    dailyMultiplier: number;
    tier: string;
    tierEmoji: string;
    sessionPosition?: number;
    dailyStreak?: number;
  };
  trendData: {
    title: string;
    category: string;
    velocity: string;
  };
}

export default function SubmissionSuccessModal({
  isOpen,
  onClose,
  earnings,
  trendData
}: SubmissionSuccessModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Trigger confetti on mount
  useEffect(() => {
    if (isOpen) {
      // Center burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B']
      });

      // Side bursts
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#3B82F6', '#8B5CF6']
        });
      }, 200);

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10B981', '#F59E0B']
        });
      }, 400);

      // Animate through steps
      const timer1 = setTimeout(() => setCurrentStep(1), 500);
      const timer2 = setTimeout(() => setCurrentStep(2), 1500);
      const timer3 = setTimeout(() => setCurrentStep(3), 2500);
      const timer4 = setTimeout(() => setShowBreakdown(true), 3500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [isOpen]);

  const totalMultiplier = earnings.tierMultiplier * earnings.sessionMultiplier * earnings.dailyMultiplier;
  const hasMultipliers = totalMultiplier > 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg"
          >
            {/* Main Card */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>

              {/* Success Header */}
              <div className="relative p-8 text-center bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="inline-flex items-center justify-center w-20 h-20 mb-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-lg"
                >
                  <CheckCircle className="w-10 h-10 text-white" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold text-white mb-2"
                >
                  Trend Submitted! 🎉
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-300"
                >
                  {trendData.title}
                </motion.p>

                {/* Category and Velocity badges */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-center gap-2 mt-4"
                >
                  <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-sm text-blue-300">
                    {trendData.category}
                  </span>
                  <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-300">
                    {trendData.velocity}
                  </span>
                </motion.div>
              </div>

              {/* Earnings Preview */}
              <div className="p-8 space-y-6">
                {/* Potential Earnings Display */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-center"
                >
                  <div className="text-sm text-gray-400 mb-2">Potential Earnings</div>
                  <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-green-400 to-blue-400">
                    {formatCurrency(earnings.potential)}
                  </div>
                  
                  {hasMultipliers && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                      className="mt-2 text-sm text-gray-400"
                    >
                      {totalMultiplier.toFixed(1)}x multiplier active! 🔥
                    </motion.div>
                  )}
                </motion.div>

                {/* Animated Progress Steps */}
                <div className="space-y-4">
                  <AnimatedStep
                    icon={<TrendingUp className="w-5 h-5" />}
                    title="Submitted to Community"
                    description="Your trend is now being reviewed"
                    isActive={currentStep >= 1}
                    color="blue"
                  />
                  
                  <AnimatedStep
                    icon={<Users className="w-5 h-5" />}
                    title="Awaiting Validation"
                    description="Need 3 verify votes to earn"
                    isActive={currentStep >= 2}
                    color="purple"
                  />
                  
                  <AnimatedStep
                    icon={<DollarSign className="w-5 h-5" />}
                    title="Earnings Pending"
                    description={`${formatCurrency(earnings.potential)} will be added once verified`}
                    isActive={currentStep >= 3}
                    color="green"
                  />
                </div>

                {/* Earnings Breakdown */}
                <AnimatePresence>
                  {showBreakdown && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-gray-800/50 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Base Amount</span>
                          <span className="text-white font-medium">{formatCurrency(earnings.base)}</span>
                        </div>
                        
                        {earnings.tierMultiplier > 1 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">
                              {earnings.tierEmoji} {earnings.tier} Tier
                            </span>
                            <span className="text-blue-400 font-medium">×{earnings.tierMultiplier}</span>
                          </div>
                        )}
                        
                        {earnings.sessionMultiplier > 1 && earnings.sessionPosition && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">
                              <Zap className="inline w-3 h-3 mr-1" />
                              Session Streak #{earnings.sessionPosition}
                            </span>
                            <span className="text-yellow-400 font-medium">×{earnings.sessionMultiplier}</span>
                          </div>
                        )}
                        
                        {earnings.dailyMultiplier > 1 && earnings.dailyStreak && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">
                              <Trophy className="inline w-3 h-3 mr-1" />
                              {earnings.dailyStreak} Day Streak
                            </span>
                            <span className="text-orange-400 font-medium">×{earnings.dailyMultiplier}</span>
                          </div>
                        )}
                        
                        <div className="pt-2 mt-2 border-t border-gray-700">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300 font-medium">Total Potential</span>
                            <span className="text-lg font-bold text-green-400">
                              {formatCurrency(earnings.potential)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="flex gap-3"
                >
                  <button
                    onClick={() => {
                      onClose();
                      // Navigate to dashboard
                      window.location.href = '/dashboard';
                    }}
                    className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-medium transition-colors"
                  >
                    View Dashboard
                  </button>
                  
                  <button
                    onClick={onClose}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2"
                  >
                    Submit Another
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>

                {/* Trust Indicator */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                  className="text-center"
                >
                  <p className="text-xs text-gray-500">
                    <Sparkles className="inline w-3 h-3 mr-1" />
                    Earnings are tracked in real-time and paid out weekly
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Animated step component
function AnimatedStep({ 
  icon, 
  title, 
  description, 
  isActive, 
  color 
}: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  isActive: boolean;
  color: 'blue' | 'purple' | 'green';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 border-blue-500',
    purple: 'from-purple-500 to-purple-600 border-purple-500',
    green: 'from-green-500 to-green-600 border-green-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: isActive ? 1 : 0.3, x: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-start gap-3"
    >
      <div className={`p-2 rounded-lg ${
        isActive 
          ? `bg-gradient-to-br ${colorClasses[color]}` 
          : 'bg-gray-700'
      } transition-all duration-500`}>
        <div className="text-white">{icon}</div>
      </div>
      <div className="flex-1">
        <h4 className={`font-semibold ${isActive ? 'text-white' : 'text-gray-500'} transition-colors duration-500`}>
          {title}
        </h4>
        <p className={`text-sm ${isActive ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-500`}>
          {description}
        </p>
      </div>
      {isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="mt-1"
        >
          <CheckCircle className="w-5 h-5 text-green-400" />
        </motion.div>
      )}
    </motion.div>
  );
}