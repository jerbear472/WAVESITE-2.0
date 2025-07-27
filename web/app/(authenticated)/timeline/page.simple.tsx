'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SimpleTimeline() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    checkUserAndFetchTrends();
  }, []);

  const checkUserAndFetchTrends = async () => {
    try {
      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);

      // Fetch trends
      const { data, error } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('spotter_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error:', error);
        setError(error.message);
      } else {
        setTrends(data || []);
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">My Timeline (Simple)</h1>
        
        {user && (
          <div className="bg-blue-50 p-3 rounded mb-4 text-sm">
            <p>Logged in as: {user.email}</p>
            <p>User ID: {user.id}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        <div className="mb-4">
          <button
            onClick={() => router.push('/submit')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Submit New Trend
          </button>
        </div>

        {trends.length === 0 ? (
          <div className="bg-white p-8 rounded shadow text-center">
            <p>No trends found. Submit your first trend!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {trends.map((trend) => (
              <div key={trend.id} className="bg-white p-4 rounded shadow">
                <h3 className="font-semibold">{trend.category}</h3>
                <p className="text-gray-600 text-sm">{trend.description}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Status: {trend.status} | Created: {new Date(trend.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}