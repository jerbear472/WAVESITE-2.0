'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Medal, Award, TrendingUp, Target, Crown, Flame, Star, Waves, Activity, Zap } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Background Wave Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute -top-20 -right-20 w-96 h-96 text-blue-100/30" viewBox="0 0 100 100">
          <path d="M10,50 Q30,20 50,50 T90,50" stroke="currentColor" strokeWidth="0.5" fill="none" />
          <path d="M10,60 Q30,30 50,60 T90,60" stroke="currentColor" strokeWidth="0.5" fill="none" />
          <path d="M10,70 Q30,40 50,70 T90,70" stroke="currentColor" strokeWidth="0.5" fill="none" />
        </svg>
        <svg className="absolute -bottom-20 -left-20 w-96 h-96 text-purple-100/20" viewBox="0 0 100 100">
          <path d="M10,30 Q30,10 50,30 T90,30" stroke="currentColor" strokeWidth="0.5" fill="none" />
          <path d="M10,40 Q30,20 50,40 T90,40" stroke="currentColor" strokeWidth="0.5" fill="none" />
        </svg>
      </div>
      
      <div className="relative z-10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-4 mb-6"
            >
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Waves className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Crown className="w-3 h-3 text-yellow-900" />
                </div>
              </div>
              <div className="text-left">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-700 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                  WaveSight
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span className="text-xl font-semibold text-gray-700">Leaderboard</span>
                </div>
              </div>
            </motion.div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-gray-600 max-w-2xl mx-auto"
            >
              Elite cultural anthropologists competing to spot the next wave
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 inline-flex items-center gap-2 px-6 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-blue-200/50 shadow-sm"
            >
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Live Competition Active</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </motion.div>
          </div>

          {/* Stats Summary */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          >
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Competition</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">Monthly</p>
              <p className="text-sm text-gray-600">7 days remaining</p>
            </div>
          
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Active</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{leaderboard.length}</p>
              <p className="text-sm text-gray-600">Anthropologists</p>
            </div>
          
          {userRank && (
            <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-200/50">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-purple-700 bg-purple-100 px-3 py-1 rounded-full">Your Rank</span>
              </div>
              <p className="text-3xl font-bold text-purple-700 mb-1">#{userRank}</p>
              {userRank <= 100 && (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <p className="text-sm text-green-700 font-medium">Prize Eligible!</p>
                </div>
              )}
            </div>
          )}
        </motion.div>

          {/* Timeframe Selector */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-1.5 flex space-x-1 border border-white/20">
            {(['all', 'monthly', 'weekly'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                  timeframe === period
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
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
            transition={{ delay: 0.6 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20"
          >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Anthropologist</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Level</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">XP</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Waves</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Accuracy</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Achievements</th>
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
                        className={`hover:bg-blue-50/50 transition-all duration-200 ${
                          entry.global_rank <= 3 ? 'bg-gradient-to-r from-yellow-50 via-orange-50 to-transparent' : ''
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
            transition={{ delay: 0.8 }}
            className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-200/50 shadow-lg">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <span>Elite Tier Rewards</span>
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
          
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200/50 shadow-lg">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <span>Expert Tier Rewards</span>
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
          
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200/50 shadow-lg">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Medal className="w-5 h-5 text-white" />
                </div>
                <span>Rising Star Rewards</span>
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
    </div>
  );
}