'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Dot,
  Area,
  ComposedChart
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Brain,
  Sparkles,
  Clock,
  Users,
  Target,
  Info,
  Save,
  RotateCcw,
  Zap,
  Award,
  ChevronUp,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { format, addDays, addWeeks, differenceInDays } from 'date-fns';

interface PredictionPoint {
  date: Date;
  value: number;
  confidence?: number;
}

interface ControlPoint {
  x: number; // 0-100 representing position on timeline
  y: number; // 0-100 representing trend strength
  type: 'start' | 'peak' | 'end' | 'control';
}

interface TrendPredictionChartProps {
  trendId: string;
  trendTitle: string;
  historicalData?: PredictionPoint[];
  onSavePrediction: (prediction: {
    curve: PredictionPoint[];
    peakDate: Date;
    peakValue: number;
    confidence: number;
    reasoning?: string;
  }) => void;
  existingPredictions?: {
    userId: string;
    username: string;
    curve: PredictionPoint[];
    confidence: number;
  }[];
}

export default function TrendPredictionChart({
  trendId,
  trendTitle,
  historicalData = [],
  onSavePrediction,
  existingPredictions = []
}: TrendPredictionChartProps) {
  const [controlPoints, setControlPoints] = useState<ControlPoint[]>([
    { x: 0, y: 30, type: 'start' },
    { x: 25, y: 60, type: 'control' },
    { x: 50, y: 85, type: 'peak' },
    { x: 75, y: 40, type: 'control' },
    { x: 100, y: 10, type: 'end' }
  ]);

  const [isDragging, setIsDragging] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(70);
  const [showOtherPredictions, setShowOtherPredictions] = useState(false);
  const [showConfidenceBands, setShowConfidenceBands] = useState(true);
  const [predictionReasoning, setPredictionReasoning] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1month' | '3months' | '6months'>('3months');
  const [wavePattern, setWavePattern] = useState<'parabolic' | 'exponential' | 'sigmoid' | 'custom'>('parabolic');
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);

  // Generate dates for X-axis
  const generateTimelineData = useCallback(() => {
    const startDate = new Date();
    const days = selectedTimeframe === '1month' ? 30 : selectedTimeframe === '3months' ? 90 : 180;
    const data = [];

    for (let i = 0; i <= days; i += days / 20) {
      const date = addDays(startDate, i);
      data.push({
        date: format(date, 'MMM dd'),
        dayIndex: i,
        timestamp: date.getTime()
      });
    }
    return data;
  }, [selectedTimeframe]);

  // Generate smooth curve from control points using cubic bezier interpolation
  const generatePredictionCurve = useCallback(() => {
    const timeline = generateTimelineData();
    const curve: any[] = [];
    
    // Convert control points to actual coordinates
    const points = controlPoints.map(cp => ({
      x: cp.x / 100 * timeline.length,
      y: cp.y
    }));

    // Generate smooth curve using cubic interpolation
    for (let i = 0; i < timeline.length; i++) {
      const t = i / (timeline.length - 1);
      let value = 0;

      if (wavePattern === 'parabolic') {
        // Parabolic curve based on control points
        const peak = points.find(p => controlPoints[points.indexOf(p)]?.type === 'peak');
        if (peak) {
          const peakT = peak.x / timeline.length;
          const a = -4 * peak.y / (peakT * peakT - 2 * peakT + 1);
          value = a * (t - peakT) * (t - peakT) + peak.y;
          value = Math.max(0, Math.min(100, value));
        }
      } else if (wavePattern === 'exponential') {
        // Exponential growth and decay
        const peak = points.find(p => controlPoints[points.indexOf(p)]?.type === 'peak');
        if (peak) {
          const peakT = peak.x / timeline.length;
          if (t <= peakT) {
            value = peak.y * Math.exp(3 * (t / peakT - 1));
          } else {
            value = peak.y * Math.exp(-5 * ((t - peakT) / (1 - peakT)));
          }
        }
      } else if (wavePattern === 'sigmoid') {
        // S-curve pattern
        const peak = points.find(p => controlPoints[points.indexOf(p)]?.type === 'peak');
        if (peak) {
          const k = 10; // Steepness
          const x0 = peak.x / timeline.length;
          value = peak.y / (1 + Math.exp(-k * (t - x0)));
          if (t > x0) {
            value = peak.y - (peak.y / (1 + Math.exp(-k * ((t - x0) / 2))));
          }
        }
      } else {
        // Custom curve using bezier control points
        value = calculateBezierPoint(t, points);
      }

      // Add confidence bands
      const upperBand = Math.min(100, value + (100 - confidence) / 2);
      const lowerBand = Math.max(0, value - (100 - confidence) / 2);

      curve.push({
        ...timeline[i],
        value: Math.round(value),
        upperBand: showConfidenceBands ? Math.round(upperBand) : null,
        lowerBand: showConfidenceBands ? Math.round(lowerBand) : null,
        controlPoint: points.find(p => Math.abs(p.x - i) < 1) ? true : false
      });
    }

    return curve;
  }, [controlPoints, confidence, showConfidenceBands, wavePattern, generateTimelineData]);

  // Bezier curve calculation
  const calculateBezierPoint = (t: number, points: any[]) => {
    if (points.length === 0) return 0;
    if (points.length === 1) return points[0].y;
    
    const n = points.length - 1;
    let value = 0;
    
    for (let i = 0; i <= n; i++) {
      const coefficient = binomialCoefficient(n, i) * Math.pow(1 - t, n - i) * Math.pow(t, i);
      value += coefficient * points[i].y;
    }
    
    return value;
  };

  const binomialCoefficient = (n: number, k: number): number => {
    if (k === 0 || k === n) return 1;
    let result = 1;
    for (let i = 1; i <= k; i++) {
      result = result * (n - i + 1) / i;
    }
    return result;
  };

  // Handle dragging control points
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging === null) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = 100 - ((e.clientY - rect.top) / rect.height) * 100;

    setControlPoints(prev => prev.map((point, index) => {
      if (index === isDragging) {
        return {
          ...point,
          x: Math.max(0, Math.min(100, x)),
          y: Math.max(0, Math.min(100, y))
        };
      }
      return point;
    }));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  // Calculate peak prediction
  const peakPrediction = useMemo(() => {
    const curve = generatePredictionCurve();
    const peak = curve.reduce((max, point) => 
      point.value > max.value ? point : max
    , curve[0]);
    
    return {
      date: peak.date,
      value: peak.value,
      daysFromNow: peak.dayIndex
    };
  }, [generatePredictionCurve]);

  // Calculate aggregate community prediction
  const communityPrediction = useMemo(() => {
    if (existingPredictions.length === 0) return null;
    
    // Average all predictions weighted by confidence
    const totalWeight = existingPredictions.reduce((sum, pred) => sum + pred.confidence, 0);
    // Implementation would aggregate curves here
    
    return {
      participants: existingPredictions.length,
      averageConfidence: totalWeight / existingPredictions.length
    };
  }, [existingPredictions]);

  const handleSave = () => {
    const curve = generatePredictionCurve();
    const peak = curve.reduce((max, point) => 
      point.value > max.value ? point : max
    , curve[0]);

    onSavePrediction({
      curve: curve.map(p => ({
        date: new Date(p.timestamp || Date.now()),
        value: p.value,
        confidence: confidence
      })),
      peakDate: new Date(peak.timestamp || Date.now()),
      peakValue: peak.value,
      confidence,
      reasoning: predictionReasoning
    });
  };

  const resetPrediction = () => {
    setControlPoints([
      { x: 0, y: 30, type: 'start' },
      { x: 25, y: 60, type: 'control' },
      { x: 50, y: 85, type: 'peak' },
      { x: 75, y: 40, type: 'control' },
      { x: 100, y: 10, type: 'end' }
    ]);
    setConfidence(70);
    setPredictionReasoning('');
  };

  const data = generatePredictionCurve();

  return (
    <div className="w-full space-y-4">
      {/* Header with controls */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              Predict the Wave: {trendTitle}
            </h3>
            <p className="text-sm text-gray-600">
              Drag the control points to shape your prediction curve
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdvancedControls(!showAdvancedControls)}
              className="px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              Advanced
              {showAdvancedControls ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={resetPrediction}
              className="px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Quick controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Timeframe selector */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Timeframe</label>
            <div className="flex gap-1">
              {(['1month', '3months', '6months'] as const).map(tf => (
                <button
                  key={tf}
                  onClick={() => setSelectedTimeframe(tf)}
                  className={`flex-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                    selectedTimeframe === tf
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {tf === '1month' ? '1M' : tf === '3months' ? '3M' : '6M'}
                </button>
              ))}
            </div>
          </div>

          {/* Wave pattern selector */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Pattern</label>
            <select
              value={wavePattern}
              onChange={(e) => setWavePattern(e.target.value as any)}
              className="w-full px-2 py-1 rounded-md text-xs font-medium bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="parabolic">🌊 Parabolic</option>
              <option value="exponential">📈 Exponential</option>
              <option value="sigmoid">⚡ S-Curve</option>
              <option value="custom">✏️ Custom</option>
            </select>
          </div>

          {/* Confidence slider */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Confidence: {confidence}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(parseInt(e.target.value))}
              className="w-full h-6 accent-purple-500"
            />
          </div>

          {/* View options */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showConfidenceBands}
                onChange={(e) => setShowConfidenceBands(e.target.checked)}
                className="rounded text-purple-500 focus:ring-purple-500"
              />
              <span className="text-xs text-gray-700">Confidence bands</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOtherPredictions}
                onChange={(e) => setShowOtherPredictions(e.target.checked)}
                className="rounded text-purple-500 focus:ring-purple-500"
              />
              <span className="text-xs text-gray-700">Community avg</span>
            </label>
          </div>
        </div>

        {/* Advanced controls */}
        <AnimatePresence>
          {showAdvancedControls && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 pt-3 border-t border-gray-200"
            >
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Prediction Reasoning (optional)
                  </label>
                  <textarea
                    value={predictionReasoning}
                    onChange={(e) => setPredictionReasoning(e.target.value)}
                    placeholder="Why do you think this trend will follow this pattern?"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={2}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main chart */}
      <div 
        className="relative bg-white rounded-xl shadow-sm border border-gray-100 p-4"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Interactive overlay for control points */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {controlPoints.map((point, index) => {
            const chartWidth = 100;
            const chartHeight = 100;
            const x = `${point.x}%`;
            const y = `${100 - point.y}%`;
            
            return (
              <motion.div
                key={index}
                className="absolute pointer-events-auto"
                style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
                animate={{
                  scale: isDragging === index ? 1.5 : 1
                }}
              >
                <div
                  onMouseDown={() => setIsDragging(index)}
                  className={`w-4 h-4 rounded-full cursor-move transition-all ${
                    point.type === 'peak' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg ring-4 ring-purple-200'
                      : point.type === 'start' || point.type === 'end'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-md ring-2 ring-blue-200'
                      : 'bg-gradient-to-r from-gray-400 to-gray-500 shadow-md ring-2 ring-gray-200'
                  } ${isDragging === index ? 'ring-4' : ''}`}
                />
                {point.type === 'peak' && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-1 bg-purple-600 text-white text-xs rounded-md whitespace-nowrap">
                    Peak: Day {Math.round(point.x * 0.9)}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              label={{ value: 'Trend Strength', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {payload[0].payload.date}
                    </p>
                    <p className="text-sm text-purple-600">
                      Strength: {payload[0].value}%
                    </p>
                    {showConfidenceBands && (
                      <p className="text-xs text-gray-500">
                        Range: {payload[0].payload.lowerBand}-{payload[0].payload.upperBand}%
                      </p>
                    )}
                  </div>
                );
              }}
            />
            
            {/* Confidence bands */}
            {showConfidenceBands && (
              <Area
                type="monotone"
                dataKey="upperBand"
                stackId="1"
                stroke="none"
                fill="url(#colorConfidence)"
              />
            )}
            
            {/* Main prediction line */}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 8 }}
            />
            
            {/* Lower confidence band */}
            {showConfidenceBands && (
              <Line
                type="monotone"
                dataKey="lowerBand"
                stroke="#3b82f6"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
            
            {/* Community average prediction */}
            {showOtherPredictions && communityPrediction && (
              <Line
                type="monotone"
                dataKey="communityAvg"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="10 5"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Prediction summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-purple-600" />
            <span className="text-xs text-purple-600 font-medium">YOUR PREDICTION</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            Day {peakPrediction.daysFromNow}
          </p>
          <p className="text-sm text-gray-600">
            Peak on {peakPrediction.date}
          </p>
          <p className="text-xs text-purple-600 mt-1">
            Strength: {peakPrediction.value}%
          </p>
        </motion.div>

        {communityPrediction && (
          <motion.div 
            className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">COMMUNITY AVG</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {communityPrediction.participants}
            </p>
            <p className="text-sm text-gray-600">
              Predictions made
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Avg confidence: {Math.round(communityPrediction.averageConfidence)}%
            </p>
          </motion.div>
        )}

        <motion.div 
          className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-2">
            <Award className="w-5 h-5 text-green-600" />
            <span className="text-xs text-green-600 font-medium">POTENTIAL XP</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {Math.round(confidence * 1.5)}
          </p>
          <p className="text-sm text-gray-600">
            If correct ±3 days
          </p>
          <p className="text-xs text-green-600 mt-1">
            Confidence bonus: +{Math.round(confidence * 0.5)}
          </p>
        </motion.div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          Lock In Prediction
        </button>
      </div>

      {/* Info tooltip */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-gray-700">
          <p className="font-medium mb-1">Pro Tips:</p>
          <ul className="space-y-0.5">
            <li>• Drag control points to shape your prediction curve</li>
            <li>• Purple point marks your predicted peak</li>
            <li>• Higher confidence = higher rewards, but also higher risk</li>
            <li>• Community predictions help validate your hypothesis</li>
          </ul>
        </div>
      </div>
    </div>
  );
}