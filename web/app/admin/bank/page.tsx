'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  AlertCircle,
  RefreshCw,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface BankStatus {
  current_balance: number;
  total_deposited: number;
  total_withdrawn: number;
  pending_cashouts: number;
  available_after_pending: number;
  last_updated: string;
  monthly_stats: {
    deposits_this_month: number;
    cashouts_this_month: number;
    transaction_count: number;
  };
}

interface BankTransaction {
  id: string;
  transaction_type: 'deposit' | 'withdrawal' | 'cashout' | 'refund';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  created_at: string;
  cashout_details?: {
    user_email: string;
    venmo_username: string;
    request_status: string;
  };
}

export default function AdminBankPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [bankStatus, setBankStatus] = useState<BankStatus | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDescription, setDepositDescription] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);

  useEffect(() => {
    checkAdminAndLoadData();
  }, [user]);

  const checkAdminAndLoadData = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user is admin
    if (user.email !== 'jeremyuys@gmail.com' && !user.is_admin && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    await loadBankData();
  };

  const loadBankData = async () => {
    setLoading(true);
    try {
      // Get bank status
      const { data: statusData, error: statusError } = await supabase
        .rpc('get_bank_status');

      if (statusError) throw statusError;
      setBankStatus(statusData);

      // Get recent transactions
      const { data: transactionsData, error: transError } = await supabase
        .from('bank_transactions_admin')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (transError) throw transError;
      setTransactions(transactionsData || []);

    } catch (error) {
      console.error('Error loading bank data:', error);
      alert('Failed to load bank data. Please check your admin permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsDepositing(true);
    try {
      const { data, error } = await supabase
        .rpc('admin_deposit_to_bank', {
          p_amount: parseFloat(depositAmount),
          p_description: depositDescription || 'Admin deposit'
        });

      if (error) throw error;

      if (data.success) {
        alert(`Successfully deposited ${formatCurrency(data.amount_added)}! New balance: ${formatCurrency(data.new_balance)}`);
        setDepositAmount('');
        setDepositDescription('');
        setShowDepositForm(false);
        await loadBankData(); // Refresh data
      } else {
        throw new Error('Deposit failed');
      }

    } catch (error: any) {
      console.error('Error depositing to bank:', error);
      alert(error.message || 'Failed to deposit money to bank');
    } finally {
      setIsDepositing(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'cashout':
        return <ArrowDownLeft className="w-4 h-4 text-red-600" />;
      case 'withdrawal':
        return <ArrowDownLeft className="w-4 h-4 text-orange-600" />;
      case 'refund':
        return <ArrowUpRight className="w-4 h-4 text-blue-600" />;
      default:
        return <DollarSign className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'refund':
        return 'text-green-600';
      case 'cashout':
        return 'text-red-600';
      case 'withdrawal':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Wallet className="w-6 h-6 text-green-600" />
                </div>
                Bank Management
              </h1>
              <p className="text-gray-600 mt-2">
                Manage the central bank balance that funds user cashouts
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadBankData}
                className="p-3 bg-white rounded-xl hover:bg-gray-100 transition-colors"
              >
                <RefreshCw className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={() => setShowDepositForm(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                Add Funds
              </button>
            </div>
          </div>
        </motion.div>

        {/* Bank Status Cards */}
        {bankStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Wallet className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Current Balance</h3>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(bankStatus.current_balance)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Available for cashouts
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Pending Cashouts</h3>
              </div>
              <p className="text-3xl font-bold text-yellow-600">
                {formatCurrency(bankStatus.pending_cashouts)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Awaiting payment
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Total Deposited</h3>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(bankStatus.total_deposited)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                All-time deposits
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Total Paid Out</h3>
              </div>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(bankStatus.total_withdrawn)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                All-time cashouts
              </p>
            </motion.div>
          </div>
        )}

        {/* Balance Warning */}
        {bankStatus && bankStatus.available_after_pending < 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-medium">Insufficient Bank Funds</p>
              <p className="text-red-700 text-sm">
                You need to add {formatCurrency(Math.abs(bankStatus.available_after_pending))} to cover pending cashouts.
              </p>
            </div>
          </motion.div>
        )}

        {/* Deposit Form Modal */}
        {showDepositForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl p-6 max-w-md w-full"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-green-600" />
                Add Funds to Bank
              </h2>
              
              <form onSubmit={handleDeposit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={depositDescription}
                    onChange={(e) => setDepositDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Admin deposit"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDepositForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDepositing || !depositAmount}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isDepositing ? 'Adding...' : 'Add Funds'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Recent Transactions
            </h2>
          </div>
          
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance After
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.transaction_type)}
                          <span className={`text-sm font-medium capitalize ${getTransactionColor(transaction.transaction_type)}`}>
                            {transaction.transaction_type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-lg font-semibold ${getTransactionColor(transaction.transaction_type)}`}>
                          {transaction.transaction_type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(transaction.balance_after)}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900">{transaction.description}</p>
                          {transaction.cashout_details && (
                            <p className="text-xs text-gray-500 mt-1">
                              → {transaction.cashout_details.user_email} (@{transaction.cashout_details.venmo_username})
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transaction.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}