'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface SentimentSliderProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  required?: boolean;
}

export default function SentimentSlider({ 
  value = 50, 
  onChange, 
  label = "Audience Sentiment",
  required = false 
}: SentimentSliderProps) {
  const [localValue, setLocalValue] = useState(value);
  
  // Sentiment labels based on value
  const getSentimentLabel = (val: number) => {
    if (val <= 20) return { text: '😡 Very Negative', color: '#ef4444' };
    if (val <= 40) return { text: '😠 Negative', color: '#f97316' };
    if (val <= 60) return { text: '😐 Neutral', color: '#eab308' };
    if (val <= 80) return { text: '😊 Positive', color: '#84cc16' };
    return { text: '😍 Very Positive', color: '#22c55e' };
  };
  
  const sentiment = getSentimentLabel(localValue);
  
  // Calculate gradient color based on value
  const getGradientColor = (val: number) => {
    // Red to yellow to green gradient
    if (val <= 50) {
      // Red to yellow (0-50)
      const ratio = val / 50;
      const r = 239; // red
      const g = Math.round(68 + (203 - 68) * ratio); // transition to yellow
      const b = 68;
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Yellow to green (50-100)
      const ratio = (val - 50) / 50;
      const r = Math.round(234 - (234 - 34) * ratio);
      const g = Math.round(179 + (197 - 179) * ratio);
      const b = 8;
      return `rgb(${r}, ${g}, ${b})`;
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    setLocalValue(newValue);
    onChange(newValue);
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-wave-200 font-medium">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
        <span 
          className="text-sm font-semibold px-3 py-1 rounded-full"
          style={{ 
            backgroundColor: `${sentiment.color}20`,
            color: sentiment.color 
          }}
        >
          {sentiment.text}
        </span>
      </div>
      
      <div className="relative">
        {/* Gradient background track */}
        <div className="absolute inset-0 h-3 rounded-full overflow-hidden top-3">
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{
              background: `linear-gradient(to right, #ef4444 0%, #f97316 25%, #eab308 50%, #84cc16 75%, #22c55e 100%)`
            }}
          />
        </div>
        
        {/* Active fill */}
        <div 
          className="absolute h-3 rounded-full top-3 transition-all duration-300"
          style={{
            width: `${localValue}%`,
            backgroundColor: getGradientColor(localValue),
            opacity: 0.8
          }}
        />
        
        {/* Slider input */}
        <input
          type="range"
          min="0"
          max="100"
          value={localValue}
          onChange={handleChange}
          className="relative w-full h-3 mt-3 appearance-none bg-transparent cursor-pointer z-10
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-6
            [&::-webkit-slider-thumb]:h-6
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-wave-600
            [&::-webkit-slider-thumb]:transition-all
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:appearance-none
            [&::-moz-range-thumb]:w-6
            [&::-moz-range-thumb]:h-6
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:shadow-lg
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-wave-600
            [&::-moz-range-thumb]:transition-all
            [&::-moz-range-thumb]:hover:scale-110"
        />
      </div>
      
      {/* Value labels */}
      <div className="flex justify-between text-xs text-wave-400 px-1">
        <span>Extremely Negative</span>
        <span>Neutral</span>
        <span>Extremely Positive</span>
      </div>
      
      {/* Numeric value display */}
      <div className="text-center">
        <span className="text-2xl font-bold" style={{ color: sentiment.color }}>
          {localValue}
        </span>
        <span className="text-wave-400 text-sm ml-1">/ 100</span>
      </div>
    </div>
  );
}