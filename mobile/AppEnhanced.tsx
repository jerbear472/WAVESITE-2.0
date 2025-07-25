import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Alert,
  Linking,
  AppState,
  AppStateStatus,
  LogBox,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { NetworkProvider } from 'react-native-offline';
import HapticFeedback from 'react-native-haptic-feedback';
import { MMKV } from 'react-native-mmkv';
import notifee, { AndroidImportance } from '@notifee/react-native';
import performanceNow from 'react-native-performance';

// Enhanced imports
import MainNavigator from './src/navigation/MainNavigatorEnhanced';
import { LoadingScreen } from './src/screens/LoadingScreenEnhanced';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import ShareExtensionService from './src/services/ShareExtensionService';
import TrendStorageService from './src/services/TrendStorageService';
import TrendExtractorService from './src/services/TrendExtractorService';
import { AuthProvider, AuthContext } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { PerformanceProvider } from './src/contexts/PerformanceContext';
import { OfflineManager } from './src/services/OfflineManager';
import { AIService } from './src/services/AIService';
import { AnalyticsService } from './src/services/AnalyticsService';
import { NotificationManager } from './src/services/NotificationManager';
import { CacheManager } from './src/services/CacheManager';

// Enable screens for better performance
enableScreens();

// Configure LogBox
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
]);

// Initialize MMKV storage
const storage = new MMKV();

// Initialize services
const offlineManager = new OfflineManager();
const aiService = new AIService();
const analyticsService = new AnalyticsService();
const notificationManager = new NotificationManager();
const cacheManager = new CacheManager();

function AppContent(): React.JSX.Element {
  const { user } = useContext(AuthContext);
  const [currentScreen, setCurrentScreen] = useState<'auth' | 'home' | 'capture'>(
    user ? 'home' : 'auth'
  );
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  // Performance optimization: Memoize navigation theme
  const navigationTheme = useMemo(() => ({
    dark: true,
    colors: {
      primary: '#007AFF',
      background: '#0a0a0a',
      card: '#1a1a1a',
      text: '#ffffff',
      border: '#2a2a2a',
      notification: '#ff453a',
    },
  }), []);

  // Enhanced shared URL processing with AI
  const processSharedUrl = useCallback(async (url: string) => {
    try {
      // Start performance tracking
      const perfTrace = performanceNow.now();
      
      // Haptic feedback
      HapticFeedback.trigger('impactLight');

      // Extract data with AI enhancement
      const extractedData = await TrendExtractorService.extractDataFromUrl(url);
      const aiEnhancedData = await aiService.enhanceTrendData(extractedData);
      
      // Save with offline support
      const savedTrend = await offlineManager.saveTrendWithSync({
        url,
        title: aiEnhancedData.title,
        description: aiEnhancedData.description,
        platform: aiEnhancedData.platform,
        aiInsights: aiEnhancedData.insights,
        predictedEngagement: aiEnhancedData.predictedEngagement,
      });

      // Track analytics
      analyticsService.trackEvent('trend_captured', {
        platform: aiEnhancedData.platform,
        processingTime: performanceNow.now() - perfTrace,
        hasAIInsights: true,
      });

      // Show success notification
      await notificationManager.showLocalNotification({
        title: 'Trend Added! 🎯',
        body: `"${aiEnhancedData.title}" has been added to your timeline.`,
        data: { trendId: savedTrend.id },
      });

      HapticFeedback.trigger('notificationSuccess');
    } catch (error) {
      HapticFeedback.trigger('notificationError');
      Alert.alert('Error', 'Failed to add trend. Please try again.');
      console.error('Error processing shared URL:', error);
    }
  }, []);

  // App state monitoring for performance
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground
        offlineManager.syncPendingData();
        notificationManager.checkPendingNotifications();
      } else if (nextAppState === 'background') {
        // App going to background
        cacheManager.persistCache();
      }
      setAppState(nextAppState);
    });

    return () => subscription.remove();
  }, [appState]);

  // Enhanced deep linking with AI predictions
  useEffect(() => {
    const handleDeepLink = async (url: string | null) => {
      if (url) {
        const urlObj = new URL(url);
        if (urlObj.protocol === 'wavesight:' && urlObj.host === 'capture') {
          const sharedUrl = urlObj.searchParams.get('url');
          if (sharedUrl && user) {
            await processSharedUrl(decodeURIComponent(sharedUrl));
          }
        }
      }
    };

    Linking.getInitialURL().then(handleDeepLink);
    const urlListener = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => urlListener.remove();
  }, [user, processSharedUrl]);

  // Enhanced share extension with real-time processing
  useEffect(() => {
    if (user) {
      const shareService = ShareExtensionService.getInstance();
      const unsubscribe = shareService.addListener(async (sharedContent) => {
        try {
          HapticFeedback.trigger('impactMedium');
          
          // Process with AI insights
          const aiInsights = await aiService.analyzeSharedContent(sharedContent);
          
          await TrendStorageService.saveTrend({
            url: sharedContent.url,
            title: sharedContent.title || `Trend from ${sharedContent.platform}`,
            description: sharedContent.text,
            platform: sharedContent.platform,
            aiCategory: aiInsights.category,
            sentiment: aiInsights.sentiment,
            viralProbability: aiInsights.viralProbability,
          });
          
          await notificationManager.showLocalNotification({
            title: 'Trend Captured! 🚀',
            body: `AI predicts ${Math.round(aiInsights.viralProbability * 100)}% viral probability`,
          });
          
          HapticFeedback.trigger('notificationSuccess');
        } catch (error) {
          console.error('Error saving shared trend:', error);
          HapticFeedback.trigger('notificationError');
        }
      });

      return () => unsubscribe();
    }
  }, [user]);

  // Initialize notification channels
  useEffect(() => {
    const initNotifications = async () => {
      await notifee.createChannel({
        id: 'trends',
        name: 'Trend Notifications',
        importance: AndroidImportance.HIGH,
      });
    };
    initNotifications();
  }, []);

  // Render based on auth state
  if (currentScreen === 'auth' && !user) {
    return (
      <NavigationContainer theme={navigationTheme}>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <MainNavigator />
    </NavigationContainer>
  );
}

// Enhanced styles with performance optimizations
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
});

// Enhanced QueryClient with offline support
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Main App component with all providers
function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NetworkProvider>
        <QueryClientProvider client={queryClient}>
          <PerformanceProvider>
            <ThemeProvider>
              <AuthProvider>
                <AppWrapper />
              </AuthProvider>
            </ThemeProvider>
          </PerformanceProvider>
        </QueryClientProvider>
      </NetworkProvider>
    </GestureHandlerRootView>
  );
}

// Enhanced App Wrapper with loading optimization
function AppWrapper(): React.JSX.Element {
  const { user, loading } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Preload critical assets
    const preloadAssets = async () => {
      await Promise.all([
        cacheManager.preloadImages([
          require('./src/assets/images/logo2.png'),
          // Add more critical images
        ]),
        aiService.initializeModels(),
      ]);
    };

    preloadAssets().then(() => {
      setTimeout(() => setIsLoading(false), 2000);
    });
  }, []);
  
  if (isLoading || loading) {
    return <LoadingScreen onLoadingComplete={() => setIsLoading(false)} />;
  }
  
  return <AppContent />;
}

export default App;