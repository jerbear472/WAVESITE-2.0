'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Dot
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Sparkles,
  Clock,
  Users,
  Save,
  RotateCcw,
  Award,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Lock
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';

interface PredictionPoint {
  date: Date;
  value: number;
  confidence?: number;
}

interface PatternTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  peakX: number; // 0-100 representing when peak happens
  peakY: number; // 0-100 representing peak intensity
  historicalExample?: string;
}

interface CommunityConsensus {
  '3-7days': number;
  '1-2weeks': number;
  '2-4weeks': number;
  '1-2months': number;
  '2-3months': number;
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
}

const PATTERN_TEMPLATES: PatternTemplate[] = [
  {
    id: 'rocket',
    name: 'Rocket',
    icon: '🚀',
    description: 'peaks fast, dies fast',
    peakX: 20,
    peakY: 95,
    historicalExample: 'Ice Bucket Challenge'
  },
  {
    id: 'wave',
    name: 'Wave',
    icon: '🌊',
    description: 'steady rise and fall',
    peakX: 50,
    peakY: 75,
    historicalExample: 'Wordle'
  },
  {
    id: 'grower',
    name: 'Grower',
    icon: '🌱',
    description: 'slow build, staying power',
    peakX: 70,
    peakY: 85,
    historicalExample: 'TikTok dances'
  },
  {
    id: 'flash',
    name: 'Flash',
    icon: '⚡',
    description: 'instant viral, quick death',
    peakX: 10,
    peakY: 100,
    historicalExample: 'Dress color debate'
  },
  {
    id: 'longtail',
    name: 'Long tail',
    icon: '🦎',
    description: 'peaks late, fades slowly',
    peakX: 65,
    peakY: 70,
    historicalExample: 'Sustainable fashion'
  }
];

