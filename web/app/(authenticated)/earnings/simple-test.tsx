'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function SimpleEarningsTest() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEarnings() {
      if (!user?.id) {
        setError('No user ID');
        setLoading(false);
        return;
      }

      console.log('Fetching for user:', user.id);

      try {
        // Try the simplest possible query
        const { data, error: fetchError } = await supabase
          .from('earnings_ledger')
          .select('*')
          .eq('user_id', user.id);

        console.log('Raw response:', { data, error: fetchError });

        if (fetchError) {
          setError(fetchError.message);
          console.error('Fetch error:', fetchError);
        } else {
          setEarnings(data || []);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('Unexpected error');
      } finally {
        setLoading(false);
      }
    }

    fetchEarnings();
  }, [user?.id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-4">
      <h1>Simple Earnings Test</h1>
      <p>User ID: {user?.id}</p>
      <p>Found {earnings.length} earnings</p>
      {earnings.length > 0 && (
        <pre>{JSON.stringify(earnings[0], null, 2)}</pre>
      )}
    </div>
  );
}