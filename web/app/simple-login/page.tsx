'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function SimpleLogin() {
  const [email, setEmail] = useState('admin@wavesight.com');
  const [password, setPassword] = useState('Admin123!');
  const [message, setMessage] = useState('');
  const supabase = createClientComponentClient();

  const handleLogin = async () => {
    setMessage('Logging in...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Success! Redirecting...');
      // Force a hard redirect
      window.location.href = '/dashboard';
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessage('Logged out');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6">Simple Login</h1>
        
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
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Login
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
          >
            Logout
          </button>
        </div>
        
        {message && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
            {message}
          </div>
        )}
        
        <div className="mt-6 text-xs text-gray-600">
          <p>Test accounts:</p>
          <p>• admin@wavesight.com / Admin123!</p>
          <p>• demo1755123016943@wavesight.com / Demo123456!</p>
        </div>
      </div>
    </div>
  );
}