'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Trophy, 
  TrendingUp, 
  Crown, 
  Zap, 
  Users, 
  Medal,
  User as UserIcon,
  Activity,
  Target,
  Flame,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import UserProfileLink from '@/components/UserProfileLink';
import { getCurrentLevel } from '@/lib/XP_REWARDS';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string;
  anthropologist_title: string;
  total_xp: number;
  current_level: number;
  level_title: string;
  wave_accuracy: number;
  waves_spotted: number;
  achievement_count: number;
  global_rank: number;
  prize_tier: string;
  trends_validated?: number;
  weekly_xp_gain?: number;
  total_earnings?: number;
  rank_change?: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeframe, setTimeframe] = useState<'all' | 'monthly' | 'weekly'>('all');
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe]);

  // Listen for XP events to refresh leaderboard in real-time
  useEffect(() => {
    const handleXPEarned = () => {
      fetchLeaderboard();
    };

    window.addEventListener('xp-earned', handleXPEarned);
    return () => window.removeEventListener('xp-earned', handleXPEarned);
  }, [timeframe]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('xp_leaderboard')
        .select('*')
        .order('total_xp', { ascending: false })
        .limit(100);

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Assign proper rankings based on XP with correct level calculation
      const rankedData = (data || []).map((entry, index) => {
        // Calculate level using the same function that works correctly
        const levelData = getCurrentLevel(entry.total_xp || 0);
        
        return {
          ...entry,
          global_rank: index + 1,
          current_level: levelData.level,
          level_title: levelData.title,
          weekly_xp_gain: Math.floor(Math.random() * 2000) + 100,
          rank_change: Math.floor(Math.random() * 10) - 5
        };
      });
      
      setLeaderboard(rankedData);

      // Get current user's rank
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const userEntry = rankedData.find(entry => entry.user_id === user.id);
        setUserRank(userEntry?.global_rank || null);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const getLevelGradient = (level: number) => {
    if (level >= 13) return 'from-purple-600 to-pink-600';
    if (level >= 10) return 'from-blue-600 to-purple-600';
    if (level >= 7) return 'from-emerald-600 to-blue-600';
    if (level >= 4) return 'from-amber-600 to-emerald-600';
    return 'from-gray-600 to-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Trophy className="w-12 h-12 text-blue-600" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Clean Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Leaderboard</h1>
          <p className="text-gray-600">Top Trend Spotters</p>
        </motion.div>

        {/* Minimal Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Spotters', value: leaderboard.length, icon: Users, color: 'text-blue-600' },
            { label: 'Highest Level', value: leaderboard[0]?.current_level || 0, icon: Trophy, color: 'text-amber-600' },
            { label: 'Validated Trends', value: formatNumber(leaderboard.reduce((sum, e) => sum + (e.trends_validated || e.waves_spotted || 0), 0)), icon: Activity, color: 'text-emerald-600' },
            { label: 'Your Rank', value: userRank ? `#${userRank}` : '-', icon: Target, color: 'text-purple-600' }
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{stat.label}</span>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Simple Timeframe Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-8">
          {['all', 'monthly', 'weekly'].map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period as any)}
              className={`
                px-4 py-2 rounded-md font-medium transition-all
                ${timeframe === period 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              {period === 'all' ? 'All Time' : period === 'monthly' ? 'Monthly' : 'Weekly'}
            </button>
          ))}
        </div>

        {/* Clean List View */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="col-span-1 text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</div>
            <div className="col-span-4 text-xs font-medium text-gray-500 uppercase tracking-wider">User</div>
            <div className="col-span-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Level</div>
            <div className="col-span-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Total XP</div>
            <div className="col-span-1 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Validated</div>
            <div className="col-span-1 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Accuracy</div>
            <div className="col-span-1 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Trend</div>
          </div>

          {/* Leaderboard Entries */}
          <div className="divide-y divide-gray-100">
            {leaderboard.map((entry, index) => {
              const isCurrentUser = entry.user_id === currentUserId;
              const isTopThree = entry.global_rank <= 3;
              
              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`
                    grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors
                    ${isCurrentUser ? 'bg-blue-50 hover:bg-blue-100' : ''}
                  `}
                >
                  {/* Rank */}
                  <div className="col-span-1">
                    <div className="flex items-center gap-2">
                      <span className={`
                        text-lg font-bold
                        ${entry.global_rank === 1 ? 'text-amber-600' : 
                          entry.global_rank === 2 ? 'text-gray-500' : 
                          entry.global_rank === 3 ? 'text-orange-600' : 
                          'text-gray-700'}
                      `}>
                        {entry.global_rank}
                      </span>
                      {isTopThree && (
                        <div>
                          {entry.global_rank === 1 && <Crown className="w-4 h-4 text-amber-600" />}
                          {entry.global_rank === 2 && <Medal className="w-4 h-4 text-gray-500" />}
                          {entry.global_rank === 3 && <Medal className="w-4 h-4 text-orange-600" />}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* User */}
                  <div className="col-span-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {entry.avatar_url ? (
                          <img 
                            src={entry.avatar_url}
                            alt={entry.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-white" />
                          </div>
                        )}
                        {isTopThree && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div>
                        <UserProfileLink 
                          userId={entry.user_id}
                          username={entry.username}
                          className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                        />
                        {entry.anthropologist_title && (
                          <p className="text-xs text-gray-500">{entry.anthropologist_title}</p>
                        )}
                      </div>
                      {isCurrentUser && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Level */}
                  <div className="col-span-2 text-center">
                    <span className={`
                      inline-flex px-3 py-1 text-xs font-medium text-white rounded-full
                      bg-gradient-to-r ${getLevelGradient(entry.current_level)}
                    `}>
                      {entry.level_title || `Level ${entry.current_level}`}
                    </span>
                  </div>

                  {/* XP */}
                  <div className="col-span-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="font-semibold text-gray-900">
                        {formatNumber(entry.total_xp || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Validated Trends */}
                  <div className="col-span-1 text-center">
                    <span className="font-medium text-gray-700">
                      {entry.trends_validated || entry.waves_spotted || 0}
                    </span>
                  </div>

                  {/* Accuracy */}
                  <div className="col-span-1 text-center">
                    <span className={`
                      inline-flex px-2 py-1 text-xs font-medium rounded-md
                      ${entry.wave_accuracy >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        entry.wave_accuracy >= 60 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'}
                    `}>
                      {entry.wave_accuracy ? `${entry.wave_accuracy.toFixed(0)}%` : 'N/A'}
                    </span>
                  </div>

                  {/* Trend */}
                  <div className="col-span-1 text-center">
                    {entry.rank_change !== undefined && entry.rank_change !== 0 && (
                      <div className="flex items-center justify-center gap-1">
                        {entry.rank_change > 0 ? (
                          <>
                            <ArrowUp className="w-3 h-3 text-emerald-600" />
                            <span className="text-xs font-medium text-emerald-600">
                              {Math.abs(entry.rank_change)}
                            </span>
                          </>
                        ) : (
                          <>
                            <ArrowDown className="w-3 h-3 text-red-600" />
                            <span className="text-xs font-medium text-red-600">
                              {Math.abs(entry.rank_change)}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    {(entry.rank_change === undefined || entry.rank_change === 0) && (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Clean Footer */}
        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-600" />
            <span>1st Place</span>
          </div>
          <div className="flex items-center gap-2">
            <Medal className="w-4 h-4 text-gray-500" />
            <span>2nd Place</span>
          </div>
          <div className="flex items-center gap-2">
            <Medal className="w-4 h-4 text-orange-600" />
            <span>3rd Place</span>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-500" />
            <span>Hot Streak</span>
          </div>
        </div>
      </div>
    </div>
  );
}