'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, CheckCircle, XCircle, Users, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PendingTrend {
  id: string;
  title: string;
  description: string;
  created_at: string;
  validation_count: number;
  positive_votes: number;
  negative_votes: number;
  platform: string;
  thumbnail_url?: string;
}

export default function PendingValidations() {
  const { user } = useAuth();
  const [pendingTrends, setPendingTrends] = useState<PendingTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPendingTrends();
      
      // Subscribe to real-time validation updates
      const subscription = supabase
        .channel(`pending_trends_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trend_validations',
            filter: `trend_id=in.(${pendingTrends.map(t => t.id).join(',')})`
          },
          () => {
            // Reload when validations change
            loadPendingTrends();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const loadPendingTrends = async () => {
    if (!user) return;

    try {
      // Get user's pending trends with vote counts
      const { data, error } = await supabase
        .from('user_pending_trends')
        .select('*')
        .eq('spotter_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPendingTrends(data);
      }
    } catch (error) {
      console.error('Error loading pending trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const getValidationProgress = (trend: PendingTrend) => {
    const total = trend.positive_votes + trend.negative_votes;
    const needed = 3;
    const progress = (total / needed) * 100;
    
    return {
      progress: Math.min(progress, 100),
      votesNeeded: Math.max(0, needed - total),
      isLeaning: trend.positive_votes > trend.negative_votes ? 'positive' : 
                 trend.negative_votes > trend.positive_votes ? 'negative' : 'neutral'
    };
  };

  const getPlatformEmoji = (platform: string) => {
    const emojis: Record<string, string> = {
      tiktok: '🎵',
      instagram: '📸',
      twitter: '𝕏',
      reddit: '🔥',
      youtube: '📺',
      default: '🌐'
    };
    return emojis[platform?.toLowerCase()] || emojis.default;
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-100 rounded-xl"></div>
      </div>
    );
  }

  if (pendingTrends.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 text-center">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="font-medium text-gray-900 mb-1">No Pending Validations</h3>
        <p className="text-sm text-gray-600">Submit trends to start earning XP!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Your Pending Trends</h2>
        <span className="text-sm text-gray-500">{pendingTrends.length} awaiting validation</span>
      </div>

      <AnimatePresence>
        {pendingTrends.map((trend, index) => {
          const validation = getValidationProgress(trend);
          
          return (
            <motion.div
              key={trend.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {trend.thumbnail_url ? (
                    <img 
                      src={trend.thumbnail_url} 
                      alt={trend.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">{getPlatformEmoji(trend.platform)}</span>
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">
                      {trend.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {trend.description}
                    </p>
                    
                    {/* Validation Stats */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600">
                          {trend.positive_votes + trend.negative_votes}/3 votes
                        </span>
                      </div>
                      
                      {trend.positive_votes > 0 && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-green-600">{trend.positive_votes}</span>
                        </div>
                      )}
                      
                      {trend.negative_votes > 0 && (
                        <div className="flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-red-500" />
                          <span className="text-red-600">{trend.negative_votes}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-500">
                          {new Date(trend.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Potential XP */}
                  <div className="text-right">
                    <div className={`text-sm font-bold ${
                      validation.isLeaning === 'positive' ? 'text-green-600' : 
                      validation.isLeaning === 'negative' ? 'text-red-600' : 
                      'text-gray-600'
                    }`}>
                      {validation.isLeaning === 'positive' && '+50 XP'}
                      {validation.isLeaning === 'negative' && '-15 XP'}
                      {validation.isLeaning === 'neutral' && '?'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {validation.votesNeeded > 0 
                        ? `${validation.votesNeeded} more`
                        : 'Soon'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="h-1 bg-gray-100">
                <div 
                  className={`h-full transition-all duration-500 ${
                    validation.isLeaning === 'positive' ? 'bg-green-500' : 
                    validation.isLeaning === 'negative' ? 'bg-red-500' : 
                    'bg-gray-300'
                  }`}
                  style={{ width: `${validation.progress}%` }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      
      {/* Educational Note */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">How Validation Works</p>
            <ul className="text-xs text-blue-700 space-y-0.5">
              <li>• Your trend needs 3 community votes to be validated</li>
              <li>• If majority approve: +50 XP bonus</li>
              <li>• If majority reject: -15 XP penalty</li>
              <li>• Focus on quality to increase approval chances</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}