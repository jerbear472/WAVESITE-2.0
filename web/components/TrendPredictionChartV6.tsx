'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  ChevronUp,
  ChevronDown,
  Lock,
  Eye,
  EyeOff,
  TrendingUp
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
    id: 'rocket', 
    name: 'Rocket', 
    icon: '🚀', 
    days: 7, 
    intensity: 95,
    example: 'Ice Bucket Challenge',
    description: 'Explodes fast, dies fast'
  },
  { 
    id: 'wave', 
    name: 'Wave', 
    icon: '🌊', 
    days: 30, 
    intensity: 75,
    example: 'Stanley Cup craze',
    description: 'Steady rise and fall'
  },
  { 
    id: 'grower', 
    name: 'Grower', 
    icon: '🌱', 
    days: 60, 
    intensity: 85,
    example: 'Roman Empire thoughts',
    description: 'Slow build, staying power'
  },
  { 
    id: 'flash', 
    name: 'Flash', 
    icon: '⚡', 
    days: 3, 
    intensity: 100,
    example: 'Bernie mittens',
    description: 'Instant viral moment'
  },
  { 
    id: 'longtail', 
    name: 'Long tail', 
    icon: '🦎', 
    days: 45, 
    intensity: 70,
    example: 'Girl dinner',
    description: 'Peaks late, fades slowly'
  }
];

