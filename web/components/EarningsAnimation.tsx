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
      // Auto-hide after 3 seconds (longer for subtle notification)
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -50, scale: 0.8 }}
        animate={{ opacity: 0.9, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -50, scale: 0.8 }}
        className="fixed bottom-6 left-6 z-50"
      >
        <div className="bg-green-500/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg shadow-sm flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4" />
          <span className="font-medium">+${amount.toFixed(2)}</span>
          {multiplier > 1 && (
            <span className="text-xs bg-green-600/60 px-1.5 py-0.5 rounded">
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