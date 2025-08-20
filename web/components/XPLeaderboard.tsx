'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  Trophy as TrophyIcon,
  Medal as MedalIcon,
  Award as AwardIcon,
  TrendingUp as TrendingUpIcon,
  Target as TargetIcon,
  Zap as ZapIcon,
  Crown as CrownIcon,
  Star as StarIcon
} from 'lucide-react';

interface LeaderboardUser {
  id: string;
  username: string;
  avatar_url: string;
  total_xp: number;
  current_level: number;
  predictions_verified: number;
  perfect_predictions: number;
  trends_submitted: number;
  level_title: string;
  global_rank: number;
  weekly_rank: number;
  monthly_rank: number;
}

type TimeFrame = 'all' | 'monthly' | 'weekly';

export default function XPLeaderboard() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
    getCurrentUser();
  }, [timeFrame]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('xp_leaderboard')
        .select('*');

      // Apply time frame filter
      if (timeFrame === 'weekly') {
        query = query.order('weekly_rank', { ascending: true });
      } else if (timeFrame === 'monthly') {
        query = query.order('monthly_rank', { ascending: true });
      } else {
        query = query.order('global_rank', { ascending: true });
      }

      query = query.limit(100);

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <CrownIcon className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <MedalIcon className="w-6 h-6 text-gray-300" />;
      case 3:
        return <MedalIcon className="w-6 h-6 text-orange-400" />;
      default:
        return <span className="text-wave-400 font-bold">#{rank}</span>;
    }
  };

  const getLevelColor = (level: number) => {
    if (level >= 9) return 'text-purple-400';
    if (level >= 7) return 'text-blue-400';
    if (level >= 5) return 'text-green-400';
    if (level >= 3) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const formatXP = (xp: number) => {
    if (xp >= 1000000) return `${(xp / 1000000).toFixed(1)}M`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
    return xp.toString();
  };

  return (
    <div className="wave-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrophyIcon className="w-7 h-7 text-yellow-400" />
          XP Leaderboard
        </h2>

        {/* Time Frame Selector */}
        <div className="flex gap-2">
          {(['all', 'monthly', 'weekly'] as TimeFrame[]).map((frame) => (
            <button
              key={frame}
              onClick={() => setTimeFrame(frame)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                timeFrame === frame
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                  : 'bg-wave-800 text-wave-400 hover:bg-wave-700'
              }`}
            >
              {frame === 'all' ? 'All Time' : frame === 'monthly' ? 'This Month' : 'This Week'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Top 3 Special Display */}
          {timeFrame === 'all' && users.slice(0, 3).length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* 2nd Place */}
              {users[1] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center"
                >
                  <div className="bg-gradient-to-b from-gray-300/20 to-gray-400/10 rounded-xl p-4 border border-gray-400/30">
                    <MedalIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <img
                      src={users[1].avatar_url || '/default-avatar.png'}
                      alt={users[1].username}
                      className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-gray-400"
                    />
                    <p className="text-white font-semibold">{users[1].username}</p>
                    <p className="text-2xl font-bold text-gray-300">{formatXP(users[1].total_xp)}</p>
                    <p className="text-xs text-wave-400">{users[1].level_title}</p>
                  </div>
                </motion.div>
              )}

              {/* 1st Place */}
              {users[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center -mt-4"
                >
                  <div className="bg-gradient-to-b from-yellow-400/20 to-yellow-500/10 rounded-xl p-4 border border-yellow-400/30">
                    <CrownIcon className="w-16 h-16 text-yellow-400 mx-auto mb-2" />
                    <img
                      src={users[0].avatar_url || '/default-avatar.png'}
                      alt={users[0].username}
                      className="w-20 h-20 rounded-full mx-auto mb-2 border-3 border-yellow-400"
                    />
                    <p className="text-white font-bold text-lg">{users[0].username}</p>
                    <p className="text-3xl font-bold text-yellow-400">{formatXP(users[0].total_xp)}</p>
                    <p className="text-sm text-wave-300">{users[0].level_title}</p>
                  </div>
                </motion.div>
              )}

              {/* 3rd Place */}
              {users[2] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center"
                >
                  <div className="bg-gradient-to-b from-orange-400/20 to-orange-500/10 rounded-xl p-4 border border-orange-400/30">
                    <MedalIcon className="w-12 h-12 text-orange-400 mx-auto mb-2" />
                    <img
                      src={users[2].avatar_url || '/default-avatar.png'}
                      alt={users[2].username}
                      className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-orange-400"
                    />
                    <p className="text-white font-semibold">{users[2].username}</p>
                    <p className="text-2xl font-bold text-orange-400">{formatXP(users[2].total_xp)}</p>
                    <p className="text-xs text-wave-400">{users[2].level_title}</p>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Rest of Leaderboard */}
          <div className="bg-wave-800/30 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-wave-700">
                  <th className="text-left py-3 px-4 text-wave-400 text-sm font-medium">Rank</th>
                  <th className="text-left py-3 px-4 text-wave-400 text-sm font-medium">User</th>
                  <th className="text-center py-3 px-4 text-wave-400 text-sm font-medium">Level</th>
                  <th className="text-center py-3 px-4 text-wave-400 text-sm font-medium">
                    <div className="flex items-center justify-center gap-1">
                      <ZapIcon className="w-4 h-4" />
                      XP
                    </div>
                  </th>
                  <th className="text-center py-3 px-4 text-wave-400 text-sm font-medium">
                    <div className="flex items-center justify-center gap-1">
                      <TargetIcon className="w-4 h-4" />
                      Predictions
                    </div>
                  </th>
                  <th className="text-center py-3 px-4 text-wave-400 text-sm font-medium">
                    <div className="flex items-center justify-center gap-1">
                      <StarIcon className="w-4 h-4" />
                      Perfect
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.slice(timeFrame === 'all' ? 3 : 0).map((user, index) => {
                  const actualRank = timeFrame === 'all' ? index + 4 : index + 1;
                  const isCurrentUser = user.id === currentUserId;
                  
                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`border-b border-wave-800 hover:bg-wave-800/50 transition-colors ${
                        isCurrentUser ? 'bg-purple-500/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getRankIcon(actualRank)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatar_url || '/default-avatar.png'}
                            alt={user.username}
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <p className="text-white font-medium">
                              {user.username}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-purple-400">(You)</span>
                              )}
                            </p>
                            <p className={`text-xs ${getLevelColor(user.current_level)}`}>
                              {user.level_title}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold ${getLevelColor(user.current_level)}`}>
                          {user.current_level}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-white font-bold">{formatXP(user.total_xp)}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-wave-300">{user.predictions_verified}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {user.perfect_predictions > 0 ? (
                          <span className="text-yellow-400 font-bold">{user.perfect_predictions}</span>
                        ) : (
                          <span className="text-wave-600">0</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}