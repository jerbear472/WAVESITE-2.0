'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingUp, Check, X } from 'lucide-react';

export interface EarningsNotification {
  id: string;
  amount: number;
  type: 'submission' | 'validation' | 'approval' | 'rejection';
  message: string;
  breakdown?: string[];
  timestamp: number;
}

interface EarningsNotificationProps {
  notification: EarningsNotification | null;
  onDismiss?: () => void;
}

export default function EarningsNotificationComponent({ 
  notification, 
  onDismiss 
}: EarningsNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      // Shorter duration for subtle validation notifications
      const duration = notification.type === 'validation' && notification.message.startsWith('+$') 
        ? 2000  // 2 seconds for validation
        : 8000; // 8 seconds for others
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss?.(), 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'submission':
        return <TrendingUp className="w-5 h-5" />;
      case 'validation':
        return <Check className="w-5 h-5" />;
      case 'approval':
        return <Check className="w-5 h-5" />;
      case 'rejection':
        return <X className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  const getTypeColor = () => {
    switch (notification.type) {
      case 'submission':
        return 'from-blue-500 to-purple-600';
      case 'validation':
        return 'from-green-500 to-emerald-600';
      case 'approval':
        return 'from-yellow-500 to-orange-600';
      case 'rejection':
        return 'from-gray-500 to-gray-600';
      default:
        return 'from-blue-500 to-purple-600';
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Subtle notification for validations
  if (notification.type === 'validation' && notification.message.startsWith('+$')) {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed bottom-6 left-6 z-50"
          >
            <div className="bg-green-500 text-white rounded-full px-5 py-2.5 shadow-lg flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span className="font-bold text-lg">
                {notification.message}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Original detailed notification for other types
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100, x: -100 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 100, x: -100 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-6 left-6 z-50 max-w-sm"
        >
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden">
            {/* Header with gradient */}
            <div className={`bg-gradient-to-r ${getTypeColor()} p-4`}>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                  {getIcon()}
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold text-2xl">
                    {formatAmount(notification.amount)}
                  </div>
                  <div className="text-white/80 text-sm">
                    {notification.type === 'submission' ? 'Pending Earnings' : 'Earned'}
                  </div>
                </div>
              </div>
            </div>

            {/* Message and breakdown */}
            <div className="p-4 space-y-3">
              <p className="text-gray-200 font-medium">
                {notification.message}
              </p>
              
              {notification.breakdown && notification.breakdown.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-gray-700/50">
                  <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">
                    Earnings Breakdown
                  </div>
                  {notification.breakdown.map((item, index) => (
                    <div key={index} className="text-sm text-gray-300 flex items-center gap-2">
                      <span className="text-gray-500">•</span>
                      {item}
                    </div>
                  ))}
                </div>
              )}

              {notification.type === 'submission' && (
                <div className="text-xs text-yellow-400/80 bg-yellow-500/10 rounded-lg p-2">
                  ⚡ Earnings pending validation (needs 3 approve votes)
                </div>
              )}
            </div>

            {/* Progress bar for auto-dismiss */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 8, ease: 'linear' }}
              className={`h-1 bg-gradient-to-r ${getTypeColor()} origin-left`}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to use earnings notifications
export function useEarningsNotification() {
  const [notification, setNotification] = useState<EarningsNotification | null>(null);

  const showEarnings = (
    amount: number,
    type: EarningsNotification['type'],
    message: string,
    breakdown?: string[]
  ) => {
    const newNotification: EarningsNotification = {
      id: `${Date.now()}-${Math.random()}`,
      amount,
      type,
      message,
      breakdown,
      timestamp: Date.now(),
    };
    setNotification(newNotification);
  };

  const dismissNotification = () => {
    setNotification(null);
  };

  return {
    notification,
    showEarnings,
    dismissNotification,
  };
}