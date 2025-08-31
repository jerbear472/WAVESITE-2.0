'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  X, 
  Loader, 
  RefreshCw,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { checkSubmissionStatus, retrySubmission } from '@/lib/submitTrendInstant';

interface SubmissionProgressProps {
  submissionId: string;
  onComplete?: () => void;
  onRetry?: () => void;
}

export default function SubmissionProgress({ 
  submissionId, 
  onComplete,
  onRetry 
}: SubmissionProgressProps) {
  const [status, setStatus] = useState<string>('pending');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    // Check status every 500ms
    const interval = setInterval(() => {
      const submission = checkSubmissionStatus(submissionId);
      if (submission) {
        setStatus(submission.status);
        setError(submission.error || null);
        setAttempts(submission.attempts);

        if (submission.status === 'completed') {
          clearInterval(interval);
          setTimeout(() => {
            onComplete?.();
          }, 2000); // Show success for 2 seconds
        } else if (submission.status === 'failed' && submission.attempts >= 3) {
          clearInterval(interval);
        }
      }
    }, 500);

    // Listen for completion events
    const handleComplete = (e: CustomEvent) => {
      if (e.detail.id === submissionId) {
        setStatus('completed');
        clearInterval(interval);
        setTimeout(() => {
          onComplete?.();
        }, 2000);
      }
    };

    const handleFailed = (e: CustomEvent) => {
      if (e.detail.id === submissionId) {
        setStatus('failed');
        setError(e.detail.error);
        clearInterval(interval);
      }
    };

    window.addEventListener('submissionComplete' as any, handleComplete);
    window.addEventListener('submissionFailed' as any, handleFailed);

    return () => {
      clearInterval(interval);
      window.removeEventListener('submissionComplete' as any, handleComplete);
      window.removeEventListener('submissionFailed' as any, handleFailed);
    };
  }, [submissionId, onComplete]);

  const handleRetry = () => {
    setStatus('pending');
    setError(null);
    retrySubmission(submissionId);
    onRetry?.();
  };

  const getStatusDisplay = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="w-5 h-5" />,
          text: 'Queued...',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/10',
          borderColor: 'border-yellow-400/20'
        };
      case 'processing':
        return {
          icon: <Loader className="w-5 h-5 animate-spin" />,
          text: attempts > 1 ? `Processing (Retry ${attempts})...` : 'Processing...',
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/10',
          borderColor: 'border-blue-400/20'
        };
      case 'completed':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          text: 'Success!',
          color: 'text-green-400',
          bgColor: 'bg-green-400/10',
          borderColor: 'border-green-400/20'
        };
      case 'failed':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          text: 'Failed',
          color: 'text-red-400',
          bgColor: 'bg-red-400/10',
          borderColor: 'border-red-400/20'
        };
      default:
        return {
          icon: <Loader className="w-5 h-5" />,
          text: 'Processing...',
          color: 'text-gray-400',
          bgColor: 'bg-gray-400/10',
          borderColor: 'border-gray-400/20'
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`
          flex items-center justify-between p-4 rounded-xl
          ${statusDisplay.bgColor} ${statusDisplay.borderColor}
          border backdrop-blur-sm
        `}
      >
        <div className="flex items-center gap-3">
          <div className={statusDisplay.color}>
            {statusDisplay.icon}
          </div>
          <div>
            <p className={`font-medium ${statusDisplay.color}`}>
              {statusDisplay.text}
            </p>
            {error && status === 'failed' && (
              <p className="text-sm text-gray-400 mt-1">
                {error}
              </p>
            )}
          </div>
        </div>

        {status === 'failed' && attempts >= 3 && (
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 
                     rounded-lg transition-colors text-white font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        )}

        {status === 'completed' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 text-green-400"
          >
            <Zap className="w-5 h-5" />
            <span className="font-bold">+10 XP</span>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}