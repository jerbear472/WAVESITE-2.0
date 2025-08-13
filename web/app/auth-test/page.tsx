'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function AuthTest() {
  const [status, setStatus] = useState<any>({});
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: { user } } = await supabase.auth.getUser();
    
    setStatus({
      hasSession: !!session,
      sessionUser: session?.user?.email,
      hasUser: !!user,
      userEmail: user?.email,
      accessToken: session?.access_token ? 'Present' : 'Missing',
      expiresAt: session?.expires_at,
    });
  };

  const doLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@wavesight.com',
      password: 'Admin123!'
    });

    if (error) {
      alert(`Login error: ${error.message}`);
    } else {
      alert('Login successful!');
      await checkAuth();
    }
  };

  const doLogout = async () => {
    await supabase.auth.signOut();
    await checkAuth();
  };

  const goToDashboard = () => {
    // Use window.location for hard navigation
    window.location.href = '/dashboard';
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Auth Debugging Page</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Current Auth Status</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(status, null, 2)}
        </pre>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        <div className="space-x-4">
          <button
            onClick={doLogin}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Login as Admin
          </button>
          
          <button
            onClick={doLogout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
          
          <button
            onClick={checkAuth}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Refresh Status
          </button>
          
          <button
            onClick={goToDashboard}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Go to Dashboard (Hard Navigate)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Instructions</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Click "Login as Admin" to authenticate</li>
          <li>Check if session shows as present</li>
          <li>Try "Go to Dashboard" to test navigation</li>
          <li>If redirected back to login, session isn't persisting</li>
        </ol>
        
        <div className="mt-4 p-4 bg-yellow-50 rounded">
          <p className="text-sm">
            <strong>Note:</strong> This page is not protected by middleware, 
            so you can always access it at <code>/auth-test</code>
          </p>
        </div>
      </div>
    </div>
  );
}