'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Wallet,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';
import { 
  SUSTAINABLE_EARNINGS,
  formatCurrency as formatEarnings,
  calculateValidationEarnings
} from '@/lib/SUSTAINABLE_EARNINGS';

type SpotterTier = 'learning' | 'verified' | 'elite' | 'master' | 'restricted';

interface Session {
  id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  trends_logged: number;
  base_earnings: number;
  bonus_earnings: number;
  total_earnings: number;
}

interface DailyEarnings {
  date: string;
  earnings: number;
}

export const EarningsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('week');
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [dailyData, setDailyData] = useState<DailyEarnings[]>([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    avgPerSession: 0,
    trendsVerified: 0,
    totalBonus: 0
  });
  const [loading, setLoading] = useState(true);
  
  // Cashout states
  const [showCashoutModal, setShowCashoutModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'venmo' | 'paypal' | null>(null);
  const [venmoUsername, setVenmoUsername] = useState('@username');
  const [paypalEmail, setPaypalEmail] = useState('email@example.com');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);

  // Fetch earnings data
  const fetchEarningsData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get date range
      const now = new Date();
      let startDate = new Date();
      
      if (timeframe === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (timeframe === 'month') {
        startDate.setDate(now.getDate() - 30);
      } else {
        startDate = new Date('2024-01-01'); // All time
      }

      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('scroll_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch verifications count
      const { count: verificationsCount, error: verError } = await supabase
        .from('trend_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('verifier_id', user.id)
        .gte('verified_at', startDate.toISOString());

      if (verError) throw verError;

      // Fetch pending trend submissions (for pending earnings)
      const { data: pendingTrends, error: pendingError } = await supabase
        .from('trend_submissions')
        .select('base_amount, status')
        .eq('spotter_id', user.id)
        .in('status', ['submitted', 'validating'])
        .gte('created_at', startDate.toISOString());

      if (pendingError) console.error('Error fetching pending trends:', pendingError);

      // Fetch approved trend submissions (for available earnings)
      const { data: approvedTrends, error: approvedError } = await supabase
        .from('trend_submissions')
        .select('base_amount, status')
        .eq('spotter_id', user.id)
        .in('status', ['approved', 'viral'])
        .gte('created_at', startDate.toISOString());

      if (approvedError) console.error('Error fetching approved trends:', approvedError);

      // Process data
      const sessions = sessionsData || [];
      setSessions(sessions);

      // Calculate pending earnings (from submitted/validating trends)
      const pendingEarnings = (pendingTrends || []).reduce((sum, trend) => {
        return sum + (trend.base_amount || 0.25); // Default 25 cents per submission
      }, 0);
      setPendingAmount(pendingEarnings);

      // Calculate available earnings (from approved trends)
      const approvedEarnings = (approvedTrends || []).reduce((sum, trend) => {
        return sum + (trend.base_amount || 1.00);
      }, 0);

      // Calculate total earnings
      const sessionEarnings = sessions.reduce((sum, s) => sum + s.total_earnings, 0);
      // Calculate verification earnings using SUSTAINABLE_EARNINGS
      const spotterTier = (user?.spotter_tier || 'learning') as SpotterTier;
      const verificationEarnings = calculateValidationEarnings(verificationsCount || 0, spotterTier);
      
      const totalAvailable = sessionEarnings + verificationEarnings + approvedEarnings;
      setAvailableBalance(totalAvailable);
      setTotalEarnings(totalAvailable + pendingEarnings);

      // Calculate stats
      const totalBonus = sessions.reduce((sum, s) => sum + s.bonus_earnings, 0);
      setStats({
        totalSessions: sessions.length,
        avgPerSession: sessions.length > 0 ? sessionEarnings / sessions.length : 0,
        trendsVerified: verificationsCount || 0,
        totalBonus
      });

      // Generate daily data for chart
      const dailyEarnings: Record<string, number> = {};
      const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90;
      
      // Initialize all days with 0
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyEarnings[dateStr] = 0;
      }

      // Add session earnings
      sessions.forEach(session => {
        const dateStr = session.started_at.split('T')[0];
        if (dailyEarnings[dateStr] !== undefined) {
          dailyEarnings[dateStr] += session.total_earnings;
        }
      });

      // Convert to array and sort
      const chartData = Object.entries(dailyEarnings)
        .map(([date, earnings]) => ({ date, earnings }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(item => ({
          ...item,
          displayDate: new Date(item.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })
        }));

      setDailyData(chartData);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, [user, timeframe]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wave-500 mx-auto mb-4" />
          <p className="text-wave-400">Loading earnings data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Earnings Dashboard</h2>
        <div className="flex gap-2">
          {(['week', 'month', 'all'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${timeframe === tf
                  ? 'bg-wave-600 text-white'
                  : 'bg-wave-800/50 text-wave-400 hover:bg-wave-700/50'
                }
              `}
            >
              {tf === 'week' ? 'Week' : tf === 'month' ? 'Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Total Earnings Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-wave-600/30 to-wave-700/20 backdrop-blur-xl rounded-2xl p-8 border border-wave-600/30"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="mb-6">
              <p className="text-wave-300 text-sm font-medium mb-2">Available Balance</p>
              <p className="text-5xl font-bold text-white mb-2">${availableBalance.toFixed(2)}</p>
              <div className="mt-4 pt-4 border-t border-wave-600/30">
                <p className="text-wave-400 text-sm mb-1">Pending</p>
                <p className="text-2xl font-semibold text-wave-200">${pendingAmount.toFixed(2)}</p>
              </div>
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg"
            >
              Cash Out
            </button>
          </div>
          <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center">
            <DollarSign className="w-10 h-10 text-green-400" />
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-wave-900/50 backdrop-blur-sm rounded-xl p-6 border border-wave-700/30"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-sm text-wave-400">Sessions</p>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalSessions}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-wave-900/50 backdrop-blur-sm rounded-xl p-6 border border-wave-700/30"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-sm text-wave-400">Avg/Session</p>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(stats.avgPerSession)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-wave-900/50 backdrop-blur-sm rounded-xl p-6 border border-wave-700/30"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-sm text-wave-400">Verified</p>
          </div>
          <p className="text-2xl font-bold text-white">{stats.trendsVerified}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-wave-900/50 backdrop-blur-sm rounded-xl p-6 border border-wave-700/30"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-sm text-wave-400">Bonuses</p>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalBonus)}</p>
        </motion.div>
      </div>

      {/* Earnings Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-wave-900/50 backdrop-blur-sm rounded-xl p-6 border border-wave-700/30"
      >
        <h3 className="text-lg font-semibold text-white mb-6">Earnings Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis 
                dataKey="displayDate" 
                stroke="#64748b"
                style={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="#64748b"
                style={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(value: number) => [formatCurrency(value), 'Earnings']}
              />
              <Line
                type="monotone"
                dataKey="earnings"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Recent Sessions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-wave-900/50 backdrop-blur-sm rounded-xl p-6 border border-wave-700/30"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Recent Sessions</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sessions.length === 0 ? (
            <p className="text-center text-wave-400 py-8">No sessions yet</p>
          ) : (
            sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 bg-wave-800/30 rounded-lg hover:bg-wave-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-wave-700/50 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-wave-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {formatDate(session.started_at)}
                    </p>
                    <p className="text-xs text-wave-500">
                      {formatDuration(session.duration_seconds)} • {session.trends_logged} trends
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">
                    {formatCurrency(session.total_earnings)}
                  </p>
                  {session.bonus_earnings > 0 && (
                    <p className="text-xs text-green-400">
                      +{formatCurrency(session.bonus_earnings)} bonus
                    </p>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
      
      {/* Payment Method Selection Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
            onClick={() => setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-wave-900 rounded-t-3xl md:rounded-3xl p-8 w-full md:max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Choose Payment Method</h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-wave-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <p className="text-wave-300 mb-6">Where should we send your money?</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setSelectedPaymentMethod('venmo');
                    setShowPaymentModal(false);
                    setShowConfirmModal(true);
                  }}
                  className="w-full bg-wave-800/50 hover:bg-wave-700/50 border border-wave-600/30 rounded-xl p-4 flex items-center gap-4 transition-all group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-white">Venmo</p>
                    <p className="text-sm text-wave-400">{venmoUsername}</p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-wave-500 group-hover:text-wave-300 transition-colors" />
                </button>
                
                <button
                  onClick={() => {
                    setSelectedPaymentMethod('paypal');
                    setShowPaymentModal(false);
                    setShowConfirmModal(true);
                  }}
                  className="w-full bg-wave-800/50 hover:bg-wave-700/50 border border-wave-600/30 rounded-xl p-4 flex items-center gap-4 transition-all group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-white">PayPal</p>
                    <p className="text-sm text-wave-400">{paypalEmail}</p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-wave-500 group-hover:text-wave-300 transition-colors" />
                </button>
              </div>
              
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full mt-6 py-3 text-wave-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirmModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-wave-900 rounded-3xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-yellow-400" />
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-white text-center mb-4">Confirm Cash Out</h3>
              
              <p className="text-wave-300 text-center mb-8">
                Send <span className="font-bold text-white">${availableBalance.toFixed(2)}</span> to{' '}
                <span className="font-bold text-white">
                  {selectedPaymentMethod === 'venmo' ? venmoUsername : paypalEmail}
                </span>?
              </p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setShowSuccessModal(true);
                  }}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 bg-wave-800/50 text-wave-300 py-3 rounded-xl font-semibold hover:bg-wave-700/50 transition-all border border-wave-600/30"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSuccessModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-wave-900 rounded-3xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.5 }}
                  className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center"
                >
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </motion.div>
              </div>
              
              <h3 className="text-2xl font-bold text-white text-center mb-4">Success!</h3>
              
              <p className="text-wave-200 text-center text-lg mb-2">
                You'll receive payment within 48 hours
              </p>
              
              <p className="text-wave-400 text-center text-sm mb-8">
                ${availableBalance.toFixed(2)} sent to {selectedPaymentMethod === 'venmo' ? venmoUsername : paypalEmail}
              </p>
              
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  // Reset balance after successful cashout
                  setTotalEarnings(pendingAmount);
                }}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};