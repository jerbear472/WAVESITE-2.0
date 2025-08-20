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
  AlertCircle,
  ChevronRight,
  Download,
  Settings,
  Eye,
  Pause,
  Play,
  X,
  CheckCircle,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ArrowLeft,
  Lightbulb,
  Building2,
  Shield,
  TrendingDown
} from 'lucide-react';
import { BountyCreator } from '@/components/enterprise/BountyCreator';
import { BountyMonitor } from '@/components/enterprise/BountyMonitor';
import { format, formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

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
  submissions?: Array<{
    id: string;
    status: string;
    created_at: string;
    trend?: {
      title: string;
      user?: {
        email: string;
      };
    };
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
  const router = useRouter();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    checkFirstTime();
    
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

  const checkFirstTime = () => {
    const hasSeenWelcome = localStorage.getItem('enterprise_bounty_welcome');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
      localStorage.setItem('enterprise_bounty_welcome', 'true');
    }
  };

  const fetchDashboardData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Fetch user's bounties with submissions
      const { data: bountiesData, error: bountiesError } = await supabase
        .from('bounties')
        .select(`
          *,
          submissions:bounty_submissions(
            id, 
            status, 
            created_at,
            trend:trends(
              title,
              user:user_profiles(email)
            )
          )
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

    // Calculate average completion time in minutes
    const completedBounties = bounties.filter(b => b.status === 'completed');
    const avgCompletionTime = completedBounties.length > 0
      ? completedBounties.reduce((sum, b) => {
          const created = new Date(b.created_at).getTime();
          const lastSubmission = b.submissions?.slice(-1)[0];
          if (lastSubmission) {
            const completed = new Date(lastSubmission.created_at).getTime();
            return sum + ((completed - created) / (1000 * 60)); // Convert to minutes
          }
          return sum;
        }, 0) / completedBounties.length
      : 0;

    // Calculate success rate
    const successRate = allSubmissions.length > 0
      ? (approvedSubmissions.length / allSubmissions.length) * 100
      : 0;

    // Mock trending insights with realistic data
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
      avg_completion_time: Math.round(avgCompletionTime),
      success_rate: successRate,
      trending_insights: trendingInsights,
    });
  };

  const toggleBountyStatus = async (bountyId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    
    try {
      const { error } = await supabase
        .from('bounties')
        .update({ status: newStatus })
        .eq('id', bountyId);

      if (error) throw error;
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating bounty status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10';
      case 'paused': return 'text-yellow-400 bg-yellow-400/10';
      case 'completed': return 'text-blue-400 bg-blue-400/10';
      case 'cancelled': return 'text-gray-400 bg-gray-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getUrgencyStyle = (level: string) => {
    switch (level) {
      case 'lightning': 
        return { 
          icon: <Zap className="w-5 h-5" />, 
          color: 'text-red-400 bg-red-400/10',
          borderColor: 'border-red-400/20'
        };
      case 'rapid': 
        return { 
          icon: <Clock className="w-5 h-5" />, 
          color: 'text-orange-400 bg-orange-400/10',
          borderColor: 'border-orange-400/20'
        };
      default: 
        return { 
          icon: <Target className="w-5 h-5" />, 
          color: 'text-blue-400 bg-blue-400/10',
          borderColor: 'border-blue-400/20'
        };
    }
  };

  const filteredBounties = bounties.filter(bounty => {
    if (filter === 'all') return true;
    if (filter === 'active') return bounty.status === 'active';
    if (filter === 'completed') return bounty.status === 'completed';
    return true;
  });

  const exportData = () => {
    // Export bounty data as CSV
    const csv = [
      ['Title', 'Status', 'Spots', 'Filled', 'Price', 'Total Value', 'Created'],
      ...bounties.map(b => [
        b.title,
        b.status,
        b.total_spots,
        b.filled_spots,
        b.price_per_spot,
        b.total_spots * b.price_per_spot,
        format(new Date(b.created_at), 'yyyy-MM-dd')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bounties-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowWelcome(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 max-w-2xl w-full border border-cyan-500/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-2">Welcome to Enterprise Bounties</h2>
                <p className="text-gray-400">Crowdsource intelligence from thousands of digital analysts</p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Lightning Fast Results</h3>
                    <p className="text-sm text-gray-400">Get insights in as little as 5 minutes with our urgency tiers</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Targeted Intelligence</h3>
                    <p className="text-sm text-gray-400">Reach specific demographics, platforms, and expertise areas</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Real-Time Analytics</h3>
                    <p className="text-sm text-gray-400">Monitor submissions and export data instantly</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowWelcome(false);
                  setShowCreator(true);
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-cyan-400 hover:to-blue-500 transition-colors"
              >
                Create Your First Bounty
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/enterprise/live')}
                className="p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-colors"
                title="Back to Livestream"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Bounty Intelligence System
                </h1>
                <p className="text-gray-400">
                  Get 50 perspectives for the price of a coffee run
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowExamples(true)}
                className="p-3 bg-purple-800/50 hover:bg-purple-700/50 rounded-xl transition-colors"
                title="View Examples"
              >
                <Lightbulb className="w-5 h-5" />
              </button>
              <button
                onClick={exportData}
                className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-colors"
                title="Export Data"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowCreator(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all transform hover:scale-105"
              >
                <Plus size={20} />
                Create Bounty
              </button>
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Active Bounties */}
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50"
            >
              <div className="flex items-center justify-between mb-3">
                <Target className="text-cyan-400" size={24} />
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  12%
                </span>
              </div>
              <div className="text-3xl font-bold mb-1">{stats?.active_bounties || 0}</div>
              <div className="text-sm text-gray-400">Active Bounties</div>
            </motion.div>

            {/* Total Submissions */}
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50"
            >
              <div className="flex items-center justify-between mb-3">
                <Activity className="text-green-400" size={24} />
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  28%
                </span>
              </div>
              <div className="text-3xl font-bold mb-1">{stats?.total_submissions || 0}</div>
              <div className="text-sm text-gray-400">Submissions</div>
            </motion.div>

            {/* Total Invested */}
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50"
            >
              <div className="flex items-center justify-between mb-3">
                <DollarSign className="text-yellow-400" size={24} />
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Minus className="w-3 h-3" />
                  0%
                </span>
              </div>
              <div className="text-3xl font-bold mb-1">${stats?.total_spent.toFixed(0) || 0}</div>
              <div className="text-sm text-gray-400">Invested</div>
            </motion.div>

            {/* Average Time */}
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50"
            >
              <div className="flex items-center justify-between mb-3">
                <Clock className="text-blue-400" size={24} />
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3" />
                  5%
                </span>
              </div>
              <div className="text-3xl font-bold mb-1">{stats?.avg_completion_time || 0}m</div>
              <div className="text-sm text-gray-400">Avg. Time</div>
            </motion.div>

            {/* Success Rate */}
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50"
            >
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="text-purple-400" size={24} />
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  3%
                </span>
              </div>
              <div className="text-3xl font-bold mb-1">{stats?.success_rate.toFixed(0) || 0}%</div>
              <div className="text-sm text-gray-400">Success Rate</div>
            </motion.div>
          </div>
        </div>

        {/* Quick Actions & Live Feed */}
        <div className="max-w-7xl mx-auto mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowCreator(true)}
                  className="w-full p-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-left transition-colors flex items-center justify-between group"
                >
                  <span className="text-cyan-400">Create New Bounty</span>
                  <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => setFilter('active')}
                  className="w-full p-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-xl text-left transition-colors flex items-center justify-between group"
                >
                  <span className="text-green-400">View Active Bounties</span>
                  <ChevronRight className="w-4 h-4 text-green-400 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={exportData}
                  className="w-full p-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-left transition-colors flex items-center justify-between group"
                >
                  <span className="text-purple-400">Export Analytics</span>
                  <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Trending Categories */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                Trending Categories
              </h3>
              <div className="space-y-3">
                {stats?.trending_insights.map((insight, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{insight.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{insight.count}</span>
                      {insight.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-green-400" />}
                      {insight.trend === 'down' && <ArrowDownRight className="w-4 h-4 text-red-400" />}
                      {insight.trend === 'stable' && <Minus className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="text-cyan-400" />
                  Live Activity Stream
                </h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-sm text-gray-400">Real-time</span>
                </div>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {bounties.slice(0, 5).flatMap(bounty => 
                  (bounty.submissions || []).slice(0, 2).map((submission, idx) => (
                    <motion.div
                      key={`${bounty.id}-${idx}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center justify-between p-3 bg-gray-800/30 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                          <Activity className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">New submission for "{bounty.title}"</p>
                          <p className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <span className="text-green-400 font-semibold">+${bounty.price_per_spot}</span>
                    </motion.div>
                  ))
                )}
                {(!bounties || bounties.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
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
                className={`px-6 py-2 rounded-xl capitalize font-medium transition-all ${
                  filter === status
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                {status}
                <span className="ml-2 text-xs opacity-70">
                  ({status === 'all' ? bounties.length : 
                    status === 'active' ? bounties.filter(b => b.status === 'active').length :
                    bounties.filter(b => b.status === 'completed').length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Bounties Grid */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredBounties.map((bounty, index) => {
                const urgencyStyle = getUrgencyStyle(bounty.urgency_level);
                const completionPercentage = (bounty.filled_spots / bounty.total_spots) * 100;
                
                return (
                  <motion.div
                    key={bounty.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                    className={`bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border ${urgencyStyle.borderColor} hover:border-cyan-500/50 cursor-pointer transition-all`}
                    onClick={() => setSelectedBounty(bounty.id)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${urgencyStyle.color}`}>
                          {urgencyStyle.icon}
                        </div>
                        <div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(bounty.status)}`}>
                            {bounty.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {bounty.status === 'active' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBountyStatus(bounty.id, bounty.status);
                            }}
                            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        {bounty.status === 'paused' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBountyStatus(bounty.id, bounty.status);
                            }}
                            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBounty(bounty.id);
                          }}
                          className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-lg font-semibold mb-2 line-clamp-1">{bounty.title}</h3>
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{bounty.description}</p>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Progress</span>
                        <span className="font-medium">
                          {bounty.filled_spots}/{bounty.total_spots} spots
                        </span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${completionPercentage}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                        />
                      </div>
                      <div className="mt-1 text-xs text-gray-500 text-right">
                        {completionPercentage.toFixed(0)}% complete
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Rate</p>
                        <p className="text-xl font-bold text-green-400">
                          ${bounty.price_per_spot.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Total Value</p>
                        <p className="text-xl font-bold">
                          ${(bounty.total_spots * bounty.price_per_spot).toFixed(0)}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    {bounty.status === 'active' && new Date(bounty.expires_at) > new Date() && (
                      <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 rounded-lg p-2">
                        <AlertCircle size={14} />
                        Expires {formatDistanceToNow(new Date(bounty.expires_at), { addSuffix: true })}
                      </div>
                    )}
                    {bounty.status === 'completed' && (
                      <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/10 rounded-lg p-2">
                        <CheckCircle size={14} />
                        Completed successfully
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {filteredBounties.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Target className="w-12 h-12 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No bounties found</h3>
              <p className="text-gray-400 mb-6">
                {filter === 'active' ? 'No active bounties at the moment' :
                 filter === 'completed' ? 'No completed bounties yet' :
                 'Get started by creating your first bounty'}
              </p>
              <button
                onClick={() => setShowCreator(true)}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all transform hover:scale-105"
              >
                Create Your First Bounty
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreator && (
          <BountyCreator
            onClose={() => setShowCreator(false)}
            onSuccess={() => {
              fetchDashboardData();
              setShowCreator(false);
            }}
          />
        )}

        {selectedBounty && (
          <BountyMonitor
            bountyId={selectedBounty}
            onClose={() => setSelectedBounty(null)}
          />
        )}

        {/* Examples Modal */}
        {showExamples && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowExamples(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 max-w-5xl w-full border border-cyan-500/20 my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold">Killer Use Cases That Pay For Themselves</h2>
                <button
                  onClick={() => setShowExamples(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Don't Work at Anduril Example */}
              <div className="mb-8 p-6 bg-gradient-to-br from-red-900/20 to-gray-900/50 rounded-xl border border-red-500/20">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-red-500/20 rounded-xl">
                    <Shield className="w-8 h-8 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">"Don't Work at Anduril" Campaign</h3>
                    <p className="text-gray-400 mb-4">Track viral anti-recruitment campaign across demographics</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <h4 className="font-semibold text-red-400 mb-2">Traditional Social Listening</h4>
                        <ul className="text-sm text-gray-400 space-y-1">
                          <li>• 50,000 mentions</li>
                          <li>• 73% negative sentiment</li>
                          <li>• Top hashtag: #NoWarProfits</li>
                          <li>• Volume spike: Tuesday 2pm</li>
                        </ul>
                        <p className="text-xs text-gray-500 mt-2 italic">So what? What do you DO with this?</p>
                      </div>
                      
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <h4 className="font-semibold text-green-400 mb-2">WaveSight Bounty (50 Spotters)</h4>
                        <ul className="text-sm text-gray-300 space-y-1">
                          <li>• <span className="text-cyan-400">Gen Z Engineers:</span> "Won't interview"</li>
                          <li>• <span className="text-cyan-400">Senior Devs:</span> "Kids are naive"</li>
                          <li>• <span className="text-cyan-400">Veterans:</span> "Offended by this"</li>
                          <li>• <span className="text-cyan-400">Women in Tech:</span> "Using for ethics debate"</li>
                        </ul>
                        <p className="text-xs text-green-400 mt-2 font-semibold">Actionable: Focus Texas recruiting, skip Berkeley</p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-900/30 to-transparent rounded-lg p-4">
                      <p className="text-sm font-semibold text-green-400 mb-2">REAL SUBMISSION EXAMPLE:</p>
                      <div className="bg-black/30 rounded p-3 text-sm">
                        <p className="text-gray-300 mb-2">"My tech friend group is split 50/50. Half think it's virtue signaling from people who'd never get hired anyway. Half genuinely won't interview there. <span className="text-yellow-400 font-semibold">The $400K salary is making people privately reconsider though.</span>"</p>
                        <p className="text-xs text-gray-500 mt-2">- Software Engineer, 28, Austin</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                      <div>
                        <p className="text-2xl font-bold text-green-400">$150</p>
                        <p className="text-xs text-gray-400">Bounty Cost</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-400">$2M</p>
                        <p className="text-xs text-gray-400">Saved in mistargeted recruiting</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tesla Cybertruck Example */}
              <div className="mb-8 p-6 bg-gradient-to-br from-blue-900/20 to-gray-900/50 rounded-xl border border-blue-500/20">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <Building2 className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">Tesla Cybertruck Reception</h3>
                    <p className="text-gray-400 mb-4">Understand real buyer sentiment by demographics</p>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <h5 className="text-sm font-semibold text-cyan-400 mb-1">Texas Contractors</h5>
                        <p className="text-xs text-gray-300">"Every contractor wants one"</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <h5 className="text-sm font-semibold text-pink-400 mb-1">California Tech</h5>
                        <p className="text-xs text-gray-300">"Embarrassing to drive"</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <h5 className="text-sm font-semibold text-yellow-400 mb-1">Young Men 18-25</h5>
                        <p className="text-xs text-gray-300">"Coolest thing ever made"</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                      <p className="text-sm text-gray-400">Cost: <span className="text-green-400 font-bold">$200</span></p>
                      <p className="text-sm text-gray-400">Value: <span className="text-cyan-400 font-bold">$50K focus group</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ozempic Backlash Example */}
              <div className="mb-8 p-6 bg-gradient-to-br from-purple-900/20 to-gray-900/50 rounded-xl border border-purple-500/20">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-purple-500/20 rounded-xl">
                    <TrendingDown className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">"Is Ozempic Backlash Real?"</h3>
                    <p className="text-gray-400 mb-4">Crisis intelligence from healthcare professionals & patients</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-cyan-400 font-semibold text-sm w-24">Nurses:</span>
                        <span className="text-gray-300 text-sm flex-1">"Seeing serious GI side effects in ER"</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-pink-400 font-semibold text-sm w-24">Influencers:</span>
                        <span className="text-gray-300 text-sm flex-1">"Quietly pivoting away from promoting"</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-yellow-400 font-semibold text-sm w-24">Mom Groups:</span>
                        <span className="text-gray-300 text-sm flex-1">"Facebook groups going crazy with horror stories"</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-green-400 font-semibold text-sm w-24">Doctors:</span>
                        <span className="text-gray-300 text-sm flex-1">"Media overblowing, but prescribing more carefully"</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                      <p className="text-sm text-gray-400">2-hour turnaround</p>
                      <p className="text-sm text-gray-400">Replaces <span className="line-through">$500K McKinsey study</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Value Props */}
              <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Why This Changes Everything</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-cyan-400 mb-2">Each Perspective Is True In Their World</h4>
                    <p className="text-sm text-gray-400">50 spotters see 50 different realities. Emma_GenZ sees "everyone hates it" while Marcus_Dad sees "never heard of it" - both are right.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-400 mb-2">Intelligence Mosaic vs Data Points</h4>
                    <p className="text-sm text-gray-400">Traditional: "73% negative." WaveSight: "Engineers split 50/50, but money talks. Texas loves it, California hates it."</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-6">
                <button
                  onClick={() => {
                    setShowExamples(false);
                    setShowCreator(true);
                  }}
                  className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all transform hover:scale-105"
                >
                  Create Your First Intelligence Bounty
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}