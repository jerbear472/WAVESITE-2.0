'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Medal, Award, TrendingUp, Target, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

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
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeframe, setTimeframe] = useState<'all' | 'monthly' | 'weekly'>('all');
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('xp_leaderboard')
        .select('*')
        .order('global_rank', { ascending: true })
        .limit(100);

      const { data, error } = await query;
      
      if (error) throw error;
      
      setLeaderboard(data || []);

      // Get current user's rank
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userEntry = data?.find(entry => entry.user_id === user.id);
        setUserRank(userEntry?.global_rank || null);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
    if (rank <= 10) return <Trophy className="h-5 w-5 text-purple-400" />;
    if (rank <= 50) return <Award className="h-5 w-5 text-blue-400" />;
    return <Target className="h-4 w-4 text-gray-400" />;
  };

  const getPrizeTierColor = (tier: string) => {
    switch(tier) {
      case 'prize_tier_1': return 'bg-gradient-to-r from-yellow-400 to-orange-500';
      case 'prize_tier_2': return 'bg-gradient-to-r from-purple-400 to-pink-500';
      case 'prize_tier_3': return 'bg-gradient-to-r from-blue-400 to-cyan-500';
      default: return 'bg-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Cultural Anthropologist Leaderboard
          </h1>
          <p className="text-gray-400">
            Top wave spotters compete for exclusive prizes and recognition
          </p>
        </div>

        {/* Prize Pool Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Monthly Competition Active
              </h2>
              <p className="text-gray-200">
                Top 10 anthropologists win exclusive prizes!
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-200">Time remaining:</p>
              <p className="text-2xl font-bold text-white">7 days</p>
            </div>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-800 rounded-lg p-1 flex space-x-1">
            {(['all', 'monthly', 'weekly'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  timeframe === period
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Your Rank Card */}
        {userRank && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-lg p-4 mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getRankIcon(userRank)}
                <div>
                  <p className="text-sm text-gray-300">Your Rank</p>
                  <p className="text-2xl font-bold text-white">#{userRank}</p>
                </div>
              </div>
              {userRank <= 100 && (
                <div className="bg-green-500 px-3 py-1 rounded-full">
                  <span className="text-sm font-bold text-white">Prize Eligible!</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Anthropologist</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Level</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Total XP</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Waves</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Accuracy</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Achievements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {leaderboard.map((entry, index) => (
                  <motion.tr
                    key={entry.user_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className={`hover:bg-gray-700 transition-colors ${
                      entry.global_rank <= 3 ? 'bg-gray-700/50' : ''
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        {getRankIcon(entry.global_rank)}
                        <span className="font-bold text-white">#{entry.global_rank}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={entry.avatar_url || '/default-avatar.png'}
                          alt={entry.username}
                          className="h-10 w-10 rounded-full"
                        />
                        <div>
                          <p className="font-medium text-white">{entry.username}</p>
                          {entry.anthropologist_title && (
                            <p className="text-xs text-gray-400">{entry.anthropologist_title}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${getPrizeTierColor(entry.prize_tier)}`}>
                        {entry.level_title}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-lg font-bold text-white">{entry.total_xp.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-gray-300">{entry.waves_spotted}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-gray-300">{entry.wave_accuracy}%</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center items-center space-x-1">
                        <Trophy className="h-4 w-4 text-yellow-400" />
                        <span className="text-gray-300">{entry.achievement_count}</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Prize Information */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg p-4">
            <h3 className="font-bold text-white mb-2">🥇 Top 10 Prizes</h3>
            <ul className="text-sm text-gray-100 space-y-1">
              <li>• Custom title & badge</li>
              <li>• Exclusive features</li>
              <li>• Hall of Fame entry</li>
            </ul>
          </div>
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-4">
            <h3 className="font-bold text-white mb-2">🥈 Top 50 Prizes</h3>
            <ul className="text-sm text-gray-100 space-y-1">
              <li>• Special recognition</li>
              <li>• XP multiplier boost</li>
              <li>• Priority features</li>
            </ul>
          </div>
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-4">
            <h3 className="font-bold text-white mb-2">🥉 Top 100 Prizes</h3>
            <ul className="text-sm text-gray-100 space-y-1">
              <li>• Achievement badge</li>
              <li>• Bonus XP rewards</li>
              <li>• Community recognition</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
