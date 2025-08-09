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
  ThumbsDown,
  Wallet,
  ArrowUpRight
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
  amount: number;
  status: 'pending' | 'awaiting_verification' | 'approved' | 'rejected' | 'paid';
  earning_type: string;
  created_at: string;
  approved_at?: string;
  notes?: string;
  trend?: {
    id: string;
    description: string;
    category: string;
  };
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
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'paid'>('all');

  useEffect(() => {
    if (user) {
      fetchEarningsData();
    }
  }, [user]);

  const fetchEarningsData = async () => {
    try {
      // Fetch user profile with earnings data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('earnings_pending, earnings_approved, earnings_paid, total_submissions, verified_submissions')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;
      
      setEarningsData(profile);

      // Fetch ALL earnings transactions including pending and awaiting_verification
      const { data: transactionsData, error: transError } = await supabase
        .from('earnings_ledger')
        .select(`
          *,
          trend:trend_submissions(
            id,
            description,
            category
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (transError) throw transError;
      
      // Map transaction types properly
      const mappedTransactions = (transactionsData || []).map(t => ({
        ...t,
        earning_type: t.type === 'submission' ? 'submission' : t.type === 'validation' ? 'validation' : t.type
      }));
      
      setTransactions(mappedTransactions);

    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalAvailable = earningsData.earnings_approved;
  const totalPending = earningsData.earnings_pending || 0;
  const totalEarnings = totalPending + earningsData.earnings_approved + earningsData.earnings_paid;
  const verificationRate = earningsData.total_submissions > 0 
    ? (earningsData.verified_submissions / earningsData.total_submissions * 100).toFixed(1)
    : '0';

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'pending') return t.status === 'pending' || t.status === 'awaiting_verification';
    return t.status === filter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Timer className="w-4 h-4 text-yellow-500" />;
      case 'awaiting_verification':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <ThumbsDown className="w-4 h-4 text-red-500" />;
      case 'paid':
        return <Wallet className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Processing';
      case 'awaiting_verification':
        return 'Awaiting Verification';
      case 'approved':
        return 'Verified';
      case 'rejected':
        return 'Not Verified';
      case 'paid':
        return 'Paid Out';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Your Earnings
          </h1>
          <p className="text-gray-400">
            Track your earnings from trend spotting and validations
          </p>
        </div>

        {/* Earnings Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Available for Cash Out */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white"
          >
            <div className="flex items-center justify-between mb-4">
              <Wallet className="w-8 h-8 opacity-80" />
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {formatCurrency(totalAvailable)}
            </div>
            <div className="text-green-100 text-sm">Available to Cash Out</div>
            <button
              onClick={() => setShowCashOutModal(true)}
              disabled={totalAvailable < EARNINGS.MINIMUM_CASHOUT}
              className="mt-4 w-full bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed rounded-lg py-2 text-sm font-medium transition-colors"
            >
              {totalAvailable >= EARNINGS.MINIMUM_CASHOUT ? 'Cash Out' : `Need ${formatCurrency(EARNINGS.MINIMUM_CASHOUT - totalAvailable)} more`}
            </button>
          </motion.div>

          {/* Pending Earnings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Timer className="w-8 h-8 text-yellow-500" />
              <div className="text-xs text-gray-500">Pending</div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatCurrency(totalPending)}
            </div>
            <div className="text-gray-400 text-sm">Pending Verification</div>
            <div className="mt-4 text-xs text-gray-500">
              Includes submissions and validations
            </div>
          </motion.div>

          {/* Total Earned */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Trophy className="w-8 h-8 text-blue-500" />
              <div className="text-xs text-gray-500">All Time</div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatCurrency(totalEarnings)}
            </div>
            <div className="text-gray-400 text-sm">Total Earned</div>
            <div className="mt-4 text-xs text-gray-500">
              {earningsData.earnings_paid > 0 && `${formatCurrency(earningsData.earnings_paid)} paid out`}
            </div>
          </motion.div>

          {/* Verification Rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div className="text-xs text-gray-500">Success Rate</div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {verificationRate}%
            </div>
            <div className="text-gray-400 text-sm">Verification Rate</div>
            <div className="mt-4 text-xs text-gray-500">
              {earningsData.verified_submissions} of {earningsData.total_submissions} verified
            </div>
          </motion.div>
        </div>

        {/* Transaction History */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Transaction History</h2>
            <div className="flex gap-2">
              {(['all', 'pending', 'approved', 'paid'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No transactions found
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-gray-700 rounded-full">
                      {getStatusIcon(transaction.status)}
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        {transaction.earning_type === 'submission' ? 'Trend Submission' : 'Validation Reward'}
                      </div>
                      <div className="text-sm text-gray-400">
                        {transaction.trend?.description.substring(0, 50)}...
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      +{formatCurrency(transaction.amount)}
                    </div>
                    <div className="text-sm text-gray-400">
                      {getStatusText(transaction.status)}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-900/20 border border-blue-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">How Earnings Work</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Submit a trend to earn {formatCurrency(EARNINGS.SUBMISSION_REWARD)} (awaiting verification)</li>
                <li>• {EARNINGS.MIN_VOTES_REQUIRED} "verify" votes = trend approved, earnings become available</li>
                <li>• {EARNINGS.MIN_VOTES_REQUIRED} "reject" votes = trend rejected, no earnings</li>
                <li>• Participate in verifications to earn {formatCurrency(EARNINGS.VERIFICATION_REWARD)} per vote</li>
                <li>• You CAN vote on your own trends</li>
                <li>• Scroll sessions maintain streak multipliers (up to 3x earnings on trends)</li>
                <li>• Cash out when you reach {formatCurrency(EARNINGS.MINIMUM_CASHOUT)} in approved earnings</li>
              </ul>
            </div>
          </div>
        </div>
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