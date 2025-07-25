'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, parseISO, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

interface Session {
  id: string;
  created_at: string;
  duration_minutes: number;
  trends_logged: number;
  base_earnings: number;
  bonus_earnings: number;
  total_earnings: number;
}

interface WeeklySummary {
  week_start: string;
  sessions: number;
  total_earnings: number;
  avg_per_session: number;
  trends_logged: number;
}

export default function Earnings() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    if (user) {
      fetchEarningsData();
    }
  }, [user, timeRange]);

  const fetchEarningsData = async () => {
    try {
      // Determine date range
      let startDate = new Date();
      if (timeRange === 'week') {
        startDate = startOfWeek(new Date());
      } else if (timeRange === 'month') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
      } else {
        startDate = new Date(0); // Beginning of time
      }

      // Fetch scroll sessions
      let query = supabase
        .from('scroll_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (timeRange !== 'all') {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data: sessionsData, error: sessionsError } = await query;

      if (sessionsError) throw sessionsError;

      setSessions(sessionsData || []);

      // Calculate weekly summaries
      const summaries = calculateWeeklySummaries(sessionsData || []);
      setWeeklySummaries(summaries);

    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklySummaries = (sessions: Session[]): WeeklySummary[] => {
    const summariesMap = new Map<string, WeeklySummary>();

    sessions.forEach(session => {
      const weekStart = startOfWeek(parseISO(session.created_at));
      const weekKey = weekStart.toISOString();

      if (!summariesMap.has(weekKey)) {
        summariesMap.set(weekKey, {
          week_start: weekKey,
          sessions: 0,
          total_earnings: 0,
          avg_per_session: 0,
          trends_logged: 0,
        });
      }

      const summary = summariesMap.get(weekKey)!;
      summary.sessions += 1;
      summary.total_earnings += session.total_earnings;
      summary.trends_logged += session.trends_logged;
      summary.avg_per_session = summary.total_earnings / summary.sessions;
    });

    return Array.from(summariesMap.values()).sort((a, b) => 
      new Date(b.week_start).getTime() - new Date(a.week_start).getTime()
    );
  };

  const totalEarnings = sessions.reduce((sum, s) => sum + s.total_earnings, 0);
  const totalSessions = sessions.length;
  const avgPerSession = totalSessions > 0 ? totalEarnings / totalSessions : 0;
  const totalBonuses = sessions.reduce((sum, s) => sum + s.bonus_earnings, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Earnings Dashboard</h1>
          <p className="text-gray-600">Track your scroll sessions and earnings</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 mb-6">
          {(['week', 'month', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              This {range === 'all' ? 'All Time' : range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <h3 className="text-sm font-medium opacity-90">Total Earnings</h3>
            <p className="text-3xl font-bold mt-1">${totalEarnings.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Sessions</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalSessions}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Avg per Session</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">${avgPerSession.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Bonuses</h3>
            <p className="text-2xl font-bold text-purple-600 mt-1">${totalBonuses.toFixed(2)}</p>
          </div>
        </div>

        {/* Weekly Breakdown */}
        {weeklySummaries.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Weekly Breakdown</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Week
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sessions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trends
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg/Session
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {weeklySummaries.map((summary) => (
                    <tr key={summary.week_start}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Week of {format(parseISO(summary.week_start), 'MMM d')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {summary.sessions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {summary.trends_logged}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${summary.avg_per_session.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${summary.total_earnings.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Session Details */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Session History</h2>
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500">No sessions found. Start scrolling to earn!</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {format(parseISO(session.created_at), 'PPP')}
                      </h3>
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                        <span>⏱ {session.duration_minutes} minutes</span>
                        <span>📍 {session.trends_logged} trends</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        ${session.total_earnings.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        ${session.base_earnings.toFixed(2)} base + ${session.bonus_earnings.toFixed(2)} bonus
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          </div>
        </div>
      </div>
  );
}