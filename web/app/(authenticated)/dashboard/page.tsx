'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigationRefresh } from '@/hooks/useNavigationRefresh';
import PendingValidations from '@/components/PendingValidations';
import StreakDisplay from '@/components/StreakDisplay';
import { motion } from 'framer-motion';
import { getCurrentLevel } from '@/lib/XP_REWARDS';
import { useXPNotification } from '@/contexts/XPNotificationContext';
import { WAVESIGHT_MESSAGES } from '@/lib/trendNotifications';
import { 
  Trophy,
  TrendingUp,
  Target,
  Zap,
  Clock,
  ChevronRight,
  Award,
  Sparkles,
  Users,
  CheckCircle,
  XCircle,
  Flame,
  ChevronDown,
  ChevronUp,
  Plus,
  Send
} from 'lucide-react';
import SmartTrendSubmission from '@/components/SmartTrendSubmission';
import { submitTrend } from '@/lib/submitTrend';

interface XPStats {
  total_xp: number;
  current_level: number;
  level_title: string;
  todays_xp: number;
  weekly_xp: number;
  trends_submitted: number;
  trends_validated: number;
  trends_rejected: number;
  pending_validations: number;
  validation_accuracy: number;
  current_streak: number;
  global_rank: number | null;
}

interface XPEvent {
  id: string;
  event_type: string;
  xp_change: number;
  description: string;
  created_at: string;
}

