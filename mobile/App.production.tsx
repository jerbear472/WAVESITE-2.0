import React, { useEffect } from 'react';
import { LogBox, Platform, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigatorEnhanced } from './src/navigation/RootNavigatorEnhanced';
import { MMKV } from 'react-native-mmkv';
import notifee, { AndroidImportance } from '@notifee/react-native';

// Enable screens for better performance
enableScreens();

// Production environment check
const isProduction = !__DEV__;

// Initialize MMKV for persistent storage
export const storage = new MMKV({
  id: 'wavesight-storage',
  encryptionKey: isProduction ? 'wavesight-prod-key-2024' : undefined,
});

// Configure LogBox for production
if (isProduction) {
  LogBox.ignoreAllLogs();
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
} else {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'Require cycle:',
    'Remote debugger',
  ]);
}

// Optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: isProduction ? 3 : 1,
      staleTime: isProduction ? 10 * 60 * 1000 : 5 * 60 * 1000, // 10 min prod, 5 min dev
      cacheTime: isProduction ? 30 * 60 * 1000 : 10 * 60 * 1000, // 30 min prod, 10 min dev
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: isProduction ? 2 : 0,
    },
  },
});

function App(): React.JSX.Element {
  useEffect(() => {
    // Set up notifications channel for Android
    const setupNotifications = async () => {
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: 'wavesight-default',
          name: 'WaveSight Notifications',
          importance: AndroidImportance.HIGH,
        });
      }
    };

    setupNotifications();

    // Configure status bar
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer
            linking={{
              prefixes: ['wavesight://', 'https://wavesight.app'],
              config: {
                screens: {
                  Main: {
                    screens: {
                      Dashboard: 'dashboard',
                      Capture: 'capture',
                      Timeline: 'timeline',
                      Profile: 'profile',
                    },
                  },
                  Auth: {
                    screens: {
                      Login: 'login',
                      Register: 'register',
                    },
                  },
                },
              },
            }}
          >
            <RootNavigatorEnhanced />
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;