import React, { useEffect } from 'react';
import { LogBox, Platform, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MMKV } from 'react-native-mmkv';
import { RootNavigatorEnhanced } from './src/navigation/RootNavigatorEnhanced';
import ErrorBoundary from './src/components/ErrorBoundary';
import { AuthProvider } from './src/contexts/AuthContext';

// Enable screens for better performance
enableScreens();

// Initialize MMKV storage
export const storage = new MMKV({
  id: 'wavesight-storage',
  encryptionKey: !__DEV__ ? 'wavesight-prod-key-2024' : undefined,
});

// Production environment check
const isProduction = !__DEV__;

// Configure LogBox
if (isProduction) {
  LogBox.ignoreAllLogs();
} else {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'Require cycle:',
  ]);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: isProduction ? 3 : 2,
      staleTime: isProduction ? 10 * 60 * 1000 : 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function App(): React.JSX.Element {
  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <NavigationContainer>
                <RootNavigatorEnhanced />
              </NavigationContainer>
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default App;