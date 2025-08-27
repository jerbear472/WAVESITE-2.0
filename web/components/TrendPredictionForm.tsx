'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { GoogleTrendsService } from '@/services/GoogleTrendsService';
import { MetadataExtractor } from '@/lib/metadataExtractorSafe';
import {
  Link as LinkIcon,
  TrendingUp as TrendingUpIcon,
  Calendar as CalendarIcon,
  Target as TargetIcon,
  Award as AwardIcon,
  AlertCircle as AlertCircleIcon,
  ChevronRight as ChevronRightIcon,
  Loader as LoaderIcon,
  X as XIcon,
  Trophy as TrophyIcon,
  Zap as ZapIcon,
  Clock as ClockIcon,
  LineChart as LineChartIcon
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TrendPredictionData {
  url: string;
  title: string;
  keywords: string[];
  peakDate: string;
  confidence: number;
  reasoning: string;
  lifecycleStage: string;
  trendType: string;
}

interface Props {
  onClose: () => void;
  onSubmit: (data: TrendPredictionData) => Promise<void>;
}

const XP_REWARDS = {
  perfect: { days: 0, xp: 1000, label: 'Perfect Prediction!', color: 'text-yellow-400' },
  excellent: { days: 3, xp: 500, label: 'Within 3 days', color: 'text-green-400' },
  good: { days: 7, xp: 250, label: 'Within a week', color: 'text-blue-400' },
  fair: { days: 14, xp: 100, label: 'Within 2 weeks', color: 'text-purple-400' },
  participation: { days: 30, xp: 50, label: 'Within a month', color: 'text-gray-400' }
};

export default function TrendPredictionForm({ onClose, onSubmit }: Props) {
  const { user } = useAuth();
  const { showError, showSuccess, showInfo } = useToast();
  
  // Form state
  const [formData, setFormData] = useState<Partial<TrendPredictionData>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [extracting, setExtracting] = useState(false);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [confidence, setConfidence] = useState(50);
  
  // Total steps
  const totalSteps = 4;
  
  // Auto-extract metadata from URL
  const handleUrlSubmit = async () => {
    if (!formData.url) {
      showError('URL Required', 'Please enter a social media URL');
      return;
    }
    
    setExtracting(true);
    try {
      // Extract metadata
      const metadata = await MetadataExtractor.extractFromUrl(formData.url);
      
      // Extract keywords from title and hashtags
      const keywords = [
        ...(metadata.title ? metadata.title.split(' ').slice(0, 3) : []),
        ...(metadata.hashtags || []).map(h => h.replace('#', '')).slice(0, 2)
      ].filter(k => k.length > 2);
      
      setFormData(prev => ({
        ...prev,
        title: metadata.title || 'Untitled Trend',
        keywords: keywords
      }));
      
      // Fetch Google Trends data for the primary keyword
      if (keywords.length > 0) {
        await fetchTrendData(keywords[0]);
      }
      
      setCurrentStep(2);
      showSuccess('Metadata extracted', 'Now make your peak prediction');
      
    } catch (error) {
      showError('Extraction failed', 'Please check the URL and try again');
    } finally {
      setExtracting(false);
    }
  };
  
  // Fetch Google Trends data
  const fetchTrendData = async (keyword: string) => {
    setLoadingTrends(true);
    try {
      const data = await GoogleTrendsService.fetchTrendData(keyword);
      setTrendData(data);
      
      // Analyze current trend
      const analysis = GoogleTrendsService.analyzePeak(data);
      
      // Show trend status
      if (analysis.hasPeaked) {
        showInfo(
          'Trend has peaked',
          `This trend peaked on ${analysis.peakDate}. Predict when the NEXT peak will be.`
        );
      } else if (analysis.trendDirection === 'rising') {
        showInfo(
          'Trend is rising',
          'This trend is currently gaining momentum. When will it peak?'
        );
      }
      
    } catch (error) {
      console.error('Failed to fetch trends:', error);
    } finally {
      setLoadingTrends(false);
    }
  };
  
  // Calculate potential XP based on confidence
  const calculatePotentialXP = () => {
    const baseXP = 25; // Base for submission
    const maxPredictionXP = confidence > 80 ? 1000 : 
                           confidence > 60 ? 500 :
                           confidence > 40 ? 250 : 100;
    return baseXP + Math.round(maxPredictionXP * (confidence / 100));
  };
  
  // Chart configuration
  const chartData = {
    labels: trendData.map(d => d.date),
    datasets: [
      {
        label: 'Search Interest',
        data: trendData.map(d => d.value),
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgb(147, 51, 234)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        },
        ticks: {
          color: '#9ca3af',
          maxTicksLimit: 6
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)'
        },
        ticks: {
          color: '#9ca3af'
        }
      }
    }
  };
  
  // Handle submission
  const handleSubmit = async () => {
    if (!formData.peakDate) {
      showError('Peak date required', 'Please select when you think this trend will peak');
      return;
    }
    
    setSubmitting(true);
    try {
      const submissionData: TrendPredictionData = {
        url: formData.url!,
        title: formData.title!,
        keywords: formData.keywords || [],
        peakDate: formData.peakDate,
        confidence: confidence,
        reasoning: formData.reasoning || '',
        lifecycleStage: formData.lifecycleStage || 'picking_up',
        trendType: formData.trendType || 'viral'
      };
      
      await onSubmit(submissionData);
      
      showSuccess(
        `Prediction submitted! Potential XP: ${calculatePotentialXP()}`,
        'We\'ll verify your prediction with Google Trends when the date arrives'
      );
      
      onClose();
      
    } catch (error) {
      showError('Submission failed', 'Please try again');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-3xl bg-wave-900 rounded-2xl shadow-2xl border border-wave-700"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-wave-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Predict the Peak</h2>
                <p className="text-sm text-wave-400 mt-1">
                  Earn up to <span className="text-yellow-400 font-bold">1000 XP</span> for perfect predictions
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-wave-800 rounded-lg transition-colors">
                <XIcon className="w-5 h-5 text-wave-400" />
              </button>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4 flex items-center gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`flex-1 h-1 rounded-full transition-all ${
                    step <= currentStep ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 'bg-wave-800'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: URL Input */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Step 1: Enter Trend URL
                    </h3>
                    <p className="text-wave-400 text-sm mb-4">
                      Paste a URL from TikTok, Twitter, YouTube, Reddit, or Instagram
                    </p>
                    
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-wave-500" />
                      <input
                        type="url"
                        value={formData.url || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="https://..."
                        className="w-full pl-10 pr-4 py-3 bg-wave-800 border border-wave-700 rounded-lg text-white placeholder-wave-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  
                  {/* XP Rewards Display */}
                  <div className="bg-wave-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-wave-200 mb-3">🏆 XP Rewards</h4>
                    <div className="space-y-2">
                      {Object.values(XP_REWARDS).map((reward) => (
                        <div key={reward.label} className="flex items-center justify-between">
                          <span className="text-wave-400 text-sm">{reward.label}</span>
                          <span className={`font-bold ${reward.color}`}>+{reward.xp} XP</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={handleUrlSubmit}
                    disabled={!formData.url || extracting}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-400 hover:to-purple-500 transition-all flex items-center justify-center gap-2"
                  >
                    {extracting ? (
                      <>
                        <LoaderIcon className="w-5 h-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        Continue
                        <ChevronRightIcon className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </motion.div>
              )}
              
              {/* Step 2: Google Trends Data */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Step 2: Analyze Trend Data
                    </h3>
                    <p className="text-wave-400 text-sm">
                      {formData.title}
                    </p>
                  </div>
                  
                  {/* Google Trends Chart */}
                  {trendData.length > 0 && (
                    <div className="bg-wave-800/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-wave-200">Search Interest Over Time</h4>
                        <LineChartIcon className="w-4 h-4 text-wave-400" />
                      </div>
                      <div className="h-48">
                        <Line data={chartData} options={chartOptions} />
                      </div>
                    </div>
                  )}
                  
                  {loadingTrends && (
                    <div className="flex items-center justify-center py-8">
                      <LoaderIcon className="w-6 h-6 text-purple-400 animate-spin" />
                    </div>
                  )}
                  
                  {/* Keywords */}
                  <div>
                    <label className="block text-sm font-medium text-wave-200 mb-2">
                      Trend Keywords (for tracking)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {formData.keywords?.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="flex-1 py-3 bg-wave-800 text-wave-300 rounded-lg font-medium hover:bg-wave-700 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-400 hover:to-purple-500 transition-all"
                    >
                      Next
                    </button>
                  </div>
                </motion.div>
              )}
              
              {/* Step 3: Peak Prediction */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Step 3: Predict the Peak
                    </h3>
                    <p className="text-wave-400 text-sm">
                      When will this trend reach maximum search interest?
                    </p>
                  </div>
                  
                  {/* Peak Date Selection */}
                  <div>
                    <label className="block text-sm font-medium text-wave-200 mb-2">
                      Peak Date Prediction <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-wave-500" />
                      <input
                        type="date"
                        value={formData.peakDate || ''}
                        min={new Date().toISOString().split('T')[0]}
                        max={new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                        onChange={(e) => setFormData(prev => ({ ...prev, peakDate: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 bg-wave-800 border border-wave-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <p className="text-xs text-wave-500 mt-1">
                      Predictions can be up to 6 months in the future
                    </p>
                  </div>
                  
                  {/* Confidence Slider */}
                  <div>
                    <label className="block text-sm font-medium text-wave-200 mb-2">
                      Confidence Level: {confidence}%
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={confidence}
                      onChange={(e) => setConfidence(parseInt(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                    <div className="flex justify-between text-xs text-wave-500 mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                  
                  {/* Potential XP Display */}
                  <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 rounded-lg p-4 border border-purple-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-wave-300">Potential XP</p>
                        <p className="text-2xl font-bold text-white">{calculatePotentialXP()}</p>
                      </div>
                      <TrophyIcon className="w-8 h-8 text-yellow-400" />
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="flex-1 py-3 bg-wave-800 text-wave-300 rounded-lg font-medium hover:bg-wave-700 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setCurrentStep(4)}
                      disabled={!formData.peakDate}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-400 hover:to-purple-500 transition-all"
                    >
                      Next
                    </button>
                  </div>
                </motion.div>
              )}
              
              {/* Step 4: Reasoning */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Step 4: Explain Your Prediction
                    </h3>
                    <p className="text-wave-400 text-sm">
                      Optional: Share your reasoning (earns respect from the community)
                    </p>
                  </div>
                  
                  {/* Reasoning */}
                  <div>
                    <label className="block text-sm font-medium text-wave-200 mb-2">
                      Why will it peak on {formData.peakDate}?
                    </label>
                    <textarea
                      value={formData.reasoning || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, reasoning: e.target.value }))}
                      placeholder="e.g., Similar trends typically peak after 2-3 weeks, holiday season will drive interest..."
                      rows={4}
                      className="w-full px-4 py-3 bg-wave-800 border border-wave-700 rounded-lg text-white placeholder-wave-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>
                  
                  {/* Summary */}
                  <div className="bg-wave-800/50 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-medium text-wave-200">Prediction Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-wave-400">Trend:</span>
                        <span className="text-white">{formData.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-wave-400">Peak Date:</span>
                        <span className="text-white">{formData.peakDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-wave-400">Confidence:</span>
                        <span className="text-white">{confidence}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-wave-400">Potential XP:</span>
                        <span className="text-yellow-400 font-bold">{calculatePotentialXP()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="flex-1 py-3 bg-wave-800 text-wave-300 rounded-lg font-medium hover:bg-wave-700 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-400 hover:to-green-500 transition-all flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <LoaderIcon className="w-5 h-5 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <TargetIcon className="w-5 h-5" />
                          Submit Prediction
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}