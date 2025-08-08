'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, TrendingUp, Zap, Award, DollarSign } from 'lucide-react';

interface EarningsAnimationProps {
  amount: number;
  show: boolean;
  bonuses?: string[];
  multiplier?: number;
  onComplete?: () => void;
}

export const EarningsAnimation: React.FC<EarningsAnimationProps> = ({ 
  amount, 
  show, 
  bonuses = [],
  multiplier = 1,
  onComplete 
}) => {
  const [displayAmount, setDisplayAmount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (show && amount > 0) {
      // Animate the amount counting up
      const duration = 1500;
      const steps = 60;
      const increment = amount / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= amount) {
          setDisplayAmount(amount);
          clearInterval(timer);
          setShowDetails(true);
          
          // Call onComplete after animation
          setTimeout(() => {
            onComplete?.();
          }, 2000);
        } else {
          setDisplayAmount(current);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [show, amount, onComplete]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        {/* Background overlay with blur */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto"
          onClick={onComplete}
        />

        {/* Main earning animation container */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative z-10"
        >
          {/* Coin burst effect */}
          <div className="absolute inset-0 flex items-center justify-center">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{ 
                  scale: [0, 1.5, 0],
                  x: Math.cos(i * Math.PI / 4) * 150,
                  y: Math.sin(i * Math.PI / 4) * 150,
                  opacity: [1, 1, 0]
                }}
                transition={{ 
                  duration: 1.5, 
                  delay: 0.1 * i,
                  ease: "easeOut"
                }}
                className="absolute"
              >
                <Coins className="w-8 h-8 text-yellow-400" />
              </motion.div>
            ))}
          </div>

          {/* Main card */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 shadow-2xl border border-wave-500/30 min-w-[320px]"
          >
            {/* Success icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="flex justify-center mb-4"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
            </motion.div>

            {/* Amount display */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center mb-4"
            >
              <div className="text-sm text-wave-400 mb-1">You earned</div>
              <div className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                ${displayAmount.toFixed(2)}
              </div>
            </motion.div>

            {/* Multiplier badge if applicable */}
            {multiplier > 1 && (
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.6, type: "spring" }}
                className="flex justify-center mb-3"
              >
                <div className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-white text-sm font-semibold flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  {multiplier}x Streak Multiplier!
                </div>
              </motion.div>
            )}

            {/* Bonuses */}
            <AnimatePresence>
              {showDetails && bonuses.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="space-y-2 mt-4 pt-4 border-t border-wave-700/50"
                >
                  <div className="text-xs text-wave-400 text-center mb-2">Bonuses applied:</div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {bonuses.map((bonus, index) => (
                      <motion.div
                        key={bonus}
                        initial={{ scale: 0, x: -20 }}
                        animate={{ scale: 1, x: 0 }}
                        transition={{ delay: 0.9 + index * 0.1 }}
                        className="px-2 py-1 bg-wave-700/50 rounded-lg text-xs text-wave-300 flex items-center gap-1"
                      >
                        <Award className="w-3 h-3" />
                        {bonus}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Continue button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              onClick={onComplete}
              className="w-full mt-6 py-3 bg-gradient-to-r from-wave-500 to-wave-600 rounded-xl text-white font-semibold hover:from-wave-400 hover:to-wave-500 transition-all"
            >
              Continue Earning
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Floating dollar signs animation */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`dollar-${i}`}
            initial={{ y: 100, opacity: 0 }}
            animate={{ 
              y: -100, 
              opacity: [0, 1, 1, 0],
              x: Math.random() * 200 - 100
            }}
            transition={{ 
              duration: 2, 
              delay: 0.2 + i * 0.2,
              ease: "easeOut"
            }}
            className="absolute"
            style={{ 
              left: `${50 + Math.random() * 30 - 15}%`,
              top: '50%'
            }}
          >
            <DollarSign className="w-6 h-6 text-green-400" />
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
};

// Export a hook for easy integration
export const useEarningsAnimation = () => {
  const [showEarnings, setShowEarnings] = useState(false);
  const [earningsData, setEarningsData] = useState<{
    amount: number;
    bonuses: string[];
    multiplier: number;
  }>({
    amount: 0,
    bonuses: [],
    multiplier: 1
  });

  const showEarningsAnimation = (amount: number, bonuses: string[] = [], multiplier: number = 1) => {
    setEarningsData({ amount, bonuses, multiplier });
    setShowEarnings(true);
  };

  const hideEarningsAnimation = () => {
    setShowEarnings(false);
  };

  return {
    showEarnings,
    earningsData,
    showEarningsAnimation,
    hideEarningsAnimation
  };
};