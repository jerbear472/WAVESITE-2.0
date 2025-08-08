'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign } from 'lucide-react';

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
  useEffect(() => {
    if (show && onComplete) {
      // Auto-hide after 2 seconds
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
      >
        <div className="bg-green-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          <span className="font-bold text-lg">+${amount.toFixed(2)}</span>
          {multiplier > 1 && (
            <span className="text-sm bg-green-600 px-2 py-0.5 rounded-full">
              {multiplier}x
            </span>
          )}
        </div>
      </motion.div>
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