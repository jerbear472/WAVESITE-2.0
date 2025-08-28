'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function TestXPPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testXPSystem = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Test via API
      const response = await fetch('/api/test-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      
      const data = await response.json();
      setResults(data);
      
      // Also check current user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('total_xp, current_streak')
        .eq('id', user.id)
        .single();
      
      setResults((prev: any) => ({
        ...prev,
        currentProfile: profile
      }));
      
    } catch (error) {
      setResults({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const debugXPStructure = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/debug-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const directXPTest = async () => {
    if (!user) return;
    
    setLoading(true);
    const testResults: any = {};
    
    try {
      // Test 1: Direct user_profiles update
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('total_xp')
        .eq('id', user.id)
        .single();
      
      testResults.profileFetch = { data: profile, error: profileError };
      
      if (profile) {
        const newXP = (profile.total_xp || 0) + 5;
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ total_xp: newXP })
          .eq('id', user.id);
        
        testResults.profileUpdate = { 
          success: !updateError, 
          error: updateError,
          newXP 
        };
      }
      
      // Test 2: Check if RPC function exists
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('award_xp', {
          p_user_id: user.id,
          p_xp_amount: 5,
          p_event_type: 'test',
          p_description: 'Direct RPC test'
        });
      
      testResults.rpcFunction = { data: rpcData, error: rpcError };
      
      setResults(testResults);
    } catch (error) {
      setResults({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const simpleXPTest = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/simple-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id,
          amount: 10,
          type: 'validation'
        })
      });
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">XP System Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <p className="mb-4">User ID: {user?.id}</p>
          
          <div className="flex gap-4 mb-6 flex-wrap">
            <button
              onClick={simpleXPTest}
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              Simple XP Test
            </button>
            
            <button
              onClick={testXPSystem}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Test XP System
            </button>
            
            <button
              onClick={debugXPStructure}
              disabled={loading}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              Debug XP Structure
            </button>
            
            <button
              onClick={directXPTest}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Direct Database Test
            </button>
          </div>
          
          {loading && <p>Testing...</p>}
          
          {results && (
            <div className="mt-4">
              <h3 className="font-bold mb-2">Results:</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}