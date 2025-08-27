'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { SessionProvider } from '@/contexts/SessionContext';
import { XPNotificationProvider } from '@/contexts/XPNotificationContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import dynamic from 'next/dynamic';

// Dynamically import FloatingSessionTimer to avoid SSR issues
const FloatingSessionTimer = dynamic(
  () => import('@/components/FloatingSessionTimer'),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data remains fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Keep in cache for 10 minutes
            gcTime: 10 * 60 * 1000,
            // Only refetch on window focus if data is stale
            refetchOnWindowFocus: 'always',
            // Refetch on reconnect
            refetchOnReconnect: 'always',
            // Retry failed requests once
            retry: 1,
            // Don't retry on 404s
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            // Retry mutations once
            retry: 1,
          },
        },
      })
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SessionProvider>
            <ToastProvider>
              <XPNotificationProvider>
                {children}
                <FloatingSessionTimer />
              </XPNotificationProvider>
            </ToastProvider>
          </SessionProvider>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}