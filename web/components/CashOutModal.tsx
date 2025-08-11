'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X as XIcon, DollarSign as DollarSignIcon, AlertCircle as AlertCircleIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/formatters';
import { 
  EARNINGS_STANDARD,
  formatEarnings,
  canCashOut
} from '@/lib/EARNINGS_STANDARD';
import SimpleLoader from '@/components/SimpleLoader';

interface CashOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  onSuccess?: () => void;
}

export default function CashOutModal({ isOpen, onClose, availableBalance, onSuccess }: CashOutModalProps) {
  const [venmoUsername, setVenmoUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate minimum cashout amount
      if (!canCashOut(availableBalance)) {
        throw new Error(`Minimum cashout amount is ${formatEarnings(EARNINGS_STANDARD.LIMITS.MIN_CASHOUT_AMOUNT)}. You currently have ${formatEarnings(availableBalance)}.`);
      }

      // Validate Venmo username
      if (!venmoUsername.trim()) {
        throw new Error('Please enter your Venmo username');
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Check if user has pending cash out requests
      const { data: pendingRequests, error: checkError } = await supabase
        .from('cashout_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error('Error checking existing requests');
      }

      if (pendingRequests) {
        throw new Error('You already have a pending cash out request. Please wait for it to be processed.');
      }

      // Create cash out request
      const { error: insertError } = await supabase
        .from('cashout_requests')
        .insert({
          user_id: user.id,
          amount: availableBalance,
          venmo_username: venmoUsername.trim().replace('@', ''), // Remove @ if included
          status: 'pending'
        });

      if (insertError) {
        throw insertError;
      }

      setSuccess(true);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setVenmoUsername('');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to submit cash out request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <DollarSignIcon className="w-6 h-6 text-green-500" />
                  Cash Out Request
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <XIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Request Submitted!</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your cash out request has been submitted. You'll receive your payment via Venmo soon.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Amount Display */}
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-6">
                    <p className="text-sm text-green-600 dark:text-green-400 mb-1">Amount to Cash Out</p>
                    <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(availableBalance)}
                    </p>
                  </div>

                  {/* Venmo Username Input */}
                  <div className="mb-6">
                    <label htmlFor="venmo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Venmo Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                      <input
                        type="text"
                        id="venmo"
                        value={venmoUsername}
                        onChange={(e) => setVenmoUsername(e.target.value)}
                        placeholder="your-venmo-username"
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-neutral-800 dark:text-white"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Enter your Venmo username without the @ symbol
                    </p>
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6 flex gap-3">
                    <AlertCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-semibold mb-1">Important Information:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Minimum cashout amount is {formatCurrency(EARNINGS.MINIMUM_CASHOUT)}</li>
                        <li>Cash out requests are processed within {EARNINGS.CASHOUT_PROCESSING_HOURS} hours</li>
                        <li>Only approved earnings can be cashed out</li>
                        <li>Make sure your Venmo username is correct</li>
                        <li>You can only have one pending request at a time</li>
                      </ul>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-4">
                      {error}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !venmoUsername.trim()}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <SimpleLoader size="small" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <DollarSignIcon className="w-5 h-5" />
                          Request Cash Out
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}