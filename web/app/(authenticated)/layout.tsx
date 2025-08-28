'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SPANavigation from '@/components/SPANavigation';
import XPLossNotification from '@/components/XPLossNotification';
import PageTransition from '@/components/PageTransition';
import ClientOnlyProvider from '@/components/ClientOnlyProvider';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Ensure client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle navigation state changes
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  // Handle authentication redirect
  useEffect(() => {
    if (!loading && !user && isClient) {
      console.log('[LAYOUT] No user, redirecting to login');
      router.push('/login');
    }
  }, [user, loading, router, isClient]);

  // Removed force refresh - not needed with proper React state management

  // Show loading state while checking auth
  if (!isClient || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-600 mt-4 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login redirect if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 font-medium">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <ClientOnlyProvider>
      <div className="min-h-screen flex flex-col">
        <SPANavigation />
        <main className="flex-1 overflow-x-hidden pt-14">
          <PageTransition>
            <div className="min-h-full">
              {children}
            </div>
          </PageTransition>
        </main>
        <XPLossNotification />
      </div>
    </ClientOnlyProvider>
  );
}