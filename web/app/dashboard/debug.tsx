'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function DebugSupabase() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        console.log('Fetching from Supabase...');
        
        // Test basic connection
        const { data: trends, error: trendsError } = await supabase
          .from('trend_submissions')
          .select('*')
          .limit(5);
        
        if (trendsError) {
          console.error('Trends error:', trendsError);
          setError(trendsError);
        } else {
          console.log('Trends data:', trends);
          setData(trends);
        }
      } catch (err) {
        console.error('Catch error:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="p-4 bg-gray-800 rounded-lg mb-4">
      <h3 className="text-lg font-bold mb-2">Supabase Debug</h3>
      {loading && <p>Loading...</p>}
      {error && (
        <div className="text-red-500">
          <p>Error: {error.message || JSON.stringify(error)}</p>
        </div>
      )}
      {data && (
        <div className="text-green-500">
          <p>Success! Found {data.length} trends</p>
          <pre className="text-xs overflow-auto max-h-40">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}