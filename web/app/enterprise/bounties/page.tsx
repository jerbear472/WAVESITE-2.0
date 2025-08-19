'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Target, 
  Activity, 
  TrendingUp, 
  Users,
  DollarSign,
  Clock,
  BarChart3,
  Zap,
  AlertCircle
} from 'lucide-react';
import { BountyCreator } from '@/components/enterprise/BountyCreator';
import { BountyMonitor } from '@/components/enterprise/BountyMonitor';
import { format, formatDistanceToNow } from 'date-fns';

interface Bounty {
  id: string;
  title: string;
  total_spots: number;
  filled_spots: number;
  price_per_spot: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  urgency_level: string;
  expires_at: string;
  created_at: string;
  submissions?: Array<{
    id: string;
    status: string;
  }>;
}

interface DashboardStats {
  active_bounties: number;
  total_submissions: number;
  total_spent: number;
  avg_completion_time: number;
  success_rate: number;
  trending_insights: Array<{
    category: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

export default function EnterpriseBountiesPage() {
  const supabase = createClientComponentClient();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('enterprise-bounties')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bounties' },
        fetchDashboardData
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bounty_submissions' },
        fetchDashboardData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Fetch user's bounties
      const { data: bountiesData, error: bountiesError } = await supabase
        .from('bounties')
        .select(`
          *,
          submissions:bounty_submissions(id, status)
        `)
        .eq('enterprise_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (bountiesError) throw bountiesError;
      setBounties(bountiesData || []);

      // Calculate stats
      calculateStats(bountiesData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (bounties: Bounty[]) => {
    const activeBounties = bounties.filter(b => b.status === 'active');
    const allSubmissions = bounties.flatMap(b => b.submissions || []);
    const approvedSubmissions = allSubmissions.filter(s => s.status === 'approved');
    const totalSpent = bounties.reduce((sum, b) => 
      sum + (b.filled_spots * b.price_per_spot), 0
    );

    // Calculate average completion time (mock data for now)
    const avgCompletionTime = 45; // minutes

    // Calculate success rate
    const successRate = allSubmissions.length > 0
      ? (approvedSubmissions.length / allSubmissions.length) * 100
      : 0;

    // Mock trending insights
    const trendingInsights = [
      { category: 'Product Reviews', count: 234, trend: 'up' as const },
      { category: 'User Reactions', count: 189, trend: 'up' as const },
      { category: 'Competitor Analysis', count: 156, trend: 'stable' as const },
      { category: 'Market Sentiment', count: 98, trend: 'down' as const },
    ];

    setStats({
      active_bounties: activeBounties.length,
      total_submissions: allSubmissions.length,
      total_spent: totalSpent,
      avg_completion_time: avgCompletionTime,
      success_rate: successRate,
      trending_insights: trendingInsights,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'paused': return 'text-yellow-400';
      case 'completed': return 'text-blue-400';
      case 'cancelled': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getUrgencyIcon = (level: string) => {
    switch (level) {
      case 'lightning': return '⚡';
      case 'rapid': return '🔥';
      case 'standard': return '⏰';
      default: return '📍';
    }
  };

  const filteredBounties = bounties.filter(bounty => {
    if (filter === 'all') return true;
    if (filter === 'active') return bounty.status === 'active';
    if (filter === 'completed') return bounty.status === 'completed';
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Enterprise Bounty System
          </h1>
          <button
            onClick={() => setShowCreator(true)}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
          >
            <Plus size={20} />
            Create Bounty
          </button>
        </div>
        <p className="text-gray-400">
          Crowdsource intelligence with targeted bounties. Get real-time insights from your community.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800"
          >
            <div className="flex items-center justify-between mb-2">
              <Target className="text-cyan-400" size={24} />
              <span className="text-xs text-green-400">+12%</span>
            </div>
            <div className="text-3xl font-bold">{stats?.active_bounties || 0}</div>
            <div className="text-sm text-gray-400">Active Bounties</div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800"
          >
            <div className="flex items-center justify-between mb-2">
              <Activity className="text-green-400" size={24} />
              <span className="text-xs text-green-400">+28%</span>
            </div>
            <div className="text-3xl font-bold">{stats?.total_submissions || 0}</div>
            <div className="text-sm text-gray-400">Total Submissions</div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800"
          >
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="text-yellow-400" size={24} />
            </div>
            <div className="text-3xl font-bold">${stats?.total_spent.toFixed(0) || 0}</div>
            <div className="text-sm text-gray-400">Total Invested</div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800"
          >
            <div className="flex items-center justify-between mb-2">
              <Clock className="text-blue-400" size={24} />
            </div>
            <div className="text-3xl font-bold">{stats?.avg_completion_time || 0}m</div>
            <div className="text-sm text-gray-400">Avg. Time</div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800"
          >
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="text-purple-400" size={24} />
            </div>
            <div className="text-3xl font-bold">{stats?.success_rate.toFixed(0) || 0}%</div>
            <div className="text-sm text-gray-400">Success Rate</div>
          </motion.div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="text-cyan-400" size={20} />
              Live Activity Stream
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-sm text-gray-400">Real-time</span>
            </div>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-400">14:32</span>
              <span className="text-white">New submission for "Product Reviews"</span>
              <span className="text-green-400">+$2.00</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-400">14:31</span>
              <span className="text-white">Bounty "User Reactions" reached 50% completion</span>
              <span className="text-cyan-400">25/50</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-400">14:30</span>
              <span className="text-white">3 new spotters joined "Market Analysis"</span>
              <span className="text-purple-400">Active</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex gap-2">
          {(['all', 'active', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                filter === status
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-gray-900/50 text-gray-400 hover:bg-gray-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Bounties Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredBounties.map((bounty, index) => (
              <motion.div
                key={bounty.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800 hover:border-cyan-500/50 cursor-pointer transition-all"
                onClick={() => setSelectedBounty(bounty.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getUrgencyIcon(bounty.urgency_level)}</span>
                    <span className={`text-xs uppercase ${getStatusColor(bounty.status)}`}>
                      {bounty.status}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(bounty.created_at), { addSuffix: true })}
                  </span>
                </div>

                <h3 className="text-lg font-semibold mb-2 line-clamp-2">{bounty.title}</h3>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-white">
                      {bounty.filled_spots}/{bounty.total_spots}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div 
                      className="bg-cyan-400 h-2 rounded-full transition-all"
                      style={{ width: `${(bounty.filled_spots / bounty.total_spots) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-green-400">
                      ${bounty.price_per_spot.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">per spot</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Total value</div>
                    <div className="text-lg font-semibold">
                      ${(bounty.total_spots * bounty.price_per_spot).toFixed(0)}
                    </div>
                  </div>
                </div>

                {bounty.status === 'active' && new Date(bounty.expires_at) > new Date() && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-yellow-400">
                    <AlertCircle size={14} />
                    Expires {formatDistanceToNow(new Date(bounty.expires_at), { addSuffix: true })}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredBounties.length === 0 && (
          <div className="text-center py-12">
            <Target className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-gray-400 mb-4">No bounties found</p>
            <button
              onClick={() => setShowCreator(true)}
              className="px-6 py-3 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
            >
              Create Your First Bounty
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreator && (
          <BountyCreator
            onClose={() => setShowCreator(false)}
            onSuccess={fetchDashboardData}
          />
        )}

        {selectedBounty && (
          <BountyMonitor
            bountyId={selectedBounty}
            onClose={() => setSelectedBounty(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}