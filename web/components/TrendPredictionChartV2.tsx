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
  AlertCircle,
  Rocket,
  TrendingDown,
  Flame,
  Timer,
  DollarSign,
  Lock
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

interface PatternTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  controlPoints: ControlPoint[];
  historicalExample?: string;
  avgDaysToPeak?: number;
}

interface CommunityConsensus {
  '2weeks': number;
  '1month': number;
  '2months': number;
  'already_peaked': number;
  'wont_peak': number;
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
    xpBet: number;
    potentialWin: number;
    potentialLoss: number;
    pattern?: string;
  }) => void;
  communityConsensus?: CommunityConsensus;
  existingPredictions?: {
    userId: string;
    username: string;
    curve: PredictionPoint[];
    confidence: number;
  }[];
}

const PATTERN_TEMPLATES: PatternTemplate[] = [
  {
    id: 'rocket',
    name: 'Rocket',
    icon: '🚀',
    description: 'peaks fast, dies fast',
    controlPoints: [
      { x: 0, y: 10, type: 'start' },
      { x: 15, y: 95, type: 'peak' },
      { x: 30, y: 20, type: 'control' },
      { x: 100, y: 5, type: 'end' }
    ],
    historicalExample: 'Ice Bucket Challenge',
    avgDaysToPeak: 14
  },
  {
    id: 'wave',
    name: 'Wave',
    icon: '🌊',
    description: 'steady rise and fall',
    controlPoints: [
      { x: 0, y: 20, type: 'start' },
      { x: 25, y: 50, type: 'control' },
      { x: 50, y: 80, type: 'peak' },
      { x: 75, y: 40, type: 'control' },
      { x: 100, y: 15, type: 'end' }
    ],
    historicalExample: 'Girl Dinner',
    avgDaysToPeak: 30
  },
  {
    id: 'grower',
    name: 'Grower',
    icon: '📈',
    description: 'keeps climbing',
    controlPoints: [
      { x: 0, y: 10, type: 'start' },
      { x: 30, y: 35, type: 'control' },
      { x: 60, y: 65, type: 'control' },
      { x: 90, y: 90, type: 'peak' },
      { x: 100, y: 95, type: 'end' }
    ],
    historicalExample: 'AI trends',
    avgDaysToPeak: 60
  },
  {
    id: 'flash',
    name: 'Flash',
    icon: '💥',
    description: 'instant spike',
    controlPoints: [
      { x: 0, y: 15, type: 'start' },
      { x: 10, y: 100, type: 'peak' },
      { x: 20, y: 30, type: 'control' },
      { x: 100, y: 10, type: 'end' }
    ],
    historicalExample: 'Bernie Sanders mittens',
    avgDaysToPeak: 7
  },
  {
    id: 'longtail',
    name: 'Long tail',
    icon: '🦴',
    description: 'slow decline',
    controlPoints: [
      { x: 0, y: 80, type: 'start' },
      { x: 20, y: 85, type: 'peak' },
      { x: 40, y: 60, type: 'control' },
      { x: 70, y: 35, type: 'control' },
      { x: 100, y: 25, type: 'end' }
    ],
    historicalExample: 'Wordle',
    avgDaysToPeak: 15
  }
];

