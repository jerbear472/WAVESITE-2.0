'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles as SparklesIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  Loader2 as LoaderIcon,
  AlertCircle as AlertIcon,
  CheckCircle as CheckIcon,
  Bot as BotIcon,
  Zap as ZapIcon,
  RefreshCw as RefreshIcon,
  Clock as ClockIcon
} from 'lucide-react';

interface AIAnalysisProps {
  trendData: any;
  onContinue: (analysis?: string) => void;
  onBack: () => void;
  visible: boolean;
}

export default function AIAnalysis({ trendData, onContinue, onBack, visible }: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [cached, setCached] = useState(false);

  useEffect(() => {
    if (visible && !analysis) {
      generateAnalysis();
    }
  }, [visible]);

  const generateAnalysis = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/analyze-trend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trendData),
      });

      const data = await response.json();
      
      if (data.error) {
        setError('Using fallback analysis due to API limitations');
      }
      
      setAnalysis(data.analysis);
      setCached(data.cached || false);
    } catch (err) {
      console.error('Error fetching analysis:', err);
      setError('Failed to generate analysis. Please try again.');
      // Set a fallback analysis
      setAnalysis(`This **${trendData.category}** trend is gaining momentum on ${trendData.platform}. 
With **${trendData.trendVelocity}** velocity and ${trendData.sentiment}% positive sentiment, 
the commercial opportunity is **immediate**. Brands should leverage authentic creator partnerships 
targeting ${trendData.audienceAge?.join(', ') || 'broad'} demographics. 
**Key insight**: The trend's unique positioning creates a narrow but high-impact window for engagement.`);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl shadow-lg">
              <BotIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">WaveSight AI</h3>
              <p className="text-sm text-gray-600">Your Trend Discovery Validation</p>
            </div>
          </div>
          {cached && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <ZapIcon className="w-3 h-3" />
              <span>Cached</span>
            </div>
          )}
        </div>

        {/* Analysis Content */}
        <div className="relative">
          {loading ? (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 flex flex-col items-center justify-center min-h-[200px]">
              <LoaderIcon className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <p className="text-gray-600 font-medium">Analyzing your discovery...</p>
              <p className="text-sm text-gray-500 mt-1">Checking how early you caught this</p>
            </div>
          ) : (
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="relative"
            >
              {/* Decorative background */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 via-blue-100/50 to-green-100/50 rounded-xl blur-2xl" />
              
              {/* Main analysis card */}
              <div className="relative bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-xl p-6">
                {/* AI Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-full text-sm font-medium">
                    <SparklesIcon className="w-4 h-4" />
                    <span>YOUR DISCOVERY ANALYSIS</span>
                  </div>
                  {error && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                      <AlertIcon className="w-3 h-3" />
                      <span>Fallback Mode</span>
                    </div>
                  )}
                </div>

                {/* Analysis Text */}
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-800 leading-relaxed text-base" 
                     dangerouslySetInnerHTML={{ __html: analysis.replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-600 font-semibold">$1</strong>') }} />
                </div>

                {/* Confidence Indicators */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <CheckIcon className="w-3 h-3 text-green-500" />
                        <span>Early Catch Confirmed</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3 text-blue-500" />
                        <span>Ahead of the Curve</span>
                      </div>
                    </div>
                    <button
                      onClick={generateAnalysis}
                      className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded-lg transition-colors"
                      disabled={loading}
                    >
                      <RefreshIcon className="w-3 h-3" />
                      <span>Regenerate</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            <span>Edit Submission</span>
          </button>
          
          <button
            onClick={() => onContinue(analysis)}
            disabled={loading || !analysis}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Continue to Submit</span>
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            <strong>Note:</strong> This analysis confirms how early you caught this trend and will be saved with your submission. 
            Other spotters will see you were one of the first to identify this!
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Add missing import
import { Clock as ClockIcon } from 'lucide-react';