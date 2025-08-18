'use client';

import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { 
  Clock, 
  CheckCircle, 
  Timer,
  ThumbsDown,
  Wallet
} from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  status: string;
  earning_type?: string;
  type?: string;
  created_at: string;
  metadata?: {
    base_amount?: number;
    tier_multiplier?: number;
    session_multiplier?: number;
    daily_multiplier?: number;
  };
}

interface Props {
  transactions: Transaction[];
  formatCurrency: (amount: number) => string;
}

export function SimplifiedTransactionHistory({ transactions, formatCurrency }: Props) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'awaiting_validation':
      case 'awaiting_verification':
        return <Timer className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <ThumbsDown className="w-4 h-4 text-red-500" />;
      case 'paid':
        return <Wallet className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
      case 'awaiting_validation':
      case 'awaiting_verification':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'paid':
        return 'Paid';
      default:
        return status;
    }
  };

  const getTypeLabel = (transaction: Transaction) => {
    const type = transaction.earning_type || transaction.type;
    if (type === 'submission' || type === 'trend_submission') return 'Trend';
    if (type === 'validation' || type === 'validation_vote') return 'Validation';
    if (type === 'bonus') return 'Bonus';
    return 'Earning';
  };

  return (
    <div className="space-y-2">
      {transactions.map((transaction) => {
        const base = transaction.metadata?.base_amount || 0.25;
        const totalMultiplier = (transaction.metadata?.tier_multiplier || 1) * 
                               (transaction.metadata?.session_multiplier || 1) * 
                               (transaction.metadata?.daily_multiplier || 1);
        const showCalculation = totalMultiplier > 1 && (transaction.earning_type === 'submission' || transaction.type === 'trend_submission');

        return (
          <motion.div
            key={transaction.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`rounded-lg p-3 flex items-center justify-between ${
              transaction.status === 'pending' || transaction.status === 'awaiting_verification'
                ? 'bg-yellow-900/20 border border-yellow-800/30'
                : 'bg-gray-700/50'
            }`}
          >
            {/* Left side - Type and Time */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-700 rounded-full">
                {getStatusIcon(transaction.status)}
              </div>
              <div>
                <div className="text-white font-medium text-sm">
                  {getTypeLabel(transaction)}
                </div>
                <div className="text-xs text-gray-500">
                  {format(new Date(transaction.created_at), 'MMM d, h:mm a')}
                </div>
              </div>
            </div>

            {/* Right side - Amount and Calculation */}
            <div className="text-right">
              <div className={`text-lg font-bold ${
                transaction.status === 'rejected' ? 'text-red-400 line-through' : 'text-white'
              }`}>
                {formatCurrency(transaction.amount)}
              </div>
              {showCalculation && (
                <div className="text-xs text-gray-400">
                  ${base.toFixed(2)} × {totalMultiplier.toFixed(1)}
                </div>
              )}
              <div className="text-xs text-gray-500">
                {getStatusText(transaction.status)}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}