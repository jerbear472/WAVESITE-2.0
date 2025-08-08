'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import SimpleLoader from '@/components/SimpleLoader';

export default function DebugAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testDirectAuth = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // Test 1: Check Supabase connection
      const { data: healthCheck } = await supabase.from('profiles').select('count').limit(1);
      console.log('Supabase connection:', healthCheck ? 'OK' : 'Failed');
      
      // Test 2: Direct auth attempt
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError) {
        setResult({
          success: false,
          error: authError.message,
          details: authError,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        });
        return;
      }
      
      // Test 3: Check profile
      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();
          
        setResult({
          success: true,
          user: authData.user,
          session: authData.session,
          profile: profile,
          profileError: profileError,
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message,
        stack: err.stack,
      });
    } finally {
      setLoading(false);
    }
  };

  const checkSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    setResult({
      session,
      error,
      timestamp: new Date().toISOString(),
    });
  };

  const testProfilesTable = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
        
      setResult({
        success: !error,
        data,
        error,
        tableExists: !error || !error.message.includes('relation'),
      });
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message,
      });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Authentication</h1>
      
      <div className="space-y-4 mb-8">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      
      <div className="space-y-4 mb-8">
        <button
          onClick={testDirectAuth}
          disabled={loading || !email || !password}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Test Direct Auth
        </button>
        
        <button
          onClick={checkSession}
          className="px-4 py-2 bg-green-500 text-white rounded ml-4"
        >
          Check Current Session
        </button>
        
        <button
          onClick={testProfilesTable}
          className="px-4 py-2 bg-purple-500 text-white rounded ml-4"
        >
          Test Profiles Table
        </button>
      </div>
      
      {loading && (
        <div className="flex justify-center py-4">
          <SimpleLoader />
        </div>
      )}
      
      {result && (
        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Result:</h2>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-yellow-100 rounded">
        <h3 className="font-bold">Environment:</h3>
        <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
        <p>Has Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}