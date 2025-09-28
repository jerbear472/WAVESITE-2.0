'use client';

import { useState, useEffect } from 'react';

export default function DebugLoad() {
  const [status, setStatus] = useState<string[]>([]);

  useEffect(() => {
    const log = (msg: string) => {
      console.log(msg);
      setStatus(prev => [...prev, `${new Date().toISOString()}: ${msg}`]);
    };

    log('Page mounted');

    // Test 1: Check if Supabase library loads
    try {
      const { createClient } = require('@supabase/supabase-js');
      log('✅ Supabase library loaded');

      // Test 2: Create a client
      const client = createClient(
        'https://aicahushpcslwjwrlqbo.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w'
      );
      log('✅ Client created');

      // Test 3: Try to make a simple request
      client.auth.getSession().then(({ data, error }) => {
        if (error) {
          log(`❌ Session check failed: ${error.message}`);
        } else {
          log(`✅ Session check succeeded: ${data.session ? 'Has session' : 'No session'}`);
        }
      }).catch(err => {
        log(`❌ Session check exception: ${err.message}`);
      });

    } catch (err: any) {
      log(`❌ Error loading/creating client: ${err.message}`);
    }

    // Test 4: Check window/document
    log(`Window defined: ${typeof window !== 'undefined'}`);
    log(`Document defined: ${typeof document !== 'undefined'}`);

    // Test 5: Check network
    fetch('https://aicahushpcslwjwrlqbo.supabase.co/rest/v1/', {
      method: 'HEAD',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w'
      }
    }).then(response => {
      log(`✅ Network test: Status ${response.status}`);
    }).catch(err => {
      log(`❌ Network test failed: ${err.message}`);
    });

  }, []);

  const testLogin = async () => {
    const log = (msg: string) => {
      console.log(msg);
      setStatus(prev => [...prev, `${new Date().toISOString()}: ${msg}`]);
    };

    try {
      log('Starting login test...');

      const response = await fetch('https://aicahushpcslwjwrlqbo.supabase.co/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword'
        })
      });

      const data = await response.json();
      log(`Login response: ${JSON.stringify(data).substring(0, 200)}`);
    } catch (err: any) {
      log(`Login test error: ${err.message}`);
    }
  };

  return (
    <div className="p-8 bg-black text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Debug Load Failure</h1>

      <button
        onClick={testLogin}
        className="mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
      >
        Test Raw Login
      </button>

      <div className="space-y-2">
        {status.map((line, i) => (
          <div key={i} className={`font-mono text-sm ${line.includes('❌') ? 'text-red-400' : line.includes('✅') ? 'text-green-400' : 'text-gray-300'}`}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}