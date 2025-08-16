'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
// formatCurrency now comes from SUSTAINABLE_EARNINGS
import { 
  SUSTAINABLE_EARNINGS,
  calculateTrendEarnings,
  calculateValidationEarnings,
  canCashOut,
  formatCurrency,
  calculateUserTier,
  getTierProgress
} from '@/lib/SUSTAINABLE_EARNINGS';
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
  status: 'pending' | 'awaiting_validation' | 'awaiting_verification' | 'approved' | 'rejected' | 'paid';
  earning_type: string;
  created_at: string;
  approved_at?: string;
  notes?: string;
  trend?: {
    id: string;
    description: string;
    category: string;
  };
  metadata?: {
    base_amount?: number;
    tier?: string;
    tier_multiplier?: number;
    session_position?: number;
    session_multiplier?: number;
    daily_streak?: number;
    daily_multiplier?: number;
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
  const [todaysEarnings, setTodaysEarnings] = useState(0);

  useEffect(() => {
    if (user) {
      fetchEarningsData();
    }
  }, [user, user?.pending_earnings, user?.total_earnings]);

  // Subscribe to real-time earnings updates
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('earnings-ledger-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'earnings_ledger',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Earnings ledger update received:', payload);
          // Refresh earnings data when ledger changes
          fetchEarningsData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const fetchEarningsData = async () => {
    try {
      console.log('Fetching earnings for user:', user?.id);
      
      // Fetch ALL earnings transactions - simplified query without join
      const { data: transactionsData, error: transError } = await supabase
        .from('earnings_ledger')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (transError) {
        console.error('Error fetching transactions:', transError);
        throw transError;
      }
      
      console.log('Fetched transactions:', transactionsData);
      
      // Map transaction types properly
      const mappedTransactions = (transactionsData || []).map(t => ({
        ...t,
        earning_type: t.type === 'trend_submission' ? 'submission' : 
                      t.type === 'validation' ? 'validation' : 
                      t.type
      }));
      
      setTransactions(mappedTransactions);
      
      // Calculate today's earnings using the fetched data
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEarnings = mappedTransactions
        .filter(t => {
          const transactionDate = new Date(t.created_at);
          return transactionDate >= today && (t.status === 'approved' || t.status === 'pending');
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      setTodaysEarnings(todayEarnings);
      
      // Calculate earnings from transactions directly for accuracy
      const pendingEarnings = mappedTransactions
        .filter(t => t.status === 'pending' || t.status === 'awaiting_validation')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const approvedEarnings = mappedTransactions
        .filter(t => t.status === 'approved')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const paidEarnings = mappedTransactions
        .filter(t => t.status === 'paid')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const totalSubmissions = mappedTransactions
        .filter(t => t.type === 'trend_submission')
        .length;
      
      const verifiedSubmissions = mappedTransactions
        .filter(t => t.type === 'trend_submission' && t.status === 'approved')
        .length;
      
      // Set earnings data calculated from ledger
      const calculatedData = {
        earnings_pending: pendingEarnings,
        earnings_approved: approvedEarnings,
        earnings_paid: paidEarnings,
        total_submissions: totalSubmissions,
        verified_submissions: verifiedSubmissions
      };
      
      console.log('Calculated earnings data:', {
        ...calculatedData,
        todaysEarnings,
        totalTransactions: mappedTransactions.length,
        pendingCount: mappedTransactions.filter(t => t.status === 'pending' || t.status === 'awaiting_validation').length,
        approvedCount: mappedTransactions.filter(t => t.status === 'approved').length,
        paidCount: mappedTransactions.filter(t => t.status === 'paid').length
      });
      
      setEarningsData(calculatedData);

    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalAvailable = earningsData.earnings_approved || 0;
  const totalPending = earningsData.earnings_pending || 0;
  
  // Earnings data is now calculated directly from transactions
  // So we can trust the totalPending value
  const displayPending = totalPending;
  
  const totalEarnings = displayPending + earningsData.earnings_approved + earningsData.earnings_paid;
  const verificationRate = earningsData.total_submissions > 0 
    ? (earningsData.verified_submissions / earningsData.total_submissions * 100).toFixed(1)
    : '0';
  
  // Calculate user tier
  const userTier = calculateUserTier({
    trends_submitted: earningsData.total_submissions,
    approval_rate: earningsData.total_submissions > 0 ? earningsData.verified_submissions / earningsData.total_submissions : 0,
    quality_score: 0.60 // Default, should come from profile
  });
  
  const tierInfo = SUSTAINABLE_EARNINGS.tiers[userTier as keyof typeof SUSTAINABLE_EARNINGS.tiers];

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'pending') return t.status === 'pending' || t.status === 'awaiting_validation';
    if (filter === 'approved') return t.status === 'approved';
    if (filter === 'paid') return t.status === 'paid';
    return false;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Timer className="w-4 h-4 text-yellow-500" />;
      case 'awaiting_validation':
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
      case 'awaiting_validation':
      case 'awaiting_verification':
        return 'Awaiting Validation';
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Today's Earnings - NEW */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 text-white"
          >
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 opacity-80" />
              <div className="text-xs bg-white/20 px-2 py-1 rounded">Today</div>
            </div>
            <div className="text-3xl font-bold mb-1">
              {formatCurrency(todaysEarnings)}
            </div>
            <div className="text-purple-100 text-sm">Today's Earnings</div>
            <div className="mt-4 text-xs text-purple-200">
              {transactions.filter(t => {
                const transactionDate = new Date(t.created_at);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return transactionDate >= today;
              }).length} transactions today
            </div>
          </motion.div>

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
              disabled={!canCashOut(totalAvailable)}
              className="mt-4 w-full bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed rounded-lg py-2 text-sm font-medium transition-colors"
            >
              {canCashOut(totalAvailable) ? 'Cash Out' : `Need ${formatCurrency(SUSTAINABLE_EARNINGS.payment.minCashout - totalAvailable)} more`}
            </button>
          </motion.div>

          {/* Pending Earnings - Enhanced */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 border border-yellow-700/50 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Timer className="w-8 h-8 text-yellow-500 animate-pulse" />
              <div className="text-xs text-yellow-400 bg-yellow-900/50 px-2 py-1 rounded">
                Awaiting Validation
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatCurrency(displayPending)}
            </div>
            <div className="text-yellow-300 text-sm font-medium">Pending Verification</div>
            <div className="mt-4">
              <div className="text-xs text-yellow-400 mb-2">
                {transactions.filter(t => t.status === 'pending' || t.status === 'awaiting_validation').length} pending transactions
              </div>
              {displayPending > 0 && (
                <div className="text-xs text-gray-400 bg-gray-800/50 rounded p-2">
                  💡 Earnings will be confirmed after community validation
                </div>
              )}
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
              <>
                {/* Summary for filtered view */}
                {filter !== 'all' && (
                  <div className="bg-gray-700/30 rounded-lg p-3 mb-4">
                    <div className="text-sm text-gray-400">
                      Showing {filteredTransactions.length} {filter} transaction{filteredTransactions.length !== 1 ? 's' : ''}
                      {filter === 'pending' && (
                        <span className="ml-2 text-yellow-500 font-semibold">
                          Total: {formatCurrency(filteredTransactions.reduce((sum, t) => sum + t.amount, 0))}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {filteredTransactions.map((transaction) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`rounded-lg p-4 flex items-center justify-between ${
                      transaction.status === 'pending' || transaction.status === 'awaiting_verification'
                        ? 'bg-yellow-900/20 border border-yellow-800/30'
                        : 'bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-gray-700 rounded-full">
                        {getStatusIcon(transaction.status)}
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {transaction.earning_type === 'submission' ? 'Trend Submission' : 
                           transaction.earning_type === 'validation' ? 'Validation Reward' :
                           transaction.earning_type === 'bonus' ? 'Bonus Reward' : 
                           transaction.type || 'Earning'}
                        </div>
                        {(transaction.description || transaction.trend?.description) && (
                          <div className="text-sm text-gray-400">
                            {(transaction.description || transaction.trend?.description || '').substring(0, 60)}
                            {(transaction.description || transaction.trend?.description || '').length > 60 ? '...' : ''}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                          <span>{format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}</span>
                          {transaction.trend_id && (
                            <>
                              <span>•</span>
                              <span className="text-blue-400">Trend #{transaction.trend_id.slice(0, 8)}</span>
                            </>
                          )}
                          {transaction.metadata?.category && (
                            <>
                              <span>•</span>
                              <span className="text-purple-400">{transaction.metadata.category}</span>
                            </>
                          )}
                        </div>
                        {(transaction.notes || transaction.description) && (
                          <div className="text-xs text-gray-400 mt-1 italic">
                            {transaction.notes || transaction.description}
                          </div>
                        )}
                        {/* Show multiplier breakdown for trend submissions */}
                        {transaction.earning_type === 'submission' && transaction.metadata && (
                          <div className="mt-2 p-2 bg-gray-800/50 rounded-lg">
                            <div className="text-xs space-y-1">
                              {/* Base amount */}
                              <div className="flex items-center justify-between text-gray-400">
                                <span>Base Amount:</span>
                                <span className="text-white font-medium">${transaction.metadata.base_amount || 0.25}</span>
                              </div>
                              
                              {/* Tier multiplier */}
                              {transaction.metadata.tier && (
                                <div className="flex items-center justify-between text-gray-400">
                                  <span>Tier ({transaction.metadata.tier}):</span>
                                  <span className="text-blue-400 font-medium">×{transaction.metadata.tier_multiplier || 1.0}</span>
                                </div>
                              )}
                              
                              {/* Session streak multiplier */}
                              {transaction.metadata.session_position && transaction.metadata.session_position > 1 && (
                                <div className="flex items-center justify-between text-gray-400">
                                  <span>Session Streak (#{transaction.metadata.session_position}):</span>
                                  <span className="text-yellow-400 font-medium">×{transaction.metadata.session_multiplier || 1.0}</span>
                                </div>
                              )}
                              
                              {/* Daily streak multiplier */}
                              {transaction.metadata.daily_streak && transaction.metadata.daily_streak > 0 && (
                                <div className="flex items-center justify-between text-gray-400">
                                  <span>Daily Streak ({transaction.metadata.daily_streak} days):</span>
                                  <span className="text-orange-400 font-medium">×{transaction.metadata.daily_multiplier || 1.0}</span>
                                </div>
                              )}
                              
                              {/* Total calculation */}
                              <div className="pt-1 mt-1 border-t border-gray-700">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-300 font-medium">Total Earnings:</span>
                                  <span className="text-green-400 font-bold">{formatCurrency(transaction.amount)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        transaction.status === 'rejected' ? 'text-red-400 line-through' : 'text-white'
                      }`}>
                        +{formatCurrency(transaction.amount)}
                      </div>
                      <div className="text-sm text-gray-400">
                        {getStatusText(transaction.status)}
                      </div>
                      {/* Show total multiplier for submissions */}
                      {transaction.earning_type === 'submission' && transaction.metadata && (
                        <div className="text-xs text-gray-500 mt-1">
                          {(() => {
                            const tierMult = transaction.metadata.tier_multiplier || 1.0;
                            const sessionMult = transaction.metadata.session_multiplier || 1.0;
                            const dailyMult = transaction.metadata.daily_multiplier || 1.0;
                            const totalMult = (tierMult * sessionMult * dailyMult).toFixed(1);
                            return totalMult !== '1.0' ? `${totalMult}x multiplier` : null;
                          })()}
                        </div>
                      )}
                      {transaction.approved_at && transaction.status === 'approved' && (
                        <div className="text-xs text-green-400 mt-1">
                          Verified {format(new Date(transaction.approved_at), 'MMM d')}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </>
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
                <li>• Submit a trend to earn {formatCurrency(SUSTAINABLE_EARNINGS.base.trendSubmission)} base (pending approval)</li>
                <li>• Build streaks: Session streak × Daily streak = Higher multipliers!</li>
                <li>• {SUSTAINABLE_EARNINGS.validation.votesToApprove} "verify" votes = trend approved, earn +{formatCurrency(SUSTAINABLE_EARNINGS.base.approvalBonus)} bonus</li>
                <li>• {SUSTAINABLE_EARNINGS.validation.votesToReject} "reject" votes = trend rejected, no earnings</li>
                <li>• Participate in verifications to earn {formatCurrency(SUSTAINABLE_EARNINGS.base.validationVote)} per vote</li>
                <li>• Your tier: <span className="font-semibold" style={{color: tierInfo.color}}>{tierInfo.emoji} {tierInfo.name}</span> ({tierInfo.multiplier}x multiplier, ${tierInfo.dailyCap}/day cap)</li>
                <li>• Cash out when you reach {formatCurrency(SUSTAINABLE_EARNINGS.payment.minCashout)} in approved earnings</li>
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