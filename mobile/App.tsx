import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import MainNavigator from './src/navigation/MainNavigator';
import LoadingScreen from './src/screens/LoadingScreen';
import AuthNavigator from './src/navigation/AuthNavigator';
import ShareExtensionService from './src/services/ShareExtensionService';
import TrendStorageService from './src/services/TrendStorageService';
import TrendExtractorService from './src/services/TrendExtractorService';

function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<'loading' | 'auth' | 'home' | 'capture'>('loading');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const processSharedUrl = async (url: string) => {
    try {
      // Extract data from the URL
      const extractedData = await TrendExtractorService.extractDataFromUrl(url);
      
      // Save the trend
      await TrendStorageService.saveTrend({
        url,
        title: extractedData.title,
        description: extractedData.description,
      });

      Alert.alert(
        'Trend Added!',
        `"${extractedData.title}" has been added to your timeline.`,
        [
          { text: 'View Timeline', onPress: () => setCurrentScreen('capture') },
          { text: 'OK', style: 'default' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add trend. Please try again.');
      console.error('Error processing shared URL:', error);
    }
  };

  useEffect(() => {
    // Show loading screen on app start
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Check authentication status (for now, always show auth)
      setCurrentScreen('auth');
    }, 3500);

    // Handle deep links
    const handleDeepLink = (url: string | null) => {
      if (url) {
        const urlObj = new URL(url);
        if (urlObj.protocol === 'wavesite:' && urlObj.host === 'addtrend') {
          const sharedUrl = urlObj.searchParams.get('url');
          if (sharedUrl && isAuthenticated) {
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
      clearTimeout(timer);
      urlListener.remove();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    // Start checking for shared data when authenticated
    if (isAuthenticated) {
      ShareExtensionService.startChecking((items) => {
        if (items.length > 0) {
          Alert.alert(
            'New Trends Captured!',
            `${items.length} new trend${items.length > 1 ? 's' : ''} added to your timeline.`,
            [
              { text: 'View Timeline', onPress: () => setCurrentScreen('capture') },
              { text: 'OK', style: 'default' }
            ]
          );
        }
      });
    }

    return () => {
      ShareExtensionService.stopChecking();
    };
  }, [isAuthenticated]);

  const handleGoToCapture = () => {
    setCurrentScreen('capture');
  };

  if (currentScreen === 'loading' || isLoading) {
    return (
      <LoadingScreen 
        onLoadingComplete={() => {
          setIsLoading(false);
          setCurrentScreen('auth');
        }} 
      />
    );
  }

  if (currentScreen === 'auth') {
    return (
      <AuthNavigator 
        onAuthComplete={() => {
          setIsAuthenticated(true);
          setCurrentScreen('home');
        }}
      />
    );
  }

  if (currentScreen === 'capture') {
    return <MainNavigator />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}>
        
        <View style={styles.header}>
          <Text style={styles.title}>WAVESITE 2.0</Text>
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

export default App;