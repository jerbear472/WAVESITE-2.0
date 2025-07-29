'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  AlertCircle as AlertCircleIcon,
  Info as InfoIcon,
  X as XIcon,
  RefreshCw as RefreshIcon
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const toastStyles = {
  success: {
    bg: 'bg-green-900/90',
    border: 'border-green-600/50',
    icon: CheckCircleIcon,
    iconColor: 'text-green-400'
  },
  error: {
    bg: 'bg-red-900/90',
    border: 'border-red-600/50',
    icon: XCircleIcon,
    iconColor: 'text-red-400'
  },
  warning: {
    bg: 'bg-yellow-900/90',
    border: 'border-yellow-600/50',
    icon: AlertCircleIcon,
    iconColor: 'text-yellow-400'
  },
  info: {
    bg: 'bg-blue-900/90',
    border: 'border-blue-600/50',
    icon: InfoIcon,
    iconColor: 'text-blue-400'
  }
};

export default function Toast({ toast, onDismiss }: ToastProps) {
  const style = toastStyles[toast.type];
  const Icon = style.icon;

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`
        pointer-events-auto max-w-sm w-full ${style.bg} 
        backdrop-blur-md rounded-xl shadow-2xl border ${style.border}
        overflow-hidden
      `}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 ${style.iconColor}`} />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-gray-100">
              {toast.title}
            </p>
            {toast.message && (
              <p className="mt-1 text-sm text-gray-300">
                {toast.message}
              </p>
            )}
            {toast.action && (
              <div className="mt-3">
                <button
                  onClick={toast.action.onClick}
                  className="text-sm font-medium text-white hover:text-gray-200 
                           bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg
                           transition-all inline-flex items-center gap-2"
                >
                  {toast.action.label}
                  {toast.action.label === 'Retry' && (
                    <RefreshIcon className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => onDismiss(toast.id)}
              className="rounded-lg inline-flex text-gray-400 hover:text-gray-200
                       focus:outline-none focus:ring-2 focus:ring-offset-2 
                       focus:ring-offset-gray-900 focus:ring-gray-500
                       transition-colors p-1.5 hover:bg-white/10"
            >
              <span className="sr-only">Close</span>
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Progress bar for timed toasts */}
      {toast.duration && toast.duration > 0 && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: toast.duration / 1000, ease: "linear" }}
          className="h-1 bg-white/20 origin-left"
          style={{ transformOrigin: 'left' }}
        />
      )}
    </motion.div>
  );
}