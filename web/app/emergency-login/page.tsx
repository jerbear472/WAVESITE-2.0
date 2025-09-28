'use client';

import { useState } from 'react';

export default function EmergencyLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setResult('Testing connection...');

    try {
      // Direct API call to Supabase Auth
      const response = await fetch('https://aicahushpcslwjwrlqbo.supabase.co/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        setResult('✅ LOGIN SUCCESSFUL! Token received.');

        // Store the token
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Date.now() + data.expires_in * 1000,
        }));

        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        setResult(`❌ Login failed: ${data.error || data.msg || 'Unknown error'}`);
      }
    } catch (error: any) {
      setResult(`❌ Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setResult('Testing Supabase connection...');

    try {
      const response = await fetch('https://aicahushpcslwjwrlqbo.supabase.co/rest/v1/', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w',
        }
      });

      if (response.ok) {
        setResult('✅ Supabase is reachable!');
      } else {
        setResult(`❌ Supabase returned status: ${response.status}`);
      }
    } catch (error: any) {
      setResult(`❌ Cannot reach Supabase: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-8">Emergency Login</h1>

        <div className="space-y-4 bg-gray-800 p-6 rounded-lg">
          <div>
            <label className="block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded"
              placeholder="password"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={testConnection}
              className="px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700"
            >
              Test Connection
            </button>

            <button
              onClick={testLogin}
              disabled={loading || !email || !password}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-600"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>

          <div className="mt-4 p-4 bg-gray-900 rounded">
            <pre className="text-sm whitespace-pre-wrap">{result}</pre>
          </div>

          <div className="text-xs text-gray-400">
            <p>Quick fill for testing:</p>
            <button
              onClick={() => {
                setEmail('demo@wavesight.com');
                setPassword('Demo123!');
              }}
              className="text-blue-400 hover:text-blue-300"
            >
              Use demo credentials
            </button>
          </div>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>This page makes direct API calls to Supabase.</p>
          <p>If this fails, the issue is with:</p>
          <ul className="list-disc ml-5 mt-2">
            <li>Supabase project configuration</li>
            <li>Network/CORS blocking</li>
            <li>Invalid credentials</li>
          </ul>
        </div>
      </div>
    </div>
  );
}