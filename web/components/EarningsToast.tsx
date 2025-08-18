'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, CheckCircle, Clock } from 'lucide-react';

interface EarningsToastProps {
  amount: number;
  type: 'pending' | 'approved' | 'bonus';
  message?: string;
  duration?: number;
}

export function EarningsToast({ amount, type, message, duration = 4000 }: EarningsToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const getIcon = () => {
    switch (type) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'bonus':
        return <TrendingUp className="w-5 h-5 text-purple-400" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'approved':
        return 'from-green-500/20 to-green-600/20 border-green-500/30';
      case 'bonus':
        return 'from-purple-500/20 to-purple-600/20 border-purple-500/30';
      default:
        return 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="fixed bottom-6 left-6 z-50"
        >
          <div className={`bg-gradient-to-r ${getColors()} backdrop-blur-xl rounded-lg p-4 border shadow-2xl max-w-sm`}>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {getIcon()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-lg font-bold text-white">+${amount.toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-300 mt-1">
                  {message || (type === 'pending' ? 'Pending approval' : 'Earnings confirmed')}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Toast manager to handle multiple toasts
interface ToastData {
  id: string;
  amount: number;
  type: 'pending' | 'approved' | 'bonus';
  message?: string;
}

export function useEarningsToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showEarningsToast = (amount: number, type: 'pending' | 'approved' | 'bonus' = 'pending', message?: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, amount, type, message }]);
    
    // Remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  return { toasts, showEarningsToast };
}

// Container component for managing multiple toasts
export function EarningsToastContainer({ toasts }: { toasts: ToastData[] }) {
  return (
    <div className="fixed bottom-6 left-6 z-50 space-y-3">
      <AnimatePresence>
        {toasts.map((toast, index) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: -50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.9 }}
            transition={{ type: 'spring', duration: 0.5, delay: index * 0.1 }}
            style={{ marginBottom: index < toasts.length - 1 ? '12px' : 0 }}
          >
            <div className={`bg-gradient-to-r ${
              toast.type === 'approved' 
                ? 'from-green-500/20 to-green-600/20 border-green-500/30'
                : toast.type === 'bonus'
                ? 'from-purple-500/20 to-purple-600/20 border-purple-500/30'
                : 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30'
            } backdrop-blur-xl rounded-lg p-4 border shadow-2xl min-w-[280px]`}>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {toast.type === 'approved' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : toast.type === 'bonus' ? (
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                  ) : (
                    <Clock className="w-5 h-5 text-yellow-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span className="text-lg font-bold text-white">+${toast.amount.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">
                    {toast.message || (toast.type === 'pending' ? 'Pending approval' : 'Earnings confirmed')}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}