'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  DollarSign as DollarSignIcon,
  Clock as ClockIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  AlertCircle as AlertCircleIcon,
  Send as SendIcon,
  User as UserIcon,
  Hash as HashIcon,
  Calendar as CalendarIcon,
  CreditCard as CreditCardIcon,
  RefreshCw as RefreshIcon,
  Download as DownloadIcon,
  Filter as FilterIcon,
  Search as SearchIcon
} from 'lucide-react';

interface CashoutRequest {
  id: string;
  user_id: string;
  email: string;
  username: string;
  amount: number;
  venmo_username: string;
  status: string;
  created_at: string;
  processed_at?: string;
  notes?: string;
  user_available_balance: number;
  user_total_requests: number;
  user_total_requested: number;
}

interface ProcessModalProps {
  request: CashoutRequest;
  onClose: () => void;
  onSuccess: () => void;
}

function ProcessModal({ request, onClose, onSuccess }: ProcessModalProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<'completed' | 'failed'>('completed');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleProcess = async () => {
    if (!user) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('process_cashout_request', {
        p_request_id: request.id,
        p_admin_id: user.id,
        p_status: status,
        p_transaction_id: status === 'completed' ? transactionId : null,
        p_notes: notes || null,
        p_failure_reason: status === 'failed' ? failureReason : null
      });

      if (error) throw error;

      onSuccess();
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-2xl p-6 max-w-lg w-full border border-gray-800"
      >
        <h3 className="text-xl font-bold text-white mb-4">Process Payment</h3>
        
        <div className="space-y-4 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">User</span>
              <span className="text-white">{request.username} ({request.email})</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Amount</span>
              <span className="text-white font-bold">{formatCurrency(request.amount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Venmo</span>
              <span className="text-white">{request.venmo_username}</span>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'completed' | 'failed')}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            >
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {status === 'completed' && (
            <div>
              <label className="block text-gray-400 mb-2">Transaction ID</label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Venmo transaction ID"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
              />
            </div>
          )}

          {status === 'failed' && (
            <div>
              <label className="block text-gray-400 mb-2">Failure Reason</label>
              <input
                type="text"
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                placeholder="Why did the payment fail?"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-gray-400 mb-2">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleProcess}
            disabled={processing || (status === 'completed' && !transactionId) || (status === 'failed' && !failureReason)}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? (
              <RefreshIcon className="w-4 h-4 animate-spin" />
            ) : (
              <SendIcon className="w-4 h-4" />
            )}
            Process Payment
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminPayments() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<CashoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<CashoutRequest | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, is_admin')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.email !== 'jeremyuys@gmail.com' && !profile.is_admin)) {
      router.push('/');
      return;
    }

    fetchRequests();
  };

  const fetchRequests = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data, error } = await supabase
        .from('admin_cashout_queue')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesFilter = filter === 'all' || request.status === filter;
    const matchesSearch = searchTerm === '' || 
      request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.venmo_username.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const totalPending = requests.reduce((sum, r) => sum + r.amount, 0);

  const exportToCSV = () => {
    const headers = ['Date', 'User', 'Email', 'Amount', 'Venmo', 'Status'];
    const rows = filteredRequests.map(r => [
      format(new Date(r.created_at), 'yyyy-MM-dd'),
      r.username,
      r.email,
      r.amount.toFixed(2),
      r.venmo_username,
      r.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-queue-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 flex items-center justify-center">
        <RefreshIcon className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Payment Processing</h1>
          <p className="text-gray-400">Process user cashout requests</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 rounded-xl p-6 border border-yellow-600/30">
            <div className="flex items-center justify-between mb-2">
              <ClockIcon className="w-6 h-6 text-yellow-400" />
              <span className="text-xs text-yellow-500">Pending</span>
            </div>
            <p className="text-2xl font-bold text-white">{requests.filter(r => r.status === 'pending').length}</p>
            <p className="text-sm text-gray-400 mt-1">Requests waiting</p>
          </div>

          <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 rounded-xl p-6 border border-blue-600/30">
            <div className="flex items-center justify-between mb-2">
              <DollarSignIcon className="w-6 h-6 text-blue-400" />
              <span className="text-xs text-blue-500">Total</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalPending)}</p>
            <p className="text-sm text-gray-400 mt-1">To be processed</p>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 rounded-xl p-6 border border-green-600/30">
            <div className="flex items-center justify-between mb-2">
              <UserIcon className="w-6 h-6 text-green-400" />
              <span className="text-xs text-green-500">Users</span>
            </div>
            <p className="text-2xl font-bold text-white">{new Set(requests.map(r => r.user_id)).size}</p>
            <p className="text-sm text-gray-400 mt-1">Unique users</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by email, username, or Venmo..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
            </select>

            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" />
              Export
            </button>

            <button
              onClick={() => fetchRequests(true)}
              disabled={refreshing}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <RefreshIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-gray-800/30 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-4 text-gray-400 font-medium">User</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Amount</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Payment Method</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Requested</th>
                  <th className="text-left p-4 text-gray-400 font-medium">User Balance</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500">
                      No pending payment requests
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr key={request.id} className="border-b border-gray-700/50 hover:bg-gray-800/50">
                      <td className="p-4">
                        <div>
                          <p className="text-white font-medium">{request.username}</p>
                          <p className="text-sm text-gray-400">{request.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-white font-bold">{formatCurrency(request.amount)}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-white">Venmo</p>
                        <p className="text-sm text-gray-400">{request.venmo_username}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-white">{format(new Date(request.created_at), 'MMM dd')}</p>
                        <p className="text-sm text-gray-400">{format(new Date(request.created_at), 'h:mm a')}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-white">{formatCurrency(request.user_available_balance)}</p>
                        <p className="text-sm text-gray-400">{request.user_total_requests} total requests</p>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all text-sm"
                        >
                          Process
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-6 bg-red-900/20 border border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-300">
              <p className="font-medium mb-1">Important:</p>
              <ul className="list-disc list-inside space-y-1 text-red-400">
                <li>Always verify the user&apos;s available balance before processing</li>
                <li>Send payments through Venmo before marking as completed</li>
                <li>Include the transaction ID for record keeping</li>
                <li>Contact users if their Venmo username is invalid</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Process Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <ProcessModal
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onSuccess={() => {
              setSelectedRequest(null);
              fetchRequests();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}