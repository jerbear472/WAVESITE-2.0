'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SimpleEarningsNotification {
  id: string;
  amount: number;
  timestamp: number;
}

interface SimpleEarningsNotificationProps {
  notification: SimpleEarningsNotification | null;
  onDismiss?: () => void;
}

export default function SimpleEarningsNotificationComponent({ 
  notification, 
  onDismiss 
}: SimpleEarningsNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss?.(), 200);
      }, 2000); // Show for only 2 seconds
      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  if (!notification) return null;

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
          <div className="bg-green-500 text-white rounded-full px-4 py-2 shadow-lg">
            <span className="font-bold text-lg">
              +${notification.amount.toFixed(2)}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for simple earnings notifications
export function useSimpleEarningsNotification() {
  const [notification, setNotification] = useState<SimpleEarningsNotification | null>(null);

  const showEarnings = (amount: number) => {
    const newNotification: SimpleEarningsNotification = {
      id: `${Date.now()}-${Math.random()}`,
      amount,
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