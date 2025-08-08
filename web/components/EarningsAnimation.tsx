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
    if (show) {
      console.log('EarningsAnimation showing with amount:', amount, 'multiplier:', multiplier);
      if (onComplete) {
        // Auto-hide after 4 seconds for better visibility
        const timer = setTimeout(() => {
          console.log('EarningsAnimation hiding');
          onComplete();
        }, 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [show, onComplete, amount, multiplier]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.5 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.5 }}
        transition={{ 
          type: "spring",
          damping: 15,
          stiffness: 300
        }}
        className="fixed bottom-8 left-8 z-[9999] pointer-events-none"
      >
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3">
          <div className="bg-white/20 rounded-full p-2">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg">+${amount.toFixed(2)}</span>
            {bonuses.length > 0 && (
              <span className="text-xs opacity-90">
                {bonuses.slice(0, 2).join(', ')}
                {bonuses.length > 2 && ` +${bonuses.length - 2} more`}
              </span>
            )}
          </div>
          {multiplier > 1 && (
            <span className="text-sm bg-white/20 px-2 py-1 rounded-full font-bold">
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