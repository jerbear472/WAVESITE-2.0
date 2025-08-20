'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Medal, Award, TrendingUp, Target, Crown, Flame, Star } from 'lucide-react';
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

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { icon: '🥇', color: 'text-yellow-500' };
    if (rank === 2) return { icon: '🥈', color: 'text-gray-400' };
    if (rank === 3) return { icon: '🥉', color: 'text-amber-600' };
    if (rank <= 10) return { icon: '🏆', color: 'text-purple-500' };
    if (rank <= 50) return { icon: '⭐', color: 'text-blue-500' };
    return { icon: '📈', color: 'text-gray-500' };
  };

  const getLevelColor = (level: number) => {
    if (level >= 50) return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
    if (level >= 30) return 'bg-gradient-to-r from-purple-400 to-pink-500 text-white';
    if (level >= 20) return 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white';
    if (level >= 10) return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-gray-900 mb-2"
          >
            WaveSight Leaderboard
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-600"
          >
            Top cultural spotters compete for recognition and rewards
          </motion.p>
        </div>

        {/* Stats Summary */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🔥</span>
              <span className="text-sm text-gray-500">Active Competition</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">Monthly</p>
            <p className="text-sm text-gray-600 mt-1">7 days remaining</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">👥</span>
              <span className="text-sm text-gray-500">Total Spotters</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{leaderboard.length}</p>
            <p className="text-sm text-gray-600 mt-1">Active this period</p>
          </div>
          
          {userRank && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 shadow-sm border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🎯</span>
                <span className="text-sm text-purple-600 font-medium">Your Rank</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">#{userRank}</p>
              {userRank <= 100 && (
                <p className="text-sm text-green-600 font-medium mt-1">Prize Eligible! ✨</p>
              )}
            </div>
          )}
        </motion.div>

        {/* Timeframe Selector */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg shadow-sm p-1 flex space-x-1">
            {(['all', 'monthly', 'weekly'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  timeframe === period
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Table */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spotter</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">XP</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Waves</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Badges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        <span>Loading leaderboard...</span>
                      </div>
                    </td>
                  </tr>
                ) : leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No spotters found for this period
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((entry, index) => {
                    const rankDisplay = getRankDisplay(entry.global_rank);
                    return (
                      <motion.tr
                        key={entry.user_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`hover:bg-gray-50 transition-colors ${
                          entry.global_rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`text-xl ${rankDisplay.color}`}>{rankDisplay.icon}</span>
                            <span className="font-bold text-gray-900">#{entry.global_rank}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                              {entry.username?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{entry.username || 'Anonymous'}</p>
                              {entry.anthropologist_title && (
                                <p className="text-xs text-gray-500">{entry.anthropologist_title}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getLevelColor(entry.current_level)}`}>
                            {entry.level_title || `Level ${entry.current_level}`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div>
                            <span className="text-lg font-bold text-gray-900">{(entry.total_xp || 0).toLocaleString()}</span>
                            <span className="text-xs text-gray-500 ml-1">XP</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-gray-700">{entry.waves_spotted || 0}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center">
                            <span className="text-gray-700">{entry.wave_accuracy || 0}%</span>
                            {entry.wave_accuracy >= 80 && <span className="ml-1 text-green-500">✓</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center items-center space-x-1">
                            <span className="text-yellow-500">🏅</span>
                            <span className="text-gray-700">{entry.achievement_count || 0}</span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Prize Information */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">🥇</span> Top 10 Rewards
            </h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Exclusive "Wave Master" title</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>3x XP multiplier for 30 days</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Hall of Fame recognition</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">🥈</span> Top 50 Rewards
            </h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Special "Trend Expert" badge</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>2x XP multiplier for 2 weeks</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Priority validation queue</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">🥉</span> Top 100 Rewards
            </h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Achievement badge</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>500 bonus XP</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Community recognition</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}