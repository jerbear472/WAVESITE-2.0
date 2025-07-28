'use client';
import { getSafeCategory } from '@/lib/safeCategory';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  DollarSign, 
  ArrowLeft,
  Link,
  Send,
  Loader2,
  Camera,
  Flame,
  Zap
} from 'lucide-react';
import { ScrollSession } from '@/components/ScrollSession';
import { FloatingTrendLogger } from '@/components/FloatingTrendLogger';
import TrendSubmissionForm from '@/components/TrendSubmissionFormEnhanced';
import TrendScreenshotUpload from '@/components/TrendScreenshotUpload';
import SubmissionHistory from '@/components/SubmissionHistory';
import { useAuth } from '@/contexts/AuthContext';
import WaveLogo from '@/components/WaveLogo';
import { formatCurrency } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
// import { mapCategoryToEnum } from '@/lib/categoryMapper'; // Using inline mapping instead
// import { TrendUmbrellaService } from '@/lib/trendUmbrellaService'; // Not needed

export default function ScrollDashboard() {
  const router = useRouter();
  const { user, updateUserEarnings } = useAuth();
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollSessionRef = useRef<any>();
  
  // Form states
  const [trendLink, setTrendLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [loggedTrends, setLoggedTrends] = useState<string[]>([]);
  const [todaysEarnings, setTodaysEarnings] = useState(0);
  const [showTrendForm, setShowTrendForm] = useState(false);
  const [showScreenshotForm, setShowScreenshotForm] = useState(false);
  
  // Streak states
  const [streak, setStreak] = useState(0);
  const [streakMultiplier, setStreakMultiplier] = useState(1);
  const [lastTrendTime, setLastTrendTime] = useState<Date | null>(null);
  const [trendsInWindow, setTrendsInWindow] = useState<Date[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes in seconds
  const streakTimerRef = useRef<NodeJS.Timeout>();
  
  // Constants
  const STREAK_WINDOW = 180000; // 3 minutes in milliseconds
  const TRENDS_FOR_STREAK = 3; // Number of trends needed in 3 minutes
  const STREAK_TIMEOUT = 60000; // 60 seconds to maintain streak

  // Streak timer effect
  useEffect(() => {
    if (streak > 0 && lastTrendTime) {
      const timer = setInterval(() => {
        const timeSinceLastTrend = Date.now() - lastTrendTime.getTime();
        const remaining = Math.max(0, (STREAK_TIMEOUT - timeSinceLastTrend) / 1000);
        
        if (remaining === 0) {
          // Lost streak
          setStreak(0);
          setStreakMultiplier(1);
          setTrendsInWindow([]);
          clearInterval(timer);
        }
        
        setTimeRemaining(Math.floor(remaining));
      }, 1000);
      
      streakTimerRef.current = timer;
      
      return () => clearInterval(timer);
    }
  }, [streak, lastTrendTime]);
  
  // Calculate streak multiplier based on streak count
  const calculateMultiplier = (streakCount: number) => {
    if (streakCount === 0) return 1;
    if (streakCount < 3) return 1.5;
    if (streakCount < 5) return 2;
    if (streakCount < 10) return 3;
    return 5; // Max multiplier
  };
  
  // Handle trend logged from floating logger
  const handleTrendLogged = () => {
    scrollSessionRef.current?.logTrend();
    updateStreakProgress();
  };
  
  // Update streak progress when a trend is logged
  const updateStreakProgress = () => {
    const now = new Date();
    
    // Add current trend to window
    const updatedTrends = [...trendsInWindow, now];
    
    // Filter trends within the 3-minute window
    const recentTrends = updatedTrends.filter(
      time => now.getTime() - time.getTime() < STREAK_WINDOW
    );
    
    setTrendsInWindow(recentTrends);
    setLastTrendTime(now);
    
    // Check if we have enough trends for a streak
    if (recentTrends.length >= TRENDS_FOR_STREAK) {
      // Increase streak
      const newStreak = streak + 1;
      setStreak(newStreak);
      setStreakMultiplier(calculateMultiplier(newStreak));
      
      // Reset window for next streak
      setTrendsInWindow([]);
    }
  };

  // Normalize URL for duplicate checking
  const normalizeUrl = (url: string) => {
    try {
      const urlObj = new URL(url.trim());
      urlObj.search = '';
      urlObj.hash = '';
      return urlObj.toString().toLowerCase();
    } catch {
      return url.trim().toLowerCase();
    }
  };

  // Handle trend submission via popup form
  const handleTrendSubmit = async (trendData: any) => {
    try {
      console.log('Starting trend submission (SCROLL v3 - NO UMBRELLAS) with data:', trendData);
      console.log('User ID:', user?.id);

      // Check if user is authenticated
      if (!user?.id) {
        setSubmitMessage({ type: 'error', text: 'Please log in to submit trends' });
        setTimeout(() => setSubmitMessage(null), 3000);
        return;
      }
      // Upload image if present
      let imageUrl = null;
      if (trendData.screenshot && trendData.screenshot instanceof File) {
        const fileExt = trendData.screenshot.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('trend-images')
          .upload(fileName, trendData.screenshot);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('trend-images')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      // Trend umbrella feature removed - v3 no umbrellas
      console.log('Scroll page v3 - umbrellas disabled');
      const umbrellaId = null;

      // ALWAYS use inline mapping to avoid import issues
      const originalCategory = trendData.categories?.[0];
      console.log('Original category from form:', originalCategory);
      console.log('All categories:', trendData.categories);
      
      // Direct inline mapping - don't rely on imports
      const categoryMapping: Record<string, string> = {
        'Fashion & Beauty': 'visual_style',
        'Food & Drink': 'behavior_pattern',
        'Humor & Memes': 'meme_format',
        'Lifestyle': 'behavior_pattern',
        'Politics & Social Issues': 'behavior_pattern',
        'Music & Dance': 'audio_music',
        'Sports & Fitness': 'behavior_pattern',
        'Tech & Gaming': 'creator_technique',
        'Art & Creativity': 'visual_style',
        'Education & Science': 'creator_technique',
        // Add any other categories that might exist
        'Entertainment': 'audio_music',
        'Travel': 'behavior_pattern',
        'Business': 'behavior_pattern',
        'Health & Wellness': 'behavior_pattern',
        'Pets & Animals': 'behavior_pattern'
      };
      
      // Use isolated safe function for mapping
      let mappedCategory = getSafeCategory(originalCategory);
      console.log('Safe mapping result:', originalCategory, '→', mappedCategory);
      
      // Validate the mapped category
      const validCategories = ['visual_style', 'audio_music', 'creator_technique', 'meme_format', 'product_brand', 'behavior_pattern'];
      if (!validCategories.includes(mappedCategory)) {
        console.error('CRITICAL: Invalid mapped category:', mappedCategory);
        console.error('Original category was:', originalCategory);
        console.error('Forcing to meme_format as emergency fallback');
        mappedCategory = 'meme_format';
      }
      
      // Save trend to database
      console.log('Inserting trend submission to database...');
      console.log('Final category being submitted:', mappedCategory);
      
      // FINAL SAFETY CHECK - Ensure mappedCategory is NEVER a display value
      const displayCategories = [
        'Fashion & Beauty',
        'Food & Drink',
        'Humor & Memes',
        'Lifestyle',
        'Politics & Social Issues',
        'Music & Dance',
        'Sports & Fitness',
        'Tech & Gaming',
        'Art & Creativity',
        'Education & Science',
        'Entertainment',
        'Travel',
        'Business',
        'Health & Wellness',
        'Pets & Animals'
      ];
      
      // Log the exact state before final check
      console.log('=== FINAL CATEGORY CHECK (SCROLL) ===');
      console.log('mappedCategory before check:', mappedCategory);
      console.log('Is it a display category?', displayCategories.includes(mappedCategory));
      
      // ALWAYS ensure we have a mapped category, not a display value
      if (displayCategories.includes(mappedCategory)) {
        console.error('EMERGENCY OVERRIDE: Display category detected in final submission!', mappedCategory);
        // Re-map it one more time as emergency fallback
        const remapped = categoryMapping[mappedCategory];
        console.log('Attempting remap:', mappedCategory, '->', remapped);
        mappedCategory = remapped || 'meme_format';
        console.log('Emergency remapped to:', mappedCategory);
      }
      
      // ULTRA PARANOID CHECK - Force mapping for any remaining display values
      const finalCheck = Object.keys(categoryMapping);
      if (finalCheck.includes(mappedCategory)) {
        console.error('CRITICAL: Display category STILL present after emergency override!', mappedCategory);
        mappedCategory = categoryMapping[mappedCategory] || 'meme_format';
        console.log('FORCED remap to:', mappedCategory);
      }
      
      console.log('=== FINAL CATEGORY RESULT (SCROLL) ===');
      console.log('mappedCategory after all checks:', mappedCategory);
      
      const insertObject = {
          spotter_id: user?.id,
          category: mappedCategory, // Use validated mapped category
          description: trendData.explanation || trendData.trendName || 'Untitled Trend',
          screenshot_url: imageUrl || trendData.thumbnail_url || null,
          evidence: {
            url: trendData.url || '',
            title: trendData.trendName || 'Untitled Trend',
            platform: trendData.platform || 'other',
            // Store all the rich data
            ageRanges: trendData.ageRanges,
            subcultures: trendData.subcultures,
            region: trendData.region,
            categories: trendData.categories,
            moods: trendData.moods,
            spreadSpeed: trendData.spreadSpeed,
            audioOrCatchphrase: trendData.audioOrCatchphrase,
            motivation: trendData.motivation,
            firstSeen: trendData.firstSeen,
            otherPlatforms: trendData.otherPlatforms,
            brandAdoption: trendData.brandAdoption,
            submitted_by: user?.username || user?.email
          },
          virality_prediction: trendData.spreadSpeed === 'viral' ? 8 : trendData.spreadSpeed === 'picking_up' ? 6 : 5,
          status: 'submitted', // Use 'submitted' to match the enum
          quality_score: 0.5,
          validation_count: 0,
          // Social media metadata
          creator_handle: trendData.creator_handle || null,
          creator_name: trendData.creator_name || null,
          post_caption: trendData.post_caption || null,
          likes_count: trendData.likes_count || 0,
          comments_count: trendData.comments_count || 0,
          shares_count: trendData.shares_count || 0,
          views_count: trendData.views_count || 0,
          hashtags: trendData.hashtags || [],
          post_url: trendData.url,
          thumbnail_url: trendData.thumbnail_url || imageUrl || null,
          posted_at: trendData.posted_at || new Date().toISOString(),
          created_at: new Date().toISOString(),
          // Link to trend umbrella
          // trend_umbrella_id removed
        };
      
      console.log('=== EXACT INSERT OBJECT ===');
      console.log('Insert object category:', insertObject.category);
      console.log('Full insert object:', JSON.stringify(insertObject, null, 2));
      
      // ABSOLUTE FINAL MAPPING - RIGHT BEFORE INSERT
      const finalCategoryMapping: Record<string, string> = {
        'Fashion & Beauty': 'visual_style',
        'Food & Drink': 'behavior_pattern',
        'Humor & Memes': 'meme_format',
        'Lifestyle': 'behavior_pattern',
        'Politics & Social Issues': 'behavior_pattern',
        'Music & Dance': 'audio_music',
        'Sports & Fitness': 'behavior_pattern',
        'Tech & Gaming': 'creator_technique',
        'Art & Creativity': 'visual_style',
        'Education & Science': 'creator_technique'
      };
      
      // Force final safe mapping
      insertObject.category = getSafeCategory(insertObject.category);
      console.log('Final safe category:', insertObject.category);
      
      const { data, error } = await supabase
        .from('trend_submissions')
        .insert(insertObject)
        .select()
        .single();

      if (error) {
        console.error('Database insertion error:', error);
        
        // Provide specific error messages
        if (error.message?.includes('invalid input value for enum')) {
          throw new Error(`Invalid category. Please try again.`);
        } else if (error.message?.includes('violates foreign key constraint')) {
          throw new Error('Authentication issue. Please log out and log back in.');
        } else if (error.message?.includes('permission denied')) {
          throw new Error('Permission denied. Please ensure you are logged in.');
        }
        
        throw error;
      }
      console.log('Successfully inserted trend:', data);

      // Update local state
      const normalizedUrl = normalizeUrl(trendData.url);
      setLoggedTrends(prev => [...prev, normalizedUrl]);
      
      // Update streak progress
      updateStreakProgress();
      
      // Calculate earnings with multiplier (10c per trend)
      const baseAmount = 0.10;
      const earnedAmount = baseAmount * streakMultiplier;
      setTodaysEarnings(prev => prev + earnedAmount);
      updateUserEarnings(earnedAmount);
      
      setSubmitMessage({ 
        type: 'success', 
        text: streak > 0 
          ? `Trend submitted! +${formatCurrency(earnedAmount)} (${streakMultiplier}x multiplier!)` 
          : `Trend submitted! +${formatCurrency(earnedAmount)}`
      });
      setTimeout(() => setSubmitMessage(null), 3000);

    } catch (error) {
      console.error('Error submitting trend:', error);
      throw error;
    }
  };

  // Handle quick submit button
  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trendLink.trim()) return;
    
    // Check for duplicate
    const normalizedUrl = normalizeUrl(trendLink);
    if (loggedTrends.includes(normalizedUrl)) {
      setSubmitMessage({ type: 'error', text: 'Already logged!' });
      setTimeout(() => setSubmitMessage(null), 3000);
      return;
    }
    
    // Open the comprehensive submission form with pre-filled URL
    setShowTrendForm(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/20 to-black">
      <div className="container mx-auto px-4 py-6 max-w-5xl safe-area-top safe-area-bottom">
        {/* Clean Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <button
            onClick={() => router.push('/dashboard')}
            className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-all hover:scale-105"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          
          <div className="flex items-center gap-3">
            <WaveLogo size={36} animated={true} showTitle={false} />
            <h1 className="text-2xl font-bold text-white">Scroll & Earn</h1>
          </div>

          <div className="text-right bg-gray-800/50 px-4 py-2 rounded-xl">
            <p className="text-xs text-gray-400 font-medium">Today's Total</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(todaysEarnings)}</p>
          </div>
        </motion.div>

        {/* Streak Status */}
        {streak > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-orange-500/20 backdrop-blur-sm rounded-xl p-4 border border-orange-500/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500/30 p-2 rounded-lg">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">
                    {streak} Streak Active
                  </p>
                  <p className="text-orange-200 text-sm">
                    {streakMultiplier}x multiplier
                  </p>
                </div>
              </div>
              <div className="text-right bg-black/30 px-3 py-2 rounded-lg">
                <p className="text-white font-semibold text-xl">{timeRemaining}s</p>
                <p className="text-orange-200 text-xs">left</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Streak Progress */}
        {trendsInWindow.length > 0 && streak === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-yellow-500/20 p-1.5 rounded">
                  <Zap className="w-4 h-4 text-yellow-400" />
                </div>
                <p className="text-white font-medium text-sm">Building Streak</p>
              </div>
              <p className="text-sm font-semibold text-gray-300">
                {trendsInWindow.length}/{TRENDS_FOR_STREAK}
              </p>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(trendsInWindow.length / TRENDS_FOR_STREAK) * 100}%` }}
                className="bg-gradient-to-r from-yellow-400 to-orange-400 h-full rounded-full"
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {TRENDS_FOR_STREAK - trendsInWindow.length} more to start streak
            </p>
          </motion.div>
        )}

        {/* Main Content - Single Column */}
        <div className="space-y-6">
          {/* Scroll Session Component */}
          <ScrollSession
            ref={scrollSessionRef}
            onSessionStateChange={setIsScrolling}
            onTrendLogged={handleTrendLogged}
            streak={streak}
            streakMultiplier={streakMultiplier}
            onStreakUpdate={(streakCount, multiplier) => {
              setStreak(streakCount);
              setStreakMultiplier(multiplier);
            }}
          />

          {/* Submit New Trend */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-indigo-600/10 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20 shadow-xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl"></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Submit New Trend</h3>
                  <p className="text-blue-200/80 font-medium">Earn ${(0.10 * streakMultiplier).toFixed(2)} per submission</p>
                </div>
              </div>
              <div className="text-right bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/20">
                <p className="text-sm text-gray-300 font-medium">Today</p>
                <p className="text-xl font-bold text-white">{loggedTrends.length}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 relative z-10">
              <button
                onClick={() => setShowScreenshotForm(true)}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl transition-all hover:scale-105 shadow-lg border border-emerald-500/30 text-white font-semibold"
              >
                <Camera className="w-5 h-5" />
                Upload Screenshot
              </button>
              <button
                onClick={() => window.open('https://www.tiktok.com', 'tiktok', 'width=1200,height=800,left=200,top=100')}
                className="text-center py-3 px-4 bg-black hover:bg-gray-900 rounded-xl transition-all hover:scale-105 font-semibold border border-gray-700/50 text-white shadow-lg"
              >
                🎵 TikTok
              </button>
              <button
                onClick={() => window.open('https://www.instagram.com', 'instagram', 'width=1200,height=800,left=200,top=100')}
                className="text-center py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl transition-all hover:scale-105 font-semibold text-white shadow-lg"
              >
                📸 Instagram
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleQuickSubmit} className="space-y-4 relative z-10">
              <div className="relative">
                <input
                  type="url"
                  value={trendLink}
                  onChange={(e) => setTrendLink(e.target.value)}
                  placeholder="Paste trending link here..."
                  className="w-full px-5 py-4 bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/60 font-medium text-lg shadow-lg transition-all focus:bg-gray-700/50"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <Link className="w-5 h-5 text-gray-400" />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={!trendLink.trim()}
                className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-500 hover:via-purple-500 hover:to-indigo-500 disabled:bg-gray-600 disabled:opacity-50 rounded-xl font-bold text-lg transition-all hover:scale-[1.02] shadow-xl text-white border border-blue-400/40"
              >
                <Send className="w-5 h-5" />
                Add Trend Details
              </button>
            </form>

            {/* Feedback */}
            {submitMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-3 rounded-xl text-center ${
                  submitMessage.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                <p className="text-sm font-semibold">{submitMessage.text}</p>
              </motion.div>
            )}
          </motion.div>

          {/* Streak Info */}
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-orange-500/20 p-1.5 rounded">
                  <Flame className="w-4 h-4 text-orange-400" />
                </div>
                <h3 className="font-semibold text-base text-white">Streak Multipliers</h3>
              </div>
              <span className="text-xs font-medium text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
                Current: {streakMultiplier}x
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-gray-700/40 rounded-lg p-3 border border-orange-400/30">
                <p className="text-xs text-gray-400 font-medium">Streak</p>
                <p className="text-lg font-semibold text-orange-400 mt-1">1-2</p>
                <p className="text-sm font-medium text-white">1.5x</p>
              </div>
              
              <div className="bg-gray-700/40 rounded-lg p-3 border border-yellow-400/30">
                <p className="text-xs text-gray-400 font-medium">Streak</p>
                <p className="text-lg font-semibold text-yellow-400 mt-1">3-4</p>
                <p className="text-sm font-medium text-white">2x</p>
              </div>
              
              <div className="bg-gray-700/40 rounded-lg p-3 border border-purple-400/30">
                <p className="text-xs text-gray-400 font-medium">Streak</p>
                <p className="text-lg font-semibold text-purple-400 mt-1">5-9</p>
                <p className="text-sm font-medium text-white">3x</p>
              </div>
              
              <div className="bg-gray-700/40 rounded-lg p-3 border border-red-400/30">
                <p className="text-xs text-gray-400 font-medium">Streak</p>
                <p className="text-lg font-semibold text-red-400 mt-1">10+</p>
                <p className="text-sm font-medium text-white">5x</p>
              </div>
            </div>
            
            <div className="mt-4 bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
              <p className="text-sm text-white text-center font-medium">
                🎯 Log 3 trends in 3 minutes to start a streak
              </p>
              <p className="text-xs text-blue-200 text-center mt-1">
                Faster submissions = higher multipliers
              </p>
            </div>
          </div>

          {/* Submission History */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-500/20 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Your Submission History</h3>
            </div>
            <SubmissionHistory />
          </motion.div>
        </div>
      </div>

      {/* Floating Trend Logger */}
      <FloatingTrendLogger 
        isVisible={isScrolling} 
        onTrendLogged={handleTrendLogged}
      />

      {/* Trend Submission Form Modal */}
      {showTrendForm && (
        <TrendSubmissionForm
          onClose={() => {
            setShowTrendForm(false);
            setTrendLink('');
          }}
          onSubmit={handleTrendSubmit}
          initialUrl={trendLink}
        />
      )}

      {/* Screenshot Upload Modal */}
      {showScreenshotForm && (
        <TrendScreenshotUpload
          onClose={() => setShowScreenshotForm(false)}
          onSubmit={() => {
            setTodaysEarnings(prev => prev + 0.10);
            setSubmitMessage({ type: 'success', text: 'Screenshot submitted! +$0.10' });
            setTimeout(() => setSubmitMessage(null), 3000);
          }}
        />
      )}
    </div>
  );
}