/**
 * WaveSight 2.0 - Enterprise Signal Intelligence
 * The Early-Signal Layer
 */

import React, { useEffect } from 'react';
import { LogBox, Platform, StatusBar } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MMKV } from 'react-native-mmkv';

import { AppNavigator } from './src/navigation';
import { AuthProvider } from './src/contexts';
import ErrorBoundary from './src/components/ErrorBoundary';
import { designSystem } from './src/styles/designSystem';

// Enable native screens for better performance
enableScreens();

// Initialize MMKV storage
export const storage = new MMKV({
  id: 'wavesight-enterprise-storage',
});

// Configure LogBox
if (!__DEV__) {
  LogBox.ignoreAllLogs();
} else {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'Require cycle:',
  ]);
}

// Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: __DEV__ ? 2 : 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

function App(): React.JSX.Element {
  useEffect(() => {
    // Configure status bar for dark theme
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(designSystem.colors.background);
      StatusBar.setTranslucent(true);
    }
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: designSystem.colors.background }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default App;
