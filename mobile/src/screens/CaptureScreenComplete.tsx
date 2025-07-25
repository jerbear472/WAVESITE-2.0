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
  Animated,
  StatusBar,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import TrendStorageService from '../services/TrendStorageService';
import TrendExtractorService from '../services/TrendExtractorService';
import ShareExtensionService from '../services/ShareExtensionService';
import PostDataExtractor, { PostDataExtractorRef } from '../components/PostDataExtractor';
import { completeTheme } from '../styles/theme.complete';

const CaptureScreenComplete: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const webViewExtractorRef = useRef<PostDataExtractorRef>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate screen entrance
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

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
          `\"${savedTrend.title}\" has been saved to your collection.`,
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
    animateButton();
    Alert.alert(
      'Capture Trend',
      'Share content directly from TikTok, Instagram, or other platforms',
      [
        { 
          text: 'Open TikTok', 
          onPress: () => {
            // Add Linking import at the top
            import('react-native').then(({ Linking }) => {
              Linking.openURL('tiktok://').catch(() => {
                Linking.openURL('https://www.tiktok.com/');
              });
            });
          }
        },
        { 
          text: 'Open Instagram', 
          onPress: () => {
            import('react-native').then(({ Linking }) => {
              Linking.openURL('instagram://').catch(() => {
                Linking.openURL('https://www.instagram.com/');
              });
            });
          }
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handlePasteLink = async () => {
    try {
      animateButton();
      const content = await Clipboard.getString();
      
      if (!content || !content.trim()) {
        Alert.alert('No Link', 'No link found in clipboard. Please copy a link first.');
        return;
      }
      
      const trimmedContent = content.trim();
      const urlPattern = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/;
      
      if (!urlPattern.test(trimmedContent)) {
        Alert.alert('Invalid URL', 'Please copy a valid link from supported platforms.');
        return;
      }
      
      const urlWithProtocol = trimmedContent.startsWith('http') ? trimmedContent : `https://${trimmedContent}`;
      await processSharedUrl(urlWithProtocol);
    } catch (error) {
      Alert.alert('Error', 'Failed to access clipboard. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={completeTheme.colors.background} />
      <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          
          {/* Header Section */}
          <View style={styles.header}>
            <LinearGradient
              colors={completeTheme.gradients.primary}
              style={styles.logoContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="wave" size={48} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.brandName}>WAVESIGHT</Text>
            <Text style={styles.pageTitle}>Capture Trends</Text>
            <Text style={styles.subtitle}>Share viral content from social media</Text>
          </View>

          {/* Primary Action Button */}
          <Animated.View style={[styles.primaryButtonWrapper, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity 
              onPress={handleCaptureTrend}
              activeOpacity={0.9}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={completeTheme.gradients.primary}
                style={styles.primaryButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.buttonContent}>
                  <Icon name="share-variant" size={28} color="#fff" />
                  <View style={styles.buttonTextContainer}>
                    <Text style={styles.primaryButtonTitle}>Capture Trend</Text>
                    <Text style={styles.primaryButtonSubtitle}>Share from any app</Text>
                  </View>
                  <Icon name="chevron-right" size={24} color="#fff" />
                </View>
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
            <View style={styles.secondaryButton}>
              <LinearGradient
                colors={completeTheme.gradients.glass}
                style={styles.secondaryButtonGradient}
              >
                {isProcessing ? (
                  <ActivityIndicator color={completeTheme.colors.primary} size="small" />
                ) : (
                  <>
                    <Icon name="content-paste" size={24} color={completeTheme.colors.primary} />
                    <Text style={styles.secondaryButtonText}>Paste Link from Clipboard</Text>
                  </>
                )}
              </LinearGradient>
            </View>
          </TouchableOpacity>

          {/* Instructions Card */}
          <View style={styles.instructionsCard}>
            <LinearGradient
              colors={completeTheme.gradients.glass}
              style={styles.instructionsGradient}
            >
              <Text style={styles.instructionsTitle}>How it works</Text>
              <View style={styles.instructionsList}>
                {[
                  { icon: 'eye-outline', text: 'Find trending content on social media', color: completeTheme.colors.primary },
                  { icon: 'share-outline', text: 'Share to WAVESIGHT or copy link', color: completeTheme.colors.success },
                  { icon: 'chart-line', text: 'Track trends and earn rewards', color: completeTheme.colors.warning },
                ].map((item, index) => (
                  <View key={index} style={styles.instructionItem}>
                    <LinearGradient
                      colors={[item.color + '20', item.color + '10']}
                      style={styles.instructionIconContainer}
                    >
                      <Icon name={item.icon} size={20} color={item.color} />
                    </LinearGradient>
                    <Text style={styles.instructionText}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>

          {/* Platform Badges */}
          <View style={styles.platformsContainer}>
            <Text style={styles.platformsTitle}>Supported Platforms</Text>
            <View style={styles.platformBadges}>
              {[
                { name: 'TikTok', icon: 'music-note', color: '#ff0050' },
                { name: 'Instagram', icon: 'instagram', color: '#e4405f' },
                { name: 'YouTube', icon: 'youtube', color: '#ff0000' },
                { name: 'Twitter', icon: 'twitter', color: '#1da1f2' },
              ].map((platform) => (
                <View key={platform.name} style={styles.platformBadge}>
                  <Icon 
                    name={platform.icon}
                    size={16} 
                    color={platform.color} 
                  />
                  <Text style={styles.platformName}>{platform.name}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        
        {/* Hidden WebView */}
        <PostDataExtractor ref={webViewExtractorRef} />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: completeTheme.colors.background,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: completeTheme.spacing.lg,
    paddingBottom: 120, // Account for tab bar
  },
  header: {
    alignItems: 'center',
    marginBottom: completeTheme.spacing.xxl,
    paddingHorizontal: completeTheme.spacing.lg,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: completeTheme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: completeTheme.spacing.md,
    ...completeTheme.shadows.primary,
  },
  brandName: {
    fontSize: completeTheme.typography.fontSize.lg,
    fontWeight: completeTheme.typography.fontWeight.extrabold,
    color: completeTheme.colors.text,
    letterSpacing: completeTheme.typography.letterSpacing.widest,
    marginBottom: completeTheme.spacing.xs,
  },
  pageTitle: {
    fontSize: completeTheme.typography.fontSize['5xl'],
    fontWeight: completeTheme.typography.fontWeight.bold,
    color: completeTheme.colors.text,
    marginBottom: completeTheme.spacing.xs,
  },
  subtitle: {
    fontSize: completeTheme.typography.fontSize.base,
    color: completeTheme.colors.textSecondary,
    textAlign: 'center',
  },
  primaryButtonWrapper: {
    paddingHorizontal: completeTheme.spacing.lg,
    marginBottom: completeTheme.spacing.lg,
    ...completeTheme.shadows.primary,
  },
  primaryButton: {
    borderRadius: completeTheme.borderRadius.lg,
    overflow: 'hidden',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: completeTheme.spacing.lg,
    paddingHorizontal: completeTheme.spacing.lg,
  },
  buttonTextContainer: {
    flex: 1,
    marginLeft: completeTheme.spacing.md,
  },
  primaryButtonTitle: {
    fontSize: completeTheme.typography.fontSize.lg,
    fontWeight: completeTheme.typography.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  primaryButtonSubtitle: {
    fontSize: completeTheme.typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  secondaryButtonWrapper: {
    paddingHorizontal: completeTheme.spacing.lg,
    marginBottom: completeTheme.spacing.xxl,
  },
  secondaryButton: {
    borderRadius: completeTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: completeTheme.colors.border,
    overflow: 'hidden',
  },
  secondaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: completeTheme.spacing.md,
    paddingHorizontal: completeTheme.spacing.lg,
    gap: completeTheme.spacing.md,
  },
  secondaryButtonText: {
    fontSize: completeTheme.typography.fontSize.base,
    fontWeight: completeTheme.typography.fontWeight.semibold,
    color: completeTheme.colors.primary,
  },
  instructionsCard: {
    marginHorizontal: completeTheme.spacing.lg,
    marginBottom: completeTheme.spacing.xl,
    borderRadius: completeTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: completeTheme.colors.border,
    overflow: 'hidden',
  },
  instructionsGradient: {
    padding: completeTheme.spacing.lg,
  },
  instructionsTitle: {
    fontSize: completeTheme.typography.fontSize.lg,
    fontWeight: completeTheme.typography.fontWeight.bold,
    color: completeTheme.colors.text,
    marginBottom: completeTheme.spacing.lg,
  },
  instructionsList: {
    gap: completeTheme.spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: completeTheme.spacing.md,
  },
  instructionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: completeTheme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    flex: 1,
    fontSize: completeTheme.typography.fontSize.base,
    color: completeTheme.colors.textSecondary,
    lineHeight: completeTheme.typography.fontSize.base * completeTheme.typography.lineHeight.normal,
  },
  platformsContainer: {
    paddingHorizontal: completeTheme.spacing.lg,
    alignItems: 'center',
  },
  platformsTitle: {
    fontSize: completeTheme.typography.fontSize.sm,
    color: completeTheme.colors.textTertiary,
    marginBottom: completeTheme.spacing.md,
  },
  platformBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: completeTheme.spacing.sm,
    justifyContent: 'center',
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: completeTheme.spacing.xs,
    backgroundColor: completeTheme.colors.surface,
    paddingVertical: completeTheme.spacing.xs,
    paddingHorizontal: completeTheme.spacing.md,
    borderRadius: completeTheme.borderRadius.xl,
    borderWidth: 1,
    borderColor: completeTheme.colors.border,
  },
  platformName: {
    fontSize: completeTheme.typography.fontSize.xs,
    color: completeTheme.colors.textSecondary,
    fontWeight: completeTheme.typography.fontWeight.medium,
  },
});

export default CaptureScreenComplete;