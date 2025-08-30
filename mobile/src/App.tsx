import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './contexts/AuthContext';
import { XPNotificationProvider } from './contexts/XPNotificationContext';
import { NotificationService } from './services/NotificationService';
import { RootNavigator } from './navigation/RootNavigator';
import { PrivacyOverlay } from './components/PrivacyOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  useEffect(() => {
    NotificationService.initialize();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AuthProvider>
            <XPNotificationProvider>
              <NavigationContainer>
                <PrivacyOverlay>
                  <RootNavigator />
                </PrivacyOverlay>
              </NavigationContainer>
            </XPNotificationProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}