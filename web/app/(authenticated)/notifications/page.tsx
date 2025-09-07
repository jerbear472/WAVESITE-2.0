'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  TrendingUp, 
  Award, 
  Heart, 
  MessageCircle, 
  UserPlus,
  Zap,
  Star,
  CheckCircle,
  Clock,
  Filter,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '@/lib/providers/auth-provider';
import { supabase } from '@/lib/supabase';

interface Notification {
  id: string;
  type: 'xp_earned' | 'trend_approved' | 'trend_rejected' | 'new_follower' | 'comment' | 'like' | 'achievement' | 'system';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata?: any;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, filter]);

  const fetchNotifications = async () => {
    try {
      // For now, we'll create mock notifications based on XP transactions
      // In production, you'd have a proper notifications table
      const { data: xpData, error: xpError } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (xpError) throw xpError;

      // Transform XP transactions into notifications
      const xpNotifications = (xpData || []).map(xp => ({
        id: xp.id,
        type: 'xp_earned' as const,
        title: `+${xp.amount} XP Earned!`,
        message: xp.description || 'You earned experience points',
        read: false,
        created_at: xp.created_at,
        metadata: { amount: xp.amount, type: xp.type }
      }));

      // Add some mock notifications for variety
      const mockNotifications: Notification[] = [
        {
          id: 'mock-1',
          type: 'trend_approved',
          title: 'Trend Approved!',
          message: 'Your trend "Winter Arc Challenge" has been approved',
          read: false,
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'mock-2',
          type: 'achievement',
          title: 'Achievement Unlocked!',
          message: 'You\'ve earned the "Trend Spotter" badge',
          read: true,
          created_at: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: 'mock-3',
          type: 'new_follower',
          title: 'New Follower',
          message: 'Sarah Chen started following you',
          read: true,
          created_at: new Date(Date.now() - 86400000).toISOString()
        }
      ];

      const allNotifications = [...xpNotifications, ...mockNotifications]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const filteredNotifications = filter === 'unread' 
        ? allNotifications.filter(n => !n.read)
        : allNotifications;

      setNotifications(filteredNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = async () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'xp_earned':
        return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'trend_approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'trend_rejected':
        return <X className="w-5 h-5 text-red-500" />;
      case 'new_follower':
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-purple-500" />;
      case 'like':
        return <Heart className="w-5 h-5 text-pink-500" />;
      case 'achievement':
        return <Award className="w-5 h-5 text-indigo-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    const minutes = Math.floor(diff / 60000);
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                <p className="text-sm text-gray-500">Stay updated with your activity</p>
              </div>
            </div>
            {notifications.some(n => !n.read) && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'unread' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Unread
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
              </h3>
              <p className="text-gray-500">
                {filter === 'unread' 
                  ? 'You\'ve read all your notifications' 
                  : 'We\'ll notify you when something happens'}
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-xl shadow-lg p-4 cursor-pointer transition-all hover:shadow-xl ${
                  !notification.read ? 'border-l-4 border-blue-500' : ''
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${
                    !notification.read ? 'bg-blue-50' : 'bg-gray-50'
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className={`font-semibold ${
                          !notification.read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatTime(notification.created_at)}
                      </div>
                    </div>
                    {notification.metadata?.amount && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                          +{notification.metadata.amount} XP
                        </span>
                      </div>
                    )}
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}