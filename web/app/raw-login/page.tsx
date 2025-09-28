'use client';

import { useState } from 'react';

export default function RawLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('');

  const testLogin = async () => {
    setResult('Testing...');

    // Raw fetch directly to Supabase Auth API
    try {
      const response = await fetch('https://aicahushpcslwjwrlqbo.supabase.co/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w'
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));

      if (data.access_token) {
        localStorage.setItem('sb-aicahushpcslwjwrlqbo-auth-token', JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Date.now() + data.expires_in * 1000
        }));

        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      }
    } catch (err: any) {
      setResult('Error: ' + err.message);
    }
  };

  return (
    <div className="p-8 bg-black text-white min-h-screen">
      <h1 className="text-2xl mb-4">Raw Login Test</h1>

      <div className="space-y-4 max-w-md">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 bg-gray-800"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 bg-gray-800"
        />

        <button
          onClick={testLogin}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700"
        >
          Test Raw Login
        </button>

        <pre className="bg-gray-900 p-4 overflow-auto text-xs">
          {result || 'No result yet'}
        </pre>
      </div>
    </div>
  );
}