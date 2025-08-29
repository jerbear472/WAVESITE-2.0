'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function StabilityMonitor() {
  const [showWarning, setShowWarning] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    // Monitor for repeated errors
    const handleError = (event: ErrorEvent) => {
      setErrorCount(prev => {
        const newCount = prev + 1;
        if (newCount >= 3) {
          setShowWarning(true);
        }
        return newCount;
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      setErrorCount(prev => {
        const newCount = prev + 1;
        if (newCount >= 3) {
          setShowWarning(true);
        }
        return newCount;
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Reset error count every 30 seconds
    const resetInterval = setInterval(() => {
      setErrorCount(0);
      setShowWarning(false);
    }, 30000);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      clearInterval(resetInterval);
    };
  }, []);

  if (!showWarning) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-yellow-900/90 backdrop-blur border border-yellow-700 rounded-lg shadow-lg p-4 z-[9999]">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-yellow-100 mb-1">
            App Stability Issue
          </h3>
          <p className="text-xs text-yellow-200 mb-3">
            Multiple errors detected. The app may not be working correctly.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowWarning(false);
                setErrorCount(0);
              }}
              className="text-xs px-2 py-1 bg-yellow-800/50 hover:bg-yellow-800 text-yellow-100 rounded transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={() => window.location.reload()}
              className="text-xs px-2 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Reload Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}