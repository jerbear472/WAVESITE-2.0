'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigationRefresh } from '@/hooks/useNavigationRefresh';
import XPActivitySidebar from '@/components/XPActivitySidebar';
import StreakDisplay from '@/components/StreakDisplay';
import QuickStartGuide, { MiniQuickStart } from '@/components/QuickStartGuide';
import { motion } from 'framer-motion';
import { useXPNotification } from '@/contexts/XPNotificationContext';
import { XP_LEVELS, calculateLevelProgress, getLevelTitle, getLevelByXP } from '@/lib/xpLevels';
import { 
  Trophy,
  TrendingUp,
  Target,
  Zap,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Award,
  Sparkles,
  Users,
  CheckCircle,
  Plus,
  Send,
  Flame,
  Activity
} from 'lucide-react';
import QuickTrendSubmit from '@/components/QuickTrendSubmit';

interface XPStats {
  total_xp: number;
  current_level: number;
  level_title: string;
  todays_xp: number;
  weekly_xp: number;
  trends_submitted: number;
  current_streak: number;
  global_rank: number | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { showXPNotification } = useXPNotification();
  const [stats, setStats] = useState<XPStats>({
    total_xp: 0,
    current_level: 1,
    level_title: 'Observer',
    todays_xp: 0,
    weekly_xp: 0,
    trends_submitted: 0,
    current_streak: 0,
    global_rank: null
  });
  const [loading, setLoading] = useState(true);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [showAllLevels, setShowAllLevels] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);

  // Use navigation refresh hook
  useNavigationRefresh(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      
      // Check if user is new (should see quick start)
      const hasSeenGuide = localStorage.getItem('hasSeenQuickStart');
      if (!hasSeenGuide && stats.trends_submitted === 0) {
        setShowQuickStart(true);
      }
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Get user XP and stats
      const { data: xpData } = await supabase
        .from('user_xp')
        .select('total_xp')
        .eq('user_id', user.id)
        .single();

      // Get user profile for streak
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('current_streak, total_submitted')
        .eq('id', user.id)
        .single();

      // Calculate today's XP
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayXP } = await supabase
        .from('xp_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      const todaysTotal = todayXP?.reduce((sum, tx) => sum + tx.amount, 0) || 0;

      // Calculate level
      const totalXP = xpData?.total_xp || 0;
      const levelData = getLevelByXP(totalXP);

      setStats({
        total_xp: totalXP,
        current_level: levelData.level,
        level_title: levelData.title,
        todays_xp: todaysTotal,
        weekly_xp: 0, // TODO: Calculate weekly
        trends_submitted: profileData?.total_submitted || 0,
        current_streak: profileData?.current_streak || 0,
        global_rank: null
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelProgress = () => {
    const currentLevel = XP_LEVELS.find(l => l.level === stats.current_level);
    const nextLevel = XP_LEVELS.find(l => l.level === stats.current_level + 1);
    
    if (!currentLevel || !nextLevel) {
      return { 
        percentage: 100, 
        xpInLevel: 0, 
        xpToNext: 0,
        currentThreshold: currentLevel?.threshold || 0,
        nextThreshold: nextLevel?.threshold || 999999
      };
    }
    
    const xpProgress = stats.total_xp - currentLevel.threshold;
    const xpRequired = nextLevel.threshold - currentLevel.threshold;
    const percentage = Math.min(100, Math.max(0, (xpProgress / xpRequired) * 100));
    
    return {
      percentage,
      xpInLevel: xpProgress,
      xpToNext: Math.max(0, nextLevel.threshold - stats.total_xp),
      currentThreshold: currentLevel.threshold,
      nextThreshold: nextLevel.threshold
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const levelProgress = getLevelProgress();

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Mini quick start disabled - was too prominent */}
        {/* {stats.trends_submitted === 0 && !showQuickStart && (
          <MiniQuickStart />
        )} */}
        
        {/* Header - modern and clean */}
        <div className="mb-6 sm:mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Your Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">Level {stats.current_level} • {stats.level_title}</p>
          </div>
          <button
            onClick={() => setShowSubmissionForm(true)}
            className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 
                     hover:from-blue-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-full 
                     font-medium transition-all duration-200 shadow-lg hover:shadow-xl 
                     hover:scale-105 text-sm"
          >
            <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span>Spot Trend</span>
          </button>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
          {/* Level Progress */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <Trophy className="w-4 sm:w-5 h-4 sm:h-5 text-yellow-500" />
              <span className="text-[10px] sm:text-xs text-gray-500">Level {stats.current_level}</span>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">{stats.level_title}</p>
            <div className="mt-1 sm:mt-2">
              <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-1.5 sm:h-2 rounded-full transition-all"
                  style={{ width: `${levelProgress.percentage}%` }}
                />
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">
                {levelProgress.xpToNext} XP to next
              </p>
            </div>
          </div>

          {/* Today's XP */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <Zap className="w-4 sm:w-5 h-4 sm:h-5 text-blue-500" />
              <span className="text-[10px] sm:text-xs text-gray-500">Today</span>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">+{stats.todays_xp} XP</p>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2 hidden sm:block">Keep the momentum!</p>
          </div>

          {/* Streak */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <Flame className="w-4 sm:w-5 h-4 sm:h-5 text-orange-500" />
              <span className="text-[10px] sm:text-xs text-gray-500">Streak</span>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{stats.current_streak} <span className="text-sm sm:text-base">days</span></p>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2 hidden sm:block">
              {stats.current_streak > 0 ? 'Keep it up!' : 'Start today!'}
            </p>
          </div>

          {/* Trends Spotted */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <TrendingUp className="w-4 sm:w-5 h-4 sm:h-5 text-green-500" />
              <span className="text-[10px] sm:text-xs text-gray-500">Spotted</span>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{stats.trends_submitted}</p>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2 hidden sm:block">Trends submitted</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column - Quick Actions & Stats */}
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Actions - moved to top */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href="/spot"
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Spot Trends</p>
                      <p className="text-xs text-gray-600">+10 XP per trend</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
                
                <Link
                  href="/predictions"
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">Make Predictions</p>
                      <p className="text-xs text-gray-600">+20 XP when correct</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>

                <Link
                  href="/timeline"
                  className="flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">My Timeline</p>
                      <p className="text-xs text-gray-600">View your history</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              </div>
            </div>
            
            {/* Level Progression */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Your Progress</h3>
                <Link
                  href="/leaderboard"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium"
                >
                  Leaderboard
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                {/* Current Level Display */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl sm:text-2xl">{XP_LEVELS.find(l => l.level === stats.current_level)?.emoji || '👁️'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-lg sm:text-xl font-bold text-gray-900">{stats.total_xp.toLocaleString()} XP</h4>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">Level {stats.current_level}: {stats.level_title}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-2">{XP_LEVELS.find(l => l.level === stats.current_level)?.benefit}</p>
                  </div>
                </div>
                
                {/* Current Level Progress */}
                {stats.current_level < 15 && (
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex justify-between text-[11px] sm:text-sm">
                      <span className="text-gray-600 truncate mr-2">Progress to {XP_LEVELS.find(l => l.level === stats.current_level + 1)?.title}</span>
                      <span className="text-gray-900 font-medium whitespace-nowrap">{levelProgress.xpToNext.toLocaleString()} XP</span>
                    </div>
                    <div className="h-2 sm:h-3 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${levelProgress.percentage}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Toggle All Levels View */}
                <button
                  onClick={() => setShowAllLevels(!showAllLevels)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium mt-3 sm:mt-4"
                >
                  {showAllLevels ? 'Hide' : 'View'} All 15 Levels
                  {showAllLevels ? <ChevronUp className="w-3 sm:w-4 h-3 sm:h-4" /> : <ChevronDown className="w-3 sm:w-4 h-3 sm:h-4" />}
                </button>
                
                {/* All Levels Display */}
                {showAllLevels && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2 max-h-60 sm:max-h-80 overflow-y-auto border-t border-gray-200 pt-3 sm:pt-4"
                  >
                    {XP_LEVELS.map((level) => {
                      const isCompleted = stats.current_level > level.level;
                      const isCurrent = stats.current_level === level.level;
                      const progress = isCurrent ? levelProgress.percentage : (isCompleted ? 100 : 0);
                      
                      return (
                        <div
                          key={level.level}
                          className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-all ${
                            isCurrent 
                              ? 'bg-blue-50 border border-blue-200' 
                              : isCompleted 
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <div className={`w-7 sm:w-8 h-7 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isCurrent
                              ? 'bg-blue-100'
                              : isCompleted
                              ? 'bg-green-100'
                              : 'bg-gray-100'
                          }`}>
                            <span className="text-base sm:text-lg">{level.emoji}</span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <p className={`text-xs sm:text-sm font-medium truncate ${
                                isCurrent ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-700'
                              }`}>
                                Lv{level.level}: {level.title}
                              </p>
                              {isCompleted && <CheckCircle className="w-3 sm:w-4 h-3 sm:h-4 text-green-500 flex-shrink-0" />}
                              {isCurrent && <Zap className="w-3 sm:w-4 h-3 sm:h-4 text-blue-500 flex-shrink-0" />}
                            </div>
                            <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1 line-clamp-1">{level.benefit}</p>
                            
                            {/* Progress bar for current level */}
                            {isCurrent && progress < 100 && (
                              <div className="w-full bg-gray-200 rounded-full h-1 sm:h-1.5 mt-0.5 sm:mt-1">
                                <div 
                                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-1 sm:h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right flex-shrink-0">
                            <p className={`text-[10px] sm:text-xs font-medium ${
                              isCurrent ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-500'
                            }`}>
                              {level.threshold >= 1000 ? `${(level.threshold/1000).toFixed(0)}k` : level.threshold} XP
                            </p>
                            {isCurrent && levelProgress.xpToNext > 0 && (
                              <p className="text-[10px] sm:text-xs text-gray-500">
                                {levelProgress.xpToNext >= 1000 ? `${(levelProgress.xpToNext/1000).toFixed(1)}k` : levelProgress.xpToNext}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column - XP Activity */}
          <div className="space-y-4 sm:space-y-6">
            <XPActivitySidebar />
          </div>
        </div>
      </div>

      {/* Quick Trend Submit Modal - Simplified 2-tap */}
      <QuickTrendSubmit
        isOpen={showSubmissionForm}
        onClose={() => setShowSubmissionForm(false)}
        onSuccess={() => {
          loadDashboardData();
        }}
      />

      {/* Quick Start Guide Modal for new users */}
      {showQuickStart && (
        <QuickStartGuide 
          onDismiss={() => setShowQuickStart(false)}
        />
      )}
    </div>
  );
}