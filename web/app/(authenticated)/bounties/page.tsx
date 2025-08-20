'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  Clock, 
  DollarSign, 
  Users,
  TrendingUp,
  Zap,
  Trophy,
  Filter,
  CheckCircle,
  AlertCircle,
  Star,
  ChevronRight
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface Bounty {
  id: string;
  title: string;
  description: string;
  total_spots: number;
  filled_spots: number;
  price_per_spot: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  urgency_level: 'lightning' | 'rapid' | 'standard';
  expires_at: string;
  created_at: string;
  targeting?: {
    platforms?: string[];
    expertise?: string[];
    demographics?: any;
  };
  match_score?: number;
  match_reason?: string;
}

interface UserStats {
  total_submissions: number;
  approved_submissions: number;
  total_earned: number;
  active_hunts: number;
  success_rate: number;
}

export default function BountiesPage() {
  const supabase = createClientComponentClient();
  const { user } = useAuth();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'matched' | 'active'>('all');
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);

  useEffect(() => {
    fetchBounties();
    fetchUserStats();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('user-bounties')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bounties' },
        fetchBounties
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bounty_submissions' },
        fetchUserStats
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBounties = async () => {
    try {
      // Fetch active bounties
      const { data: bountiesData, error } = await supabase
        .from('bounties')
        .select('*')
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('urgency_level', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch match scores if they exist
      if (user) {
        const { data: matchData } = await supabase
          .from('bounty_matches')
          .select('bounty_id, match_score, match_reason')
          .eq('user_id', user.id);

        // Merge match scores with bounties
        const bountiesWithScores = (bountiesData || []).map(bounty => {
          const match = matchData?.find(m => m.bounty_id === bounty.id);
          return {
            ...bounty,
            match_score: match?.match_score,
            match_reason: match?.match_reason
          };
        });

        setBounties(bountiesWithScores);
      } else {
        setBounties(bountiesData || []);
      }
    } catch (error) {
      console.error('Error fetching bounties:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      const { data: stats, error } = await supabase
        .from('bounty_submissions')
        .select('status, earned')
        .eq('user_id', user.id);

      if (error) throw error;

      const total = stats?.length || 0;
      const approved = stats?.filter(s => s.status === 'approved').length || 0;
      const totalEarned = stats?.reduce((sum, s) => sum + (s.earned || 0), 0) || 0;

      // Get active hunts
      const { data: activeHunts } = await supabase
        .from('active_hunts')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      setUserStats({
        total_submissions: total,
        approved_submissions: approved,
        total_earned: totalEarned,
        active_hunts: activeHunts?.length || 0,
        success_rate: total > 0 ? (approved / total) * 100 : 0
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const startHunt = async (bountyId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('active_hunts')
        .insert({
          user_id: user.id,
          bounty_id: bountyId,
          status: 'active'
        });

      if (error) throw error;

      // Navigate to hunt screen (mobile) or submission form
      window.location.href = `/bounties/${bountyId}/hunt`;
    } catch (error) {
      console.error('Error starting hunt:', error);
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'lightning': return 'text-red-500 bg-red-50';
      case 'rapid': return 'text-orange-500 bg-orange-50';
      default: return 'text-blue-500 bg-blue-50';
    }
  };

  const getUrgencyIcon = (level: string) => {
    switch (level) {
      case 'lightning': return <Zap className="w-4 h-4" />;
      case 'rapid': return <Clock className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const filteredBounties = bounties.filter(bounty => {
    if (filter === 'matched') return bounty.match_score && bounty.match_score > 70;
    if (filter === 'active') {
      const hoursLeft = (new Date(bounty.expires_at).getTime() - Date.now()) / (1000 * 60 * 60);
      return hoursLeft < 2;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-500" />
                Bounty Board
              </h1>
              <p className="text-gray-600 mt-2">Hunt trends for enterprise clients and earn premium rewards</p>
            </div>
            {userStats && (
              <div className="hidden lg:flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">${userStats.total_earned.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">Total Earned</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{userStats.success_rate.toFixed(0)}%</p>
                  <p className="text-sm text-gray-500">Success Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{userStats.active_hunts}</p>
                  <p className="text-sm text-gray-500">Active Hunts</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards - Mobile */}
      {userStats && (
        <div className="lg:hidden grid grid-cols-3 gap-4 px-4 py-4">
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <p className="text-lg font-bold text-green-600">${userStats.total_earned.toFixed(0)}</p>
            <p className="text-xs text-gray-500">Earned</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <p className="text-lg font-bold text-blue-600">{userStats.success_rate.toFixed(0)}%</p>
            <p className="text-xs text-gray-500">Success</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <p className="text-lg font-bold text-purple-600">{userStats.active_hunts}</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Filter className="w-5 h-5 text-gray-400" />
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Bounties
          </button>
          <button
            onClick={() => setFilter('matched')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'matched' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Star className="w-4 h-4 inline mr-1" />
            Best Matches
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'active' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Zap className="w-4 h-4 inline mr-1" />
            Expiring Soon
          </button>
        </div>

        {/* Bounties Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {filteredBounties.map((bounty, index) => (
                <motion.div
                  key={bounty.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => setSelectedBounty(bounty)}
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {bounty.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {bounty.description}
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded-lg flex items-center gap-1 ${getUrgencyColor(bounty.urgency_level)}`}>
                        {getUrgencyIcon(bounty.urgency_level)}
                        <span className="text-xs font-medium capitalize">
                          {bounty.urgency_level}
                        </span>
                      </div>
                    </div>

                    {/* Match Score */}
                    {bounty.match_score && (
                      <div className="mb-4 p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-700">
                            {bounty.match_score}% Match
                          </span>
                          <Star className="w-4 h-4 text-green-600" />
                        </div>
                        {bounty.match_reason && (
                          <p className="text-xs text-green-600 mt-1">{bounty.match_reason}</p>
                        )}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          ${bounty.price_per_spot}
                        </p>
                        <p className="text-xs text-gray-500">per spot</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {bounty.total_spots - bounty.filled_spots}
                        </p>
                        <p className="text-xs text-gray-500">spots left</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-orange-600">
                          {formatDistanceToNow(new Date(bounty.expires_at), { addSuffix: false })}
                        </p>
                        <p className="text-xs text-gray-500">remaining</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>{bounty.filled_spots} filled</span>
                        <span>{bounty.total_spots} total</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${(bounty.filled_spots / bounty.total_spots) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startHunt(bounty.id);
                      }}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors flex items-center justify-center gap-2"
                    >
                      Start Hunting
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {filteredBounties.length === 0 && !loading && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bounties available</h3>
            <p className="text-gray-600">Check back soon for new opportunities!</p>
          </div>
        )}
      </div>

      {/* Bounty Detail Modal */}
      <AnimatePresence>
        {selectedBounty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedBounty(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedBounty.title}</h2>
                <p className="text-gray-600 mb-6">{selectedBounty.description}</p>
                
                {/* Targeting Info */}
                {selectedBounty.targeting && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Requirements</h3>
                    {selectedBounty.targeting.platforms && (
                      <div className="mb-2">
                        <span className="text-sm text-gray-500">Platforms: </span>
                        <span className="text-sm font-medium">
                          {selectedBounty.targeting.platforms.join(', ')}
                        </span>
                      </div>
                    )}
                    {selectedBounty.targeting.expertise && (
                      <div className="mb-2">
                        <span className="text-sm text-gray-500">Expertise: </span>
                        <span className="text-sm font-medium">
                          {selectedBounty.targeting.expertise.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={() => startHunt(selectedBounty.id)}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors"
                  >
                    Start Hunting
                  </button>
                  <button
                    onClick={() => setSelectedBounty(null)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}