'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  TrendingUp, 
  CheckCircle, 
  Target,
  Award,
  Clock,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface XPActivity {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

export default function XPActivitySidebar() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<XPActivity[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [todayXP, setTodayXP] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadXPActivity();
    }
  }, [user]);

  const loadXPActivity = async () => {
    if (!user?.id) return;

    try {
      // Load recent XP transactions
      const { data: xpData, error: xpError } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (xpError) throw xpError;

      // Load total XP
      const { data: totalData } = await supabase
        .from('user_xp')
        .select('total_xp')
        .eq('user_id', user.id)
        .single();

      // Calculate today's XP
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayActivities = xpData?.filter(activity => 
        new Date(activity.created_at) >= today
      ) || [];
      
      const todayTotal = todayActivities.reduce((sum, activity) => 
        sum + activity.amount, 0
      );

      setActivities(xpData || []);
      setTotalXP(totalData?.total_xp || 0);
      setTodayXP(todayTotal);
    } catch (error) {
      console.error('Error loading XP activity:', error);
      // Use mock data for demo
      setActivities(getMockActivities());
      setTotalXP(1250);
      setTodayXP(85);
    } finally {
      setLoading(false);
    }
  };

  const getMockActivities = (): XPActivity[] => {
    const now = new Date();
    return [
      {
        id: '1',
        amount: 10,
        type: 'trend_submission',
        description: 'Submitted: AI movie trailers',
        created_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        amount: 5,
        type: 'validation',
        description: 'Validated trend correctly',
        created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        amount: 20,
        type: 'prediction_correct',
        description: 'Prediction came true!',
        created_at: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        amount: 15,
        type: 'streak_bonus',
        description: '7 day streak bonus',
        created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '5',
        amount: 5,
        type: 'validation',
        description: 'Validated trend correctly',
        created_at: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString()
      }
    ];
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'trend_submission':
        return <TrendingUp className="w-4 h-4" />;
      case 'validation':
        return <CheckCircle className="w-4 h-4" />;
      case 'prediction_correct':
        return <Target className="w-4 h-4" />;
      case 'streak_bonus':
        return <Award className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'trend_submission':
        return 'text-blue-600 bg-blue-50';
      case 'validation':
        return 'text-green-600 bg-green-50';
      case 'prediction_correct':
        return 'text-purple-600 bg-purple-50';
      case 'streak_bonus':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffMs = now.getTime() - activityDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return format(activityDate, 'MMM d');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-2/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-500">
        <div className="text-white">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5" />
            XP Activity
          </h3>
          
          {/* XP Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-blue-100 text-sm">Total XP</p>
              <p className="text-2xl font-bold">{totalXP.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Today</p>
              <p className="text-2xl font-bold">+{todayXP}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Zap className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {activity.description}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  {getTimeAgo(activity.created_at)}
                </p>
              </div>
              
              <div className="text-right">
                <span className="text-sm font-bold text-green-600">
                  +{activity.amount}
                </span>
                <p className="text-xs text-gray-400">XP</p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* View All Link */}
      <div className="p-4 border-t border-gray-100">
        <button className="w-full py-2 text-center text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center justify-center gap-2">
          View All Activity
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}