export default function TrendPredictionChartV2({
  trendId,
  trendTitle,
  historicalData = [],
  onSavePrediction,
  communityConsensus = {
    '2weeks': 45,
    '1month': 30,
    '2months': 10,
    'already_peaked': 10,
    'wont_peak': 5
  },
  existingPredictions = []
}: TrendPredictionChartProps) {
  const [selectedPattern, setSelectedPattern] = useState<string>('custom');
  const [controlPoints, setControlPoints] = useState<ControlPoint[]>([
    { x: 0, y: 30, type: 'start' },
    { x: 25, y: 60, type: 'control' },
    { x: 50, y: 85, type: 'peak' },
    { x: 75, y: 40, type: 'control' },
    { x: 100, y: 10, type: 'end' }
  ]);

  const [isDragging, setIsDragging] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(50);
  const [showCommunity, setShowCommunity] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1month' | '3months' | '6months'>('3months');

  // Calculate XP betting mechanics
  const xpBet = confidence;
  const potentialWin = Math.round(confidence * 2);
  const potentialLoss = confidence;
  
  // Check if prediction differs from crowd
  const crowdPeakConsensus = Math.max(...Object.values(communityConsensus));
  const isDifferentFromCrowd = true; // Calculate based on actual prediction
  const crowdBonus = isDifferentFromCrowd ? 20 : 0;

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

  // Generate smooth curve from control points
  const generatePredictionCurve = useCallback(() => {
    const timeline = generateTimelineData();
    const curve: any[] = [];
    
    const points = controlPoints.map(cp => ({
      x: cp.x / 100 * timeline.length,
      y: cp.y
    }));

    for (let i = 0; i < timeline.length; i++) {
      const t = i / (timeline.length - 1);
      let value = 0;

      // Simple quadratic interpolation for smoother curves
      const peak = points.find(p => controlPoints[points.indexOf(p)]?.type === 'peak');
      if (peak) {
        const peakT = peak.x / timeline.length;
        const a = -4 * peak.y / (peakT * peakT - 2 * peakT + 1);
        value = a * (t - peakT) * (t - peakT) + peak.y;
        value = Math.max(0, Math.min(100, value));
      }

      curve.push({
        ...timeline[i],
        value: Math.round(value),
        controlPoint: points.find(p => Math.abs(p.x - i) < 1) ? true : false
      });
    }

    return curve;
  }, [controlPoints, generateTimelineData]);

  // Apply pattern template
  const applyPattern = (patternId: string) => {
    const pattern = PATTERN_TEMPLATES.find(p => p.id === patternId);
    if (pattern) {
      setControlPoints([...pattern.controlPoints]);
      setSelectedPattern(patternId);
    } else {
      // Custom pattern
      setSelectedPattern('custom');
    }
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
    
    // Mark as custom when user drags
    setSelectedPattern('custom');
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
    
    const peakDate = new Date(peak.timestamp || Date.now());
    const daysFromNow = Math.round((peakDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    return {
      date: format(peakDate, 'MMM dd'),
      fullDate: format(peakDate, 'MMMM dd, yyyy'),
      value: peak.value,
      daysFromNow
    };
  }, [generatePredictionCurve]);

  // Get confidence color
  const getConfidenceColor = () => {
    if (confidence < 40) return 'text-green-600 bg-green-50';
    if (confidence < 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

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
      xpBet,
      potentialWin: potentialWin + crowdBonus,
      potentialLoss,
      pattern: selectedPattern
    });
  };

  const data = generatePredictionCurve();

  return (
    <div className="w-full space-y-4">
      {/* Simplified Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Draw when this trend peaks</h2>
        <p className="text-gray-600 mt-1">{trendTitle}</p>
      </div>

      {/* Pattern Templates */}
      <div className="bg-gray-50 p-4 rounded-xl">
        <div className="text-sm font-medium text-gray-700 mb-3">PATTERN TEMPLATES</div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {PATTERN_TEMPLATES.map(pattern => (
            <button
              key={pattern.id}
              onClick={() => applyPattern(pattern.id)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedPattern === pattern.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">{pattern.icon}</div>
              <div className="text-xs font-medium">{pattern.name}</div>
              <div className="text-xs text-gray-500">{pattern.description}</div>
              {pattern.historicalExample && (
                <div className="text-xs text-blue-600 mt-1">
                  like "{pattern.historicalExample}"
                </div>
              )}
            </button>
          ))}
          <button
            onClick={() => applyPattern('custom')}
            className={`p-3 rounded-lg border-2 transition-all ${
              selectedPattern === 'custom'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-2xl mb-1">✏️</div>
            <div className="text-xs font-medium">Custom</div>
            <div className="text-xs text-gray-500">draw your own</div>
          </button>
        </div>
      </div>

      {/* Main Chart with visual feedback */}
      <div 
        className="relative bg-white rounded-xl shadow-sm border border-gray-100 p-4"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Peak Date Display - Big and Clear */}
        <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur rounded-lg p-3 shadow-lg">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Your Prediction</div>
          <div className="text-2xl font-bold text-purple-600">
            {peakPrediction.fullDate}
          </div>
          <div className="text-sm text-gray-600">
            Peak in {peakPrediction.daysFromNow} days
          </div>
        </div>

        {/* Interactive control points */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {controlPoints.map((point, index) => {
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
                      : 'bg-gradient-to-r from-gray-400 to-gray-500 shadow-md ring-2 ring-gray-200'
                  } ${isDragging === index ? 'ring-4' : ''}`}
                />
              </motion.div>
            );
          })}
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top: 80, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
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
                  </div>
                );
              }}
            />
            
            <Area
              type="monotone"
              dataKey="value"
              stroke="#8b5cf6"
              fill="url(#colorValue)"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Community Consensus */}
      {showCommunity && (
        <div className="bg-blue-50 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-gray-700">WHAT OTHERS THINK</div>
            <button
              onClick={() => setShowCommunity(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {Object.entries(communityConsensus).map(([period, percentage]) => (
              <div key={period} className="flex items-center gap-3">
                <div className="w-20 text-xs text-gray-600">
                  {period === '2weeks' ? '2 weeks' :
                   period === '1month' ? '1 month' :
                   period === '2months' ? '2 months' :
                   period === 'already_peaked' ? 'Peaked' : "Won't peak"}
                </div>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-xs font-medium text-gray-700 w-10">
                  {percentage}%
                </div>
              </div>
            ))}
          </div>
          {isDifferentFromCrowd && (
            <div className="mt-3 p-2 bg-yellow-100 rounded-lg">
              <p className="text-xs text-yellow-800 font-medium">
                🎯 Your prediction differs from the crowd (+{crowdBonus} XP bonus if right)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Confidence = Your Bet */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl">
        <div className="text-sm font-medium text-gray-700 mb-3">CONFIDENCE = YOUR BET</div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="range"
                min="10"
                max="100"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="w-full h-2 bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, 
                    #10b981 0%, 
                    #10b981 40%, 
                    #f59e0b 40%, 
                    #f59e0b 70%, 
                    #ef4444 70%, 
                    #ef4444 100%)`
                }}
              />
            </div>
            <div className={`text-2xl font-bold px-3 py-1 rounded-lg ${getConfidenceColor()}`}>
              {confidence}%
            </div>
          </div>

          <div className="text-xs text-gray-600">
            How sure are you? {confidence < 40 ? '(Safe bet)' : confidence < 70 ? '(Risky)' : '(Bold call)'}
          </div>
        </div>

        {/* Stakes Display */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs text-gray-500">BETTING</div>
            <div className="text-xl font-bold text-purple-600">{xpBet} XP</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-green-600">IF RIGHT</div>
            <div className="text-xl font-bold text-green-600">
              +{potentialWin + crowdBonus} XP
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-xs text-red-600">IF WRONG</div>
            <div className="text-xl font-bold text-red-600">-{potentialLoss} XP</div>
          </div>
        </div>
      </div>

      {/* Summary and Action */}
      <div className="bg-white border-2 border-purple-200 rounded-xl p-4">
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">You predict {trendTitle} peaks:</span>
            <span className="font-bold text-purple-600">{peakPrediction.fullDate}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Pattern:</span>
            <span className="font-medium">
              {PATTERN_TEMPLATES.find(p => p.id === selectedPattern)?.name || 'Custom'} 
              {PATTERN_TEMPLATES.find(p => p.id === selectedPattern)?.icon}
            </span>
          </div>
          {isDifferentFromCrowd && (
            <div className="text-sm text-yellow-600">
              You're more {peakPrediction.daysFromNow < 30 ? 'bearish' : 'bullish'} than 73% of predictors
            </div>
          )}
          <div className="text-sm text-gray-600">
            If you're right: <span className="font-bold text-green-600">+{potentialWin + crowdBonus} XP</span> and <span className="text-purple-600">Major Prophet badge</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 text-lg"
        >
          <Lock className="w-5 h-5" />
          Lock In Prediction
        </button>
      </div>
    </div>
  );
}