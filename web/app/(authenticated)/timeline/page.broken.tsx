'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';

interface Trend {
  id: string;
  created_at: string;
  category: string;
  notes?: string;
  emoji?: string;
  status: 'pending' | 'verified' | 'rewarded';
  bonus_earnings?: number;
  platform?: string;
  verification_count?: number;
  image_url?: string;
}

export default function Timeline() {
  const { user } = useAuth();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchUserTrends();
    }
  }, [user, filter, statusFilter]);

  const fetchUserTrends = async () => {
    try {
      let query = supabase
        .from('trend_submissions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('category', filter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTrends(data || []);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rewarded: 'bg-purple-100 text-purple-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || ''}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const categories = ['all', 'fashion', 'wellness', 'meme', 'audio', 'tech', 'lifestyle'];
  const statuses = ['all', 'pending', 'verified', 'rewarded'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Trend Timeline</h1>
          <p className="text-gray-600">Track all your spotted trends and their verification status</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Trends</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{trends.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Verified</h3>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {trends.filter(t => t.status === 'verified' || t.status === 'rewarded').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Pending</h3>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {trends.filter(t => t.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Bonus Earned</h3>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              ${trends.reduce((sum, t) => sum + (t.bonus_earnings || 0), 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Trends List */}
        <div className="space-y-4">
          {trends.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">No trends found. Start scrolling to spot trends!</p>
            </div>
          ) : (
            trends.map((trend) => (
              <div key={trend.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{trend.emoji || '📍'}</span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {trend.category.charAt(0).toUpperCase() + trend.category.slice(1)} Trend
                      </h3>
                      {getStatusBadge(trend.status)}
                    </div>
                    
                    {trend.notes && (
                      <p className="text-gray-600 mb-2">{trend.notes}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{format(parseISO(trend.created_at), 'PPp')}</span>
                      {trend.platform && (
                        <span className="flex items-center gap-1">
                          <span>📱</span> {trend.platform}
                        </span>
                      )}
                      {trend.verification_count && trend.verification_count > 0 && (
                        <span className="flex items-center gap-1">
                          <span>✓</span> {trend.verification_count} verifications
                        </span>
                      )}
                    </div>
                    
                    {trend.bonus_earnings && trend.bonus_earnings > 0 && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          +${trend.bonus_earnings.toFixed(2)} bonus
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {trend.image_url && (
                    <div className="ml-4 flex-shrink-0">
                      <img
                        src={trend.image_url}
                        alt="Trend"
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    </div>
                  )}
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