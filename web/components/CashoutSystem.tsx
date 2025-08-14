'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { SUSTAINABLE_EARNINGS, formatCurrency } from '@/lib/SUSTAINABLE_EARNINGS';
import { CheckCircle, AlertCircle, DollarSign, Clock, CreditCard, Send } from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  minAmount: number;
  fee: number;
  icon: React.ReactNode;
}

interface CashoutRequest {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  processed_at?: string;
  transaction_id?: string;
}

export default function CashoutSystem() {
  const supabase = createClientComponentClient();
  const [approvedBalance, setApprovedBalance] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [pendingCashouts, setPendingCashouts] = useState(0);
  const [cashoutAmount, setCashoutAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('venmo');
  const [paymentDetails, setPaymentDetails] = useState({
    venmo: '',
    paypal: '',
    bank_account: '',
    crypto_address: '',
  });
  const [requests, setRequests] = useState<CashoutRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const paymentMethods: PaymentMethod[] = [
    { 
      id: 'venmo', 
      name: 'Venmo', 
      minAmount: 10, 
      fee: 0,
      icon: <Send className="w-5 h-5" />
    },
    { 
      id: 'paypal', 
      name: 'PayPal', 
      minAmount: 10, 
      fee: 0.30,
      icon: <CreditCard className="w-5 h-5" />
    },
    { 
      id: 'bank_transfer', 
      name: 'Bank Transfer', 
      minAmount: 25, 
      fee: 0,
      icon: <DollarSign className="w-5 h-5" />
    },
    { 
      id: 'crypto', 
      name: 'Cryptocurrency', 
      minAmount: 50, 
      fee: 2.00,
      icon: <DollarSign className="w-5 h-5" />
    },
  ];

  useEffect(() => {
    fetchBalance();
    fetchCashoutHistory();
  }, []);

  const fetchBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('approved_earnings, pending_earnings')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setApprovedBalance(data.approved_earnings || 0);
      setPendingEarnings(data.pending_earnings || 0);
    }

    // Get pending cashout requests
    const { data: pending } = await supabase
      .from('cashout_requests')
      .select('amount')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (pending) {
      const total = pending.reduce((sum, req) => sum + req.amount, 0);
      setPendingCashouts(total);
    }
  };

  const fetchCashoutHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('cashout_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setRequests(data);
    }
  };

  const handleCashout = async () => {
    setError('');
    setSuccess('');
    
    const amount = parseFloat(cashoutAmount);
    const method = paymentMethods.find(m => m.id === selectedMethod);
    
    if (!method) return;

    // Validation
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amount < method.minAmount) {
      setError(`Minimum cashout for ${method.name} is ${formatCurrency(method.minAmount)}`);
      return;
    }

    if (amount > approvedBalance) {
      setError('Insufficient approved balance. Only approved earnings can be cashed out.');
      return;
    }

    const totalWithFee = amount + method.fee;
    if (totalWithFee > approvedBalance) {
      setError(`Insufficient approved balance to cover fee of ${formatCurrency(method.fee)}`);
      return;
    }

    // Get payment details for selected method
    const detailsKey = selectedMethod === 'bank_transfer' ? 'bank_account' : 
                      selectedMethod === 'crypto' ? 'crypto_address' : selectedMethod;
    const details = paymentDetails[detailsKey as keyof typeof paymentDetails];

    if (!details) {
      setError(`Please enter your ${method.name} details`);
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call the database function to request cashout
      const { data, error: cashoutError } = await supabase
        .rpc('request_cashout', {
          p_user_id: user.id,
          p_amount: amount,
          p_payment_method: selectedMethod,
          p_payment_details: {
            [detailsKey]: details,
            fee: method.fee,
          }
        });

      if (cashoutError) throw cashoutError;

      setSuccess(`Cashout request for ${formatCurrency(amount)} submitted successfully!`);
      setCashoutAmount('');
      setPaymentDetails(prev => ({ ...prev, [detailsKey]: '' }));
      
      // Refresh data
      await fetchBalance();
      await fetchCashoutHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to submit cashout request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'processing': return 'text-blue-600 bg-blue-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'processing': return <Clock className="w-4 h-4 animate-spin" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const selectedMethodDetails = paymentMethods.find(m => m.id === selectedMethod);
  const availableBalance = approvedBalance - pendingCashouts;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Balance Overview */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-2xl font-bold mb-4">Cashout Center</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Available to Cashout</p>
            <p className="text-2xl font-bold text-green-700">
              {formatCurrency(availableBalance)}
            </p>
            <p className="text-xs text-green-600 mt-1">Can withdraw now</p>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Approved Earnings</p>
            <p className="text-2xl font-bold text-blue-700">
              {formatCurrency(approvedBalance)}
            </p>
            <p className="text-xs text-blue-600 mt-1">From approved trends</p>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm text-orange-600 font-medium">Pending Earnings</p>
            <p className="text-2xl font-bold text-orange-700">
              {formatCurrency(pendingEarnings)}
            </p>
            <p className="text-xs text-orange-600 mt-1">Awaiting approval</p>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-yellow-600 font-medium">Pending Cashouts</p>
            <p className="text-2xl font-bold text-yellow-700">
              {formatCurrency(pendingCashouts)}
            </p>
            <p className="text-xs text-yellow-600 mt-1">Processing</p>
          </div>
        </div>
      </div>

      {/* Request Cashout */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Request Cashout</h3>
        
        {/* Payment Methods */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {paymentMethods.map(method => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`
                  p-3 rounded-lg border-2 transition-all
                  ${selectedMethod === method.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex flex-col items-center gap-2">
                  {method.icon}
                  <span className="text-sm font-medium">{method.name}</span>
                  <span className="text-xs text-gray-500">
                    Min: {formatCurrency(method.minAmount)}
                  </span>
                  {method.fee > 0 && (
                    <span className="text-xs text-gray-500">
                      Fee: {formatCurrency(method.fee)}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Details Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {selectedMethod === 'venmo' && 'Venmo Username'}
            {selectedMethod === 'paypal' && 'PayPal Email'}
            {selectedMethod === 'bank_transfer' && 'Account Number'}
            {selectedMethod === 'crypto' && 'Wallet Address'}
          </label>
          <input
            type="text"
            value={paymentDetails[selectedMethod as keyof typeof paymentDetails]}
            onChange={(e) => setPaymentDetails(prev => ({
              ...prev,
              [selectedMethod]: e.target.value
            }))}
            placeholder={
              selectedMethod === 'venmo' ? '@username' :
              selectedMethod === 'paypal' ? 'email@example.com' :
              selectedMethod === 'bank_transfer' ? '1234567890' :
              '0x...'
            }
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount to Cashout
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              $
            </span>
            <input
              type="number"
              value={cashoutAmount}
              onChange={(e) => setCashoutAmount(e.target.value)}
              placeholder="0.00"
              min={selectedMethodDetails?.minAmount}
              max={availableBalance}
              step="0.01"
              className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Available: {formatCurrency(availableBalance)} | 
            Min: {formatCurrency(selectedMethodDetails?.minAmount || 0)}
            {selectedMethodDetails?.fee ? ` | Fee: ${formatCurrency(selectedMethodDetails.fee)}` : ''}
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleCashout}
          disabled={loading || availableBalance < (selectedMethodDetails?.minAmount || 0)}
          className={`
            w-full py-3 px-4 rounded-lg font-medium transition-colors
            ${loading || availableBalance < (selectedMethodDetails?.minAmount || 0)
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {loading ? 'Processing...' : 'Request Cashout'}
        </button>
      </div>

      {/* Cashout History */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Cashout History</h3>
        
        {requests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No cashout requests yet
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map(request => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${getStatusColor(request.status)}`}>
                    {getStatusIcon(request.status)}
                  </div>
                  <div>
                    <p className="font-medium">{formatCurrency(request.amount)}</p>
                    <p className="text-sm text-gray-500">
                      {request.payment_method} • {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className={`
                    px-3 py-1 rounded-full text-xs font-medium
                    ${getStatusColor(request.status)}
                  `}>
                    {request.status}
                  </span>
                  {request.transaction_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      TX: {request.transaction_id}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}