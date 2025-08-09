import React, { useState, useEffect, useContext } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Linking,
  LogBox,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import MainNavigator from './src/navigation/MainNavigator';
import { LoadingScreen } from './src/screens/LoadingScreen';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import ShareExtensionService from './src/services/ShareExtensionService';
import TrendStorageService from './src/services/TrendStorageService';
import TrendExtractorService from './src/services/TrendExtractorService';
import { AuthProvider, AuthContext } from './src/contexts/AuthContext';

// Enable screens for better performance
enableScreens();

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

function AppContent(): React.JSX.Element {
  const { user } = useContext(AuthContext);
  const [currentScreen, setCurrentScreen] = useState<'auth' | 'home' | 'capture'>(user ? 'home' : 'auth');

  const processSharedUrl = async (url: string) => {
    try {
      // Extract data from the URL
      const extractedData = await TrendExtractorService.extractDataFromUrl(url);
      
      // Save the trend
      await TrendStorageService.saveTrend({
        url,
        title: extractedData.title,
        description: extractedData.description,
        platform: extractedData.platform,
      });

      Alert.alert(
        'Trend Added!',
        `"${extractedData.title}" has been added to your timeline.`,
        [
          { text: 'View My Timeline', onPress: () => {
            setCurrentScreen('capture');
            // Navigate to My Timeline tab after a short delay
            setTimeout(() => {
              // This will be handled by the MainNavigator
            }, 100);
          }},
          { text: 'OK', style: 'default' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add trend. Please try again.');
      console.error('Error processing shared URL:', error);
    }
  };

  useEffect(() => {
    // Update screen based on auth status
    if (user) {
      setCurrentScreen('home');
    } else {
      setCurrentScreen('auth');
    }
  }, [user]);

  useEffect(() => {
    // Handle deep links
    const handleDeepLink = (url: string | null) => {
      if (url) {
        const urlObj = new URL(url);
        if (urlObj.protocol === 'wavesight:' && urlObj.host === 'capture') {
          const sharedUrl = urlObj.searchParams.get('url');
          if (sharedUrl && user) {
            // Process the shared URL
            processSharedUrl(decodeURIComponent(sharedUrl));
          }
        }
      }
    };

    // Get initial URL
    Linking.getInitialURL().then(handleDeepLink);

    // Listen for new URLs
    const urlListener = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      urlListener.remove();
    };
  }, [user]);

  useEffect(() => {
    // Start checking for shared data when authenticated
    if (user) {
      const shareService = ShareExtensionService.getInstance();
      const unsubscribe = shareService.addListener(async (sharedContent) => {
        try {
          // Save the trend using TrendStorageService
          await TrendStorageService.saveTrend({
            url: sharedContent.url,
            title: sharedContent.title || `Trend from ${sharedContent.platform}`,
            description: sharedContent.text,
            platform: sharedContent.platform,
          });
          
          Alert.alert(
            'Trend Added!',
            `Successfully captured from ${sharedContent.platform}`,
            [
              { text: 'View My Timeline', onPress: () => setCurrentScreen('capture') },
              { text: 'OK', style: 'default' }
            ]
          );
        } catch (error) {
          console.error('Error saving shared trend:', error);
          Alert.alert('Error', 'Failed to save trend');
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [user]);

  const handleGoToCapture = () => {
    setCurrentScreen('capture');
  };

  if (currentScreen === 'auth' && !user) {
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  if (currentScreen === 'capture') {
    return (
      <NavigationContainer>
        <MainNavigator />
      </NavigationContainer>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}>
        
        <View style={styles.header}>
          <Text style={styles.title}>WaveSight 2.0</Text>
          <Text style={styles.subtitle}>Trend Capture App</Text>
        </View>

        <View style={styles.mainContent}>
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>Share Extension</Text>
            <Text style={styles.featureDescription}>
              Share TikTok and Instagram posts directly from the apps to capture trends
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>OCR Data Extraction</Text>
            <Text style={styles.featureDescription}>
              Automatically extract post metrics, captions, and engagement data using advanced OCR
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>Trend Analytics</Text>
            <Text style={styles.featureDescription}>
              View statistics and insights from your captured social media trends
            </Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleGoToCapture}>
            <Text style={styles.buttonText}>Go to Capture Screen</Text>
          </TouchableOpacity>

          <View style={styles.platformSelector}>
            <Text style={styles.platformTitle}>Supported Platforms</Text>
            <View style={styles.platformRow}>
              <View style={styles.platformChip}>
                <Text style={styles.platformText}>TikTok</Text>
              </View>
              <View style={styles.platformChip}>
                <Text style={styles.platformText}>Instagram</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Optimized for 30% faster performance
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#999',
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  featureCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    marginVertical: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  platformSelector: {
    alignItems: 'center',
  },
  platformTitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 15,
  },
  platformRow: {
    flexDirection: 'row',
    gap: 15,
  },
  platformChip: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  platformText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 12,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    padding: 10,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppWrapper />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function AppWrapper(): React.JSX.Element {
  const { user, loading } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3500);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (isLoading || loading) {
    return (
      <LoadingScreen 
        onLoadingComplete={() => {
          setIsLoading(false);
        }} 
      />
    );
  }
  
  return <AppContent />;
}

export default App;