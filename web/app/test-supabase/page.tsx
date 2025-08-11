'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';

export default function TestSupabase() {
  const [info, setInfo] = useState<any>({});
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function checkSupabase() {
      // Get the actual URL being used
      const url = (supabase as any).supabaseUrl || (supabase as any).restUrl || 'Unknown';
      
      // Check which instance
      const isNew = url.includes('aicahushpcslwjwrlqbo');
      const isOld = url.includes('aicahushpcslwjwrlqbo');
      
      // Try to query users to see which database
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, username, created_at')
        .order('created_at', { ascending: false })
        .limit(3);
      
      // Try to query trends
      const { data: trends, error: trendError } = await supabase
        .from('trend_submissions')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .limit(3);
      
      setInfo({
        url,
        isNew,
        isOld,
        profiles: profiles || [],
        profileError: profileError?.message,
        trends: trends || [],
        trendError: trendError?.message,
        envUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
      });
    }
    
    checkSupabase();
  }, []);

  return (
    <div className="min-h-screen p-8 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-8">Supabase Connection Test</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Active Supabase Instance:</h2>
          <p className="font-mono text-sm">{info.url}</p>
          {info.isNew && (
            <p className="text-green-500 mt-2">✅ Using NEW Supabase (Good!)</p>
          )}
          {info.isOld && (
            <p className="text-red-500 mt-2">❌ Using OLD Supabase (This causes numeric overflow!)</p>
          )}
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Environment Variable:</h2>
          <p className="font-mono text-sm">{info.envUrl}</p>
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Recent Users:</h2>
          {info.profileError ? (
            <p className="text-red-500">Error: {info.profileError}</p>
          ) : (
            <ul>
              {info.profiles?.map((p: any) => (
                <li key={p.id} className="text-sm">
                  {p.username} - {new Date(p.created_at).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Recent Trends:</h2>
          {info.trendError ? (
            <p className="text-red-500">Error: {info.trendError}</p>
          ) : (
            <p>{info.trends?.length || 0} trends found</p>
          )}
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">What This Means:</h2>
          {info.isNew ? (
            <div>
              <p>✅ You're connected to the NEW Supabase instance</p>
              <p>- You should NOT see old user accounts</p>
              <p>- You should NOT get numeric overflow errors</p>
              <p>- You need to create new accounts</p>
            </div>
          ) : info.isOld ? (
            <div>
              <p>❌ You're still connected to the OLD Supabase instance</p>
              <p>- This explains the numeric overflow errors</p>
              <p>- Clear your browser cache</p>
              <p>- Restart the dev server</p>
            </div>
          ) : (
            <p>Checking...</p>
          )}
        </div>
      </div>
    </div>
  );
}