export default function TrendPredictionChartV3({
  trendId,
  trendTitle,
  historicalData = [],
  onSavePrediction,
  communityConsensus = {
    '3-7days': 35,
    '1-2weeks': 25,
    '2-4weeks': 20,
    '1-2months': 15,
    '2-3months': 5
  }
}: TrendPredictionChartProps) {
  const [selectedPattern, setSelectedPattern] = useState<string>('wave');
  const [peakX, setPeakX] = useState(50); // 0-100 representing position on timeline
  const [peakY, setPeakY] = useState(75); // 0-100 representing peak intensity
  const [isDragging, setIsDragging] = useState(false);
  const [confidence, setConfidence] = useState(50);
  const [showCommunity, setShowCommunity] = useState(true);

  // XP calculation based on confidence
  const xpBet = Math.round(confidence / 2);
  const potentialWin = Math.round(xpBet * (confidence / 25));
  const potentialLoss = Math.round(xpBet * 0.2);

  // Check if different from crowd
  const isDifferentFromCrowd = peakX < 20 || peakX > 60;
  const crowdBonus = isDifferentFromCrowd ? Math.round(xpBet * 0.5) : 0;

  // Generate timeline (3 months)
  const generateTimelineData = useCallback(() => {
    const timeline = [];
    const today = new Date();
    for (let i = 0; i <= 90; i += 3) {
      timeline.push({
        date: format(addDays(today, i), 'MMM d'),
        fullDate: addDays(today, i),
        dayIndex: i
      });
    }
    return timeline;
  }, []);

  // Generate smooth bell curve based on single peak point
  const generatePredictionCurve = useCallback(() => {
    const timeline = generateTimelineData();
    const curve: Array<{ date: Date; value: number; confidence?: number; isPeak?: boolean; fullDate?: string }> = [];
    
    const peakDayIndex = Math.round((peakX / 100) * 90);
    const peakIntensity = peakY;
    
    timeline.forEach((day, i) => {
      const daysDiff = day.dayIndex;
      const distanceFromPeak = Math.abs(daysDiff - peakDayIndex);
      
      // Generate bell curve
      let value;
      if (daysDiff < peakDayIndex) {
        // Rising phase - exponential growth
        const progress = daysDiff / peakDayIndex;
        value = 10 + (peakIntensity - 10) * Math.pow(progress, 1.5);
      } else if (daysDiff === peakDayIndex) {
        // Peak
        value = peakIntensity;
      } else {
        // Declining phase - exponential decay
        const decayRate = peakX < 30 ? 0.1 : 0.05; // Faster decay for early peaks
        const daysAfterPeak = daysDiff - peakDayIndex;
        value = peakIntensity * Math.exp(-decayRate * daysAfterPeak);
      }
      
      curve.push({
        date: day.fullDate,
        value: Math.round(Math.max(5, Math.min(100, value))),
        isPeak: daysDiff === peakDayIndex,
        fullDate: day.date
      });
    });
    
    return curve;
  }, [peakX, peakY, generateTimelineData]);

  // Apply pattern template
  const applyPattern = (patternId: string) => {
    const pattern = PATTERN_TEMPLATES.find(p => p.id === patternId);
    if (pattern) {
      setPeakX(pattern.peakX);
      setPeakY(pattern.peakY);
      setSelectedPattern(patternId);
    }
  };

  // Handle dragging on chart
  const handleChartMouseDown = (e: any) => {
    if (e && e.activeCoordinate) {
      setIsDragging(true);
      updatePeakFromChart(e);
    }
  };

  const handleChartMouseMove = (e: any) => {
    if (isDragging && e && e.activeCoordinate) {
      updatePeakFromChart(e);
    }
  };

  const handleChartMouseUp = () => {
    setIsDragging(false);
  };

  const updatePeakFromChart = (e: any) => {
    if (!e.activeCoordinate) return;
    
    const { x, y } = e.activeCoordinate;
    const chartWidth = e.chartWidth || 800;
    const chartHeight = e.chartHeight || 400;
    
    // Convert pixel coordinates to percentage
    const xPercent = Math.round((x / chartWidth) * 100);
    const yPercent = Math.round(100 - (y / chartHeight) * 100);
    
    setPeakX(Math.max(5, Math.min(95, xPercent)));
    setPeakY(Math.max(20, Math.min(100, yPercent)));
    setSelectedPattern('custom');
  };

  // Calculate peak prediction
  const peakPrediction = useMemo(() => {
    const peakDayIndex = Math.round((peakX / 100) * 90);
    const peakDate = addDays(new Date(), peakDayIndex);
    const daysFromNow = peakDayIndex;
    
    return {
      date: format(peakDate, 'MMM dd'),
      fullDate: format(peakDate, 'MMMM dd, yyyy'),
      value: peakY,
      daysFromNow
    };
  }, [peakX, peakY]);

  // Get confidence color
  const getConfidenceColor = () => {
    if (confidence < 40) return 'text-green-600 bg-green-50';
    if (confidence < 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const handleSave = () => {
    const curve = generatePredictionCurve();
    const peakPoint = curve.find(p => p.isPeak) || curve[Math.round(curve.length * (peakX / 100))];

    onSavePrediction({
      curve: curve.map(p => ({
        date: p.date,
        value: p.value,
        confidence: confidence
      })),
      peakDate: peakPoint.date,
      peakValue: peakPoint.value,
      confidence,
      xpBet,
      potentialWin: potentialWin + crowdBonus,
      potentialLoss,
      pattern: selectedPattern
    });
  };

  const data = generatePredictionCurve();
  const peakPoint = data.find(p => p.isPeak) || data[Math.round(data.length * (peakX / 100))];

  return (
    <div className="w-full space-y-4">
      {/* Simplified Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Draw when this trend peaks</h2>
        <p className="text-gray-600 mt-1">{trendTitle}</p>
        <p className="text-sm text-gray-500 mt-2">Drag the peak point on the chart or use a pattern template</p>
      </div>

      {/* Pattern Templates */}
      <div className="bg-gray-50 p-4 rounded-xl">
        <div className="text-sm font-medium text-gray-700 mb-3">QUICK PATTERNS</div>
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
            </button>
          ))}
          <button
            onClick={() => setSelectedPattern('custom')}
            className={`p-3 rounded-lg border-2 transition-all ${
              selectedPattern === 'custom'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-2xl mb-1">✏️</div>
            <div className="text-xs font-medium">Custom</div>
            <div className="text-xs text-gray-500">drag to adjust</div>
          </button>
        </div>
      </div>

      {/* Interactive Chart */}
      <div className="bg-white p-4 rounded-xl border-2 border-gray-200 relative">
        {/* Peak Date Display */}
        <div className="absolute top-4 right-4 z-10 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="text-xs opacity-90">Peak prediction:</div>
          <div className="text-lg font-bold">{peakPrediction.date}</div>
          <div className="text-xs opacity-90">({peakPrediction.daysFromNow} days)</div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <AreaChart 
            data={data}
            onMouseDown={handleChartMouseDown}
            onMouseMove={handleChartMouseMove}
            onMouseUp={handleChartMouseUp}
            onMouseLeave={handleChartMouseUp}
            style={{ cursor: 'crosshair' }}
          >
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date"
              tick={{ fontSize: 11 }}
              interval={4}
            />
            <YAxis 
              label={{ value: 'Trend Strength', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {data.date}
                    </p>
                    <p className="text-sm text-purple-600">
                      Strength: {data.value}%
                    </p>
                    {data.isPeak && (
                      <p className="text-xs text-orange-500 font-bold">
                        PEAK DAY
                      </p>
                    )}
                  </div>
                );
              }}
            />
            
            <Area
              type="monotone"
              dataKey="value"
              stroke="#8b5cf6"
              strokeWidth={3}
              fill="url(#colorGradient)"
              animationDuration={500}
            />
            
            {/* Peak point marker */}
            <ReferenceDot
              x={peakPoint?.date.toISOString()}
              y={peakPoint?.value}
              r={8}
              fill="#8b5cf6"
              stroke="#fff"
              strokeWidth={3}
              className="animate-pulse"
            />
          </AreaChart>
        </ResponsiveContainer>
        
        {/* Dragging indicator */}
        {isDragging && (
          <div className="absolute top-2 left-2 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium animate-pulse">
            Adjusting peak...
          </div>
        )}
      </div>

      {/* Community Consensus */}
      {showCommunity && (
        <div className="bg-blue-50 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-gray-700">COMMUNITY CONSENSUS</div>
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
                  {period.replace('-', ' - ')}
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
      
      {!showCommunity && (
        <button
          onClick={() => setShowCommunity(true)}
          className="w-full p-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <ChevronDown className="w-4 h-4" />
          Show community predictions
        </button>
      )}

      {/* Confidence Slider */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl">
        <div className="text-sm font-medium text-gray-700 mb-3">YOUR CONFIDENCE = YOUR BET</div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="range"
                min="10"
                max="100"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="w-full h-2 bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            <div className={`text-2xl font-bold px-3 py-1 rounded-lg ${getConfidenceColor()}`}>
              {confidence}%
            </div>
          </div>

          <div className="text-xs text-gray-600">
            {confidence < 40 ? '🛡️ Playing it safe' : confidence < 70 ? '⚖️ Balanced risk' : '🔥 High conviction'}
          </div>
        </div>

        {/* Stakes Display */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs text-gray-500">BETTING</div>
            <div className="text-xl font-bold text-purple-600">{xpBet} XP</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-green-600">WIN</div>
            <div className="text-xl font-bold text-green-600">
              +{potentialWin + crowdBonus} XP
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-xs text-red-600">LOSE</div>
            <div className="text-xl font-bold text-red-600">-{potentialLoss} XP</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setPeakX(50);
            setPeakY(75);
            setConfidence(50);
            setSelectedPattern('wave');
          }}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
        
        <button
          onClick={handleSave}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 font-medium"
        >
          <Lock className="w-4 h-4" />
          Lock in Prediction ({xpBet} XP)
        </button>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: white;
          border: 3px solid #8b5cf6;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: white;
          border: 3px solid #8b5cf6;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}