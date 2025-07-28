'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/formatters';
import { EARNINGS } from '@/lib/constants';
import { 
  Flame, 
  Trophy, 
  Target, 
  Zap, 
  TrendingUp,
  CheckCircle,
  Lock,
  Calendar,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Challenge {
  id: string;
  title: string;
  description: string;
  requirement: number;
  reward: number;
  category: string;
  icon: React.ElementType;
  color: string;
}

const challenges: Challenge[] = [
  {
    id: 'fashion_forward',
    title: 'Fashion Forward',
    description: 'Log 3 fashion trends',
    requirement: 3,
    reward: 1.00,
    category: 'fashion',
    icon: TrendingUp,
    color: 'from-pink-500 to-rose-500'
  },
  {
    id: 'trend_verifier',
    title: 'Trend Verifier',
    description: 'Verify 20 trends',
    requirement: 20,
    reward: 0.50,
    category: 'verification',
    icon: CheckCircle,
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'daily_scroller',
    title: 'Daily Scroller',
    description: 'Complete 5 scroll sessions',
    requirement: 5,
    reward: 2.00,
    category: 'sessions',
    icon: Zap,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'meme_master',
    title: 'Meme Master',
    description: 'Log 5 meme trends',
    requirement: 5,
    reward: 0.75,
    category: 'meme',
    icon: Target,
    color: 'from-purple-500 to-indigo-500'
  }
];

export const StreaksAndChallenges: React.FC = () => {
  const { user } = useAuth();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [challengeProgress, setChallengeProgress] = useState<Record<string, number>>({});
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFireAnimation, setShowFireAnimation] = useState(false);

  // Fetch streak data
  const fetchStreakData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get user streak data
      const { data: streakData, error: streakError } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (streakError && streakError.code !== 'PGRST116') throw streakError;

      if (streakData) {
        setCurrentStreak(streakData.current_streak);
        setLongestStreak(streakData.longest_streak);
        
        // Show fire animation for 7+ day streaks
        if (streakData.current_streak >= 7) {
          setShowFireAnimation(true);
        }
      }

      // Get challenge progress for current week
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      // Fashion challenge progress
      const { count: fashionCount } = await supabase
        .from('logged_trends')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('category', 'fashion')
        .gte('created_at', weekStart.toISOString());

      // Verification challenge progress
      const { count: verificationCount } = await supabase
        .from('trend_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('verifier_id', user.id)
        .gte('verified_at', weekStart.toISOString());

      // Session challenge progress
      const { count: sessionCount } = await supabase
        .from('scroll_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('started_at', weekStart.toISOString());

      // Meme challenge progress
      const { count: memeCount } = await supabase
        .from('logged_trends')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('category', 'meme')
        .gte('created_at', weekStart.toISOString());

      setChallengeProgress({
        fashion_forward: fashionCount || 0,
        trend_verifier: verificationCount || 0,
        daily_scroller: sessionCount || 0,
        meme_master: memeCount || 0
      });

      // Check completed challenges
      const { data: completions } = await supabase
        .from('challenge_completions')
        .select('challenge_id')
        .eq('user_id', user.id)
        .gte('completed_at', weekStart.toISOString());

      if (completions) {
        setCompletedChallenges(completions.map(c => c.challenge_id));
      }
    } catch (error) {
      console.error('Error fetching streak data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreakData();
  }, [user]);

  // Get progress percentage
  const getProgressPercentage = (challengeId: string, requirement: number) => {
    const progress = challengeProgress[challengeId] || 0;
    return Math.min((progress / requirement) * 100, 100);
  };

  // Get days until reset
  const getDaysUntilReset = () => {
    const now = new Date();
    const sunday = new Date();
    sunday.setDate(sunday.getDate() + (7 - sunday.getDay()));
    sunday.setHours(0, 0, 0, 0);
    const diff = sunday.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wave-500 mx-auto mb-4" />
          <p className="text-wave-400">Loading challenges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Streak Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-orange-600/30 to-red-600/20 backdrop-blur-xl rounded-2xl p-8 border border-orange-600/30 relative overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-red-500 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Daily Streak</h3>
              <p className="text-wave-300">Keep the momentum going!</p>
            </div>
            <div className="relative">
              <motion.div
                animate={showFireAnimation ? {
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0]
                } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-20 h-20 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-full flex items-center justify-center"
              >
                <Flame className="w-10 h-10 text-orange-400" />
              </motion.div>
              {currentStreak >= 7 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full"
                >
                  🔥 HOT
                </motion.div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="text-center p-6 bg-wave-800/30 rounded-xl">
              <p className="text-5xl font-bold text-white mb-2">{currentStreak}</p>
              <p className="text-sm text-wave-400">Current Streak</p>
              {currentStreak >= 7 && (
                <p className="text-xs text-orange-400 mt-2">🏆 Week Warrior!</p>
              )}
            </div>
            <div className="text-center p-6 bg-wave-800/30 rounded-xl">
              <p className="text-5xl font-bold text-white mb-2">{longestStreak}</p>
              <p className="text-sm text-wave-400">Longest Streak</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-wave-800/20 rounded-xl">
            <p className="text-sm text-wave-300">
              <span className="font-semibold">Pro Tip:</span> Log at least one trend daily to maintain your streak!
            </p>
          </div>
        </div>
      </motion.div>

      {/* Weekly Challenges */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Weekly Challenges</h3>
          <div className="flex items-center gap-2 text-sm text-wave-400">
            <Calendar className="w-4 h-4" />
            <span>Resets in {getDaysUntilReset()} days</span>
          </div>
        </div>

        <div className="grid gap-4">
          {challenges.map((challenge, index) => {
            const Icon = challenge.icon;
            const progress = challengeProgress[challenge.id] || 0;
            const percentage = getProgressPercentage(challenge.id, challenge.requirement);
            const isCompleted = completedChallenges.includes(challenge.id);

            return (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  relative overflow-hidden bg-wave-900/50 backdrop-blur-sm rounded-xl p-6 
                  border transition-all
                  ${isCompleted 
                    ? 'border-green-500/30 bg-green-500/5' 
                    : 'border-wave-700/30 hover:border-wave-600/50'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    w-12 h-12 rounded-xl bg-gradient-to-br ${challenge.color} 
                    flex items-center justify-center flex-shrink-0
                    ${isCompleted ? 'opacity-50' : ''}
                  `}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-white">{challenge.title}</h4>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-semibold">
                          {formatCurrency(challenge.reward)}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-wave-400 mb-3">{challenge.description}</p>

                    <div className="relative h-2 bg-wave-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={`
                          h-full rounded-full
                          ${isCompleted 
                            ? 'bg-green-500' 
                            : 'bg-gradient-to-r ' + challenge.color
                          }
                        `}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-wave-500">
                        {progress} / {challenge.requirement}
                      </p>
                      {isCompleted && (
                        <div className="flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          <span>Completed!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Completion overlay */}
                <AnimatePresence>
                  {isCompleted && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-green-500/5 pointer-events-none"
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Achievements Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-wave-900/50 backdrop-blur-sm rounded-xl p-6 border border-wave-700/30"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Upcoming Achievements</h3>
          <Trophy className="w-5 h-5 text-yellow-400" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { name: '30 Day Warrior', requirement: '30 day streak', locked: currentStreak < 30 },
            { name: 'Trend Master', requirement: '100 trends logged', locked: true },
            { name: 'Elite Verifier', requirement: '500 verifications', locked: true }
          ].map((achievement, index) => (
            <div
              key={index}
              className={`
                text-center p-4 rounded-xl transition-all
                ${achievement.locked 
                  ? 'bg-wave-800/30 opacity-50' 
                  : 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20'
                }
              `}
            >
              <div className="w-12 h-12 bg-wave-700/50 rounded-full flex items-center justify-center mx-auto mb-2">
                {achievement.locked ? (
                  <Lock className="w-5 h-5 text-wave-500" />
                ) : (
                  <Trophy className="w-5 h-5 text-yellow-400" />
                )}
              </div>
              <p className="text-xs font-medium text-white">{achievement.name}</p>
              <p className="text-xs text-wave-500 mt-1">{achievement.requirement}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};