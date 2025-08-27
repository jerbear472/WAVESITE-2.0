'use client';
// Enhanced Verify Page V3 - Optimized UI/UX with Mobile-First Design
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { 
  TrendingUp,
  X,
  Check,
  Zap,
  DollarSign,
  SkipForward,
  Info,
  AlertCircle,
  Eye,
  Heart,
  Clock,
  Sparkles,
  Trophy,
  Flame,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Shield,
  Target
} from 'lucide-react';

interface TrendToVerify {
  id: string;
  created_at: string;
  category: string;
  description: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  post_url?: string;
  spotter_id: string;
  evidence?: {
    title?: string;
    [key: string]: any;
  };
  creator_handle?: string;
  creator_name?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  platform?: string;
  validation_count: number;
  validation_difficulty?: number;
}

interface UserStats {
  verified_today: number;
  earnings_today: number;
  accuracy_score: number;
  streak: number;
  rank?: number;
  total_verified?: number;
}

export default function EnhancedVerifyV3() {
  const { user } = useAuth();
  const [trends, setTrends] = useState<TrendToVerify[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    verified_today: 0,
    earnings_today: 0,
    accuracy_score: 0,
    streak: 0,
  });
  const [confidence, setConfidence] = useState(50);
  const [showTutorial, setShowTutorial] = useState(false);
  const [estimatedEarning, setEstimatedEarning] = useState(0.05);
  
  // Swipe gesture handling
  const dragX = useMotionValue(0);
  const dragOpacity = useTransform(dragX, [-200, 0, 200], [0.5, 1, 0.5]);
  const rotateZ = useTransform(dragX, [-200, 200], [-15, 15]);

  // Touch gesture states
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!currentTrend || verifying) return;
      
      switch(e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          handleVerify(false);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          handleVerify(true);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
        case ' ':
          handleSkip();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, verifying, trends]);

  useEffect(() => {
    if (user) {
      fetchTrends();
      fetchStats();
      checkFirstTime();
    }
  }, [user]);

  useEffect(() => {
    // Calculate estimated earning based on confidence
    const base = 0.05;
    const confidenceBonus = confidence > 80 ? 0.01 : confidence < 20 ? 0.01 : 0;
    setEstimatedEarning(base + confidenceBonus);
  }, [confidence]);

  const checkFirstTime = () => {
    const hasSeenTutorial = localStorage.getItem('verify-tutorial-seen');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
      localStorage.setItem('verify-tutorial-seen', 'true');
    }
  };

  const fetchTrends = async () => {
    try {
      const { data, error } = await supabase
        .from('trend_submissions')
        .select('*')
        .neq('spotter_id', user?.id)
        .in('stage', ['submitted', 'validating'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTrends(data || []);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: validations } = await supabase
        .from('trend_validations')
        .select('*')
        .eq('validator_id', user?.id)
        .gte('created_at', today.toISOString());

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profile) {
        setStats({
          verified_today: validations?.length || 0,
          earnings_today: (validations?.length || 0) * 0.05,
          accuracy_score: profile.accuracy_score || 85,
          streak: profile.validation_streak || 0,
          rank: profile.validator_rank || 1000,
          total_verified: profile.total_validations || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleVerify = async (isValid: boolean) => {
    if (verifying || !trends[currentIndex]) return;

    setVerifying(true);
    
    try {
      const { error } = await supabase
        .from('trend_validations')
        .insert({
          trend_id: trends[currentIndex].id,
          validator_id: user?.id,
          vote: isValid ? 'verify' : 'reject',
          confidence_score: confidence / 100,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Show success animation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Move to next trend
      if (currentIndex < trends.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setCurrentIndex(trends.length);
      }
      
      // Reset confidence
      setConfidence(50);
      
      // Update stats
      fetchStats();
    } catch (error) {
      console.error('Error verifying:', error);
    } finally {
      setVerifying(false);
    }
  };

  const handleSkip = () => {
    if (verifying) return;
    
    if (currentIndex < trends.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(trends.length);
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 100;
    
    if (info.offset.x > threshold) {
      handleVerify(true);
    } else if (info.offset.x < -threshold) {
      handleVerify(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isRightSwipe) {
      handleVerify(true);
    } else if (isLeftSwipe) {
      handleVerify(false);
    }
  };

  const formatCount = (count?: number): string => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  const currentTrend = trends[currentIndex];
  const progress = trends.length > 0 ? ((currentIndex + 1) / trends.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-3 border-blue-500 border-t-transparent rounded-full mx-auto"
          />
          <p className="text-gray-400 mt-4">Loading trends...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-pink-900/10 pointer-events-none" />
      
      {/* Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10"
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div 
                whileHover={{ scale: 1.1 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
              >
                <TrendingUp className="w-5 h-5" />
              </motion.div>
              <div>
                <h1 className="text-lg font-bold">Verify</h1>
                <p className="text-xs text-gray-400">Help validate trends</p>
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowTutorial(true)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Info className="w-5 h-5" />
            </motion.button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="pt-24 pb-32 px-4 min-h-screen flex items-center justify-center">
        <AnimatePresence mode="wait">
          {currentTrend && currentIndex < trends.length ? (
            <motion.div
              key={currentTrend.id}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={{ x: dragX, opacity: dragOpacity, rotateZ }}
              className="w-full max-w-md"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/10">
                {/* Earnings Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-green-500/20 backdrop-blur-md rounded-2xl px-3 py-2 border border-green-500/30"
                  >
                    <p className="text-xs text-green-400">Earn</p>
                    <p className="text-lg font-bold text-green-400">
                      ${estimatedEarning.toFixed(3)}
                    </p>
                  </motion.div>
                </div>

                {/* Trend Image */}
                {(currentTrend.thumbnail_url || currentTrend.screenshot_url) && (
                  <div className="relative h-72 bg-gray-800">
                    <img
                      src={currentTrend.thumbnail_url || currentTrend.screenshot_url}
                      alt="Trend"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
                    
                    {/* Engagement Stats */}
                    <div className="absolute bottom-4 left-4 flex gap-3">
                      {currentTrend.likes_count !== undefined && (
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5"
                        >
                          <Heart className="w-4 h-4 text-red-400" />
                          <span className="text-sm font-medium">
                            {formatCount(currentTrend.likes_count)}
                          </span>
                        </motion.div>
                      )}
                      {currentTrend.views_count !== undefined && (
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5"
                        >
                          <Eye className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium">
                            {formatCount(currentTrend.views_count)}
                          </span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-2">
                    {currentTrend.evidence?.title || currentTrend.description}
                  </h2>
                  
                  {currentTrend.creator_handle && (
                    <p className="text-sm text-gray-400 mb-4">
                      {currentTrend.creator_handle} • {currentTrend.platform || 'Social'}
                    </p>
                  )}

                  {/* Confidence Slider */}
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-400">Confidence</span>
                      <motion.span 
                        key={confidence}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="text-2xl font-bold"
                      >
                        {confidence}%
                      </motion.span>
                    </div>
                    
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={confidence}
                        onChange={(e) => setConfidence(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #3B82F6 0%, #8B5CF6 ${confidence}%, #1F2937 ${confidence}%, #1F2937 100%)`
                        }}
                      />
                      
                      {/* Confidence Indicators */}
                      <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-gray-500">
                        <span>Low</span>
                        <span>Medium</span>
                        <span>High</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Swipe Indicators */}
              <div className="flex justify-center gap-2 mt-4">
                <motion.div
                  animate={{ opacity: dragX.get() < -50 ? 1 : 0.3 }}
                  className="text-red-400 text-sm font-medium"
                >
                  ← Not Trending
                </motion.div>
                <motion.div
                  animate={{ opacity: dragX.get() > 50 ? 1 : 0.3 }}
                  className="text-green-400 text-sm font-medium"
                >
                  Trending →
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6"
              >
                <Check className="w-12 h-12" />
              </motion.div>
              
              <h2 className="text-3xl font-bold mb-2">All Done!</h2>
              <p className="text-gray-400 mb-8">Check back later for more trends</p>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10"
              >
                <h3 className="text-lg font-semibold mb-4">Today's Performance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-400">{stats.verified_today}</p>
                    <p className="text-sm text-gray-400">Verified</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-400">${stats.earnings_today.toFixed(2)}</p>
                    <p className="text-sm text-gray-400">Earned</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Action Bar */}
      {currentTrend && currentIndex < trends.length && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 safe-area-bottom"
        >
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleVerify(false)}
              disabled={verifying}
              className="flex-1 py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 transition-all flex items-center justify-center gap-2 font-semibold"
            >
              <X className="w-5 h-5" />
              Not Trending
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSkip}
              disabled={verifying}
              className="px-6 py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 transition-all"
            >
              <SkipForward className="w-5 h-5" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleVerify(true)}
              disabled={verifying}
              className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-lg transition-all flex items-center justify-center gap-2 font-semibold"
            >
              <Check className="w-5 h-5" />
              Trending
            </motion.button>
          </div>
          
          <p className="text-center text-xs text-gray-500 mt-3">
            Swipe or use keyboard: ← Not Trending | → Trending | ↓ Skip
          </p>
        </motion.div>
      )}

      {/* Stats Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed top-24 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg flex items-center justify-center"
        onClick={() => {/* Open stats modal */}}
      >
        <BarChart3 className="w-6 h-6" />
      </motion.button>

      {/* Tutorial Modal */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowTutorial(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gray-900 rounded-3xl p-6 max-w-md w-full border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-4">How to Verify</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-400">1</span>
                  </div>
                  <div>
                    <p className="font-semibold">Review the trend</p>
                    <p className="text-sm text-gray-400">Look at the content and engagement metrics</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-purple-400">2</span>
                  </div>
                  <div>
                    <p className="font-semibold">Set confidence level</p>
                    <p className="text-sm text-gray-400">Adjust the slider based on how sure you are</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-green-400">3</span>
                  </div>
                  <div>
                    <p className="font-semibold">Make your decision</p>
                    <p className="text-sm text-gray-400">Swipe or tap to verify, reject, or skip</p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowTutorial(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 font-semibold"
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}