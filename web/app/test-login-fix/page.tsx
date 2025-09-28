'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestLoginFix() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testDirectLogin = async () => {
    setLoading(true);
    setResult('Testing direct Supabase login...');

    try {
      console.log('[TEST] Starting login with:', email);

      // Direct Supabase auth call
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (error) {
        console.error('[TEST] Login error:', error);
        setResult({
          success: false,
          error: error.message,
          details: error
        });
      } else {
        console.log('[TEST] Login successful:', data);
        setResult({
          success: true,
          user: data.user,
          session: data.session ? 'Session created' : 'No session'
        });

        // Test fetching user profile
        if (data.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          setResult(prev => ({
            ...prev,
            profile: profile || profileError
          }));
        }
      }
    } catch (err: any) {
      console.error('[TEST] Exception:', err);
      setResult({
        success: false,
        exception: err.message,
        stack: err.stack
      });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing Supabase connection...');

    try {
      // Test if we can reach Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        setResult({
          connection: 'Failed',
          error: error.message,
          details: error
        });
      } else {
        setResult({
          connection: 'Success',
          message: 'Supabase is reachable'
        });
      }
    } catch (err: any) {
      setResult({
        connection: 'Failed',
        exception: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Login Fix Test</h1>

      <div className="max-w-2xl space-y-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Test Connection</h2>
          <button
            onClick={testConnection}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
          >
            Test Supabase Connection
          </button>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Test Login</h2>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-700 rounded"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-700 rounded"
            />
            <button
              onClick={testDirectLogin}
              disabled={loading || !email || !password}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
            >
              Test Direct Login
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Result:</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}