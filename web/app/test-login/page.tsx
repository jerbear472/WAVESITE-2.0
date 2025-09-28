'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';

export default function TestLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[${timestamp}] ${message}`);
  };

  const testDirectSupabaseLogin = async () => {
    setLogs([]);
    setLoading(true);

    try {
      addLog('Starting direct Supabase login test...');
      addLog(`Email: ${email}`);
      addLog(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
      addLog(`Anon Key Length: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0}`);

      // Test 1: Check if we can reach Supabase at all
      addLog('Test 1: Checking Supabase health...');
      try {
        const healthCheck = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
          method: 'GET',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
        });
        addLog(`Health check status: ${healthCheck.status}`);
      } catch (err: any) {
        addLog(`Health check failed: ${err.message}`);
      }

      // Test 2: Try to get current session
      addLog('Test 2: Getting current session...');
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          addLog(`Session error: ${sessionError.message}`);
        } else {
          addLog(`Session exists: ${sessionData?.session ? 'Yes' : 'No'}`);
        }
      } catch (err: any) {
        addLog(`Session check exception: ${err.message}`);
      }

      // Test 3: Attempt actual login
      addLog('Test 3: Attempting login...');
      try {
        const startTime = Date.now();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        const duration = Date.now() - startTime;

        addLog(`Login duration: ${duration}ms`);

        if (error) {
          addLog(`Login error: ${error.message}`);
          addLog(`Error status: ${(error as any).status || 'unknown'}`);
          addLog(`Error code: ${(error as any).code || 'unknown'}`);

          // Check for specific error types
          if (error.message.includes('fetch')) {
            addLog('NETWORK ERROR: Unable to reach Supabase');
            addLog('Possible causes:');
            addLog('1. Supabase URL is incorrect');
            addLog('2. CORS is blocking the request');
            addLog('3. Network connectivity issues');
          }
        } else if (data?.user) {
          addLog('✅ LOGIN SUCCESSFUL!');
          addLog(`User ID: ${data.user.id}`);
          addLog(`User Email: ${data.user.email}`);
          addLog(`Session: ${data.session ? 'Created' : 'No session'}`);
        } else {
          addLog('❌ Login returned no error but also no user data');
        }
      } catch (err: any) {
        addLog(`Login exception: ${err.message}`);
        addLog(`Exception type: ${err.name}`);
        addLog(`Stack trace: ${err.stack?.substring(0, 200)}...`);

        // Network error detection
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          addLog('');
          addLog('🔴 NETWORK ERROR DETECTED');
          addLog('This usually means:');
          addLog('1. The Supabase URL is incorrect or unreachable');
          addLog('2. CORS is blocking the request from your domain');
          addLog('3. The Supabase instance is down or not responding');
          addLog('');
          addLog('Please check:');
          addLog('- Vercel environment variables are set correctly');
          addLog('- Supabase project is active and not paused');
          addLog('- Your domain is allowed in Supabase settings');
        }
      }

      // Test 4: Try a simple fetch to see if we can reach Supabase
      addLog('Test 4: Direct fetch test...');
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'Content-Type': 'application/json',
          },
        });
        addLog(`Direct fetch status: ${response.status}`);
      } catch (err: any) {
        addLog(`Direct fetch failed: ${err.message}`);
      }

    } catch (err: any) {
      addLog(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
      addLog('Test complete');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Login Debug Test</h1>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Login Test</h2>

          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full p-2 border rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full p-2 border rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              onClick={testDirectSupabaseLogin}
              disabled={loading || !email || !password}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? 'Testing...' : 'Test Login'}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>

          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-auto max-h-96">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Try logging in to see debug information.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={
                  log.includes('ERROR') ? 'text-red-400' :
                  log.includes('SUCCESS') || log.includes('✅') ? 'text-green-400' :
                  log.includes('❌') || log.includes('🔴') ? 'text-red-400' :
                  log.includes('Test') ? 'text-yellow-400' :
                  'text-gray-300'
                }>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 p-4 rounded">
          <h3 className="font-semibold text-blue-900 mb-2">Environment Check:</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</li>
            <li>Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</li>
            <li>Site URL: {process.env.NEXT_PUBLIC_SITE_URL || 'Not set'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}