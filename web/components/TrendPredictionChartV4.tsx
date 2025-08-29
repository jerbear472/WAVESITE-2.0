'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot
} from 'recharts';
import { motion } from 'framer-motion';
import {
  Save,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Lock,
  Sparkles
} from 'lucide-react';
import { format, addDays } from 'date-fns';

interface TrendPredictionChartProps {
  trendId: string;
  trendTitle: string;
  onSavePrediction: (prediction: {
    curve: Array<{ date: Date; value: number; confidence?: number }>;
    peakDate: Date;
    peakValue: number;
    confidence: number;
    xpBet: number;
    potentialWin: number;
    potentialLoss: number;
    pattern?: string;
  }) => void;
}

const PATTERN_TEMPLATES = [
  { id: 'rocket', name: 'Rocket', icon: '🚀', days: 7, intensity: 95 },
  { id: 'wave', name: 'Wave', icon: '🌊', days: 30, intensity: 75 },
  { id: 'grower', name: 'Grower', icon: '🌱', days: 60, intensity: 85 },
  { id: 'flash', name: 'Flash', icon: '⚡', days: 3, intensity: 100 },
  { id: 'longtail', name: 'Long tail', icon: '🦎', days: 45, intensity: 70 }
];

export default function TrendPredictionChartV4({
  trendId,
  trendTitle,
  onSavePrediction
}: TrendPredictionChartProps) {
  // Single peak point state (days from now, intensity 0-100)
  const [peakDays, setPeakDays] = useState(30);
  const [peakIntensity, setPeakIntensity] = useState(75);
  const [isDragging, setIsDragging] = useState(false);
  const [confidence, setConfidence] = useState(50);
  const [showCommunity, setShowCommunity] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState('wave');

  // XP calculations
  const xpBet = Math.round(confidence / 2);
  const potentialWin = Math.round(xpBet * (confidence / 25));
  const potentialLoss = Math.round(xpBet * 0.2);
  const isDifferentFromCrowd = peakDays < 14 || peakDays > 45;
  const crowdBonus = isDifferentFromCrowd ? Math.round(xpBet * 0.5) : 0;

  // Generate smooth curve data
  const curveData = useMemo(() => {
    const data = [];
    const totalDays = 90;
    
    for (let day = 0; day <= totalDays; day += 2) {
      let value;
      
      if (day === 0) {
        value = 10; // Starting baseline
      } else if (day < peakDays) {
        // Smooth rise to peak using sine curve
        const progress = day / peakDays;
        value = 10 + (peakIntensity - 10) * Math.sin(progress * Math.PI / 2);
      } else if (day === peakDays) {
        // Peak
        value = peakIntensity;
      } else {
        // Smooth decline after peak
        const daysAfterPeak = day - peakDays;
        const decayFactor = peakDays < 14 ? 0.15 : 0.08; // Faster decay for early peaks
        value = peakIntensity * Math.exp(-decayFactor * daysAfterPeak);
      }
      
      data.push({
        day,
        date: format(addDays(new Date(), day), 'MMM d'),
        value: Math.round(Math.max(5, Math.min(100, value))),
        isPeak: Math.abs(day - peakDays) < 1
      });
    }
    
    return data;
  }, [peakDays, peakIntensity]);

  // Handle mouse interaction on chart
  const handleChartClick = useCallback((e: any) => {
    if (!e || !e.activeLabel) return;
    
    // Find the clicked data point
    const clickedPoint = curveData.find(d => d.date === e.activeLabel);
    if (clickedPoint) {
      setPeakDays(clickedPoint.day);
      setSelectedPattern('custom');
    }
  }, [curveData]);

  // Apply pattern template
  const applyPattern = (pattern: typeof PATTERN_TEMPLATES[0]) => {
    setPeakDays(pattern.days);
    setPeakIntensity(pattern.intensity);
    setSelectedPattern(pattern.id);
  };

  // Get peak date
  const peakDate = useMemo(() => {
    const date = addDays(new Date(), peakDays);
    return {
      short: format(date, 'MMM d'),
      full: format(date, 'MMMM d, yyyy'),
      date
    };
  }, [peakDays]);

  const handleSave = () => {
    const curve = curveData.map(point => ({
      date: addDays(new Date(), point.day),
      value: point.value,
      confidence
    }));

    onSavePrediction({
      curve,
      peakDate: peakDate.date,
      peakValue: peakIntensity,
      confidence,
      xpBet,
      potentialWin: potentialWin + crowdBonus,
      potentialLoss,
      pattern: selectedPattern
    });
  };

  // Custom dot for the peak
  const CustomDot = (props: any): React.ReactElement<SVGElement> => {
    const { cx, cy, payload } = props;
    if (!payload?.isPeak) return <g></g>;
    
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={12}
          fill="#8b5cf6"
          stroke="#fff"
          strokeWidth={3}
          className="animate-pulse cursor-move"
          style={{ filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.5))' }}
        />
        <text
          x={cx}
          y={cy - 20}
          fill="#8b5cf6"
          fontSize="12"
          fontWeight="bold"
          textAnchor="middle"
        >
          PEAK
        </text>
      </g>
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">When will "{trendTitle}" peak?</h2>
        <p className="text-sm text-gray-500 mt-2">
          Click on the chart or drag the sliders to set your prediction
        </p>
      </div>

      {/* Pattern Templates */}
      <div className="flex gap-2 justify-center flex-wrap">
        {PATTERN_TEMPLATES.map(pattern => (
          <button
            key={pattern.id}
            onClick={() => applyPattern(pattern)}
            className={`px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
              selectedPattern === pattern.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <span className="text-xl">{pattern.icon}</span>
            <span className="text-sm font-medium">{pattern.name}</span>
          </button>
        ))}
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-xl border-2 border-gray-200 relative">
        {/* Peak Date Display */}
        <div className="absolute top-4 right-4 z-10 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="text-xs opacity-90">Peak prediction:</div>
          <div className="text-xl font-bold">{peakDate.short}</div>
          <div className="text-xs opacity-90">({peakDays} days)</div>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <AreaChart 
            data={curveData}
            onClick={handleChartClick}
            style={{ cursor: 'crosshair' }}
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            
            <XAxis 
              dataKey="date"
              tick={{ fontSize: 10 }}
              interval={6}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              label={{ 
                value: 'Trend Intensity', 
                angle: -90, 
                position: 'insideLeft',
                style: { fontSize: 12, fill: '#6b7280' }
              }}
            />
            
            <Tooltip 
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 rounded-lg shadow-xl border border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">{data.date}</p>
                    <p className="text-sm text-purple-600">Intensity: {data.value}%</p>
                    {data.isPeak && (
                      <p className="text-xs text-orange-500 font-bold mt-1">📍 PEAK DAY</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Click to move peak here</p>
                  </div>
                );
              }}
            />
            
            <Area
              type="monotone"
              dataKey="value"
              stroke="#8b5cf6"
              strokeWidth={3}
              fill="url(#areaGradient)"
              animationDuration={300}
              dot={CustomDot}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Fine-tune Controls */}
      <div className="bg-gray-50 p-4 rounded-xl space-y-4">
        <div className="text-sm font-medium text-gray-700">FINE-TUNE YOUR PREDICTION</div>
        
        {/* Days slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-600">Days until peak</span>
            <span className="text-sm font-bold text-purple-600">{peakDays} days</span>
          </div>
          <input
            type="range"
            min="1"
            max="90"
            value={peakDays}
            onChange={(e) => {
              setPeakDays(parseInt(e.target.value));
              setSelectedPattern('custom');
            }}
            className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider-purple"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Tomorrow</span>
            <span>3 months</span>
          </div>
        </div>

        {/* Intensity slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-600">Peak intensity</span>
            <span className="text-sm font-bold text-purple-600">{peakIntensity}%</span>
          </div>
          <input
            type="range"
            min="30"
            max="100"
            value={peakIntensity}
            onChange={(e) => {
              setPeakIntensity(parseInt(e.target.value));
              setSelectedPattern('custom');
            }}
            className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider-purple"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Mild</span>
            <span>Viral explosion</span>
          </div>
        </div>
      </div>

      {/* Community Consensus (Collapsible) */}
      <div className="bg-blue-50 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowCommunity(!showCommunity)}
          className="w-full p-4 flex items-center justify-between hover:bg-blue-100 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">COMMUNITY PREDICTIONS</span>
          {showCommunity ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {showCommunity && (
          <div className="p-4 pt-0 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-20">Next week</span>
              <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: '15%' }} />
              </div>
              <span className="text-xs font-medium">15%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-20">2-4 weeks</span>
              <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: '45%' }} />
              </div>
              <span className="text-xs font-medium">45%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-20">1-2 months</span>
              <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: '30%' }} />
              </div>
              <span className="text-xs font-medium">30%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-20">2+ months</span>
              <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: '10%' }} />
              </div>
              <span className="text-xs font-medium">10%</span>
            </div>
            {isDifferentFromCrowd && (
              <div className="mt-2 p-2 bg-yellow-100 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  Your prediction differs from the crowd (+{crowdBonus} XP bonus)
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confidence/Betting */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl">
        <div className="text-sm font-medium text-gray-700 mb-3">YOUR CONFIDENCE</div>
        
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="10"
            max="100"
            value={confidence}
            onChange={(e) => setConfidence(parseInt(e.target.value))}
            className="flex-1 h-2 bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-lg appearance-none cursor-pointer"
          />
          <div className={`text-2xl font-bold px-3 py-1 rounded-lg ${
            confidence < 40 ? 'text-green-600 bg-green-50' :
            confidence < 70 ? 'text-yellow-600 bg-yellow-50' :
            'text-red-600 bg-red-50'
          }`}>
            {confidence}%
          </div>
        </div>

        {/* Stakes */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-white rounded-lg p-2 text-center">
            <div className="text-xs text-gray-500">BET</div>
            <div className="text-lg font-bold text-purple-600">{xpBet} XP</div>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <div className="text-xs text-green-600">WIN</div>
            <div className="text-lg font-bold text-green-600">+{potentialWin + crowdBonus}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-2 text-center">
            <div className="text-xs text-red-600">LOSE</div>
            <div className="text-lg font-bold text-red-600">-{potentialLoss}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setPeakDays(30);
            setPeakIntensity(75);
            setConfidence(50);
            setSelectedPattern('wave');
          }}
          className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
        
        <button
          onClick={handleSave}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 font-medium"
        >
          <Lock className="w-4 h-4" />
          Lock Prediction • {xpBet} XP
        </button>
      </div>

      <style jsx>{`
        .slider-purple::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #8b5cf6;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .slider-purple::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #8b5cf6;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}