// 15-level cultural anthropologist progression system
const XP_LEVELS = [
  { level: 1, title: 'Observer', emoji: '👁️', threshold: 0, color: 'text-gray-600', benefit: 'Begin your journey as a cultural observer' },
  { level: 2, title: 'Recorder', emoji: '📝', threshold: 100, color: 'text-blue-600', benefit: 'Document emerging cultural patterns' },
  { level: 3, title: 'Tracker', emoji: '🔍', threshold: 300, color: 'text-blue-700', benefit: 'Track trends across multiple platforms' },
  { level: 4, title: 'Spotter', emoji: '📍', threshold: 600, color: 'text-green-600', benefit: 'Spot trends before they peak' },
  { level: 5, title: 'Analyst', emoji: '📊', threshold: 1000, color: 'text-green-700', benefit: 'Analyze cultural movement patterns' },
  { level: 6, title: 'Interpreter', emoji: '🔬', threshold: 1500, color: 'text-purple-600', benefit: 'Interpret deeper cultural meanings' },
  { level: 7, title: 'Specialist', emoji: '🎯', threshold: 2100, color: 'text-purple-700', benefit: 'Specialize in trend prediction' },
  { level: 8, title: 'Expert', emoji: '🧠', threshold: 2800, color: 'text-orange-600', benefit: 'Expert in cultural wave mechanics' },
  { level: 9, title: 'Scholar', emoji: '📚', threshold: 3600, color: 'text-orange-700', benefit: 'Scholar of cultural anthropology' },
  { level: 10, title: 'Researcher', emoji: '🔬', threshold: 4500, color: 'text-red-600', benefit: 'Lead cultural research initiatives' },
  { level: 11, title: 'Authority', emoji: '👑', threshold: 5500, color: 'text-red-700', benefit: 'Recognized cultural authority' },
  { level: 12, title: 'Pioneer', emoji: '🚀', threshold: 6600, color: 'text-yellow-600', benefit: 'Pioneer new cultural territories' },
  { level: 13, title: 'Visionary', emoji: '✨', threshold: 8000, color: 'text-yellow-700', benefit: 'Visionary cultural insights' },
  { level: 14, title: 'Master', emoji: '🏆', threshold: 10000, color: 'text-amber-600', benefit: 'Master of cultural wave science' },
  { level: 15, title: 'Legend', emoji: '⭐', threshold: 12500, color: 'text-amber-700', benefit: 'Legendary cultural anthropologist' }
];

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
    trends_validated: 0,
    trends_rejected: 0,
    pending_validations: 0,
    validation_accuracy: 0,
    current_streak: 0,
    global_rank: null
  });
  const [recentEvents, setRecentEvents] = useState<XPEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllLevels, setShowAllLevels] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);

  // Use navigation refresh hook to reload data on route changes
  useNavigationRefresh(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  // Also load on user change
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Get user XP summary
      const { data: xpSummary, error: xpError } = await supabase
        .from('user_xp_summary')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (xpError) {
        console.error('Error fetching XP summary:', xpError);
        console.log('XP Error details:', {
          message: xpError.message,
          details: xpError.details,
          hint: xpError.hint,
          code: xpError.code
        });
      }
      
      console.log('XP Summary data:', xpSummary);
      console.log('XP Summary columns available:', xpSummary ? Object.keys(xpSummary) : 'No data');

      // Get today's and this week's XP
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Try xp_events first, fall back to xp_transactions if it doesn't exist
      let xpEvents = null;
      const { data: xpEventsData, error: eventsError } = await supabase
        .from('xp_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false });
      
      if (eventsError && eventsError.code === '42P01') {
        // Table doesn't exist, try xp_transactions
        const { data: xpTransData } = await supabase
          .from('xp_transactions')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', weekAgo.toISOString())
          .order('created_at', { ascending: false });
        
        // Map xp_transactions to match xp_events structure
        xpEvents = xpTransData?.map(t => ({
          ...t,
          xp_change: t.amount,
          event_type: t.type
        }));
      } else {
        xpEvents = xpEventsData;
      }

      const todaysXP = xpEvents
        ?.filter(e => new Date(e.created_at) >= today)
        .reduce((sum, e) => sum + e.xp_change, 0) || 0;

      const weeklyXP = xpEvents
        ?.reduce((sum, e) => sum + e.xp_change, 0) || 0;

      // Get validation accuracy
      const { data: validations } = await supabase
        .from('trend_validations')
        .select('is_valid, trend_id')
        .eq('validator_id', user.id);

      let accuracy = 0;
      if (validations && validations.length > 0) {
        // Check how many of user's validations matched final outcome
        // Simplified for now - would need to check actual trend outcomes
        accuracy = 75; // Placeholder
      }

      // Get global rank
      const { data: leaderboard } = await supabase
        .from('xp_leaderboard')
        .select('global_rank')
        .eq('user_id', user.id)
        .single();

      // Ensure we handle both null and undefined properly
      const totalXP = xpSummary?.total_xp ?? 0;
      
      // Calculate level using the same function that works correctly on scroll page
      const currentLevelData = getCurrentLevel(totalXP);
      const currentLevel = currentLevelData.level;
      const levelTitle = currentLevelData.title;
      
      setStats({
        total_xp: totalXP,
        current_level: currentLevel,
        level_title: levelTitle,
        todays_xp: todaysXP,
        weekly_xp: weeklyXP,
        trends_submitted: xpSummary?.total_trends_submitted ?? 0,
        trends_validated: xpSummary?.validated_trends ?? 0,
        trends_rejected: xpSummary?.rejected_trends ?? 0,
        pending_validations: xpSummary?.pending_trends ?? 0,
        validation_accuracy: accuracy,
        current_streak: 0, // Would need to calculate from profile
        global_rank: leaderboard?.global_rank || null
      });
      
      console.log('Stats updated:', {
        totalXP,
        currentLevel,
        fromSummary: xpSummary
      });

      // Get recent XP events
      const recentXP = xpEvents?.slice(0, 5) || [];
      setRecentEvents(recentXP);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrendSubmit = async (data: any) => {
    try {
      console.log('🚀 Starting trend submission...');
      const result = await submitTrend(user!.id, data);
      console.log('📨 Submission result:', result);
      
      if (result.success) {
        console.log('✅ Submission successful, showing XP notification...');
        // Show XP notification with actual XP earned (including multipliers)
        const xpEarned = result.earnings || 10;
        try {
          showXPNotification(
            xpEarned, 
            `You earned ${xpEarned} XP`, 
            'submission',
            WAVESIGHT_MESSAGES.SUBMISSION_TITLE,
            WAVESIGHT_MESSAGES.VALIDATION_BONUS
          );
        } catch (notificationError) {
          console.warn('XP notification error:', notificationError);
        }
        setShowSubmissionForm(false);
        // Reload dashboard data to show new stats
        loadDashboardData();
      } else {
        console.error('❌ Submission failed:', result.error);
        throw new Error(result.error || 'Failed to submit trend');
      }
    } catch (error) {
      console.error('❌ Trend submission error:', error);
      throw error; // Re-throw to let SmartTrendSubmission handle the error
    }
  };

  const getLevelProgress = () => {
    // Calculate progress to next level
    const levelThresholds = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 8000, 10000, 12500, 15000];
    const currentThreshold = levelThresholds[stats.current_level - 1] || 0;
    const nextThreshold = levelThresholds[stats.current_level] || 15000;
    const progress = ((stats.total_xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return {
      progress: Math.min(Math.max(progress, 0), 100),
      xpToNext: nextThreshold - stats.total_xp
    };
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'trend_submitted': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'trend_validated': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'trend_rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'validation': return <Users className="w-4 h-4 text-purple-500" />;
      default: return <Sparkles className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const levelProgress = getLevelProgress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Welcome back, <span className="bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">{user?.username || 'Cultural Anthropologist'}</span>!
            </h1>
            <p className="text-gray-600">Track your journey in spotting cultural waves</p>
          </div>
          <button
            onClick={() => setShowSubmissionForm(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-3 sm:px-6 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base whitespace-nowrap min-w-fit"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">Submit New Trend</span>
            <span className="xs:hidden">New Trend</span>
          </button>
        </div>


        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl shadow-sm p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className="text-xs text-gray-500">Today</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.todays_xp}</p>
            <p className="text-xs text-gray-600">XP Earned</p>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl shadow-sm p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="text-xs text-gray-500">Pending</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.pending_validations}</p>
            <p className="text-xs text-gray-600">Validations</p>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl shadow-sm p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-xs text-gray-500">Success</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.trends_validated}</p>
            <p className="text-xs text-gray-600">Validated</p>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl shadow-sm p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 text-purple-500" />
              <span className="text-xs text-gray-500">Accuracy</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.validation_accuracy}%</p>
            <p className="text-xs text-gray-600">Hit Rate</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent XP Activity</h3>
            
            {recentEvents.length > 0 ? (
              <div className="space-y-3">
                {recentEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getEventIcon(event.event_type)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{event.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(event.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${
                      event.xp_change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {event.xp_change > 0 ? '+' : ''}{event.xp_change} XP
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            )}
            
            <Link
              href="/timeline"
              className="mt-4 flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All Activity
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* XP & Level Progress */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Your Progress</h3>
              <Link
                href="/leaderboard"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Leaderboard
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="space-y-4">
              {/* Current Level Display */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">{XP_LEVELS.find(l => l.level === stats.current_level)?.emoji || '👁️'}</span>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{stats.total_xp.toLocaleString()} XP</h4>
                  <p className="text-sm text-gray-600">Level {stats.current_level}: {stats.level_title}</p>
                  <p className="text-xs text-gray-500">{XP_LEVELS.find(l => l.level === stats.current_level)?.benefit}</p>
                </div>
              </div>
              
              {stats.global_rank && stats.global_rank <= 100 && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full">
                  <Award className="w-3 h-3" />
                  <span className="text-xs font-medium">Global Rank #{stats.global_rank}</span>
                </div>
              )}
              
              {/* Current Level Progress */}
              {stats.current_level < 15 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress to {XP_LEVELS.find(l => l.level === stats.current_level + 1)?.title}</span>
                    <span className="text-gray-900 font-medium">{levelProgress.xpToNext.toLocaleString()} XP to go</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${levelProgress.progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}
              
              {/* Toggle All Levels View */}
              <button
                onClick={() => setShowAllLevels(!showAllLevels)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mt-4"
              >
                {showAllLevels ? 'Hide' : 'View'} All 15 Levels
                {showAllLevels ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {/* All Levels Display */}
              {showAllLevels && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-2 max-h-80 overflow-y-auto border-t border-gray-200 pt-4"
                >
                  {XP_LEVELS.map((level) => {
                    const isCompleted = stats.current_level > level.level;
                    const isCurrent = stats.current_level === level.level;
                    const progress = isCurrent ? levelProgress.progress : (isCompleted ? 100 : 0);
                    
                    return (
                      <div
                        key={level.level}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          isCurrent 
                            ? 'bg-blue-50 border border-blue-200' 
                            : isCompleted 
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isCurrent
                            ? 'bg-blue-100'
                            : isCompleted
                            ? 'bg-green-100'
                            : 'bg-gray-100'
                        }`}>
                          <span className="text-lg">{level.emoji}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${
                              isCurrent ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-700'
                            }`}>
                              Level {level.level}: {level.title}
                            </p>
                            {isCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
                            {isCurrent && <Zap className="w-4 h-4 text-blue-500" />}
                          </div>
                          <p className="text-xs text-gray-600 mb-1">{level.benefit}</p>
                          
                          {/* Progress bar for current level */}
                          {isCurrent && progress < 100 && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div 
                                className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <p className={`text-xs font-medium ${
                            isCurrent ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-500'
                          }`}>
                            {level.threshold.toLocaleString()} XP
                          </p>
                          {isCurrent && levelProgress.xpToNext > 0 && (
                            <p className="text-xs text-gray-500">+{levelProgress.xpToNext.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
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
                href="/validate"
                className="flex items-center justify-between p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-900">Validate</p>
                    <p className="text-xs text-gray-600">+5 XP per validation</p>
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
                    <p className="font-medium text-gray-900">Predictions</p>
                    <p className="text-xs text-gray-600">Bonus XP for accuracy</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* Streak Display - Separate Section */}
        <div className="mt-6">
          <StreakDisplay />
        </div>

        {/* Pending Validations */}
        <div className="mt-6">
          <PendingValidations />
        </div>
      </div>

      {/* Trend Submission Modal */}
      {showSubmissionForm && (
        <SmartTrendSubmission
          onClose={() => setShowSubmissionForm(false)}
          onSubmit={handleTrendSubmit}
        />
      )}
    </div>
  );
}