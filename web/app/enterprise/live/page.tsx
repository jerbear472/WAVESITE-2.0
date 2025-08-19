'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  Filter, Search, Download, Settings, TrendingUp, Users, AlertCircle,
  BarChart3, Target, Zap, Clock, ChevronRight, Activity, Globe,
  Sparkles, Volume2, VolumeX, Maximize2, RefreshCw, Bell
} from 'lucide-react';
import Link from 'next/link';

interface TrendCard {
  id: string;
  timestamp: Date;
  spotter: {
    age?: number;
    gender?: string;
    occupation?: string;
    location?: string;
    trustScore: number;
    avatar?: string;
  };
  trend: {
    headline: string;
    context: string;
    platform: 'tiktok' | 'instagram' | 'twitter' | 'youtube' | 'reddit';
    type: string;
    thumbnail?: string;
    quote?: string;
  };
  metrics: {
    velocity: number;
    spottedCount: number;
    verified: boolean;
    aiGenerated: boolean;
  };
}

interface LiveStats {
  activeSpotters: number;
  trendsToday: number;
  patternAlerts: number;
  trendsPerHour: number;
  topDemo: string;
  hottestPlatform: string;
  patternStrength: number;
}

interface DemographicData {
  genZ: number;
  millennial: number;
  genX: number;
  boomer: number;
}

interface TrendingItem {
  name: string;
  change: number;
}

