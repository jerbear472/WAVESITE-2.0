'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bell,
  TrendingUp,
  DollarSign,
  CheckCircle,
  XCircle,
  Award,
  Sparkles,
  Clock,
  X,
  ChevronRight,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { formatCurrency } from '@/lib/SUSTAINABLE_EARNINGS';

interface Notification {
  id: string;
  type: 'earning_approved' | 'earning_rejected' | 'trend_validated' | 'bonus_earned' | 'tier_upgrade' | 'streak_milestone';
  title: string;
  message: string;
  amount?: number;
  trend_title?: string;
  created_at: string;
  read: boolean;
  icon?: string;
  color?: string;
}

export default function NotificationsWindow() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      subscribeToNotifications();
    }
  }, [user?.id]);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch recent earnings changes
      const { data: earnings } = await supabase
        .from('earnings_ledger')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['approved', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(10);

      // Convert earnings to notifications
      const earningsNotifications: Notification[] = (earnings || []).map(e => {
        if (e.status === 'approved' && e.type === 'approval_bonus') {
          return {
            id: e.id,
            type: 'bonus_earned',
            title: '🎉 Approval Bonus!',
            message: `Your trend was approved! Bonus earned: ${formatCurrency(e.amount)}`,
            amount: e.amount,
            created_at: e.created_at,
            read: false,
            color: 'from-yellow-500 to-orange-500'
          };
        } else if (e.status === 'approved') {
          return {
            id: e.id,
            type: 'earning_approved',
            title: '✅ Earnings Approved',
            message: `${formatCurrency(e.amount)} moved to approved balance`,
            amount: e.amount,
            trend_title: e.description,
            created_at: e.created_at,
            read: false,
            color: 'from-green-500 to-emerald-500'
          };
        } else {
          return {
            id: e.id,
            type: 'earning_rejected',
            title: '❌ Trend Rejected',
            message: `Trend was rejected by community`,
            created_at: e.created_at,
            read: false,
            color: 'from-red-500 to-pink-500'
          };
        }
      });

      // Check for tier upgrades
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('performance_tier, current_streak')
        .eq('id', user.id)
        .single();

      // Add milestone notifications
      const milestoneNotifications: Notification[] = [];
      
      if (profile?.current_streak && profile.current_streak % 7 === 0) {
        milestoneNotifications.push({
          id: `streak-${profile.current_streak}`,
          type: 'streak_milestone',
          title: '🔥 Streak Milestone!',
          message: `${profile.current_streak} day streak! Keep it up!`,
          created_at: new Date().toISOString(),
          read: false,
          color: 'from-orange-500 to-red-500'
        });
      }

      setNotifications([...earningsNotifications, ...milestoneNotifications].slice(0, 8));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!user?.id) return;

    const subscription = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'earnings_ledger',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'earning_approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'earning_rejected':
        return <XCircle className="w-4 h-4" />;
      case 'bonus_earned':
        return <Award className="w-4 h-4" />;
      case 'tier_upgrade':
        return <TrendingUp className="w-4 h-4" />;
      case 'streak_milestone':
        return <Sparkles className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-700">
      {/* Header */}
      <div 
        className="p-6 border-b border-gray-200 dark:border-neutral-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {unreadCount > 0 ? `${unreadCount} new` : 'All caught up!'}
              </p>
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {/* Notifications List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  <Clock className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                  <p className="text-xs mt-1">We'll notify you when something happens!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-neutral-700">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors ${
                        !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-1.5 rounded-lg bg-gradient-to-r ${notification.color || 'from-gray-500 to-gray-600'} text-white`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            {notification.message}
                          </p>
                          {notification.amount && (
                            <p className="text-xs font-bold text-green-600 dark:text-green-400 mt-1">
                              +{formatCurrency(notification.amount)}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="p-4 border-t border-gray-200 dark:border-neutral-700">
                <Link
                  href="/earnings"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  View all earnings
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}