'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestSupabaseConnection() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Test 1: Check if Supabase is reachable
      const healthCheck = await fetch('https://aicahushpcslwjwrlqbo.supabase.co/rest/v1/', {
        method: 'HEAD',
      }).catch(err => ({ ok: false, error: err.message }));

      // Test 2: Try to get session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      // Test 3: Try a simple query
      const { data: testData, error: queryError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      setResult({
        healthCheck: healthCheck.ok ? 'Connection successful' : 'Connection failed',
        session: sessionError ? sessionError.message : (sessionData?.session ? 'Active session' : 'No session'),
        query: queryError ? queryError.message : 'Query successful',
        supabaseUrl: 'https://aicahushpcslwjwrlqbo.supabase.co',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'testpassword123'
      });

      setResult({
        success: !error,
        message: error ? error.message : 'Login would succeed if credentials were valid',
        details: error
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Supabase Connection Test</h1>

        <div className="space-y-4">
          <button
            onClick={testConnection}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            onClick={testLogin}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 ml-4"
          >
            {loading ? 'Testing...' : 'Test Login Flow'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded">
            <h2 className="font-bold text-red-700">Error:</h2>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-gray-100 border border-gray-300 rounded">
            <h2 className="font-bold mb-2">Test Results:</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-300 rounded">
          <h2 className="font-bold mb-2">Configuration Info:</h2>
          <p className="text-sm">
            <strong>Supabase URL:</strong> https://aicahushpcslwjwrlqbo.supabase.co<br/>
            <strong>Anon Key:</strong> {'{configured}'}<br/>
            <strong>Auth Method:</strong> PKCE Flow
          </p>
        </div>
      </div>
    </div>
  );
}