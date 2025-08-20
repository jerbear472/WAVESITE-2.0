'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingDown, X, AlertTriangle, Info } from 'lucide-react';

interface XPLossEvent {
  id: string;
  amount: number;
  description: string;
  trend_title: string;
  created_at: string;
  is_grace_period?: boolean;
}

export default function XPLossNotification() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<XPLossEvent[]>([]);
  const [showEducation, setShowEducation] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Subscribe to XP loss events
    const subscription = supabase
      .channel(`xp_losses_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'xp_transactions',
          filter: `user_id=eq.${user.id} AND transaction_type=eq.trend_rejected`
        },
        async (payload) => {
          const transaction = payload.new as any;
          
          // Check if user is in grace period
          const { data: status } = await supabase
            .rpc('get_user_xp_penalty_status', { p_user_id: user.id });
          
          const notification: XPLossEvent = {
            id: transaction.id,
            amount: Math.abs(transaction.amount),
            description: transaction.description,
            trend_title: transaction.description?.replace('Trend rejected by community: ', '') || 'Unknown trend',
            created_at: transaction.created_at,
            is_grace_period: status?.in_grace_period || status?.grace_submissions_remaining > 0
          };
          
          setNotifications(prev => [...prev, notification]);
          
          // Auto-remove after 10 seconds
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
          }, 10000);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <>
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed z-50 max-w-sm"
            style={{
              bottom: `${20 + index * 100}px`,
              right: '20px'
            }}
          >
            <div className={`rounded-lg shadow-lg overflow-hidden ${
              notification.is_grace_period 
                ? 'bg-blue-50 border-2 border-blue-200' 
                : 'bg-red-50 border-2 border-red-200'
            }`}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {notification.is_grace_period ? (
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Info className="w-5 h-5 text-blue-600" />
                    </div>
                  ) : (
                    <div className="p-2 bg-red-100 rounded-lg">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      notification.is_grace_period ? 'text-blue-900' : 'text-red-900'
                    }`}>
                      {notification.is_grace_period ? 'Trend Rejected (Protected)' : `−${notification.amount} XP`}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      notification.is_grace_period ? 'text-blue-700' : 'text-red-700'
                    }`}>
                      "{notification.trend_title}"
                    </p>
                    {notification.is_grace_period && (
                      <p className="text-xs text-blue-600 mt-2">
                        No XP lost - you're in the learning period
                      </p>
                    )}
                    {!notification.is_grace_period && (
                      <button
                        onClick={() => setShowEducation(true)}
                        className="text-xs text-red-600 hover:text-red-700 mt-2 underline"
                      >
                        Why was this rejected?
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => dismissNotification(notification.id)}
                    className={`${
                      notification.is_grace_period 
                        ? 'text-blue-400 hover:text-blue-600' 
                        : 'text-red-400 hover:text-red-600'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Progress bar for auto-dismiss */}
              <div className="h-1 bg-gray-200">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 10, ease: 'linear' }}
                  className={`h-full ${
                    notification.is_grace_period ? 'bg-blue-400' : 'bg-red-400'
                  }`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Educational Modal */}
      <AnimatePresence>
        {showEducation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowEducation(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Why Trends Get Rejected
                </h3>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-1">❌ Not Actually Trending</h4>
                  <p className="text-sm text-gray-600">
                    The content isn't spreading or gaining traction
                  </p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-1">🔄 Duplicate Submission</h4>
                  <p className="text-sm text-gray-600">
                    Someone already spotted this trend
                  </p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-1">📝 Poor Evidence</h4>
                  <p className="text-sm text-gray-600">
                    Missing links, screenshots, or clear description
                  </p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-1">🎯 Wrong Category</h4>
                  <p className="text-sm text-gray-600">
                    Not a cultural trend (e.g., news events, personal posts)
                  </p>
                </div>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg mb-4">
                <p className="text-sm text-green-800">
                  <strong>💡 Pro Tip:</strong> Focus on content that's spreading across multiple accounts, 
                  has remixes/variations, and shows clear momentum.
                </p>
              </div>
              
              <button
                onClick={() => setShowEducation(false)}
                className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}