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
  Animated,
  Dimensions,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import TrendStorageService from '../services/TrendStorageService';
import TrendExtractorService from '../services/TrendExtractorService';
import ShareExtensionService from '../services/ShareExtensionService';
import PostDataExtractor, { PostDataExtractorRef } from '../components/PostDataExtractor';
import { enhancedTheme } from '../styles/theme.enhanced';
import { GlassCard } from '../components/ui/GlassCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CaptureTrendsScreenEnhanced: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const webViewExtractorRef = useRef<PostDataExtractorRef>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Set up share extension listener
    const shareService = ShareExtensionService.getInstance();
    const unsubscribe = shareService.addListener(async (content) => {
      await processSharedUrl(content.url);
    });
    
    checkPendingShares();
    
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
    
    if (sharedContent) {
      await processSharedUrl(sharedContent.url);
    }
  };

  const processSharedUrl = async (url: string) => {
    try {
      setIsProcessing(true);
      animateButton();
      
      const extractedData = await TrendExtractorService.extractDataFromUrl(url);
      
      const savedTrend = await TrendStorageService.saveTrend({
        url,
        title: extractedData.title || 'Untitled Trend',
        description: extractedData.description || 'No description available',
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
            { text: 'View Trends', onPress: () => {} },
            { text: 'OK', style: 'default' },
          ]
        );
      }
    } catch (error) {
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to capture trend. Please try again.');
    }
  };

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
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
      
      if (!content || !content.trim()) {
        Alert.alert('No Link', 'No link found in clipboard.');
        return;
      }
      
      const trimmedContent = content.trim();
      const urlPattern = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/;
      
      if (!urlPattern.test(trimmedContent)) {
        Alert.alert('Invalid URL', 'Please copy a valid link.');
        return;
      }
      
      const urlWithProtocol = trimmedContent.startsWith('http') ? trimmedContent : `https://${trimmedContent}`;
      await processSharedUrl(urlWithProtocol);
    } catch (error) {
      Alert.alert('Error', 'Failed to access clipboard.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        
        {/* Logo Section */}
        <View style={styles.header}>
          <LinearGradient
            colors={enhancedTheme.gradients.primary}
            style={styles.logoContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon name="wave" size={48} color="#fff" />
          </LinearGradient>
          <Text style={styles.brandName}>WAVESITE</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Capture Trends</Text>
        <Text style={styles.subtitle}>Share viral content from social media</Text>

        {/* Primary Action Button */}
        <Animated.View style={[styles.buttonWrapper, { transform: [{ scale: scaleAnim }] }]}>
          <TouchableOpacity 
            onPress={handleCaptureTrend}
            activeOpacity={0.9}
            disabled={isProcessing}
          >
            <LinearGradient
              colors={enhancedTheme.gradients.primary}
              style={styles.primaryButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Icon name="share-variant" size={28} color="#fff" />
              <View style={styles.buttonContent}>
                <Text style={styles.primaryButtonTitle}>Capture Trend</Text>
                <Text style={styles.primaryButtonSubtitle}>Share from any app</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Secondary Action Button */}
        <TouchableOpacity 
          onPress={handlePasteLink}
          activeOpacity={0.8}
          disabled={isProcessing}
          style={styles.secondaryButtonWrapper}
        >
          <GlassCard style={styles.secondaryButton}>
            {isProcessing ? (
              <ActivityIndicator color={enhancedTheme.colors.primary} size="small" />
            ) : (
              <>
                <Icon name="content-paste" size={24} color={enhancedTheme.colors.primary} />
                <Text style={styles.secondaryButtonText}>Paste Link from Clipboard</Text>
              </>
            )}
          </GlassCard>
        </TouchableOpacity>

        {/* Instructions Card */}
        <GlassCard style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>How it works</Text>
          <View style={styles.instructionsList}>
            {[
              { icon: 'eye-outline', text: 'Find trending content on social media' },
              { icon: 'share-outline', text: 'Share to WAVESITE or copy link' },
              { icon: 'chart-line', text: 'Track trends and earn rewards' },
            ].map((item, index) => (
              <View key={index} style={styles.instructionItem}>
                <LinearGradient
                  colors={enhancedTheme.gradients.accent}
                  style={styles.instructionIconContainer}
                >
                  <Icon name={item.icon} size={20} color="#fff" />
                </LinearGradient>
                <Text style={styles.instructionText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Platform Badges */}
        <View style={styles.platformsContainer}>
          <Text style={styles.platformsTitle}>Supported Platforms</Text>
          <View style={styles.platformBadges}>
            {['TikTok', 'Instagram', 'YouTube', 'Twitter'].map((platform) => (
              <View key={platform} style={styles.platformBadge}>
                <Icon 
                  name={platform.toLowerCase() === 'tiktok' ? 'music-note' : 
                        platform.toLowerCase() === 'instagram' ? 'instagram' :
                        platform.toLowerCase() === 'youtube' ? 'youtube' : 'twitter'}
                  size={16} 
                  color={enhancedTheme.colors.textSecondary} 
                />
                <Text style={styles.platformName}>{platform}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      
      {/* Hidden WebView */}
      <PostDataExtractor ref={webViewExtractorRef} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: enhancedTheme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 20,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: enhancedTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    color: enhancedTheme.colors.text,
    letterSpacing: 3,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: enhancedTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 40,
  },
  buttonWrapper: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: enhancedTheme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  buttonContent: {
    flex: 1,
    marginLeft: 16,
  },
  primaryButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  primaryButtonSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  secondaryButtonWrapper: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: enhancedTheme.colors.primary,
  },
  instructionsCard: {
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 24,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
    marginBottom: 20,
  },
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  instructionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: enhancedTheme.colors.textSecondary,
    lineHeight: 20,
  },
  platformsContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  platformsTitle: {
    fontSize: 14,
    color: enhancedTheme.colors.textTertiary,
    marginBottom: 12,
  },
  platformBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: enhancedTheme.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: enhancedTheme.colors.border,
  },
  platformName: {
    fontSize: 13,
    color: enhancedTheme.colors.textSecondary,
    fontWeight: '500',
  },
});

export default CaptureTrendsScreenEnhanced;