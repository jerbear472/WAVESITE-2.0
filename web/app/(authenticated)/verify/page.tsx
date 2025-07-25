'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';

interface TrendToVerify {
  id: string;
  created_at: string;
  category: string;
  description: string;
  screenshot_url?: string;
  thumbnail_url?: string;
  post_url?: string;
  spotter_id: string;
  // Social media metadata
  creator_handle?: string;
  creator_name?: string;
  post_caption?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  hashtags?: string[];
  platform?: string;
  validation_count: number;
  status: string;
  // User info
  spotter?: {
    username?: string;
    email?: string;
  };
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
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTrendsToVerify();
      fetchUserStats();
    }
  }, [user]);

  const fetchTrendsToVerify = async () => {
    try {
      // Fetch trends that the user hasn't verified yet
      const { data: trendsData, error: trendsError } = await supabase
        .from('trend_submissions')
        .select('*')
        .neq('spotter_id', user?.id)
        .or('status.eq.submitted,status.eq.validating')
        .order('created_at', { ascending: false })
        .limit(20);

      if (trendsError) throw trendsError;

      // Fetch user details for each trend
      const userIds = [...new Set(trendsData?.map(t => t.spotter_id) || [])];
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('id, username, email')
        .in('id', userIds);

      // Create a map of user data
      const userMap = (usersData || []).reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<string, any>);

      // Transform the data to include spotter info
      const transformedData = (trendsData || []).map(trend => ({
        ...trend,
        spotter: userMap[trend.spotter_id] || { username: 'Anonymous', email: null }
      }));

      setTrends(transformedData);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    setStatsLoading(true);
    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Fetch user's validations for today
      const { data: todayValidations, error: validationsError } = await supabase
        .from('trend_validations')
        .select('*')
        .eq('validator_id', user?.id)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (validationsError) throw validationsError;

      // Fetch all user's validations for accuracy calculation
      const { data: allValidations, error: allValidationsError } = await supabase
        .from('trend_validations')
        .select('confirmed, trend_id')
        .eq('validator_id', user?.id);

      if (allValidationsError) throw allValidationsError;

      // Calculate accuracy by checking if user's validations match the final trend status
      let correctValidations = 0;
      let totalCheckedValidations = 0;

      if (allValidations && allValidations.length > 0) {
        // Get trend statuses for all validated trends
        const trendIds = [...new Set(allValidations.map(v => v.trend_id))];
        const { data: trends } = await supabase
          .from('trend_submissions')
          .select('id, status')
          .in('id', trendIds)
          .in('status', ['approved', 'rejected']);

        if (trends) {
          const trendStatusMap = trends.reduce((acc, trend) => {
            acc[trend.id] = trend.status;
            return acc;
          }, {} as Record<string, string>);

          allValidations.forEach(validation => {
            const trendStatus = trendStatusMap[validation.trend_id];
            if (trendStatus) {
              totalCheckedValidations++;
              // User was correct if they confirmed and trend was approved, or rejected and trend was rejected
              if ((validation.confirmed && trendStatus === 'approved') || 
                  (!validation.confirmed && trendStatus === 'rejected')) {
                correctValidations++;
              }
            }
          });
        }
      }

      const accuracyScore = totalCheckedValidations > 0 
        ? Math.round((correctValidations / totalCheckedValidations) * 100)
        : 0;

      setStats({
        verified_today: todayValidations?.length || 0,
        earnings_today: (todayValidations?.length || 0) * 0.10, // $0.10 per validation
        accuracy_score: accuracyScore,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set to 0 if there's an error
      setStats({
        verified_today: 0,
        earnings_today: 0,
        accuracy_score: 0,
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const handleVerify = async (isValid: boolean) => {
    if (verifying || !trends[currentIndex]) return;

    setVerifying(true);
    const trend = trends[currentIndex];

    try {
      // Check if user has already validated this trend
      const { data: existingValidation } = await supabase
        .from('trend_validations')
        .select('id')
        .eq('trend_id', trend.id)
        .eq('validator_id', user?.id)
        .single();

      if (existingValidation) {
        console.log('Already validated this trend');
        // Move to next trend
        if (currentIndex < trends.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          await fetchTrendsToVerify();
          setCurrentIndex(0);
        }
        return;
      }

      // Submit verification vote
      const { error } = await supabase
        .from('trend_validations')
        .insert({
          trend_id: trend.id,
          validator_id: user?.id,
          confirmed: isValid,
          confidence_score: isValid ? 0.8 : 0.2,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update validation count on the trend
      const { error: updateError } = await supabase
        .from('trend_submissions')
        .update({ 
          validation_count: trend.validation_count + 1,
          status: trend.validation_count + 1 >= 3 ? 'approved' : 'validating'
        })
        .eq('id', trend.id);

      if (updateError) console.error('Error updating validation count:', updateError);

      // Fetch updated stats from database
      await fetchUserStats();

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

  const extractTitleFromDescription = (description: string): string => {
    // Try to extract title from the formatted description
    const lines = description.split('\n');
    return lines[0] || 'Untitled Trend';
  };

  const extractPlatformFromDescription = (description: string): string => {
    // Try to extract platform from the formatted description
    const platformMatch = description.match(/Platform:\s*(\w+)/i);
    return platformMatch ? platformMatch[1] : 'Unknown';
  };

  const formatEngagementCount = (count?: number): string => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
  };

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
              {statsLoading ? (
                <div className="h-8 w-16 mx-auto bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-bold text-blue-600">{stats.verified_today}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Verified Today</p>
            </div>
            <div>
              {statsLoading ? (
                <div className="h-8 w-20 mx-auto bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-bold text-green-600">${stats.earnings_today.toFixed(2)}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Earned Today</p>
            </div>
            <div>
              {statsLoading ? (
                <div className="h-8 w-16 mx-auto bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-bold text-purple-600">
                  {stats.accuracy_score > 0 ? `${stats.accuracy_score}%` : 'N/A'}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">Accuracy</p>
            </div>
          </div>
        </div>

        {/* Trend Card */}
        {currentTrend ? (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
            {(currentTrend.thumbnail_url || currentTrend.screenshot_url) && (
              <div className="relative">
                <img
                  src={currentTrend.thumbnail_url || currentTrend.screenshot_url}
                  alt="Trend"
                  className="w-full h-64 object-cover"
                />
                {currentTrend.post_url && (
                  <a 
                    href={currentTrend.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm hover:bg-black/90 transition"
                  >
                    View Original →
                  </a>
                )}
              </div>
            )}
            
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  {extractTitleFromDescription(currentTrend.description)}
                </h2>
                <p className="text-sm text-gray-500">
                  Submitted by <span className="font-semibold text-gray-700">@{currentTrend.spotter?.username || currentTrend.spotter?.email?.split('@')[0] || 'anonymous'}</span> • {format(parseISO(currentTrend.created_at), 'PPp')}
                </p>
              </div>

              {currentTrend.creator_handle && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Original Creator</p>
                  <p className="font-medium text-gray-900">
                    {currentTrend.creator_handle}
                    {currentTrend.creator_name && ` (${currentTrend.creator_name})`}
                  </p>
                </div>
              )}

              {currentTrend.post_caption && (
                <div className="mb-4">
                  <p className="text-gray-700 italic">"{currentTrend.post_caption}"</p>
                </div>
              )}

              {/* Engagement Metrics */}
              {(currentTrend.likes_count || currentTrend.comments_count || currentTrend.shares_count || currentTrend.views_count) ? (
                <div className="flex flex-wrap gap-3 mb-4">
                  {currentTrend.likes_count !== undefined && currentTrend.likes_count > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm">
                      ❤️ {formatEngagementCount(currentTrend.likes_count)}
                    </span>
                  )}
                  {currentTrend.comments_count !== undefined && currentTrend.comments_count > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm">
                      💬 {formatEngagementCount(currentTrend.comments_count)}
                    </span>
                  )}
                  {currentTrend.shares_count !== undefined && currentTrend.shares_count > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm">
                      🔄 {formatEngagementCount(currentTrend.shares_count)}
                    </span>
                  )}
                  {currentTrend.views_count !== undefined && currentTrend.views_count > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-sm">
                      👁️ {formatEngagementCount(currentTrend.views_count)}
                    </span>
                  )}
                </div>
              ) : null}

              {/* Hashtags */}
              {currentTrend.hashtags && currentTrend.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {currentTrend.hashtags.map((tag, index) => (
                    <span key={index} className="text-sm text-blue-600">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100">
                  📂 {currentTrend.category.replace(/_/g, ' ')}
                </span>
                {currentTrend.platform && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100">
                    📱 {currentTrend.platform}
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100">
                  ✓ {currentTrend.validation_count} validations
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
          <div className="space-y-3">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Is this a trending topic?</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => handleVerify(false)}
                  disabled={verifying}
                  className="flex-1 bg-white border-2 border-red-500 text-red-600 py-3 px-4 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Not Trending</span>
                </button>
                <button
                  onClick={() => handleVerify(true)}
                  disabled={verifying}
                  className="flex-1 bg-green-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Yes, Trending</span>
                </button>
              </div>
            </div>
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