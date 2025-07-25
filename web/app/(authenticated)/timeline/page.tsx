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

  useEffect(() => {
    if (user) {
      fetchUserTrends();
    }
  }, [user]);

  const fetchUserTrends = async () => {
    try {
      const { data, error } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrends(data || []);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
    }
  };

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
        
        <div className="space-y-4">
          {trends.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No trends spotted yet. Start scrolling to find trending content!</p>
            </div>
          ) : (
            trends.map((trend) => (
              <div key={trend.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {trend.emoji} {trend.category}
                    </h3>
                    {trend.notes && (
                      <p className="text-gray-600 mb-2">{trend.notes}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      {format(parseISO(trend.created_at), 'PPp')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    trend.status === 'verified' ? 'bg-green-100 text-green-800' :
                    trend.status === 'rewarded' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {trend.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}