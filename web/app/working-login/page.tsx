'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function WorkingLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('Logging in...');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (!error && data?.user) {
      setMessage('✅ Success! Redirecting...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } else {
      setMessage(`❌ Error: ${error?.message || 'Login failed'}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-6">Working Login</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded"
              required
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {message && (
          <div className="mt-4 p-3 bg-gray-700 rounded text-white">
            {message}
          </div>
        )}

        <div className="mt-6 text-center text-gray-400 text-sm">
          <p>This login creates Supabase client on-demand</p>
          <p>No complex initialization</p>
        </div>
      </div>
    </div>
  );
}