import React, { useState, useEffect, useContext, useRef } from 'react';
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
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainNavigator from './src/navigation/MainNavigator';
import { LoadingScreen } from './src/screens/LoadingScreen';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import ShareExtensionService from './src/services/ShareExtensionService';
import TrendStorageService from './src/services/TrendStorageService';
import TrendExtractorService from './src/services/TrendExtractorService';
import { AuthProvider, AuthContext } from './src/contexts/AuthContext';
import PostDataExtractor, { PostDataExtractorRef } from './src/components/PostDataExtractor';

function AppContent(): React.JSX.Element {
  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('AppContent must be used within AuthProvider');
  }
  const { user } = authContext;
  const [currentScreen, setCurrentScreen] = useState<'auth' | 'home' | 'capture'>(user ? 'home' : 'auth');
  const postDataExtractorRef = useRef<PostDataExtractorRef>(null);

  // Set the WebView extractor in TrendExtractorService
  useEffect(() => {
    if (postDataExtractorRef.current) {
      TrendExtractorService.setWebViewExtractor(postDataExtractorRef.current);
    }
  }, []);

  const processSharedUrl = async (url: string) => {
    try {
      // Show loading alert
      Alert.alert(
        'Extracting Post Data',
        'Please wait while we fetch the post information...',
        [],
        { cancelable: false }
      );

      // Extract data from the URL using WebView
      const extractedData = await TrendExtractorService.extractDataFromUrl(url);
      
      // Save the trend with full metadata
      await TrendStorageService.saveTrend({
        url,
        title: extractedData.title,
        description: extractedData.description,
        platform: extractedData.platform,
        metadata: {
          creator: extractedData.creator,
          creatorName: extractedData.creatorName,
          caption: extractedData.caption,
          likes: extractedData.likes,
          comments: extractedData.comments,
          shares: extractedData.shares,
          views: extractedData.views,
          thumbnail: extractedData.thumbnail,
          hashtags: extractedData.hashtags,
          postedAt: extractedData.postedAt,
        }
      });

      Alert.alert(
        'Trend Added!',
        `"${extractedData.title}" has been added to your timeline.\n\n` +
        `Creator: ${extractedData.creator || 'Unknown'}\n` +
        `Likes: ${extractedData.likes?.toLocaleString() || 0}`,
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
      Alert.alert('Error', 'Failed to extract post data. Please try again.');
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
          // Process the URL to extract full post data
          await processSharedUrl(sharedContent.url);
        } catch (error) {
          console.error('Error processing shared trend:', error);
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
      <>
        <NavigationContainer>
          <AuthNavigator />
        </NavigationContainer>
        {/* Hidden WebView for data extraction */}
        <PostDataExtractor ref={postDataExtractorRef} />
      </>
    );
  }

  if (currentScreen === 'capture') {
    return (
      <>
        <NavigationContainer>
          <MainNavigator />
        </NavigationContainer>
        {/* Hidden WebView for data extraction */}
        <PostDataExtractor ref={postDataExtractorRef} />
      </>
    );
  }

  return (
    <>
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
              <Text style={styles.featureTitle}>Real-Time Data Extraction</Text>
              <Text style={styles.featureDescription}>
                Automatically extracts creator handle, caption, likes, comments, and more from shared posts
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureTitle}>Share Extension</Text>
              <Text style={styles.featureDescription}>
                Share TikTok and Instagram posts directly from the apps to capture trends
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureTitle}>Trend Analytics</Text>
              <Text style={styles.featureDescription}>
                View comprehensive statistics and insights from your captured social media trends
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
              Powered by WebView data extraction
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
      
      {/* Hidden WebView for data extraction */}
      <PostDataExtractor ref={postDataExtractorRef} />
    </>
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
    fontSize: 16,
    color: '#888',
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  featureCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#4ECDC4',
    borderRadius: 25,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  platformSelector: {
    marginTop: 30,
  },
  platformTitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  platformRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  platformChip: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  platformText: {
    color: '#4ECDC4',
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
});

// Create the QueryClient outside the component
const queryClient = new QueryClient();

function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;