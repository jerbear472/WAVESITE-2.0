'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';

interface TrendToVerify {
  id: string;
  created_at: string;
  category: string;
  notes?: string;
  emoji?: string;
  platform?: string;
  image_url?: string;
  user_id: string;
  username?: string;
  verification_count: number;
}

export default function Verify() {
  const { user } = useAuth();
  const [trends, setTrends] = useState<TrendToVerify[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [stats, setStats] = useState({
    verified_today: 0,
    earnings_today: 0,
    accuracy_score: 0,
  });

  useEffect(() => {
    if (user) {
      fetchTrendsToVerify();
      fetchUserStats();
    }
  }, [user]);

  const fetchTrendsToVerify = async () => {
    try {
      // Fetch trends that the user hasn't verified yet
      const { data, error } = await supabase
        .from('trend_submissions')
        .select(`
          *,
          user_profiles!user_id (username)
        `)
        .neq('user_id', user?.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setTrends(data || []);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      // This would fetch from a user stats table
      // For now, using placeholder data
      setStats({
        verified_today: 12,
        earnings_today: 1.20,
        accuracy_score: 85,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleVerify = async (isValid: boolean) => {
    if (verifying || !trends[currentIndex]) return;

    setVerifying(true);
    const trend = trends[currentIndex];

    try {
      // Submit verification vote
      const { error } = await supabase
        .from('trend_verifications')
        .insert({
          trend_id: trend.id,
          user_id: user?.id,
          is_valid: isValid,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update local stats
      setStats(prev => ({
        ...prev,
        verified_today: prev.verified_today + 1,
        earnings_today: prev.earnings_today + 0.10,
      }));

      // Move to next trend
      if (currentIndex < trends.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Fetch more trends
        await fetchTrendsToVerify();
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Error verifying trend:', error);
    } finally {
      setVerifying(false);
    }
  };

  const currentTrend = trends[currentIndex];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Trends</h1>
          <p className="text-gray-600">Help validate trends and earn rewards</p>
        </div>

        {/* Stats Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.verified_today}</p>
              <p className="text-xs text-gray-500">Verified Today</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">${stats.earnings_today.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Earned Today</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.accuracy_score}%</p>
              <p className="text-xs text-gray-500">Accuracy</p>
            </div>
          </div>
        </div>

        {/* Trend Card */}
        {currentTrend ? (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
            {currentTrend.image_url && (
              <div className="aspect-w-16 aspect-h-9">
                <img
                  src={currentTrend.image_url}
                  alt="Trend"
                  className="w-full h-64 object-cover"
                />
              </div>
            )}
            
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{currentTrend.emoji || '📍'}</span>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {currentTrend.category.charAt(0).toUpperCase() + currentTrend.category.slice(1)} Trend
                  </h2>
                  <p className="text-sm text-gray-500">
                    by @{currentTrend.username || 'anonymous'} • {format(parseISO(currentTrend.created_at), 'PPp')}
                  </p>
                </div>
              </div>

              {currentTrend.notes && (
                <p className="text-gray-700 mb-4">{currentTrend.notes}</p>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-500">
                {currentTrend.platform && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100">
                    📱 {currentTrend.platform}
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100">
                  ✓ {currentTrend.verification_count} verifications
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No more trends to verify right now. Check back later!</p>
          </div>
        )}

        {/* Action Buttons */}
        {currentTrend && (
          <div className="flex gap-4">
            <button
              onClick={() => handleVerify(false)}
              disabled={verifying}
              className="flex-1 bg-red-500 text-white py-4 px-6 rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <span>❌</span>
              <span>Not a Trend</span>
            </button>
            <button
              onClick={() => handleVerify(true)}
              disabled={verifying}
              className="flex-1 bg-green-500 text-white py-4 px-6 rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <span>✅</span>
              <span>Confirm Trend</span>
            </button>
          </div>
        )}

        {/* Progress Indicator */}
        {trends.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>Progress</span>
              <span>{currentIndex + 1} / {trends.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / trends.length) * 100}%` }}
              />
            </div>
          </div>
        )}
        </div>
      </div>
  );
}