function EnterpriseLiveDashboard() {
  const [trends, setTrends] = useState<TrendCard[]>([]);
  const [stats, setStats] = useState<LiveStats>({
    activeSpotters: 247,
    trendsToday: 1847,
    patternAlerts: 3,
    trendsPerHour: 74,
    topDemo: 'Gen Z Female',
    hottestPlatform: 'TikTok',
    patternStrength: 82
  });
  const [demographics, setDemographics] = useState<DemographicData>({
    genZ: 34,
    millennial: 41,
    genX: 18,
    boomer: 7
  });
  const [trendingUp, setTrendingUp] = useState<TrendingItem[]>([
    { name: 'Silent walking', change: 240 },
    { name: 'Winter arc prep', change: 180 },
    { name: 'Ceramic everything', change: 156 }
  ]);
  const [soundEnabled, setSoundEnabled] = useState(false); // Start with sound off
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [isClient, setIsClient] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);
  const [tickerMessages] = useState([
    'Breaking: "Sad beige" spreading to Gen X',
    'Pattern detected: Morning routine evolution',
    'Nike mentioned 47 times in last hour',
    'Velocity spike: "Office siren" aesthetic',
    'Alert: Micro-trend cluster forming in Midwest',
    'Gen Alpha driving "brain rot" vocabulary mainstream'
  ]);

  // Check if we're on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Generate mock trend data
  const generateMockTrend = useCallback((): TrendCard => {
    const platforms: TrendCard['trend']['platform'][] = ['tiktok', 'instagram', 'twitter', 'youtube', 'reddit'];
    const types = ['Visual Style', 'Audio/Music', 'Behavior Pattern', 'Meme Format', 'Product/Brand'];
    const occupations = ['Student', 'Nurse', 'Teacher', 'Engineer', 'Designer', 'Marketer', 'Developer'];
    const locations = ['Chicago', 'NYC', 'LA', 'Austin', 'Miami', 'Seattle', 'Denver'];
    const genders = ['Male', 'Female', 'Non-binary'];
    
    const headlines = [
      'New dance move incorporating office supplies',
      'Aesthetic shift towards "cozy maximalism"',
      'Sound remix blending classical with trap',
      'Morning routine including "villain arc" prep',
      'Ceramic mugs as personality indicators',
      'Silent walking but with dramatic soundtrack',
      'Romanticizing mundane errands content',
      'Winter arc preparation rituals trending'
    ];

    const contexts = [
      'Appearing in FYP with increasing frequency',
      'Cross-demographic appeal detected',
      'Originated from niche community, spreading fast',
      'Celebrity adoption accelerating spread',
      'Organic growth pattern, no paid promotion',
      'Meme-ification in progress across platforms'
    ];

    return {
      id: `trend-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      spotter: {
        age: Math.floor(Math.random() * 40) + 18,
        gender: genders[Math.floor(Math.random() * genders.length)],
        occupation: occupations[Math.floor(Math.random() * occupations.length)],
        location: locations[Math.floor(Math.random() * locations.length)],
        trustScore: Math.floor(Math.random() * 2) + 3,
        avatar: `https://api.dicebear.com/7.x/personas/svg?seed=${Math.random()}`
      },
      trend: {
        headline: headlines[Math.floor(Math.random() * headlines.length)],
        context: contexts[Math.floor(Math.random() * contexts.length)],
        platform: platforms[Math.floor(Math.random() * platforms.length)],
        type: types[Math.floor(Math.random() * types.length)],
        thumbnail: Math.random() > 0.3 ? `https://picsum.photos/400/300?random=${Math.random()}` : undefined,
        quote: Math.random() > 0.5 ? '"This is literally changing how I see mornings"' : undefined
      },
      metrics: {
        velocity: Math.floor(Math.random() * 100),
        spottedCount: Math.floor(Math.random() * 20) + 1,
        verified: Math.random() > 0.3,
        aiGenerated: Math.random() < 0.1
      }
    };
  }, []);

  // Add new trends periodically
  useEffect(() => {
    if (!isClient) return;
    
    // Add initial trends
    const initialTrends = Array.from({ length: 5 }, generateMockTrend);
    setTrends(initialTrends);

    // Add new trend every 3-8 seconds
    const interval = setInterval(() => {
      const newTrend = generateMockTrend();
      setTrends(prev => {
        const updated = [newTrend, ...prev];
        return updated.slice(0, 20); // Keep max 20 trends
      });

      // Play sound if enabled
      playNotificationSound();

      // Update stats
      setStats(prev => ({
        ...prev,
        trendsToday: prev.trendsToday + 1,
        trendsPerHour: Math.floor(Math.random() * 20) + 65
      }));
    }, Math.random() * 5000 + 3000);

    return () => clearInterval(interval);
  }, [generateMockTrend, soundEnabled, isClient, playNotificationSound]);

  // Update live stats
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        activeSpotters: prev.activeSpotters + Math.floor(Math.random() * 5) - 2,
        patternAlerts: Math.floor(Math.random() * 5),
        patternStrength: Math.min(100, Math.max(60, prev.patternStrength + (Math.random() * 10 - 5)))
      }));

      // Update demographics
      const total = 100;
      const genZ = Math.floor(Math.random() * 10) + 30;
      const millennial = Math.floor(Math.random() * 10) + 35;
      const genX = Math.floor(Math.random() * 10) + 15;
      const boomer = total - genZ - millennial - genX;
      
      setDemographics({ genZ, millennial, genX, boomer });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  const getPlatformIcon = (platform: string) => {
    switch(platform) {
      case 'tiktok': return '🎵';
      case 'instagram': return '📸';
      case 'twitter': return '𝕏';
      case 'youtube': return '📺';
      case 'reddit': return '👽';
      default: return '🌐';
    }
  };

  // Play sound effect
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      // Create a simple beep sound using Web Audio API as fallback
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.log('Audio playback not available');
    }
  }, [soundEnabled]);

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white overflow-hidden">
      {/* Audio element removed - using Web Audio API instead */}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e27]/80 backdrop-blur-xl border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                WAVESIGHT LIVE
              </h1>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-gray-400">Active Spotters:</span>
                  <span className="font-mono font-bold text-white">{stats.activeSpotters}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Trends Today:</span>
                  <span className="font-mono font-bold text-white">{stats.trendsToday.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Pattern Alerts:</span>
                  <span className="font-mono font-bold text-orange-400">{stats.patternAlerts}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Filter className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Search className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Download className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex pt-20 h-screen">
        {/* Left Sidebar - Navigation */}
        <aside className="w-16 bg-[#0a0e27] border-r border-white/10 flex flex-col items-center py-6 gap-6">
          <Link href="/enterprise/live" className="p-3 bg-blue-600/20 rounded-lg">
            <BarChart3 className="w-5 h-5 text-blue-400" />
          </Link>
          <Link href="/enterprise/bounties" className="p-3 hover:bg-white/10 rounded-lg transition-colors">
            <Target className="w-5 h-5 text-gray-400" />
          </Link>
          <Link href="/enterprise/analytics" className="p-3 hover:bg-white/10 rounded-lg transition-colors">
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </Link>
          <Link href="/enterprise/demographics" className="p-3 hover:bg-white/10 rounded-lg transition-colors">
            <Users className="w-5 h-5 text-gray-400" />
          </Link>
          <Link href="/enterprise/settings" className="p-3 hover:bg-white/10 rounded-lg transition-colors">
            <Settings className="w-5 h-5 text-gray-400" />
          </Link>
        </aside>

        {/* Main Feed Area */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <AnimatePresence mode="popLayout">
            {trends.map((trend, index) => (
              <motion.div
                key={trend.id}
                initial={{ opacity: 0, y: -50, scale: 0.95 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: { 
                    duration: 0.5, 
                    ease: "easeOut",
                    delay: index === 0 ? 0 : 0.1 
                  }
                }}
                exit={{ 
                  opacity: 0, 
                  y: 50, 
                  scale: 0.95,
                  transition: { duration: 0.3 }
                }}
                className={`mb-4 ${index === 0 ? 'animate-pulse-slow' : ''}`}
              >
                <div className="bg-gradient-to-r from-[#1a1f3a] to-[#1a1f3a]/80 rounded-xl p-6 border border-white/10 hover:border-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.01]">
                  {/* Timestamp */}
                  <div className="text-xs text-gray-400 mb-3">{formatTimeAgo(trend.timestamp)}</div>
                  
                  {/* Profile Section */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <span className="text-lg">👤</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-300">
                          {trend.spotter.gender}, {trend.spotter.age}, {trend.spotter.occupation}, {trend.spotter.location}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={i < trend.spotter.trustScore ? 'text-yellow-400' : 'text-gray-600'}>
                            ⭐
                          </span>
                        ))}
                        <span className="text-xs text-gray-400 ml-2">Trust Score</span>
                      </div>
                    </div>
                  </div>

                  {/* Trend Content */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2">{trend.trend.headline}</h3>
                    <p className="text-sm text-gray-400 mb-3">{trend.trend.context}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <span className="text-lg">{getPlatformIcon(trend.trend.platform)}</span>
                        <span className="capitalize">{trend.trend.platform}</span>
                      </span>
                      <span className="px-2 py-1 bg-blue-500/20 rounded-full text-blue-400 text-xs">
                        {trend.trend.type}
                      </span>
                    </div>
                  </div>

                  {/* Visual Preview */}
                  {trend.trend.thumbnail && (
                    <div className="mb-4 rounded-lg overflow-hidden">
                      <img src={trend.trend.thumbnail} alt="" className="w-full h-48 object-cover" />
                    </div>
                  )}
                  {trend.trend.quote && !trend.trend.thumbnail && (
                    <div className="mb-4 p-4 bg-white/5 rounded-lg border-l-4 border-blue-500">
                      <p className="italic text-gray-300">{trend.trend.quote}</p>
                    </div>
                  )}

                  {/* Metrics Bar */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span>🔥</span>
                        <span className="text-xs text-gray-400">Velocity:</span>
                        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                            style={{ width: `${trend.metrics.velocity}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>👥</span>
                        <span className="text-xs text-gray-400">Spotted by:</span>
                        <span className="text-sm font-bold">{trend.metrics.spottedCount}</span>
                      </div>
                    </div>
                    <div>
                      {trend.metrics.verified ? (
                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                          ✓ Human Verified
                        </span>
                      ) : trend.metrics.aiGenerated ? (
                        <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">
                          🤖 Possible AI
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty State */}
          {trends.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mb-4"
              >
                <Activity className="w-16 h-16" />
              </motion.div>
              <p className="text-lg">Spotters are browsing...</p>
              <p className="text-sm mt-2">Next trend expected in ~30 seconds</p>
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="w-80 bg-[#0a0e27] border-l border-white/10 p-6 overflow-y-auto">
          {/* Real-time Metrics */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">REAL-TIME METRICS</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Trends/Hour:</span>
                <span className="text-lg font-bold text-white">{stats.trendsPerHour} ↑</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Top Demo Active:</span>
                <span className="text-sm font-semibold text-white">{stats.topDemo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Hottest Platform:</span>
                <span className="text-sm font-semibold text-white">{stats.hottestPlatform} (67%)</span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Pattern Strength:</span>
                  <span className="text-sm font-semibold text-white">{stats.patternStrength}%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${stats.patternStrength}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Demographics */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">WHO'S SPOTTING</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Gen Z</span>
                <span className="text-sm font-bold">{demographics.genZ}%</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: `${demographics.genZ}%` }} />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Millennial</span>
                <span className="text-sm font-bold">{demographics.millennial}%</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${demographics.millennial}%` }} />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Gen X</span>
                <span className="text-sm font-bold">{demographics.genX}%</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${demographics.genX}%` }} />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Boomer</span>
                <span className="text-sm font-bold">{demographics.boomer}%</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500" style={{ width: `${demographics.boomer}%` }} />
              </div>
            </div>
          </div>

          {/* Velocity Indicators */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">TRENDING UP 🔥</h3>
            <div className="space-y-3">
              {trendingUp.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500/10 to-transparent rounded-lg border border-green-500/20"
                >
                  <span className="text-sm text-white">{item.name}</span>
                  <span className="text-sm font-bold text-green-400">+{item.change}%</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Active Bounties */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-4">YOUR BOUNTIES</h3>
            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
              <p className="text-sm font-semibold text-white mb-2">Find formal Jordans</p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>12 responses</span>
                <span>6 hrs left</span>
              </div>
              <button className="mt-3 w-full py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-sm font-semibold text-purple-400 transition-colors">
                View Results
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Ticker */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0e27]/80 backdrop-blur-xl border-t border-white/10 py-2 overflow-hidden">
        <div className="flex animate-scroll">
          {tickerMessages.map((message, index) => (
            <span key={index} className="text-sm text-gray-400 mx-8 whitespace-nowrap">
              {message} <span className="text-gray-600 mx-4">•</span>
            </span>
          ))}
          {tickerMessages.map((message, index) => (
            <span key={`duplicate-${index}`} className="text-sm text-gray-400 mx-8 whitespace-nowrap">
              {message} <span className="text-gray-600 mx-4">•</span>
            </span>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse 2s ease-in-out;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Initializing Live Dashboard...</p>
        <p className="text-gray-400 text-sm mt-2">Connecting to real-time feed</p>
      </div>
    </div>
  );
}

// Export with Suspense wrapper
export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <EnterpriseLiveDashboard />
    </Suspense>
  );
}