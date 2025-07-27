'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, Filter, TrendingUp, Sparkles, Target, 
  ArrowUpRight, ArrowDownRight, ArrowUpLeft, ArrowDownLeft,
  Play, Pause, RotateCw, Download, Maximize2
} from 'lucide-react';

interface TrendPosition {
  id: string;
  name: string;
  x: number; // -1 (subculture) to 1 (mainstream)
  y: number; // -1 (positive) to 1 (polarizing)
  velocity: { x: number; y: number };
  size: number; // engagement size
  category: string;
  timestamp: number;
}

interface CompassQuadrant {
  id: string;
  label: string;
  description: string;
  color: string;
  gradient: string;
  icon: React.ReactNode;
}

export function CulturalCompass() {
  const [trends, setTrends] = useState<TrendPosition[]>([]);
  const [selectedTrend, setSelectedTrend] = useState<TrendPosition | null>(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTrails, setShowTrails] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [hoveredQuadrant, setHoveredQuadrant] = useState<string | null>(null);

  const quadrants: CompassQuadrant[] = [
    {
      id: 'niche-positive',
      label: 'Niche Darlings',
      description: 'Beloved by specific communities',
      color: 'purple',
      gradient: 'from-purple-500/20 to-transparent',
      icon: <ArrowUpLeft className="w-5 h-5" />
    },
    {
      id: 'mass-positive',
      label: 'Mainstream Winners',
      description: 'Widely accepted and loved',
      color: 'cyan',
      gradient: 'from-cyan-500/20 to-transparent',
      icon: <ArrowUpRight className="w-5 h-5" />
    },
    {
      id: 'niche-polarizing',
      label: 'Cult Controversies',
      description: 'Divisive within subcultures',
      color: 'pink',
      gradient: 'from-pink-500/20 to-transparent',
      icon: <ArrowDownLeft className="w-5 h-5" />
    },
    {
      id: 'mass-polarizing',
      label: 'Viral Debates',
      description: 'Mainstream but controversial',
      color: 'amber',
      gradient: 'from-amber-500/20 to-transparent',
      icon: <ArrowDownRight className="w-5 h-5" />
    }
  ];

  useEffect(() => {
    // Generate sample trend data
    const sampleTrends: TrendPosition[] = [
      { id: '1', name: 'AI-Generated Fashion', x: -0.3, y: 0.6, velocity: { x: 0.02, y: -0.01 }, size: 85, category: 'Technology', timestamp: Date.now() },
      { id: '2', name: 'NPC TikTok', x: -0.7, y: 0.8, velocity: { x: 0.03, y: 0.02 }, size: 92, category: 'Entertainment', timestamp: Date.now() },
      { id: '3', name: 'Barbiecore', x: 0.8, y: -0.6, velocity: { x: -0.01, y: -0.02 }, size: 78, category: 'Fashion', timestamp: Date.now() },
      { id: '4', name: 'Quiet Luxury', x: 0.3, y: -0.3, velocity: { x: 0.02, y: 0.01 }, size: 65, category: 'Fashion', timestamp: Date.now() },
      { id: '5', name: 'AI Art Debates', x: -0.4, y: 0.4, velocity: { x: 0.03, y: 0.03 }, size: 88, category: 'Technology', timestamp: Date.now() },
      { id: '6', name: 'BeReal Authenticity', x: -0.5, y: -0.7, velocity: { x: 0.04, y: 0.01 }, size: 72, category: 'Social Media', timestamp: Date.now() },
      { id: '7', name: 'Deinfluencing', x: 0.2, y: -0.5, velocity: { x: 0.02, y: -0.03 }, size: 58, category: 'Social Media', timestamp: Date.now() },
      { id: '8', name: 'Climate Activism', x: 0.6, y: 0.7, velocity: { x: 0.01, y: -0.02 }, size: 94, category: 'Social Issues', timestamp: Date.now() },
      { id: '9', name: 'Crypto Recovery', x: -0.6, y: 0.5, velocity: { x: 0.05, y: -0.04 }, size: 81, category: 'Finance', timestamp: Date.now() },
      { id: '10', name: 'Nostalgiacore', x: 0.7, y: -0.8, velocity: { x: -0.02, y: 0.01 }, size: 76, category: 'Culture', timestamp: Date.now() }
    ];
    setTrends(sampleTrends);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setTrends(prevTrends => 
          prevTrends.map(trend => ({
            ...trend,
            x: Math.max(-1, Math.min(1, trend.x + trend.velocity.x)),
            y: Math.max(-1, Math.min(1, trend.y + trend.velocity.y)),
            timestamp: Date.now()
          }))
        );
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  const getQuadrant = (x: number, y: number): string => {
    if (x < 0 && y < 0) return 'niche-positive';
    if (x > 0 && y < 0) return 'mass-positive';
    if (x < 0 && y > 0) return 'niche-polarizing';
    return 'mass-polarizing';
  };

  const filteredTrends = filterCategory === 'all' 
    ? trends 
    : trends.filter(t => t.category === filterCategory);

  const categories = ['all', ...new Set(trends.map(t => t.category))];

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-2">Cultural Compass</h2>
          <p className="text-gray-400">Track how trends move through cultural spaces</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => setShowTrails(!showTrails)}
            className={`px-4 py-2 rounded-lg transition-all ${
              showTrails 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' 
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
          >
            Show Trails
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Pause' : 'Play'} Animation
          </button>
        </div>
      </div>

      {/* Main Compass */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-800/50">
        <div className="relative aspect-square max-w-4xl mx-auto">
          {/* Quadrant Backgrounds */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            {quadrants.map((quadrant, idx) => (
              <motion.div
                key={quadrant.id}
                className={`relative bg-gradient-to-br ${quadrant.gradient} border-gray-800 cursor-pointer transition-all ${
                  idx === 0 ? 'rounded-tl-2xl border-r border-b' :
                  idx === 1 ? 'rounded-tr-2xl border-l border-b' :
                  idx === 2 ? 'rounded-bl-2xl border-r border-t' :
                  'rounded-br-2xl border-l border-t'
                }`}
                onMouseEnter={() => setHoveredQuadrant(quadrant.id)}
                onMouseLeave={() => setHoveredQuadrant(null)}
                animate={{
                  opacity: hoveredQuadrant === quadrant.id ? 1 : hoveredQuadrant ? 0.3 : 0.7
                }}
              >
                <div className="absolute inset-4 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    {quadrant.icon}
                    <div className="text-right">
                      <div className="font-semibold text-sm">{quadrant.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{quadrant.description}</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-600">
                    {filteredTrends.filter(t => getQuadrant(t.x, t.y) === quadrant.id).length}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Axes */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-full h-px bg-gray-700"></div>
            <div className="absolute h-full w-px bg-gray-700"></div>
            
            {/* Axis Labels */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-sm font-medium text-gray-400">
              POSITIVE
            </div>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm font-medium text-gray-400">
              POLARIZING
            </div>
            <div className="absolute -left-20 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400 -rotate-90">
              SUBCULTURE
            </div>
            <div className="absolute -right-20 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400 rotate-90">
              MAINSTREAM
            </div>
          </div>

          {/* Trend Points */}
          <AnimatePresence>
            {filteredTrends.map((trend) => {
              const isSelected = selectedTrend?.id === trend.id;
              const quadrant = getQuadrant(trend.x, trend.y);
              const quadrantColor = quadrants.find(q => q.id === quadrant)?.color || 'gray';
              
              return (
                <motion.div
                  key={trend.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: isSelected ? 1.5 : 1, 
                    opacity: 1,
                    x: `${50 + trend.x * 45}%`,
                    y: `${50 - trend.y * 45}%`
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  whileHover={{ scale: 1.2 }}
                  onClick={() => setSelectedTrend(trend)}
                  className="absolute cursor-pointer"
                  style={{
                    transform: 'translate(-50%, -50%)',
                    zIndex: isSelected ? 50 : 10
                  }}
                >
                  {/* Velocity Vector */}
                  {showTrails && (
                    <svg
                      className="absolute inset-0 w-32 h-32 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ left: '50%', top: '50%' }}
                    >
                      <defs>
                        <marker
                          id={`arrowhead-${trend.id}`}
                          markerWidth="10"
                          markerHeight="7"
                          refX="9"
                          refY="3.5"
                          orient="auto"
                        >
                          <polygon
                            points="0 0, 10 3.5, 0 7"
                            fill="rgba(148, 163, 184, 0.5)"
                          />
                        </marker>
                      </defs>
                      <line
                        x1="64"
                        y1="64"
                        x2={64 + trend.velocity.x * 500}
                        y2={64 - trend.velocity.y * 500}
                        stroke="rgba(148, 163, 184, 0.5)"
                        strokeWidth="2"
                        markerEnd={`url(#arrowhead-${trend.id})`}
                      />
                    </svg>
                  )}
                  
                  {/* Trend Bubble */}
                  <div
                    className={`relative bg-gradient-to-br rounded-full transition-all ${
                      quadrantColor === 'purple' ? 'from-purple-400 to-purple-600' :
                      quadrantColor === 'cyan' ? 'from-cyan-400 to-cyan-600' :
                      quadrantColor === 'pink' ? 'from-pink-400 to-pink-600' :
                      quadrantColor === 'amber' ? 'from-amber-400 to-amber-600' :
                      'from-gray-400 to-gray-600'
                    }`}
                    style={{
                      width: `${Math.sqrt(trend.size) * 0.8}rem`,
                      height: `${Math.sqrt(trend.size) * 0.8}rem`,
                      boxShadow: isSelected ? `0 0 30px rgba(6, 182, 212, 0.5)` : ''
                    }}
                  >
                    {/* Pulse Animation */}
                    {trend.velocity.x > 0.03 || trend.velocity.y > 0.03 ? (
                      <div className="absolute inset-0 rounded-full bg-white/20 animate-ping"></div>
                    ) : null}
                    
                    {/* Trend Name (shown on hover or selection) */}
                    {(isSelected || trend.size > 80) && (
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium">
                        {trend.name}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Center Compass Icon */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <Compass className="w-8 h-8 text-gray-700" />
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-600"></div>
            <span className="text-gray-400">Trend Size = Engagement</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400">Arrow = Movement Direction</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-white/20 animate-ping"></div>
            <span className="text-gray-400">Pulsing = High Velocity</span>
          </div>
        </div>
      </div>

      {/* Selected Trend Details */}
      <AnimatePresence>
        {selectedTrend && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-800/50"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold mb-1">{selectedTrend.name}</h3>
                <p className="text-sm text-gray-400">{selectedTrend.category}</p>
              </div>
              <button
                onClick={() => setSelectedTrend(null)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Position</div>
                <div className="font-medium">
                  {selectedTrend.x > 0 ? 'Mainstream' : 'Subculture'} & {selectedTrend.y > 0 ? 'Polarizing' : 'Positive'}
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Movement</div>
                <div className="flex items-center gap-1">
                  {selectedTrend.velocity.x > 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-green-400" />
                  ) : (
                    <ArrowDownLeft className="w-4 h-4 text-red-400" />
                  )}
                  <span className="font-medium">
                    {Math.abs(selectedTrend.velocity.x * 100).toFixed(1)}% / day
                  </span>
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Engagement</div>
                <div className="font-medium">{selectedTrend.size}%</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Quadrant</div>
                <div className="font-medium">
                  {quadrants.find(q => q.id === getQuadrant(selectedTrend.x, selectedTrend.y))?.label}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-500/20">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Emerging from Subculture
          </h3>
          <div className="space-y-3">
            {filteredTrends
              .filter(t => t.x < -0.3 && t.velocity.x > 0.02)
              .sort((a, b) => b.velocity.x - a.velocity.x)
              .slice(0, 3)
              .map(trend => (
                <div key={trend.id} className="flex items-center justify-between">
                  <span>{trend.name}</span>
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400">
                      +{(trend.velocity.x * 100).toFixed(1)}%/day
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl p-6 border border-cyan-500/20">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Shifting Sentiment
          </h3>
          <div className="space-y-3">
            {filteredTrends
              .filter(t => Math.abs(t.velocity.y) > 0.02)
              .sort((a, b) => Math.abs(b.velocity.y) - Math.abs(a.velocity.y))
              .slice(0, 3)
              .map(trend => (
                <div key={trend.id} className="flex items-center justify-between">
                  <span>{trend.name}</span>
                  <div className="flex items-center gap-2">
                    {trend.velocity.y > 0 ? (
                      <>
                        <ArrowUpRight className="w-4 h-4 text-amber-400" />
                        <span className="text-sm text-amber-400">More Polarizing</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">More Positive</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}