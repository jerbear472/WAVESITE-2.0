'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, Shield, TrendingDown, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface XPPenaltyStatus {
  current_level: number;
  rejection_count: number;
  grace_submissions_remaining: number;
  daily_xp_lost: number;
  daily_loss_remaining: number;
  next_penalty: number;
  in_grace_period: boolean;
}

export default function XPPenaltyIndicator() {
  const { user } = useAuth();
  const [status, setStatus] = useState<XPPenaltyStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPenaltyStatus();
    }
  }, [user]);

  const fetchPenaltyStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_user_xp_penalty_status', { p_user_id: user.id });

      if (!error && data) {
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching penalty status:', error);
    }
  };

  if (!status) return null;

  const getRiskLevel = () => {
    if (status.in_grace_period) return 'protected';
    if (status.rejection_count === 0) return 'low';
    if (status.rejection_count < 3) return 'medium';
    return 'high';
  };

  const riskLevel = getRiskLevel();
  const riskColors = {
    protected: 'text-green-500 bg-green-50 border-green-200',
    low: 'text-blue-500 bg-blue-50 border-blue-200',
    medium: 'text-yellow-500 bg-yellow-50 border-yellow-200',
    high: 'text-red-500 bg-red-50 border-red-200'
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
          riskColors[riskLevel]
        } hover:opacity-80`}
      >
        {status.in_grace_period ? (
          <>
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Protected</span>
          </>
        ) : status.rejection_count > 0 ? (
          <>
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Risk: {status.next_penalty} XP</span>
          </>
        ) : (
          <>
            <TrendingDown className="w-4 h-4" />
            <span className="text-sm font-medium">Quality Matters</span>
          </>
        )}
      </button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full mt-2 right-0 w-80 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">XP Risk Status</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {/* Grace Period Status */}
            {status.in_grace_period ? (
              <div className="mb-4 p-3 bg-green-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">New User Protection</p>
                    <p className="text-xs text-green-700 mt-1">
                      You're protected from XP penalties while learning (Level {status.current_level}/3)
                    </p>
                  </div>
                </div>
              </div>
            ) : status.grace_submissions_remaining > 0 ? (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Grace Period: {status.grace_submissions_remaining} submissions left
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Your first 10 rejections won't cost XP
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Penalty Information */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Next Rejection Penalty:</span>
                <span className={`text-sm font-bold ${
                  status.next_penalty > 30 ? 'text-red-600' : 
                  status.next_penalty > 15 ? 'text-yellow-600' : 'text-gray-900'
                }`}>
                  -{status.next_penalty} XP
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Rejections:</span>
                <span className="text-sm font-medium text-gray-900">{status.rejection_count}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">XP Lost Today:</span>
                <span className="text-sm font-medium text-gray-900">{status.daily_xp_lost} / 100</span>
              </div>

              {/* Daily Cap Warning */}
              {status.daily_xp_lost > 50 && (
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    ⚠️ You're approaching the daily XP loss cap (100 XP)
                  </p>
                </div>
              )}
            </div>

            {/* Penalty Scale */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">Penalty Escalation:</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">1st rejection:</span>
                  <span>-15 XP</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">2nd rejection:</span>
                  <span>-22 XP</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">3rd rejection:</span>
                  <span>-33 XP</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Max penalty:</span>
                  <span className="text-red-600 font-medium">-50 XP</span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-1">💡 Tips to Avoid Penalties:</p>
              <ul className="text-xs text-gray-600 space-y-0.5">
                <li>• Verify trends are actually spreading</li>
                <li>• Include clear evidence (links/screenshots)</li>
                <li>• Avoid duplicate submissions</li>
                <li>• Focus on quality over quantity</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}