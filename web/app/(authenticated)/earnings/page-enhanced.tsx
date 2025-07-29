'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';
import { EARNINGS } from '@/lib/constants';
import CashOutModal from '@/components/CashOutModal';
import PaymentHistory from '@/components/PaymentHistory';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign as DollarSignIcon, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Timer,
  Trophy,
  Eye,
  ThumbsUp,
  Zap,
  Wallet,
  History as HistoryIcon,
  ArrowUpRight,
  Receipt
} from 'lucide-react';

interface EarningsData {
  earnings_pending: number;
  earnings_approved: number;
  earnings_paid: number;
  total_submissions: number;
  verified_submissions: number;
}

interface EarningTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string;
  status: string;
  created_at: string;
  trend_id?: string;
  validation_id?: string;
}

export default function Earnings() {
  const { user } = useAuth();
  const [earningsData, setEarningsData] = useState<EarningsData>({
    earnings_pending: 0,
    earnings_approved: 0,
    earnings_paid: 0,
    total_submissions: 0,
    verified_submissions: 0
  });
  const [transactions, setTransactions] = useState<EarningTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'payments'>('overview');

  useEffect(() => {
    if (user) {
      fetchEarningsData();
    }
  }, [user]);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Fetch user profile with earnings data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileError) throw profileError;

      // Fetch earnings ledger
      const { data: earningsLedger, error: earningsError } = await supabase
        .from('earnings_ledger')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (earningsError) throw earningsError;

      // Calculate totals
      const pending = earningsLedger?.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0) || 0;
      const approved = earningsLedger?.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0) || 0;
      const paid = profile?.total_cashed_out || 0;

      // Get pending cashouts
      const { data: pendingCashouts } = await supabase
        .from('cashout_requests')
        .select('amount')
        .eq('user_id', currentUser.id)
        .in('status', ['pending', 'processing']);

      const pendingCashoutTotal = pendingCashouts?.reduce((sum, c) => sum + c.amount, 0) || 0;
      const available = approved - paid - pendingCashoutTotal;

      setEarningsData({
        earnings_pending: pending,
        earnings_approved: approved,
        earnings_paid: paid,
        total_submissions: profile?.trends_spotted || 0,
        verified_submissions: earningsLedger?.filter(e => e.type === 'trend_submission' && e.status === 'approved').length || 0
      });

      setTransactions(earningsLedger || []);
      setTotalAvailable(available);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'trend_submission':
        return <TrendingUp className="w-4 h-4" />;
      case 'validation':
        return <ThumbsUp className="w-4 h-4" />;
      case 'bonus':
        return <Trophy className="w-4 h-4" />;
      default:
        return <DollarSignIcon className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Timer className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-500';
      case 'pending':
        return 'text-yellow-500';
      case 'rejected':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'pending':
        return 'Pending Verification';
      case 'rejected':
        return 'Not Verified';
      default:
        return status;
    }
  };

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'trend_submission':
        return 'Trend Submission';
      case 'validation':
        return 'Verification Vote';
      case 'bonus':
        return 'Bonus Reward';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Earnings Dashboard</h1>
          <p className="text-gray-400">Track your earnings and manage payouts</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-800/50 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Overview
            </div>
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'transactions'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Transactions
            </div>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'payments'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <HistoryIcon className="w-4 h-4" />
              Payment History
            </div>
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-green-600/20 to-green-700/20 rounded-2xl p-6 border border-green-600/30"
                >
                  <div className="flex items-center justify-between mb-4">
                    <DollarSignIcon className="w-8 h-8 text-green-400" />
                    <ArrowUpRight className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-gray-400 text-sm mb-1">Available to Cash Out</h3>
                  <p className="text-3xl font-bold text-white">{formatCurrency(totalAvailable)}</p>
                  <button
                    onClick={() => setShowCashOutModal(true)}
                    disabled={totalAvailable < EARNINGS.MINIMUM_CASHOUT}
                    className="mt-4 w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors font-medium"
                  >
                    Cash Out
                  </button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 rounded-2xl p-6 border border-blue-600/30"
                >
                  <div className="flex items-center justify-between mb-4">
                    <CheckCircle className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-gray-400 text-sm mb-1">Total Approved</h3>
                  <p className="text-3xl font-bold text-white">{formatCurrency(earningsData.earnings_approved)}</p>
                  <p className="text-sm text-gray-400 mt-2">{earningsData.verified_submissions} verified trends</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 rounded-2xl p-6 border border-yellow-600/30"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Clock className="w-8 h-8 text-yellow-400" />
                  </div>
                  <h3 className="text-gray-400 text-sm mb-1">Pending Verification</h3>
                  <p className="text-3xl font-bold text-white">{formatCurrency(earningsData.earnings_pending)}</p>
                  <p className="text-sm text-gray-400 mt-2">Awaiting votes</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 rounded-2xl p-6 border border-purple-600/30"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Trophy className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-gray-400 text-sm mb-1">Total Cashed Out</h3>
                  <p className="text-3xl font-bold text-white">{formatCurrency(earningsData.earnings_paid)}</p>
                  <p className="text-sm text-gray-400 mt-2">Lifetime earnings</p>
                </motion.div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">How Earnings Work</h3>
                    <ul className="space-y-2 text-gray-300 text-sm">
                      <li>• Submit a trend to earn {formatCurrency(EARNINGS.SUBMISSION_REWARD)} (pending verification)</li>
                      <li>• When {EARNINGS.MIN_VOTES_REQUIRED}+ people vote and majority verify your trend, earnings become approved</li>
                      <li>• Participate in verifications to earn {formatCurrency(EARNINGS.VERIFICATION_REWARD)} per vote</li>
                      <li>• Cash out when you reach {formatCurrency(EARNINGS.MINIMUM_CASHOUT)} in approved earnings</li>
                      <li>• Tie votes go in favor of the trend submitter</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'transactions' && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-6">Recent Transactions</h2>
                
                <div className="space-y-4">
                  {transactions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No earnings yet. Start submitting trends!</p>
                    </div>
                  ) : (
                    transactions.map((transaction, index) => (
                      <motion.div
                        key={transaction.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between py-4 border-b border-gray-700 last:border-0"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gray-800 rounded-xl">
                            {getTypeIcon(transaction.type)}
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {formatTransactionType(transaction.type)}
                            </div>
                            <div className="text-sm text-gray-400">
                              {format(new Date(transaction.created_at), 'MMM dd, yyyy h:mm a')}
                            </div>
                            {transaction.description && (
                              <div className="text-sm text-gray-500 mt-1">
                                {transaction.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">
                            +{formatCurrency(transaction.amount)}
                          </div>
                          <div className={`text-sm flex items-center gap-1 justify-end ${getStatusColor(transaction.status)}`}>
                            {getStatusIcon(transaction.status)}
                            {getStatusText(transaction.status)}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'payments' && (
            <motion.div
              key="payments"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <PaymentHistory />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cash Out Modal */}
      <AnimatePresence>
        {showCashOutModal && (
          <CashOutModal
            isOpen={showCashOutModal}
            onClose={() => setShowCashOutModal(false)}
            availableBalance={totalAvailable}
            onSuccess={() => {
              setShowCashOutModal(false);
              fetchEarningsData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}