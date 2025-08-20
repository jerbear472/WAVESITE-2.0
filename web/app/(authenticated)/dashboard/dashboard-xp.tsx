'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PendingValidations from '@/components/PendingValidations';
import StreakDisplay from '@/components/StreakDisplay';
import { motion } from 'framer-motion';
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
  Flame
} from 'lucide-react';

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

export default function DashboardXP() {
  const { user } = useAuth();
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

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Get user XP summary
      const { data: xpSummary } = await supabase
        .from('user_xp_summary')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Get today's and this week's XP
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: xpEvents } = await supabase
        .from('xp_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false });

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

      setStats({
        total_xp: xpSummary?.total_xp || 0,
        current_level: xpSummary?.level || 1,
        level_title: xpSummary?.level_title || 'Observer',
        todays_xp: todaysXP,
        weekly_xp: weeklyXP,
        trends_submitted: xpSummary?.total_trends_submitted || 0,
        trends_validated: xpSummary?.validated_trends || 0,
        trends_rejected: xpSummary?.rejected_trends || 0,
        pending_validations: xpSummary?.pending_trends || 0,
        validation_accuracy: accuracy,
        current_streak: 0, // Would need to calculate from profile
        global_rank: leaderboard?.global_rank || null
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.username || 'Cultural Anthropologist'}!
          </h1>
          <p className="text-gray-600">Track your journey in spotting cultural waves</p>
        </div>

        {/* XP & Level Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{stats.total_xp.toLocaleString()} XP</h2>
                  <p className="text-sm text-gray-600">Level {stats.current_level}: {stats.level_title}</p>
                </div>
              </div>
              {stats.global_rank && stats.global_rank <= 100 && (
                <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full">
                  <Award className="w-4 h-4" />
                  <span className="text-sm font-medium">Global Rank #{stats.global_rank}</span>
                </div>
              )}
            </div>
            
            <Link
              href="/leaderboard"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View Leaderboard
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Level Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progress to Level {stats.current_level + 1}</span>
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
            
            {/* Streak Display */}
            <div className="mt-6">
              <StreakDisplay />
            </div>
          </div>
        </div>

        {/* Pending Validations */}
        <div className="mt-6">
          <PendingValidations />
        </div>
      </div>
    </div>
  );
}