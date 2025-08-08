'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { 
  DollarSign as DollarSignIcon,
  Check as CheckIcon,
  X as XIcon,
  Clock as ClockIcon,
  User as UserIcon,
  Calendar as CalendarIcon,
  AlertCircle as AlertCircleIcon,
  RefreshCw as RefreshIcon,
  CreditCard as CreditCardIcon
} from 'lucide-react';

interface CashOutRequest {
  id: string;
  user_id: string;
  amount: number;
  venmo_username: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requested_at: string;
  processed_at?: string;
  transaction_id?: string;
  admin_notes?: string;
  user_email?: string;
  username?: string;
  current_balance?: number;
}

export default function AdminCashOutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [requests, setRequests] = useState<CashOutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAndFetchRequests();
  }, [user, filter]);

  const checkAdminAndFetchRequests = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      // Check if user is admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);
      await fetchRequests();
    } catch (error) {
      console.error('Error checking admin status:', error);
      router.push('/dashboard');
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('cashout_requests_admin')
        .select('*')
        .order('requested_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('status', 'pending');
      } else if (filter === 'completed') {
        query = query.in('status', ['approved', 'completed', 'rejected']);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRequest = async (
    requestId: string, 
    newStatus: 'approved' | 'rejected' | 'completed',
    transactionId?: string
  ) => {
    setProcessing(requestId);
    
    try {
      const { data, error } = await supabase.rpc('process_cashout_with_bank_check', {
        p_request_id: requestId,
        p_new_status: newStatus,
        p_notes: newStatus === 'approved' ? 'Payment approved' : newStatus === 'completed' ? 'Payment sent via Venmo' : 'Request rejected',
        p_transaction_id: transactionId || null
      });

      if (error) throw error;

      if (data.success) {
        // Refresh the list
        await fetchRequests();
        
        // Show success message with bank info if relevant
        if (newStatus === 'completed' && data.withdrawal_result) {
          alert(`Payment completed! ${data.amount} withdrawn from bank. New bank balance: $${data.withdrawal_result.new_balance}`);
        } else {
          alert(`Request ${newStatus} successfully!`);
        }
      } else {
        throw new Error(data.error || 'Failed to process request');
      }

    } catch (error: any) {
      console.error('Error processing request:', error);
      alert(error.message || 'Failed to process request');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            <ClockIcon className="w-3 h-3" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
            <CheckIcon className="w-3 h-3" />
            Approved
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckIcon className="w-3 h-3" />
            Completed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            <XIcon className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                  <DollarSignIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                Cash Out Requests
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage user cash out requests
              </p>
            </div>
            <button
              onClick={() => fetchRequests()}
              className="p-3 bg-white dark:bg-neutral-900 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <RefreshIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
            }`}
          >
            All Requests
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
            }`}
          >
            Completed
          </button>
        </div>

        {/* Requests List */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <CreditCardIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No cash out requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Venmo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Requested
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
                  {requests.map((request) => (
                    <motion.tr
                      key={request.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {request.username || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {request.user_email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            ${request.amount.toFixed(2)}
                          </p>
                          {request.current_balance !== undefined && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Balance: ${request.current_balance.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900 dark:text-white font-mono">
                          @{request.venmo_username}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <CalendarIcon className="w-4 h-4" />
                          {formatDate(request.requested_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {request.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleProcessRequest(request.id, 'approved')}
                              disabled={processing === request.id}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-1"
                            >
                              <CheckIcon className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleProcessRequest(request.id, 'rejected')}
                              disabled={processing === request.id}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-1"
                            >
                              <XIcon className="w-4 h-4" />
                              Reject
                            </button>
                          </div>
                        ) : request.status === 'approved' ? (
                          <button
                            onClick={() => {
                              const txId = prompt('Enter Venmo transaction ID:');
                              if (txId) {
                                handleProcessRequest(request.id, 'completed', txId);
                              }
                            }}
                            disabled={processing === request.id}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                          >
                            Mark as Paid
                          </button>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {request.transaction_id && (
                              <span className="font-mono text-xs">
                                TX: {request.transaction_id}
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-gray-200 dark:border-neutral-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <ClockIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pending</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${requests.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {requests.filter(r => r.status === 'pending').length} requests
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-gray-200 dark:border-neutral-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <CheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Approved</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {requests.filter(r => r.status === 'approved').length} requests
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-gray-200 dark:border-neutral-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CreditCardIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Completed</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${requests.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {requests.filter(r => r.status === 'completed').length} requests
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}