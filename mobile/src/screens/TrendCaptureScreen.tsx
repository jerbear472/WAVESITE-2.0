import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  Linking,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  FadeIn,
  runOnJS,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import TrendCaptureService from '../services/TrendCaptureService';
import ShareExtensionService from '../services/ShareExtensionService';
import { useAuth } from '../hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { enhancedTheme } from '../styles/theme.enhanced';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { AnimatedText } from '../components/ui/AnimatedText';
import { Logo } from '../components/Logo';
import { testShareExtension } from '../utils/shareExtensionTest';

export const TrendCaptureScreen: React.FC = () => {
  const { user } = useAuth();
  const [sharedLink, setSharedLink] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'tiktok' | 'instagram' | 'youtube' | null>(null);
  const [capturedTrends, setCapturedTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [trendDetails, setTrendDetails] = useState({
    title: '',
    description: '',
    hashtags: '',
  });
  
  const buttonScale = useSharedValue(1);
  const pointsScale = useSharedValue(0);
  const pointsOpacity = useSharedValue(0);

  // Check for shared content on mount
  useEffect(() => {
    checkForSharedContent();
    
    // Listen for shared content from share extension
    const shareService = ShareExtensionService.getInstance();
    const unsubscribe = shareService.addListener((content) => {
      setSharedLink(content.url);
      setSelectedPlatform(content.platform as any);
      
      // Auto-populate title if provided
      if (content.title) {
        setTrendDetails(prev => ({
          ...prev,
          title: content.title || `Shared from ${content.platform}`,
        }));
      }
      
      // Show capture modal with a slight delay for better UX
      setTimeout(() => {
        setShowCaptureModal(true);
      }, 300);
      
      // Show toast notification
      Alert.alert(
        '🔗 Link Received',
        `Ready to capture ${content.platform} trend`,
        [{ text: 'OK' }],
        { cancelable: true }
      );
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const checkForSharedContent = async () => {
    // Check for any previously shared content
    const shareService = ShareExtensionService.getInstance();
    const sharedContent = await shareService.getSharedContent();
    if (sharedContent.length > 0) {
      const latestShare = sharedContent[0];
      setSharedLink(latestShare.url);
      setSelectedPlatform(latestShare.platform as any);
    }
  };

  const handleCapturePress = useCallback(() => {
    buttonScale.value = withSequence(
      withSpring(0.9, { damping: 15 }),
      withSpring(1, { damping: 15 })
    );
    setShowCaptureModal(true);
  }, [buttonScale]);

  const loadRecentCaptures = useCallback(async () => {
    if (user?.id) {
      try {
        const trends = await TrendCaptureService.getUserTrends(user.id, 5);
        setCapturedTrends(trends);
        setDbError(false);
      } catch (error: any) {
        if (error?.code === '42P01') {
          setDbError(true);
        }
      }
    }
  }, [user?.id]);

  // Load recent captures on mount
  useEffect(() => {
    loadRecentCaptures();
  }, [loadRecentCaptures]);

  const handleLinkSubmit = useCallback(async () => {
    if (!sharedLink.trim()) {
      Alert.alert('Error', 'Please enter a link');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    setIsLoading(true);
    const platform = TrendCaptureService.detectPlatform(sharedLink);
    setSelectedPlatform(platform);

    try {
      const capturedTrend = await TrendCaptureService.captureTrend(
        sharedLink,
        user.id,
        {
          title: trendDetails.title,
          description: trendDetails.description,
          hashtags: trendDetails.hashtags,
        },
        'manual'
      );

      setCapturedTrends([capturedTrend, ...capturedTrends]);
      setShowCaptureModal(false);
      setSharedLink('');
      setTrendDetails({ title: '', description: '', hashtags: '' });
      setSelectedPlatform(null);
      
      // Show points animation
      setPointsEarned(50); // Base points for flagging a trend
      setShowPointsAnimation(true);
      pointsScale.value = withSequence(
        withSpring(1.2, { damping: 10 }),
        withSpring(1, { damping: 15 })
      );
      pointsOpacity.value = withSequence(
        withSpring(1),
        withSpring(1),
        withSpring(0, { damping: 15 }, () => {
          runOnJS(() => setShowPointsAnimation(false))();
        })
      );
      
      Alert.alert(
        'Trend Captured! +50 Points',
        `Your ${platform || 'social media'} trend has been saved for analysis.`,
        [
          { text: 'View', onPress: () => handleViewTrend(capturedTrend) },
          { text: 'OK', style: 'cancel' }
        ]
      );
    } catch (error: any) {
      console.error('Error capturing trend:', error);
      Alert.alert(
        'Capture Failed',
        error.message || 'Failed to capture trend. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [sharedLink, trendDetails, user, capturedTrends]);

  const handleClipboardPaste = useCallback(async () => {
    try {
      const clipboardContent = await Clipboard.getString();
      if (clipboardContent && (clipboardContent.startsWith('http') || clipboardContent.startsWith('www'))) {
        setSharedLink(clipboardContent);
        const platform = TrendCaptureService.detectPlatform(clipboardContent);
        setSelectedPlatform(platform);
        
        if (platform) {
          Alert.alert(
            'Link Detected',
            `Found a ${platform.charAt(0).toUpperCase() + platform.slice(1)} link. Would you like to capture this trend?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Capture', onPress: () => setShowCaptureModal(true) }
            ]
          );
        } else {
          setShowCaptureModal(true);
        }
      } else {
        Alert.alert('No Link Found', 'No valid link found in clipboard. Make sure you have copied a social media link.');
      }
    } catch (error) {
      console.error('Error reading clipboard:', error);
      Alert.alert('Error', 'Failed to read clipboard');
    }
  }, []);

  const handleViewTrend = useCallback((trend: any) => {
    // In a real app, this would navigate to a trend detail screen
    TrendCaptureService.openOriginalContent(trend.url);
  }, []);

  const renderCapturedTrend = ({ item, index }: { item: any; index: number }) => (
    <Animated.View
      entering={FadeIn.delay(index * 100).springify()}
    >
      <Pressable
        style={({ pressed }) => [
          pressed && styles.cardPressed
        ]}
        onPress={() => Linking.openURL(item.url)}
      >
        <GlassCard style={styles.trendCard}>
          <View style={styles.trendHeader}>
            <View style={styles.platformBadge}>
              <LinearGradient
                colors={
                  item.platform === 'tiktok' ? ['#FF0050', '#FF005080'] :
                  item.platform === 'instagram' ? ['#E4405F', '#E4405F80'] :
                  ['#FF0000', '#FF000080']
                }
                style={styles.platformGradient}
              >
                <Icon 
                  name={
                    item.platform === 'tiktok' ? 'music-note' :
                    item.platform === 'instagram' ? 'instagram' : 'youtube'
                  } 
                  size={16} 
                  color="#FFFFFF" 
                />
              </LinearGradient>
              <Text style={styles.platformText}>{item.platform || 'Unknown'}</Text>
            </View>
            <Text style={styles.trendTime}>
              {new Date(item.captured_at).toLocaleTimeString()}
            </Text>
          </View>
          
          <Text style={styles.trendTitle} numberOfLines={2}>
            {item.title || 'Untitled Trend'}
          </Text>
          
          {item.metadata?.author && (
            <View style={styles.authorRow}>
              <Icon name="account" size={14} color={enhancedTheme.colors.textSecondary} />
              <Text style={styles.authorText}>@{item.metadata.author}</Text>
            </View>
          )}
          
          {item.description && (
            <Text style={styles.trendDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          {item.hashtags && (
            <Text style={styles.hashtags} numberOfLines={1}>
              {item.hashtags}
            </Text>
          )}
          
          <View style={styles.trendStats}>
            {item.metadata?.videoId && (
              <View style={styles.statItem}>
                <Icon name="identifier" size={14} color={enhancedTheme.colors.primary} />
                <Text style={styles.statText}>ID: {item.metadata.videoId.slice(0, 8)}...</Text>
              </View>
            )}
            <View style={styles.statItem}>
              <Icon name="clock-outline" size={14} color={enhancedTheme.colors.primary} />
              <Text style={styles.statText}>Captured</Text>
            </View>
          </View>
          
          <View style={styles.trendFooter}>
            <View style={styles.footerLeft}>
              <Icon name="link-variant" size={16} color={enhancedTheme.colors.accent} />
              <Text style={styles.linkText} numberOfLines={1}>
                View Original
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={enhancedTheme.colors.textTertiary} />
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));
  
  const pointsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pointsScale.value }],
    opacity: pointsOpacity.value,
  }));

  return (
    <LinearGradient
      colors={[enhancedTheme.colors.background, enhancedTheme.colors.backgroundSecondary]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Logo size="small" showText={false} animated />
            <AnimatedText
              type="slide"
              style={styles.title}
              gradient
            >
              Capture Trends
            </AnimatedText>
          </View>
          
          <AnimatedText
            type="fade"
            delay={200}
            style={styles.subtitle}
          >
            Share viral content from social media
          </AnimatedText>

          <View style={styles.content}>
            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <Animated.View
                entering={FadeIn.delay(300).springify()}
                style={styles.actionCard}
              >
                <Pressable
                  onPress={handleCapturePress}
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.buttonPressed
                  ]}
                >
                  <Animated.View style={buttonAnimatedStyle}>
                    <LinearGradient
                      colors={enhancedTheme.colors.primaryGradient}
                      style={styles.actionGradient}
                    >
                      <Text style={styles.actionEmoji}>🚩</Text>
                      <Text style={styles.actionText}>Capture Trend</Text>
                      <Text style={styles.actionSubtext}>Share from any app</Text>
                    </LinearGradient>
                  </Animated.View>
                </Pressable>
              </Animated.View>

              <Animated.View
                entering={FadeIn.delay(400).springify()}
                style={styles.actionCard}
              >
                <Pressable
                  onPress={handleClipboardPaste}
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.buttonPressed
                  ]}
                >
                  <GlassCard style={styles.actionGlass}>
                    <Text style={styles.actionEmoji}>📋</Text>
                    <Text style={styles.actionTextAlt}>Paste Link</Text>
                    <Text style={styles.actionSubtextAlt}>From clipboard</Text>
                  </GlassCard>
                </Pressable>
              </Animated.View>
            </View>

            {/* Instructions */}
            <Animated.View
              entering={FadeIn.delay(500).springify()}
              style={styles.instructionsCard}
            >
              <GlassCard style={styles.instructions}>
                <Text style={styles.instructionTitle}>How to capture trends:</Text>
                <View style={styles.instructionStep}>
                  <Icon name="numeric-1-circle" size={20} color={enhancedTheme.colors.accent} />
                  <Text style={styles.instructionText}>Browse TikTok, Instagram, or YouTube</Text>
                </View>
                <View style={styles.instructionStep}>
                  <Icon name="numeric-2-circle" size={20} color={enhancedTheme.colors.accent} />
                  <Text style={styles.instructionText}>Find trending content you want to save</Text>
                </View>
                <View style={styles.instructionStep}>
                  <Icon name="numeric-3-circle" size={20} color={enhancedTheme.colors.accent} />
                  <Text style={styles.instructionText}>Share to WaveSight or copy the link</Text>
                </View>
                <View style={styles.instructionStep}>
                  <Icon name="numeric-4-circle" size={20} color={enhancedTheme.colors.accent} />
                  <Text style={styles.instructionText}>Add details and let AI analyze it</Text>
                </View>
              </GlassCard>
            </Animated.View>

            {/* Database Setup Notice */}
            {dbError && (
              <Animated.View
                entering={FadeIn.delay(500).springify()}
                style={styles.noticeCard}
              >
                <GlassCard style={styles.notice}>
                  <Icon name="database-alert" size={24} color={enhancedTheme.colors.warning} />
                  <Text style={styles.noticeTitle}>Database Setup Required</Text>
                  <Text style={styles.noticeText}>
                    The captured_trends table needs to be created in Supabase.
                  </Text>
                  <Text style={styles.noticeText}>
                    Please check docs/DATABASE_SETUP.md for instructions.
                  </Text>
                </GlassCard>
              </Animated.View>
            )}

            {/* Debug Tools (Dev Only) */}
            {__DEV__ && (
              <Animated.View
                entering={FadeIn.delay(600).springify()}
                style={styles.debugSection}
              >
                <GlassCard style={styles.debugCard}>
                  <Text style={styles.debugTitle}>🛠️ Debug Tools</Text>
                  <View style={styles.debugButtons}>
                    <Pressable
                      onPress={() => testShareExtension.runDiagnostics()}
                      style={styles.debugButton}
                    >
                      <Text style={styles.debugButtonText}>Test ShareExtension</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => testShareExtension.simulateShare('https://www.tiktok.com/@test/video/123')}
                      style={styles.debugButton}
                    >
                      <Text style={styles.debugButtonText}>Simulate TikTok Share</Text>
                    </Pressable>
                  </View>
                </GlassCard>
              </Animated.View>
            )}

            {/* Recent Captures */}
            {capturedTrends.length > 0 && (
              <Animated.View
                entering={FadeIn.delay(600).springify()}
                style={styles.recentSection}
              >
                <Text style={styles.sectionTitle}>Recent Captures</Text>
                <FlatList
                  data={capturedTrends}
                  renderItem={renderCapturedTrend}
                  keyExtractor={(item) => item.id || ''}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.trendsList}
                />
              </Animated.View>
            )}
          </View>

          {/* Capture Modal */}
          <Modal
            visible={showCaptureModal}
            transparent
            animationType="slide"
          >
            <View style={styles.modalOverlay}>
              <GlassCard style={styles.modalContent}>
                <AnimatedText type="scale" style={styles.modalTitle}>
                  {selectedPlatform ? `Capture ${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} Trend` : 'Capture Trend'}
                </AnimatedText>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Link</Text>
                  <TextInput
                    style={styles.input}
                    value={sharedLink}
                    onChangeText={setSharedLink}
                    placeholder="Paste link here"
                    placeholderTextColor={enhancedTheme.colors.textTertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {selectedPlatform && (
                    <View style={styles.detectedPlatform}>
                      <Icon 
                        name={
                          selectedPlatform === 'tiktok' ? 'music-note' :
                          selectedPlatform === 'instagram' ? 'instagram' : 'youtube'
                        } 
                        size={16} 
                        color={enhancedTheme.colors.accent} 
                      />
                      <Text style={styles.detectedPlatformText}>
                        {selectedPlatform} detected
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Title (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={trendDetails.title}
                    onChangeText={(text) => setTrendDetails({...trendDetails, title: text})}
                    placeholder="What's this trend about?"
                    placeholderTextColor={enhancedTheme.colors.textTertiary}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Description (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={trendDetails.description}
                    onChangeText={(text) => setTrendDetails({...trendDetails, description: text})}
                    placeholder="Add any notes or context"
                    placeholderTextColor={enhancedTheme.colors.textTertiary}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Hashtags (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={trendDetails.hashtags}
                    onChangeText={(text) => setTrendDetails({...trendDetails, hashtags: text})}
                    placeholder="#trending #viral"
                    placeholderTextColor={enhancedTheme.colors.textTertiary}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.modalButtons}>
                  <GradientButton
                    title="Cancel"
                    onPress={() => {
                      setShowCaptureModal(false);
                      setSharedLink('');
                      setTrendDetails({ title: '', description: '', hashtags: '' });
                    }}
                    variant="secondary"
                    size="small"
                    style={styles.modalButton}
                  />
                  <GradientButton
                    title="Capture"
                    onPress={handleLinkSubmit}
                    variant="primary"
                    size="small"
                    loading={isLoading}
                    style={styles.modalButton}
                  />
                </View>
              </GlassCard>
            </View>
          </Modal>
          
          {/* Points Animation */}
          {showPointsAnimation && (
            <Animated.View style={[styles.pointsAnimation, pointsAnimatedStyle]}>
              <LinearGradient
                colors={enhancedTheme.colors.successGradient}
                style={styles.pointsAnimationGradient}
              >
                <Icon name="star" size={24} color="#FFFFFF" />
                <Text style={styles.pointsAnimationText}>+{pointsEarned} Points!</Text>
              </LinearGradient>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
    color: enhancedTheme.colors.text,
    letterSpacing: 1,
  },
  subtitle: {
    ...enhancedTheme.typography.bodyLarge,
    color: enhancedTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mainCard: {
    padding: 24,
    alignItems: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 16,
  },
  actionCard: {
    flex: 1,
  },
  actionButton: {
    width: '100%',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  actionGradient: {
    padding: 24,
    borderRadius: enhancedTheme.borderRadius.xl,
    alignItems: 'center',
    ...enhancedTheme.shadows.lg,
  },
  actionGlass: {
    padding: 24,
    alignItems: 'center',
  },
  actionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionText: {
    ...enhancedTheme.typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionTextAlt: {
    ...enhancedTheme.typography.titleMedium,
    color: enhancedTheme.colors.text,
    fontWeight: '600',
  },
  actionSubtext: {
    ...enhancedTheme.typography.bodySmall,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
  },
  actionSubtextAlt: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textSecondary,
    marginTop: 4,
  },
  instructionsCard: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  instructions: {
    padding: 20,
  },
  instructionTitle: {
    ...enhancedTheme.typography.titleMedium,
    color: enhancedTheme.colors.text,
    marginBottom: 16,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  instructionText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textSecondary,
    flex: 1,
  },
  recentSection: {
    paddingLeft: 20,
    marginTop: 8,
  },
  sectionTitle: {
    ...enhancedTheme.typography.headlineSmall,
    color: enhancedTheme.colors.text,
    marginBottom: 16,
  },
  trendsList: {
    paddingRight: 20,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  trendCard: {
    padding: 16,
    marginRight: 12,
    width: 280,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  platformGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.text,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  trendTime: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textTertiary,
  },
  trendTitle: {
    ...enhancedTheme.typography.titleMedium,
    color: enhancedTheme.colors.text,
    marginBottom: 8,
  },
  trendDescription: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  hashtags: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.accent,
    marginBottom: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  authorText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textSecondary,
    fontWeight: '500',
  },
  trendStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textSecondary,
  },
  trendFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: enhancedTheme.colors.glassBorder,
    paddingTop: 12,
    marginTop: 4,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  linkText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.accent,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    ...enhancedTheme.typography.headlineMedium,
    color: enhancedTheme.colors.text,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    ...enhancedTheme.typography.bodyMedium,
    color: enhancedTheme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: enhancedTheme.colors.surface,
    borderRadius: enhancedTheme.borderRadius.lg,
    padding: 16,
    color: enhancedTheme.colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: enhancedTheme.colors.glassBorder,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  detectedPlatform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  detectedPlatformText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.accent,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    minWidth: 80,
  },
  divider: {
    height: 1,
    backgroundColor: enhancedTheme.colors.glassBorder,
    marginVertical: 32,
    marginHorizontal: 20,
  },
  noticeCard: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  notice: {
    padding: 20,
    alignItems: 'center',
  },
  noticeTitle: {
    ...enhancedTheme.typography.titleMedium,
    color: enhancedTheme.colors.warning,
    marginTop: 12,
    marginBottom: 8,
  },
  noticeText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  debugSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  debugCard: {
    padding: 20,
    alignItems: 'center',
  },
  debugTitle: {
    ...enhancedTheme.typography.titleMedium,
    color: enhancedTheme.colors.text,
    marginBottom: 16,
  },
  debugButtons: {
    gap: 12,
    width: '100%',
  },
  debugButton: {
    backgroundColor: enhancedTheme.colors.surface,
    padding: 12,
    borderRadius: enhancedTheme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: enhancedTheme.colors.glassBorder,
  },
  debugButtonText: {
    ...enhancedTheme.typography.bodyMedium,
    color: enhancedTheme.colors.primary,
    fontWeight: '600',
  },
  pointsAnimation: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    zIndex: 1000,
  },
  pointsAnimationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: enhancedTheme.borderRadius.full,
    gap: 12,
    ...enhancedTheme.shadows.lg,
  },
  pointsAnimationText: {
    ...enhancedTheme.typography.headlineSmall,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});