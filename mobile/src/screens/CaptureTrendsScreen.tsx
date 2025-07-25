import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import TrendStorageService from '../services/TrendStorageService';
import TrendExtractorService from '../services/TrendExtractorService';
import ShareExtensionService from '../services/ShareExtensionService';
import HiddenWebViewExtractor, { HiddenWebViewExtractorRef } from '../components/HiddenWebViewExtractor';

const CaptureTrendsScreen: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const webViewExtractorRef = useRef<HiddenWebViewExtractorRef>(null);
  
  useEffect(() => {
    // Set up share extension listener
    const shareService = ShareExtensionService.getInstance();
    const unsubscribe = shareService.addListener(async (content) => {
      // Handle shared content from share extension
      await processSharedUrl(content.url);
    });
    
    // Check for any pending shares on mount
    checkPendingShares();
    
    // Set the WebView extractor reference
    if (webViewExtractorRef.current) {
      TrendExtractorService.setWebViewExtractor(webViewExtractorRef.current);
    }
    
    return () => {
      unsubscribe();
      TrendExtractorService.setWebViewExtractor(null);
    };
  }, []);
  
  const checkPendingShares = async () => {
    const shareService = ShareExtensionService.getInstance();
    const sharedContent = await shareService.getSharedContent();
    if (sharedContent.length > 0) {
      const latestShare = sharedContent[0];
      if (Date.now() - latestShare.timestamp < 60000) { // Within last minute
        await processSharedUrl(latestShare.url);
      }
    }
  };
  
  const processSharedUrl = async (url: string) => {
    try {
      if (!url || typeof url !== 'string') {
        Alert.alert('Error', 'Invalid URL provided');
        return;
      }
      
      setIsProcessing(true);
      
      // Extract data from URL (this will try to fetch actual post data)
      const extractedData = await TrendExtractorService.extractDataFromUrl(url);
      
      // Validate extracted data
      if (!extractedData || !extractedData.title) {
        throw new Error('Failed to extract data from URL');
      }
      
      // Save the trend with metadata
      const savedTrend = await TrendStorageService.saveTrend({
        url: url,
        title: extractedData.title || 'Untitled Trend',
        description: extractedData.description || '',
        platform: extractedData.platform || 'Unknown',
        metadata: {
          creator: extractedData.creator,
          caption: extractedData.caption,
          likes: extractedData.likes,
          comments: extractedData.comments,
          shares: extractedData.shares,
          views: extractedData.views,
        },
      });
      
      setIsProcessing(false);
      
      if (savedTrend && savedTrend.title) {
        Alert.alert(
          'Trend Captured! 🎉',
          `"${savedTrend.title}" has been saved to your collection.`,
          [
            {
              text: 'View Trends',
              onPress: () => {
                // Navigation handled by bottom nav
              },
            },
            { text: 'OK', style: 'default' },
          ]
        );
      } else {
        Alert.alert('Success', 'Trend has been saved to your collection.');
      }
    } catch (error) {
      setIsProcessing(false);
      console.error('Error processing shared URL:', error);
      Alert.alert('Error', 'Failed to capture trend. Please try again.');
    }
  };

  const handleCaptureTrend = () => {
    Alert.alert(
      'Capture Trend',
      'Share content directly from TikTok or Instagram',
      [
        { 
          text: 'Open TikTok', 
          onPress: () => {
            Linking.openURL('tiktok://').catch(() => {
              Linking.openURL('https://www.tiktok.com/');
            });
          }
        },
        { 
          text: 'Open Instagram', 
          onPress: () => {
            Linking.openURL('instagram://').catch(() => {
              Linking.openURL('https://www.instagram.com/');
            });
          }
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handlePasteLink = async () => {
    try {
      const content = await Clipboard.getString();
      
      // Check if clipboard has content
      if (!content || !content.trim()) {
        Alert.alert('No Link', 'No link found in clipboard. Please copy a link first.');
        return;
      }
      
      const trimmedContent = content.trim();
      
      // Check if it's a valid URL
      const urlPattern = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/;
      if (!urlPattern.test(trimmedContent)) {
        Alert.alert('Invalid URL', 'Please copy a valid link from TikTok, Instagram, or other supported platforms.');
        return;
      }
      
      // Ensure the URL has a protocol
      const urlWithProtocol = trimmedContent.startsWith('http') ? trimmedContent : `https://${trimmedContent}`;
      
      // Process the URL using the shared function
      await processSharedUrl(urlWithProtocol);
    } catch (error) {
      console.error('Error accessing clipboard:', error);
      Alert.alert('Error', 'Failed to access clipboard. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        {/* Empty top nav for spacing */}
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        
        {/* Main Icon */}
        <View style={styles.mainIconContainer}>
          <View style={styles.logoRow}>
            <Image 
              source={require('../assets/images/logo2.png')} 
              style={styles.mainLogo}
              resizeMode="contain"
            />
            <Text style={styles.wavesiteText}>WAVESITE</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Capture Trends</Text>
        <Text style={styles.subtitle}>Share viral content from social media</Text>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={handleCaptureTrend}
            activeOpacity={0.8}>
            <Text style={styles.buttonIcon}>▶️</Text>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonTitle}>Capture Trend</Text>
              <Text style={styles.buttonSubtitle}>Share from any app</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton, isProcessing && styles.disabledButton]} 
            onPress={handlePasteLink}
            activeOpacity={0.8}
            disabled={isProcessing}>
            {isProcessing ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <Text style={styles.buttonIcon}>📋</Text>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonTitle}>Paste Link</Text>
                  <Text style={styles.buttonSubtitle}>From clipboard</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>How to capture trends:</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumberContainer}>
                <Text style={styles.instructionNumber}>1</Text>
              </View>
              <Text style={styles.instructionText}>Browse TikTok, Instagram, or other platforms</Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumberContainer}>
                <Text style={styles.instructionNumber}>2</Text>
              </View>
              <Text style={styles.instructionText}>Copy link or share to WAVESIGHT</Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumberContainer}>
                <Text style={styles.instructionNumber}>3</Text>
              </View>
              <Text style={styles.instructionText}>Track trends you've spotted early</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Hidden WebView for data extraction */}
      <HiddenWebViewExtractor ref={webViewExtractorRef} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#000',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  logo: {
    height: 40,
    width: 150,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  mainIconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  mainIcon: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainIconText: {
    fontSize: 50,
  },
  mainLogo: {
    width: 80,
    height: 60,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  wavesiteText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 40,
  },
  buttonsContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 40,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minHeight: 80,
  },
  primaryButton: {
    backgroundColor: '#0066ff',
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 255, 0.3)',
  },
  secondaryButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonIcon: {
    fontSize: 32,
    width: 40,
    textAlign: 'center',
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  instructionsCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 25,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
  },
  instructionsList: {
    gap: 15,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 15,
  },
  instructionNumberContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0066ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    paddingTop: 5,
  },
  disabledCard: {
    opacity: 0.7,
  },
});

export default CaptureTrendsScreen;