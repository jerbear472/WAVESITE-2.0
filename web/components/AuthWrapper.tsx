'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

const PUBLIC_ROUTES = ['/', '/login', '/register', '/auth/callback', '/auth/confirm'];

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading, sessionReady, checkSession } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[AuthWrapper] Initializing...', { pathname, user: !!user, loading, sessionReady });
      
      // Wait for session to be ready
      if (!sessionReady && !loading) {
        console.log('[AuthWrapper] Session not ready, checking...');
        await checkSession();
      }
      
      setIsInitialized(true);
    };

    initializeAuth();
  }, [sessionReady, loading]);

  useEffect(() => {
    if (!isInitialized || loading) return;

    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname === route || pathname?.startsWith('/auth/'));
    
    console.log('[AuthWrapper] Route check:', { 
      pathname, 
      isPublicRoute, 
      hasUser: !!user,
      sessionReady 
    });

    // Only redirect if we're certain about the auth state
    if (sessionReady && !loading) {
      if (!user && !isPublicRoute) {
        console.log('[AuthWrapper] No user on protected route, redirecting to login');
        router.push(`/login?from=${encodeURIComponent(pathname || '/predictions')}`);
      } else if (user && (pathname === '/login' || pathname === '/register')) {
        console.log('[AuthWrapper] User logged in on auth page, redirecting to predictions');
        router.push('/predictions');
      }
    }
  }, [user, pathname, loading, sessionReady, isInitialized, router]);

  // Show loading state while initializing
  if (!isInitialized || (loading && !sessionReady)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading WaveSight...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}