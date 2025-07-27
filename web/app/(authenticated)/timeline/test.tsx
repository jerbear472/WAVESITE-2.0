'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        // Get session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        
        if (!currentSession) {
          setError('No session found');
          return;
        }

        // Test 1: Try to fetch from trend_submissions without any filters
        console.log('Test 1: Fetching all trends (limited)...');
        const { data: allTrends, error: allError } = await supabase
          .from('trend_submissions')
          .select('id, spotter_id, category, status')
          .limit(5);
        
        console.log('All trends result:', { data: allTrends, error: allError });

        // Test 2: Try to fetch with user filter
        console.log('Test 2: Fetching user trends...');
        const { data: userTrends, error: userError } = await supabase
          .from('trend_submissions')
          .select('*')
          .eq('spotter_id', currentSession.user.id);
        
        console.log('User trends result:', { data: userTrends, error: userError });

        // Test 3: Check user_profiles table
        console.log('Test 3: Fetching user profile...');
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();
        
        console.log('Profile result:', { data: profile, error: profileError });

        setData({
          session: currentSession,
          allTrends,
          userTrends,
          profile,
          errors: {
            allError,
            userError,
            profileError
          }
        });
      } catch (err) {
        console.error('Test error:', err);
        setError(err);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {JSON.stringify(error, null, 2)}
        </div>
      )}

      {session && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Session Info:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            {JSON.stringify({
              userId: session.user.id,
              email: session.user.email,
              role: session.user.role
            }, null, 2)}
          </pre>
        </div>
      )}

      {data && (
        <div>
          <h2 className="text-xl font-semibold">Test Results:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}