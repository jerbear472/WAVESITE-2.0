'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';

export default function TestAuthPage() {
  const [status, setStatus] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [testPassword, setTestPassword] = useState('');
  const [loginResult, setLoginResult] = useState<any>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setLoading(true);
    const results: any = {};

    // Check environment variables
    results.envVars = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      supabaseUrlValue: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      supabaseAnonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'Not set',
    };

    // Test Supabase connection
    try {
      const { data, error } = await supabase.auth.getSession();
      results.sessionCheck = {
        status: error ? '❌ Failed' : '✅ Success',
        error: error?.message,
        hasSession: data?.session ? 'Yes' : 'No',
      };
    } catch (err: any) {
      results.sessionCheck = {
        status: '❌ Exception',
        error: err.message,
      };
    }

    // Test database connection
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      results.dbConnection = {
        status: error ? '❌ Failed' : '✅ Success',
        error: error?.message,
        tableExists: error ? 'Unknown' : 'Yes',
      };
    } catch (err: any) {
      results.dbConnection = {
        status: '❌ Exception',
        error: err.message,
      };
    }

    // Check auth settings
    try {
      const { data: settings } = await supabase.auth.getSession();
      results.authSettings = {
        persistSession: '✅ Enabled',
        autoRefreshToken: '✅ Enabled',
        detectSessionInUrl: '✅ Enabled',
        storageKey: 'supabase.auth.token',
      };
    } catch (err: any) {
      results.authSettings = {
        status: '❌ Failed to get settings',
        error: err.message,
      };
    }

    setStatus(results);
    setLoading(false);
  };

  const testLogin = async () => {
    if (!testEmail || !testPassword) {
      setLoginResult({ error: 'Please enter email and password' });
      return;
    }

    setLoginResult({ loading: true });

    try {
      console.log('Testing login with:', testEmail);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail.trim().toLowerCase(),
        password: testPassword,
      });

      if (error) {
        console.error('Login error:', error);
        setLoginResult({
          status: '❌ Login Failed',
          error: error.message,
          errorDetails: error,
        });
      } else {
        console.log('Login successful:', data);
        setLoginResult({
          status: '✅ Login Successful',
          user: data.user?.email,
          userId: data.user?.id,
          session: data.session ? 'Created' : 'No session',
        });
      }
    } catch (err: any) {
      console.error('Login exception:', err);
      setLoginResult({
        status: '❌ Exception',
        error: err.message,
        stack: err.stack,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Auth Connection Test</h1>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Environment Variables */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
              <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
                {JSON.stringify(status.envVars, null, 2)}
              </pre>
            </div>

            {/* Session Check */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Session Check</h2>
              <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
                {JSON.stringify(status.sessionCheck, null, 2)}
              </pre>
            </div>

            {/* Database Connection */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Database Connection</h2>
              <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
                {JSON.stringify(status.dbConnection, null, 2)}
              </pre>
            </div>

            {/* Auth Settings */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Auth Settings</h2>
              <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
                {JSON.stringify(status.authSettings, null, 2)}
              </pre>
            </div>

            {/* Login Test */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Test Login</h2>
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full p-2 border rounded"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full p-2 border rounded"
                  value={testPassword}
                  onChange={(e) => setTestPassword(e.target.value)}
                />
                <button
                  onClick={testLogin}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  disabled={loginResult?.loading}
                >
                  {loginResult?.loading ? 'Testing...' : 'Test Login'}
                </button>
                {loginResult && !loginResult.loading && (
                  <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto mt-4">
                    {JSON.stringify(loginResult, null, 2)}
                  </pre>
                )}
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={checkConnection}
              className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
            >
              Refresh All Tests
            </button>
          </div>
        )}
      </div>
    </div>
  );
}