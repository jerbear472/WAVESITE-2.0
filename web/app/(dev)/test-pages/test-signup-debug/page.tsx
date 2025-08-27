'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestSignupDebug() {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    email: `test${Date.now()}@example.com`,
    username: `testuser${Date.now()}`,
    password: 'TestPassword123!',
    birthday: '2000-01-01',
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    setLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testDirectSupabase = async () => {
    setLoading(true);
    setLog([]);
    addLog('Starting direct Supabase signup test...');
    
    try {
      addLog(`Testing with email: ${formData.email}`);
      
      // Test 1: Direct auth signup
      addLog('Calling supabase.auth.signUp...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            username: formData.username,
            birthday: formData.birthday,
          }
        }
      });
      
      if (authError) {
        addLog(`❌ Auth error: ${authError.message}`);
        addLog(`Error details: ${JSON.stringify(authError)}`);
        return;
      }
      
      addLog('✅ Auth signup successful!');
      addLog(`User ID: ${authData.user?.id}`);
      addLog(`Session: ${authData.session ? 'Created' : 'Not created'}`);
      addLog(`Email confirmed: ${authData.user?.email_confirmed_at ? 'Yes' : 'No'}`);
      
      // Test 2: Check profile
      if (authData.user) {
        addLog('Waiting for profile creation...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();
        
        if (profileError) {
          addLog(`⚠️ Profile check: ${profileError.message}`);
        } else {
          addLog('✅ Profile found in database');
        }
        
        // Test 3: RPC function
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('complete_user_registration', {
            p_user_id: authData.user.id,
            p_email: formData.email,
            p_username: formData.username,
            p_birthday: formData.birthday
          });
        
        if (rpcError) {
          addLog(`⚠️ RPC: ${rpcError.message}`);
        } else {
          addLog('✅ RPC completed successfully');
        }
      }
      
    } catch (error: any) {
      addLog(`❌ Unexpected error: ${error.message}`);
      console.error('Full error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testAuthContext = async () => {
    setLoading(true);
    setLog([]);
    addLog('Testing via AuthContext (simulated)...');
    
    try {
      addLog('Importing useAuth hook...');
      const { register } = await import('@/contexts/AuthContext').then(m => {
        // This won't work directly, but shows the approach
        addLog('❌ Cannot directly use hooks in this context');
        throw new Error('Hook usage not valid here');
      });
    } catch (error: any) {
      addLog(`Expected: ${error.message}`);
      addLog('Would need to test from actual register page');
    }
    
    setLoading(false);
  };

  const testNetworkRequest = async () => {
    setLoading(true);
    setLog([]);
    addLog('Testing network connectivity...');
    
    try {
      // Test Supabase URL directly
      addLog('Fetching Supabase health check...');
      const response = await fetch('https://aicahushpcslwjwrlqbo.supabase.co/rest/v1/', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w',
        }
      });
      
      if (response.ok) {
        addLog('✅ Supabase API is reachable');
      } else {
        addLog(`⚠️ Response status: ${response.status}`);
      }
      
      // Test auth endpoint
      addLog('Testing auth endpoint...');
      const authResponse = await fetch('https://aicahushpcslwjwrlqbo.supabase.co/auth/v1/health', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w',
        }
      });
      
      if (authResponse.ok) {
        addLog('✅ Auth endpoint is healthy');
      } else {
        addLog(`⚠️ Auth response: ${authResponse.status}`);
      }
      
    } catch (error: any) {
      addLog(`❌ Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Signup Debug Tool</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Data</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Birthday</label>
              <input
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData({...formData, birthday: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Options</h2>
          <div className="flex gap-4">
            <button
              onClick={testNetworkRequest}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Test Network
            </button>
            <button
              onClick={testDirectSupabase}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Test Direct Supabase
            </button>
            <button
              onClick={() => window.location.href = '/register'}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Go to Register Page
            </button>
          </div>
        </div>
        
        <div className="bg-black rounded-lg shadow p-6 text-white">
          <h2 className="text-xl font-semibold mb-4">Log Output</h2>
          <div className="font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
            {log.length === 0 ? 'No logs yet. Click a test button above.' : log.join('\n')}
          </div>
        </div>
      </div>
    </div>
  );
}