export default function TrendPredictionChartV6({
  trendId,
  trendTitle,
  onSavePrediction
}: TrendPredictionChartProps) {
  // Single peak point state (days from now, intensity 0-100)
  const [peakDays, setPeakDays] = useState(30);
  const [peakIntensity, setPeakIntensity] = useState(75);
  const [confidence, setConfidence] = useState(50);
  const [showCommunity, setShowCommunity] = useState(false);
  const [showOtherPredictions, setShowOtherPredictions] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState('wave');
  const [otherPredictions, setOtherPredictions] = useState<OtherPrediction[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

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
    setLoadingPredictions(true);
    try {
      // Load real predictions from database
      const { data, error } = await supabase
        .from('trend_predictions')
        .select('user_id, predicted_peak_date, confidence_score, profiles!user_id(username)')
        .eq('trend_submission_id', trendId)
        .limit(20);

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
        // Generate sample predictions for demo
        setOtherPredictions([
          { userId: '1', username: 'TrendMaster', peakDays: 15, peakIntensity: 85, confidence: 75 },
          { userId: '2', username: 'ViralScout', peakDays: 25, peakIntensity: 70, confidence: 60 },
          { userId: '3', username: 'WaveRider', peakDays: 35, peakIntensity: 80, confidence: 80 },
          { userId: '4', username: 'EarlyBird', peakDays: 8, peakIntensity: 95, confidence: 65 },
          { userId: '5', username: 'LateBoomer', peakDays: 50, peakIntensity: 65, confidence: 45 }
        ]);
      }
    } catch (error) {
      console.error('Error loading predictions:', error);
      // Use sample data on error
      setOtherPredictions([
        { userId: '1', username: 'TrendMaster', peakDays: 15, peakIntensity: 85, confidence: 75 },
        { userId: '2', username: 'ViralScout', peakDays: 25, peakIntensity: 70, confidence: 60 },
        { userId: '3', username: 'WaveRider', peakDays: 35, peakIntensity: 80, confidence: 80 }
      ]);
    }
    setLoadingPredictions(false);
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

  // Generate smooth curve for a given peak - MUCH SMOOTHER ALGORITHM
  const generateCurve = useCallback((days: number, intensity: number) => {
    const curve = [];
    const totalPoints = 46; // Every 2 days for 90 days = 45 points + day 0
    
    for (let i = 0; i < totalPoints; i++) {
      const day = i * 2; // 0, 2, 4, 6, ... 90
      let value;
      
      if (day === 0) {
        value = 15; // Starting baseline
      } else {
        // Normalize day to 0-1 scale
        const t = day / 90;
        const peakT = days / 90;
        
        // Use smooth mathematical curves based on peak position
        if (t < peakT) {
          // Pre-peak: smooth acceleration using power curve
          const progress = t / peakT;
          const easedProgress = 1 - Math.pow(1 - progress, 2.5); // Ease-out curve
          value = 15 + (intensity - 15) * easedProgress;
        } else {
          // Post-peak: smooth deceleration
          const progress = (t - peakT) / (1 - peakT);
          let decayRate;
          
          // Different decay rates based on peak timing
          if (days <= 7) {
            decayRate = 3.5; // Very fast decay for flash trends
          } else if (days <= 21) {
            decayRate = 2.5; // Fast decay for rockets
          } else if (days <= 45) {
            decayRate = 1.8; // Medium decay for waves
          } else {
            decayRate = 1.2; // Slow decay for growers
          }
          
          // Exponential decay with floor
          const decayValue = intensity * Math.exp(-decayRate * progress);
          value = Math.max(10, decayValue); // Floor at 10%
        }
      }
      
      curve.push({
        day,
        value: Math.round(Math.max(5, Math.min(100, value))),
        isPeak: Math.abs(day - days) <= 2 // Wider peak detection for smoother experience
      });
    }
    
    return curve;
  }, []);

  // Generate main chart data with all curves
  const chartData = useMemo(() => {
    const yourCurve = generateCurve(peakDays, peakIntensity);
    
    return yourCurve.map((point, index) => {
      const dataPoint: any = {
        day: point.day,
        date: format(addDays(new Date(), point.day), 'MMM d'),
        yourPrediction: point.value,
        isPeak: point.isPeak
      };
      
      // Add other users' predictions if visible
      if (showOtherPredictions) {
        otherPredictions.forEach((pred, predIndex) => {
          const curve = generateCurve(pred.peakDays, pred.peakIntensity);
          dataPoint[`user${predIndex}`] = curve[index]?.value || 0;
        });
        
        // Add average prediction
        if (averagePrediction) {
          const avgCurve = generateCurve(averagePrediction.days, averagePrediction.intensity);
          dataPoint.average = avgCurve[index]?.value || 0;
        }
      }
      
      return dataPoint;
    });
  }, [peakDays, peakIntensity, showOtherPredictions, otherPredictions, averagePrediction, generateCurve]);

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

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">When will "{trendTitle}" peak?</h2>
        <p className="text-sm text-gray-500 mt-2">
          Choose a pattern or adjust the sliders to predict the trend wave
        </p>
      </div>

      {/* Pattern Templates with Examples */}
      <div className="bg-gray-50 p-4 rounded-xl">
        <div className="text-sm font-medium text-gray-700 mb-3">CHOOSE A PATTERN</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {PATTERN_TEMPLATES.map(pattern => (
            <motion.button
              key={pattern.id}
              onClick={() => applyPattern(pattern)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                selectedPattern === pattern.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{pattern.icon}</span>
                <span className="text-sm font-bold">{pattern.name}</span>
              </div>
              <div className="text-xs text-gray-600 mb-1">{pattern.description}</div>
              <div className="text-xs text-blue-600 font-medium">
                e.g., {pattern.example}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {pattern.days} days • {pattern.intensity}% intensity
              </div>
            </motion.button>
          ))}
        </div>
        <button
          onClick={() => setSelectedPattern('custom')}
          className={`mt-3 w-full p-2 rounded-lg border-2 transition-all ${
            selectedPattern === 'custom'
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <span className="text-sm font-medium">✏️ Custom Pattern</span>
        </button>
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-xl border-2 border-gray-200 relative">
        {/* Peak Date Display */}
        <div className="absolute top-4 right-4 z-10 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="text-xs opacity-90">Your peak prediction:</div>
          <div className="text-xl font-bold">{peakDate.short}</div>
          <div className="text-xs opacity-90">({peakDays} days)</div>
        </div>

        {/* Toggle Community Predictions */}
        <button
          onClick={() => setShowOtherPredictions(!showOtherPredictions)}
          className={`absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
            showOtherPredictions 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {showOtherPredictions ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="text-sm font-medium">
            {showOtherPredictions ? 'Hide' : 'Show'} Community
          </span>
        </button>

        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart 
            data={chartData}
            style={{ cursor: 'default' }}
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
                    {payload.map((entry: any, index: number) => {
                      if (entry.dataKey === 'yourPrediction') {
                        return (
                          <p key={index} className="text-sm text-purple-600 font-bold">
                            You: {entry.value}%
                          </p>
                        );
                      } else if (entry.dataKey === 'average') {
                        return (
                          <p key={index} className="text-sm text-blue-600">
                            Community Avg: {entry.value}%
                          </p>
                        );
                      } else if (entry.dataKey.startsWith('user')) {
                        const userIndex = parseInt(entry.dataKey.replace('user', ''));
                        const user = otherPredictions[userIndex];
                        if (user) {
                          return (
                            <p key={index} className="text-xs text-gray-500">
                              {user.username}: {entry.value}%
                            </p>
                          );
                        }
                      }
                      return null;
                    })}
                    {data.isPeak && (
                      <p className="text-xs text-orange-500 font-bold mt-1">📍 YOUR PEAK</p>
                    )}
                  </div>
                );
              }}
            />
            
            {/* Other users' predictions (shown first so they're behind) */}
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
            
            {/* Your prediction (on top) */}
            <Area
              type="monotone"
              dataKey="yourPrediction"
              stroke="#8b5cf6"
              strokeWidth={3}
              fill="url(#yourGradient)"
              animationDuration={200}
            />
            
            {/* Peak markers */}
            <ReferenceDot
              x={chartData.find(d => d.isPeak)?.date}
              y={peakIntensity}
              r={8}
              fill="#8b5cf6"
              stroke="#fff"
              strokeWidth={3}
            />
            
            {/* Average peak marker */}
            {showOtherPredictions && averagePrediction && (
              <ReferenceDot
                x={chartData[Math.round(averagePrediction.days / 2)]?.date}
                y={averagePrediction.intensity}
                r={6}
                fill="#3b82f6"
                stroke="#fff"
                strokeWidth={2}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend when showing community */}
        {showOtherPredictions && (
          <div className="mt-4 flex gap-4 justify-center flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-purple-600"></div>
              <span>Your prediction</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-blue-500"></div>
              <span>Community average</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-gray-400" style={{ borderTop: '1px dashed' }}></div>
              <span>Others ({otherPredictions.length})</span>
            </div>
          </div>
        )}
      </div>

      {/* Smooth Control Sliders */}
      <div className="bg-gray-50 p-4 rounded-xl space-y-4">
        <div className="text-sm font-medium text-gray-700">FINE-TUNE YOUR PREDICTION</div>
        
        {/* Days slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-600">Days until peak</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-purple-600">{peakDays} days</span>
              {averagePrediction && Math.abs(peakDays - averagePrediction.days) > 10 && (
                <span className="text-xs text-blue-600">
                  (Avg: {averagePrediction.days})
                </span>
              )}
            </div>
          </div>
          <input
            type="range"
            min="3"
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
            <span>3 days</span>
            <span>3 months</span>
          </div>
        </div>

        {/* Intensity slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-600">Peak intensity</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-purple-600">{peakIntensity}%</span>
              {averagePrediction && Math.abs(peakIntensity - averagePrediction.intensity) > 15 && (
                <span className="text-xs text-blue-600">
                  (Avg: {averagePrediction.intensity}%)
                </span>
              )}
            </div>
          </div>
          <input
            type="range"
            min="30"
            max="100"
            step="1"
            value={peakIntensity}
            onChange={(e) => {
              setPeakIntensity(parseInt(e.target.value));
              setSelectedPattern('custom');
            }}
            className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider-purple"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Mild trend</span>
            <span>Viral explosion</span>
          </div>
        </div>
      </div>

      {/* Community Stats */}
      {showOtherPredictions && otherPredictions.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-xl">
          <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            COMMUNITY INSIGHTS
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-600">Most confident</div>
              <div className="text-sm font-bold text-blue-600">
                {otherPredictions.reduce((max, p) => p.confidence > max.confidence ? p : max).username}
              </div>
              <div className="text-xs text-gray-500">
                {otherPredictions.reduce((max, p) => p.confidence > max.confidence ? p : max).confidence}% sure
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Peak range</div>
              <div className="text-sm font-bold text-blue-600">
                {Math.min(...otherPredictions.map(p => p.peakDays))}-{Math.max(...otherPredictions.map(p => p.peakDays))} days
              </div>
              <div className="text-xs text-gray-500">
                Community spread
              </div>
            </div>
          </div>
          {isDifferentFromCrowd && (
            <div className="mt-3 p-2 bg-yellow-100 rounded-lg">
              <p className="text-xs text-yellow-800">
                🎯 Contrarian bet: +{crowdBonus} XP bonus if you're right!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Confidence Betting */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl">
        <div className="text-sm font-medium text-gray-700 mb-3">YOUR CONFIDENCE</div>
        
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="10"
            max="100"
            step="1"
            value={confidence}
            onChange={(e) => setConfidence(parseInt(e.target.value))}
            className="flex-1 h-3 bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-lg appearance-none cursor-pointer confidence-slider"
          />
          <div className={`text-2xl font-bold px-3 py-1 rounded-lg ${
            confidence < 40 ? 'text-green-600 bg-green-50' :
            confidence < 70 ? 'text-yellow-600 bg-yellow-50' :
            'text-red-600 bg-red-50'
          }`}>
            {confidence}%
          </div>
        </div>

        <div className="text-xs text-gray-600 mt-2 text-center">
          {confidence < 40 ? '🛡️ Safe bet • Low risk, low reward' : 
           confidence < 70 ? '⚖️ Balanced • Medium risk & reward' : 
           '🔥 High conviction • Big risk, big reward'}
        </div>

        {/* Stakes */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-white rounded-lg p-2 text-center">
            <div className="text-xs text-gray-500">BETTING</div>
            <div className="text-lg font-bold text-purple-600">{xpBet} XP</div>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <div className="text-xs text-green-600">IF RIGHT</div>
            <div className="text-lg font-bold text-green-600">+{potentialWin + crowdBonus}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-2 text-center">
            <div className="text-xs text-red-600">IF WRONG</div>
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
          Lock Prediction • Bet {xpBet} XP
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
          transition: all 0.2s ease;
        }
        .slider-purple::-webkit-slider-thumb:hover {
          transform: scale(1.1);
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
        .confidence-slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          background: white;
          border: 3px solid #8b5cf6;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
        }
        .confidence-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}