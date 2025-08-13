'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function DebugLoginPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState('admin@wavesight.com');
  const [password, setPassword] = useState('Admin123!');
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
    console.log(message);
  };

  const testLogin = async () => {
    setLoading(true);
    setLogs([]);
    
    try {
      addLog(`Starting login for: ${email}`);
      
      // 1. Try direct Supabase login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        addLog(`❌ Login error: ${error.message}`);
        return;
      }
      
      addLog(`✅ Login successful! User ID: ${data.user?.id}`);
      addLog(`Session token exists: ${!!data.session?.access_token}`);
      
      // 2. Check current session
      const { data: { session } } = await supabase.auth.getSession();
      addLog(`Session retrieved: ${!!session}`);
      
      if (session) {
        addLog(`Session user: ${session.user.email}`);
      }
      
      // 3. Try to fetch profile
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
          
        if (profile) {
          addLog(`✅ Profile found: ${profile.username}`);
        } else if (profileError) {
          addLog(`❌ Profile error: ${profileError.message}`);
        }
      }
      
      // 4. Test redirect
      addLog('Attempting redirect to /dashboard...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      
    } catch (err: any) {
      addLog(`❌ Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Debug Login Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <button
              onClick={testLogin}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Login'}
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Debug Logs</h2>
          <div className="space-y-1 font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Click test login to start.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={log.includes('❌') ? 'text-red-600' : log.includes('✅') ? 'text-green-600' : 'text-gray-700'}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-6 text-sm text-gray-600">
          <p>Test Accounts:</p>
          <ul className="mt-2 space-y-1">
            <li>• admin@wavesight.com / Admin123!</li>
            <li>• demo1755123016943@wavesight.com / Demo123456!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}