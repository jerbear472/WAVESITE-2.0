'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClearCache() {
  const [cleared, setCleared] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Clear all localStorage items related to Supabase
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('auth'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('Removed:', key);
    });
    
    // Clear sessionStorage too
    sessionStorage.clear();
    
    // Clear cookies if any
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    setCleared(true);
    
    // Redirect after 3 seconds
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center text-white">
        <h1 className="text-3xl font-bold mb-4">Clearing Cache...</h1>
        {cleared ? (
          <>
            <p className="text-green-500 mb-4">✅ Cache cleared successfully!</p>
            <p>Redirecting to login page...</p>
            <p className="mt-4 text-sm text-gray-400">
              You'll need to login with a NEW account from the new Supabase instance.
            </p>
            <div className="mt-8 p-4 bg-gray-800 rounded">
              <p className="font-semibold">New Test Account:</p>
              <p>Email: tester.1754889443@wavesight.com</p>
              <p>Password: Test123!</p>
            </div>
          </>
        ) : (
          <p>Clearing browser cache...</p>
        )}
      </div>
    </div>
  );
}