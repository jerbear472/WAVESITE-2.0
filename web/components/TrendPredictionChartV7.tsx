'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  ComposedChart
} from 'recharts';
import { motion } from 'framer-motion';
import {
  RotateCcw,
  Lock,
  Eye,
  EyeOff,
  TrendingUp,
  Move
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface OtherPrediction {
  userId: string;
  username: string;
  peakDays: number;
  peakIntensity: number;
  confidence: number;
}

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
  { 
    id: 'peaked', 
    name: 'Already Peaked', 
    icon: '📉', 
    days: -7,  // Negative days means it peaked in the past
    intensity: 30,  // Current intensity is low
    example: 'Last week\'s meme',
    description: 'It\'s over, moving on',
    decayRate: 10.0,  // Very steep decline
    isPast: true
  },
  { 
    id: '48hrs', 
    name: '48 Hours', 
    icon: '⚡', 
    days: 2, 
    intensity: 100,
    example: 'Breaking news reaction',
    description: 'Exploding right now',
    decayRate: 6.0  // Fast decay after peak
  },
  { 
    id: '1week', 
    name: '1 Week', 
    icon: '🚀', 
    days: 7, 
    intensity: 90,
    example: 'Viral challenge',
    description: 'Building momentum fast',
    decayRate: 4.0  // Moderate decay
  },
  { 
    id: 'here_to_stay', 
    name: 'Here to Stay', 
    icon: '♾️', 
    days: 90, 
    intensity: 70,
    example: 'New lifestyle trend',
    description: 'Long-term cultural shift',
    decayRate: 1.0  // Slow decay
  }
];

