'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClearCache() {
  const [cleared, setCleared] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const clearAll = async () => {
      // Clear all localStorage
      localStorage.clear();
      console.log('Cleared localStorage');

      // Clear sessionStorage too
      sessionStorage.clear();
      console.log('Cleared sessionStorage');

      // Clear cookies if any
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      console.log('Cleared cookies');

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
          console.log('Unregistered service worker:', registration.scope);
        }
      }

      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => {
            console.log('Deleting cache:', name);
            return caches.delete(name);
          })
        );
      }

      setCleared(true);
    };

    clearAll();
    
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