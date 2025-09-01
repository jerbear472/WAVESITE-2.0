'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  TrendingUp, 
  Clock, 
  Target,
  Lightbulb,
  AlertCircle,
  Loader2,
  ChevronRight,
  Sparkles,
  BarChart3,
  Globe,
  Heart,
  DollarSign,
  Users,
  Zap
} from 'lucide-react';

interface TrendAnalyzerProps {
  trend: {
    id: string;
    title: string;
    description?: string;
    platform?: string;
    category?: string;
    url?: string;
    wave_votes?: number;
    fire_votes?: number;
    declining_votes?: number;
    dead_votes?: number;
  };
  onClose?: () => void;
}

interface Analysis {
  summary: string;
  culturalContext?: string;
  viralityScore: number;
  keyFactors: string[];
  whyResonating?: string[];
  predictions: {
    peakTime: string;
    longevity: string;
    nextPhase: string;
  };
  recommendations: string[];
  competitorInsights?: string;
  monetizationPotential?: string;
}

export default function TrendAnalyzer({ trend, onClose }: TrendAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeTrend = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/analyze-trend-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trend)
      });
      
      if (!response.ok) {
        throw new Error('Analysis failed');
      }
      
      const data = await response.json();
      setAnalysis(data);
    } catch (err: any) {
      setError('Failed to analyze trend. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getViralityColor = (score: number) => {
    if (score >= 80) return 'from-red-500 to-orange-500';
    if (score >= 60) return 'from-orange-500 to-yellow-500';
    if (score >= 40) return 'from-yellow-500 to-green-500';
    return 'from-gray-400 to-gray-500';
  };

  const getViralityLabel = (score: number) => {
    if (score >= 80) return '🔥 Explosive';
    if (score >= 60) return '📈 Hot';
    if (score >= 40) return '🌱 Growing';
    return '🌊 Early Stage';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">AI Trend Analysis</h3>
            <p className="text-sm text-gray-500">Powered by Claude 3.5 Sonnet</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
          >
            ✕
          </button>
        )}
      </div>

      {/* Trend Info */}
      <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-100">
        <h4 className="font-semibold text-gray-900 mb-1">{trend.title}</h4>
        {trend.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{trend.description}</p>
        )}
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          {trend.platform && <span>📱 {trend.platform}</span>}
          {trend.category && <span>🏷️ {trend.category}</span>}
          <span>👍 {(trend.wave_votes || 0) + (trend.fire_votes || 0)} votes</span>
        </div>
      </div>

      {/* Analyze Button */}
      {!analysis && !isAnalyzing && (
        <motion.button
          onClick={analyzeTrend}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
        >
          <Sparkles className="w-5 h-5" />
          Analyze Trend with AI
        </motion.button>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
          <p className="text-gray-600">Analyzing trend data and cultural context...</p>
          <p className="text-sm text-gray-500">Searching web for real-time insights...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700">{error}</p>
            <button
              onClick={analyzeTrend}
              className="text-sm text-red-600 hover:text-red-700 underline mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Virality Score */}
            <div className="bg-gradient-to-r from-gray-50 to-white p-5 rounded-lg border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600">Virality Score</span>
                <span className="text-xl font-bold">{getViralityLabel(analysis.viralityScore)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${analysis.viralityScore}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full bg-gradient-to-r ${getViralityColor(analysis.viralityScore)}`}
                />
              </div>
              <div className="mt-2 text-center text-2xl font-bold text-gray-800">
                {analysis.viralityScore}/100
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white border border-purple-100 rounded-lg p-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-500" />
                Executive Summary
              </h4>
              <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
            </div>

            {/* Cultural Context */}
            {analysis.culturalContext && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-5 border border-blue-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  Cultural Context & Timing
                </h4>
                <p className="text-gray-700 leading-relaxed">{analysis.culturalContext}</p>
              </div>
            )}

            {/* Why It's Resonating */}
            {analysis.whyResonating && analysis.whyResonating.length > 0 && (
              <div className="bg-gradient-to-r from-pink-50 to-red-50 rounded-lg p-5 border border-pink-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  Why It's Resonating
                </h4>
                <div className="space-y-2">
                  {analysis.whyResonating.map((reason, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <span className="text-red-500 mt-0.5">♥</span>
                      <span>{reason}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Factors */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-green-500" />
                Key Success Factors
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.keyFactors.map((factor, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                  >
                    <div className="flex items-start gap-2 text-sm text-gray-700">
                      <ChevronRight className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{factor}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Predictions */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-xs text-gray-600 mb-1">Peak Time</p>
                <p className="text-sm font-bold text-gray-900">{analysis.predictions.peakTime}</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-xs text-gray-600 mb-1">Longevity</p>
                <p className="text-sm font-bold text-gray-900">{analysis.predictions.longevity}</p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <BarChart3 className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-xs text-gray-600 mb-1">Next Phase</p>
                <p className="text-sm font-bold text-gray-900">{analysis.predictions.nextPhase}</p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="p-5 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-600" />
                Strategic Recommendations
              </h4>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">→</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            {/* Competitor Insights & Monetization */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.competitorInsights && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    Competitor Activity
                  </h4>
                  <p className="text-sm text-gray-600">{analysis.competitorInsights}</p>
                </div>
              )}
              
              {analysis.monetizationPotential && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    Monetization Potential
                  </h4>
                  <p className="text-sm text-gray-600">{analysis.monetizationPotential}</p>
                </div>
              )}
            </div>

            {/* Re-analyze Button */}
            <button
              onClick={analyzeTrend}
              className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Brain className="w-4 h-4" />
              Re-analyze with Latest Data
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}