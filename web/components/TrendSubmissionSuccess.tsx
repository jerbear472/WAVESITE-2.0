'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Users, TrendingUp, DollarSign, X } from 'lucide-react';
import { calculateAudienceSize, getNumericAudienceSize, formatAudienceSize } from '@/lib/calculateAudienceSize';

interface TrendSubmissionSuccessProps {
  show: boolean;
  trendSize?: string;
  earnings?: number;
  trendTitle?: string;
  onClose: () => void;
}

export const TrendSubmissionSuccess: React.FC<TrendSubmissionSuccessProps> = ({
  show,
  trendSize,
  earnings = 0.25,
  trendTitle = 'Trend',
  onClose
}) => {
  const audienceSize = trendSize ? calculateAudienceSize(trendSize) : '0';
  const numericAudience = trendSize ? getNumericAudienceSize(trendSize) : 0;

  useEffect(() => {
    if (show) {
      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", damping: 15, stiffness: 300 }}
          className="bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 rounded-2xl p-8 max-w-md w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white/80" />
          </button>

          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", damping: 10 }}
              className="bg-green-500 rounded-full p-4"
            >
              <CheckCircle className="w-12 h-12 text-white" />
            </motion.div>
          </div>

          {/* Title */}
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-white text-center mb-2"
          >
            TREND CAPTURED!
          </motion.h2>

          {/* Trend Title */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-purple-200 text-center mb-6"
          >
            {trendTitle}
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            {/* Earnings */}
            <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-green-400" />
                <span className="text-white font-medium">Earnings</span>
              </div>
              <span className="text-2xl font-bold text-green-400">
                ${earnings.toFixed(2)}
              </span>
            </div>

            {/* Audience */}
            <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-400" />
                <span className="text-white font-medium">Potential Audience</span>
              </div>
              <span className="text-2xl font-bold text-blue-400">
                {audienceSize}
              </span>
            </div>

            {/* Trend Score */}
            <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-purple-400" />
                <span className="text-white font-medium">Trend Score</span>
              </div>
              <span className="text-2xl font-bold text-purple-400">
                {Math.min(95, Math.round(50 + (numericAudience / 200000)))}
              </span>
            </div>
          </motion.div>

          {/* Footer message */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-purple-300 text-sm mt-6"
          >
            Your trend will be validated by the community
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};