export default function TrendPredictionChartV7({
  trendId,
  trendTitle,
  onSavePrediction
}: TrendPredictionChartProps) {
  const [peakDays, setPeakDays] = useState(30);
  const [peakIntensity, setPeakIntensity] = useState(75);
  const confidence = 75; // Fixed confidence for simplified UX
  const [showOtherPredictions, setShowOtherPredictions] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState('1week');
  const [otherPredictions, setOtherPredictions] = useState<OtherPrediction[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // XP calculations
  const xpBet = Math.round(confidence / 2);
  const potentialWin = Math.round(xpBet * (confidence / 25));
  const potentialLoss = Math.round(xpBet * 0.2);
  const isDifferentFromCrowd = peakDays < 14 || peakDays > 45;
  const crowdBonus = isDifferentFromCrowd ? Math.round(xpBet * 0.5) : 0;

  // Load other users' predictions
  useEffect(() => {
    if (showOtherPredictions && otherPredictions.length === 0) {
      loadOtherPredictions();
    }
  }, [showOtherPredictions]);

  const loadOtherPredictions = async () => {
    try {
      const { data } = await supabase
        .from('trend_predictions')
        .select('user_id, predicted_peak_date, confidence_score, profiles!user_id(username)')
        .eq('trend_submission_id', trendId)
        .limit(10);

      if (data && data.length > 0) {
        const predictions: OtherPrediction[] = data.map((pred: any) => {
          const peakDate = new Date(pred.predicted_peak_date);
          const daysFromNow = Math.round((peakDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          
          return {
            userId: pred.user_id,
            username: pred.profiles?.username || 'Anonymous',
            peakDays: Math.max(1, Math.min(90, daysFromNow)),
            peakIntensity: 50 + Math.round(pred.confidence_score / 2),
            confidence: pred.confidence_score || 50
          };
        });
        setOtherPredictions(predictions);
      } else {
        // Sample data for demo
        setOtherPredictions([
          { userId: '1', username: 'TrendMaster', peakDays: 15, peakIntensity: 85, confidence: 75 },
          { userId: '2', username: 'ViralScout', peakDays: 25, peakIntensity: 70, confidence: 60 },
          { userId: '3', username: 'WaveRider', peakDays: 35, peakIntensity: 80, confidence: 80 }
        ]);
      }
    } catch (error) {
      console.error('Error loading predictions:', error);
    }
  };

  // Calculate average community prediction
  const averagePrediction = useMemo(() => {
    if (otherPredictions.length === 0) return null;
    
    const avgDays = Math.round(
      otherPredictions.reduce((sum, p) => sum + p.peakDays, 0) / otherPredictions.length
    );
    const avgIntensity = Math.round(
      otherPredictions.reduce((sum, p) => sum + p.peakIntensity, 0) / otherPredictions.length
    );
    
    return { days: avgDays, intensity: avgIntensity };
  }, [otherPredictions]);

  // Generate curve with pattern-specific decay rates
  const generateCurve = useCallback((days: number, intensity: number, patternId?: string) => {
    const curve = [];
    const totalPoints = 46;
    
    // Handle "Already Peaked" pattern (negative days)
    if (days < 0) {
      const peakDaysAgo = Math.abs(days);
      const peakIntensityValue = 90; // Assume it peaked at 90%
      
      for (let i = 0; i < totalPoints; i++) {
        const day = i * 2;
        let value;
        
        if (day === 0) {
          // Current day - already declining
          value = intensity; // Use current intensity (low)
        } else {
          // Future projection - continued decline
          const decayRate = 5.0; // Steep decline
          const decayFactor = Math.exp(-decayRate * (day / 30));
          value = Math.max(5, intensity * decayFactor);
        }
        
        curve.push({
          day,
          value: Math.round(Math.max(5, Math.min(100, value))),
          isPeak: false, // Peak was in the past
          isPast: day === 0 // Mark current position
        });
      }
      
      return curve;
    }
    
    // Get decay rate from pattern or calculate based on days
    let decayRate = 2.0; // default
    if (patternId) {
      const pattern = PATTERN_TEMPLATES.find(p => p.id === patternId);
      if (pattern) decayRate = pattern.decayRate;
    } else {
      // Auto-calculate decay rate based on peak timing
      if (days <= 3) decayRate = 8.0;
      else if (days <= 7) decayRate = 4.5;
      else if (days <= 21) decayRate = 3.0;
      else if (days <= 45) decayRate = 2.0;
      else decayRate = 1.0;
    }
    
    for (let i = 0; i < totalPoints; i++) {
      const day = i * 2;
      let value;
      
      if (day === 0) {
        value = 10; // Starting baseline
      } else if (day < days) {
        // Pre-peak: smooth rise
        const progress = day / days;
        // Use a smoother curve for rise
        const easedProgress = Math.sin(progress * Math.PI / 2);
        value = 10 + (intensity - 10) * easedProgress;
      } else if (day === days) {
        // Peak
        value = intensity;
      } else {
        // Post-peak: pattern-specific decay
        const daysAfterPeak = day - days;
        
        // For flash pattern, drop to near-zero very quickly
        if (patternId === 'flash') {
          if (daysAfterPeak <= 2) {
            value = intensity * 0.3; // Drop to 30% immediately
          } else if (daysAfterPeak <= 4) {
            value = intensity * 0.1; // Drop to 10% by day 2
          } else {
            value = 5; // Flatline at minimum
          }
        } else {
          // Normal exponential decay for other patterns
          const decayFactor = Math.exp(-decayRate * (daysAfterPeak / 10));
          value = Math.max(5, intensity * decayFactor);
        }
      }
      
      curve.push({
        day,
        value: Math.round(Math.max(5, Math.min(100, value))),
        isPeak: day === days
      });
    }
    
    return curve;
  }, []);

  // Generate main chart data
  const chartData = useMemo(() => {
    const yourCurve = generateCurve(peakDays, peakIntensity, selectedPattern);
    
    return yourCurve.map((point, index) => {
      const dataPoint: any = {
        day: point.day,
        date: format(addDays(new Date(), point.day), 'MMM d'),
        yourPrediction: point.value,
        isPeak: point.isPeak
      };
      
      if (showOtherPredictions) {
        otherPredictions.forEach((pred, predIndex) => {
          const curve = generateCurve(pred.peakDays, pred.peakIntensity);
          dataPoint[`user${predIndex}`] = curve[index]?.value || 0;
        });
        
        if (averagePrediction) {
          const avgCurve = generateCurve(averagePrediction.days, averagePrediction.intensity);
          dataPoint.average = avgCurve[index]?.value || 0;
        }
      }
      
      return dataPoint;
    });
  }, [peakDays, peakIntensity, selectedPattern, showOtherPredictions, otherPredictions, averagePrediction, generateCurve]);

  // Handle chart click to move peak
  const handleChartClick = useCallback((e: any) => {
    if (e && e.activeLabel) {
      // Find the day index from the clicked point
      const clickedPoint = chartData.find(d => d.date === e.activeLabel);
      if (clickedPoint) {
        setPeakDays(clickedPoint.day);
        setSelectedPattern('custom');
      }
    }
  }, [chartData]);

  // Apply pattern template
  const applyPattern = (pattern: typeof PATTERN_TEMPLATES[0]) => {
    setPeakDays(pattern.days);
    // Keep current intensity instead of overriding with pattern default
    // Only set intensity if it's the first time or user explicitly wants pattern defaults
    if (selectedPattern === 'custom' || selectedPattern !== pattern.id) {
      // Optional: You can choose to keep current intensity or use pattern default
      // setPeakIntensity(pattern.intensity); // Uncomment to use pattern defaults
      // Keep current intensity for better user experience
    }
    setSelectedPattern(pattern.id);
  };

  // Get peak date
  const peakDate = useMemo(() => {
    if (peakDays < 0) {
      // Peak was in the past
      const date = addDays(new Date(), peakDays);
      return {
        short: `${Math.abs(peakDays)} days ago`,
        full: `Peaked ${format(date, 'MMMM d, yyyy')}`,
        date,
        isPast: true
      };
    }
    const date = addDays(new Date(), peakDays);
    return {
      short: format(date, 'MMM d'),
      full: format(date, 'MMMM d, yyyy'),
      date,
      isPast: false
    };
  }, [peakDays]);

  const handleSave = () => {
    const curve = chartData.map(point => ({
      date: addDays(new Date(), point.day),
      value: point.yourPrediction,
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

  // Custom draggable dot
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    // Always return an element for Area component compatibility
    if (!payload?.isPeak) {
      return <circle cx={cx} cy={cy} r={0} fill="transparent" />;
    }
    
    return (
      <g style={{ cursor: 'move' }}>
        <circle
          cx={cx}
          cy={cy}
          r={12}
          fill="#8b5cf6"
          stroke="#fff"
          strokeWidth={3}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(139, 92, 246, 0.3))' }}
        />
        <text
          x={cx}
          y={cy - 20}
          fill="#8b5cf6"
          fontSize="11"
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
        <p className="text-sm text-gray-500 mt-2 flex items-center justify-center gap-2">
          <Move className="w-4 h-4" />
          Click anywhere on the chart to move the peak, or use the sliders
        </p>
      </div>

      {/* Pattern Templates */}
      <div className="bg-gray-50 p-4 rounded-xl">
        <div className="text-sm font-medium text-gray-700 mb-3">CHOOSE A PATTERN</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {PATTERN_TEMPLATES.map(pattern => (
            <motion.button
              key={pattern.id}
              onClick={() => applyPattern(pattern)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                selectedPattern === pattern.id
                  ? 'border-purple-500 bg-purple-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{pattern.icon}</span>
                <span className="text-sm font-bold">{pattern.name}</span>
              </div>
              <div className="text-xs text-gray-600">{pattern.description}</div>
              <div className="text-xs text-blue-600 font-medium mt-1">
                {pattern.example}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-xl border-2 border-gray-200 relative" ref={chartRef}>
        {/* Peak Date Display */}
        <div className={`absolute top-4 right-4 z-10 px-4 py-2 rounded-lg shadow-lg ${
          peakDate.isPast 
            ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white'
            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
        }`}>
          <div className="text-xs opacity-90">
            {peakDate.isPast ? 'Peak was:' : 'Peak prediction:'}
          </div>
          <div className="text-xl font-bold">{peakDate.short}</div>
          {!peakDate.isPast && (
            <div className="text-xs opacity-90">in {peakDays} days</div>
          )}
        </div>

        {/* Toggle Community */}
        <button
          onClick={() => setShowOtherPredictions(!showOtherPredictions)}
          className={`absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
            showOtherPredictions 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {showOtherPredictions ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="text-sm font-medium">Community</span>
        </button>

        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart 
            data={chartData}
            onClick={handleChartClick}
            style={{ cursor: 'crosshair' }}
          >
            <defs>
              <linearGradient id="yourGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="avgGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
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
                    <p className="text-sm text-purple-600 font-bold">
                      Intensity: {payload[0].value}%
                    </p>
                    {data.isPeak && (
                      <p className="text-xs text-orange-500 font-bold mt-1">📍 PEAK DAY</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Click to move peak here</p>
                  </div>
                );
              }}
            />
            
            {/* Other users' predictions */}
            {showOtherPredictions && otherPredictions.map((pred, index) => (
              <Line
                key={`user${index}`}
                type="monotone"
                dataKey={`user${index}`}
                stroke="#cbd5e1"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                opacity={0.5}
              />
            ))}
            
            {/* Community average */}
            {showOtherPredictions && averagePrediction && (
              <Area
                type="monotone"
                dataKey="average"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#avgGradient)"
                strokeDasharray="5 5"
              />
            )}
            
            {/* Your prediction */}
            <Area
              type="monotone"
              dataKey="yourPrediction"
              stroke="#8b5cf6"
              strokeWidth={3}
              fill="url(#yourGradient)"
              dot={CustomDot}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Fine-tune Controls */}
      <div className="bg-gray-50 p-4 rounded-xl space-y-4">
        <div className="text-sm font-medium text-gray-700">FINE-TUNE YOUR PREDICTION</div>
        
        {/* Days slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-600">
              {peakDays < 0 ? 'Days since peak' : 'Days until peak'}
            </span>
            <span className="text-sm font-bold text-purple-600">
              {peakDays < 0 ? `${Math.abs(peakDays)} days ago` : `${peakDays} days`}
            </span>
          </div>
          <input
            type="range"
            min="-30"
            max="90"
            step="1"
            value={peakDays}
            onChange={(e) => {
              setPeakDays(parseInt(e.target.value));
              setSelectedPattern('custom');
            }}
            className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider-purple"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>30d ago</span>
            <span>Today</span>
            <span>90d future</span>
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
            min="10"
            max="100"
            step="5"
            value={peakIntensity}
            onChange={(e) => {
              setPeakIntensity(parseInt(e.target.value));
              setSelectedPattern('custom');
            }}
            className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider-purple"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>10%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* XP Stakes - Simplified */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 uppercase">Stake</div>
            <div className="text-xl font-bold text-purple-600">{xpBet} XP</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-xs text-green-600 uppercase">If Right</div>
            <div className="text-xl font-bold text-green-600">+{potentialWin + crowdBonus}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-xs text-red-600 uppercase">If Wrong</div>
            <div className="text-xl font-bold text-red-600">-{potentialLoss}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setPeakDays(30);
            setPeakIntensity(75);
            setSelectedPattern('custom');
          }}
          className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
        
        <button
          onClick={handleSave}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 font-semibold text-lg"
        >
          <Lock className="w-5 h-5" />
          Lock in Prediction
        </button>
      </div>

      <style jsx>{`
        .slider-purple::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: #8b5cf6;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .slider-purple::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #8b5cf6;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}