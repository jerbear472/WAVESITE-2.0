'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { 
  DollarSign as DollarSignIcon,
  Clock as ClockIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  AlertCircle as AlertCircleIcon,
  Download as DownloadIcon,
  RefreshCw as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Wallet as WalletIcon
} from 'lucide-react';

interface CashoutRequest {
  id: string;
  amount: number;
  venmo_username: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  processed_at?: string;
  transaction_id?: string;
  failure_reason?: string;
  notes?: string;
}

interface PaymentSummary {
  total_earnings: number;
  total_cashed_out: number;
  pending_cashout: number;
  available_balance: number;
}

export default function PaymentHistory() {
  const [requests, setRequests] = useState<CashoutRequest[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch cashout requests
      const { data: cashoutData, error: cashoutError } = await supabase
        .from('cashout_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (cashoutError) throw cashoutError;

      // Fetch payment summary
      const { data: summaryData, error: summaryError } = await supabase
        .from('user_payment_summary')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (summaryError && summaryError.code !== 'PGRST116') throw summaryError;

      setRequests(cashoutData || []);
      setSummary(summaryData || {
        total_earnings: 0,
        total_cashed_out: 0,
        pending_cashout: 0,
        available_balance: 0
      });
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <RefreshIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'failed':
      case 'cancelled':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'processing':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Amount', 'Status', 'Payment Method', 'Transaction ID'];
    const rows = requests.map(r => [
      format(new Date(r.created_at), 'yyyy-MM-dd'),
      r.amount.toFixed(2),
      r.status,
      r.venmo_username,
      r.transaction_id || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshIcon className="w-6 h-6 text-wave-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-wave-600/20 to-wave-700/20 rounded-xl p-6 border border-wave-600/30"
          >
            <div className="flex items-center justify-between mb-2">
              <TrendingUpIcon className="w-5 h-5 text-wave-400" />
              <span className="text-xs text-wave-500">Total Earned</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(summary.total_earnings)}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-green-600/20 to-green-700/20 rounded-xl p-6 border border-green-600/30"
          >
            <div className="flex items-center justify-between mb-2">
              <CheckCircleIcon className="w-5 h-5 text-green-400" />
              <span className="text-xs text-green-500">Cashed Out</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(summary.total_cashed_out)}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 rounded-xl p-6 border border-yellow-600/30"
          >
            <div className="flex items-center justify-between mb-2">
              <ClockIcon className="w-5 h-5 text-yellow-400" />
              <span className="text-xs text-yellow-500">Pending</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(summary.pending_cashout)}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 rounded-xl p-6 border border-blue-600/30"
          >
            <div className="flex items-center justify-between mb-2">
              <WalletIcon className="w-5 h-5 text-blue-400" />
              <span className="text-xs text-blue-500">Available</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(summary.available_balance)}</p>
          </motion.div>
        </div>
      )}

      {/* History Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Payment History</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            disabled={requests.length === 0}
            className="px-3 py-1.5 rounded-lg bg-wave-600/20 hover:bg-wave-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            <DownloadIcon className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => fetchPaymentData(true)}
            disabled={refreshing}
            className="p-1.5 rounded-lg hover:bg-wave-800/50 transition-all"
          >
            <RefreshIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Payment History */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {requests.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-wave-500"
            >
              <DollarSignIcon className="w-12 h-12 mx-auto mb-3 text-wave-600" />
              <p>No payment history yet</p>
            </motion.div>
          ) : (
            requests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-wave-800/30 rounded-xl p-4 border border-wave-700/30"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(request.status)}
                      <span className="text-lg font-semibold text-white">
                        {formatCurrency(request.amount)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="text-sm text-wave-400 space-y-1">
                      <p>Requested: {format(new Date(request.created_at), 'MMM dd, yyyy h:mm a')}</p>
                      {request.processed_at && (
                        <p>Processed: {format(new Date(request.processed_at), 'MMM dd, yyyy h:mm a')}</p>
                      )}
                      <p>Payment Method: Venmo ({request.venmo_username})</p>
                      {request.transaction_id && (
                        <p>Transaction ID: {request.transaction_id}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {request.failure_reason && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircleIcon className="w-4 h-4 text-red-400 mt-0.5" />
                      <p className="text-sm text-red-300">{request.failure_reason}</p>
                    </div>
                  </div>
                )}
                
                {request.notes && (
                  <div className="mt-3 p-3 bg-wave-700/30 rounded-lg">
                    <p className="text-sm text-wave-300">{request.notes}</p>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}