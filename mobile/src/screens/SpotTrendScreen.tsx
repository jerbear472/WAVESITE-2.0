import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
  Linking,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { useAuth } from '../hooks/useAuth';
import { useXPNotification } from '../contexts/XPNotificationContext';
import { supabase } from '../config/supabase';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { SmartTrendSubmission } from '../components/SmartTrendSubmission';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  color: string[];
  urlPrefix: string[];
  placeholder: string;
}

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'music-note',
    color: ['#FF0050', '#00F2EA'],
    urlPrefix: ['tiktok.com', 'vm.tiktok.com'],
    placeholder: 'Paste TikTok video link...',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    color: ['#F58529', '#DD2A7B', '#8134AF'],
    urlPrefix: ['instagram.com', 'instagr.am'],
    placeholder: 'Paste Instagram post/reel link...',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: 'twitter',
    color: ['#1DA1F2', '#14171A'],
    urlPrefix: ['twitter.com', 'x.com', 't.co'],
    placeholder: 'Paste X/Twitter post link...',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: 'youtube',
    color: ['#FF0000', '#CC0000'],
    urlPrefix: ['youtube.com', 'youtu.be', 'shorts'],
    placeholder: 'Paste YouTube video/shorts link...',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: 'reddit',
    color: ['#FF4500', '#FF5700'],
    urlPrefix: ['reddit.com', 'redd.it'],
    placeholder: 'Paste Reddit post link...',
  },
];

export const SpotTrendScreen: React.FC = () => {
  const { user } = useAuth();
  const { showXPNotification } = useXPNotification();
  const [trendUrl, setTrendUrl] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSmartSubmission, setShowSmartSubmission] = useState(false);
  const [pastedUrl, setPastedUrl] = useState('');
  const [recentTrends, setRecentTrends] = useState<any[]>([]);
  
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    loadRecentTrends();
    checkClipboard();
  }, []);

  const loadRecentTrends = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('spotter_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (data) {
        setRecentTrends(data);
      }
    } catch (error) {
      console.error('Error loading recent trends:', error);
    }
  };

  const checkClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getString();
      if (clipboardContent && isValidUrl(clipboardContent)) {
        setPastedUrl(clipboardContent);
        setTrendUrl(clipboardContent);
        detectPlatform(clipboardContent);
      }
    } catch (error) {
      console.error('Error reading clipboard:', error);
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const detectPlatform = (url: string) => {
    const platform = SOCIAL_PLATFORMS.find(p => 
      p.urlPrefix.some(prefix => url.includes(prefix))
    );
    setSelectedPlatform(platform || null);
  };

  const handlePlatformSelect = (platform: SocialPlatform) => {
    setSelectedPlatform(platform);
    scale.value = withSequence(
      withSpring(0.9),
      withSpring(1.1),
      withSpring(1)
    );
    rotation.value = withSequence(
      withSpring(-5),
      withSpring(5),
      withSpring(0)
    );
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getString();
      if (clipboardContent) {
        setTrendUrl(clipboardContent);
        detectPlatform(clipboardContent);
        
        // Show feedback
        scale.value = withSequence(
          withSpring(1.1),
          withSpring(1)
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to paste from clipboard');
    }
  };

  const handleQuickSubmit = async () => {
    if (!trendUrl.trim()) {
      Alert.alert('Missing URL', 'Please enter or paste a trend URL');
      return;
    }

    if (!isValidUrl(trendUrl)) {
      Alert.alert('Invalid URL', 'Please enter a valid URL');
      return;
    }

    if (!user) {
      Alert.alert('Login Required', 'Please login to submit trends');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Basic submission for quick flow
      const { data, error } = await supabase
        .from('trend_submissions')
        .insert({
          spotter_id: user.id,
          url: trendUrl,
          platform: selectedPlatform?.id || 'unknown',
          title: `Trend from ${selectedPlatform?.name || 'Social Media'}`,
          category: 'lifestyle',
          status: 'submitted',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Award XP for submission
      await supabase.from('xp_transactions').insert({
        user_id: user.id,
        amount: 20,
        type: 'submission',
        description: 'Quick trend submission',
        reference_id: data.id,
        reference_type: 'trend',
        created_at: new Date().toISOString()
      });

      showXPNotification(20, 'Trend submitted!', 'submission');
      
      Alert.alert(
        'Success!',
        'Your trend has been submitted for validation.',
        [
          {
            text: 'Submit Another',
            onPress: () => {
              setTrendUrl('');
              setSelectedPlatform(null);
            }
          },
          {
            text: 'View Trends',
            style: 'cancel'
          }
        ]
      );
      
      loadRecentTrends();
    } catch (error) {
      console.error('Error submitting trend:', error);
      Alert.alert('Error', 'Failed to submit trend. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSmartSubmit = () => {
    if (!trendUrl.trim()) {
      Alert.alert('Missing URL', 'Please enter or paste a trend URL first');
      return;
    }
    setShowSmartSubmission(true);
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0F0F0F', '#1A1A1A']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Spot a Trend</Text>
            <Text style={styles.headerSubtitle}>
              Drop a link or choose a platform to get started
            </Text>
          </View>

          {/* URL Input Card */}
          <Animated.View style={animatedCardStyle}>
            <GlassCard style={styles.inputCard}>
              <View style={styles.inputHeader}>
                <Icon name="link-variant" size={24} color="#8B5CF6" />
                <Text style={styles.inputTitle}>Drop Your Link Here</Text>
              </View>
              
              <View style={styles.inputContainer}>
                <TextInput
                  value={trendUrl}
                  onChangeText={(text) => {
                    setTrendUrl(text);
                    detectPlatform(text);
                  }}
                  placeholder={selectedPlatform?.placeholder || "Paste any social media link..."}
                  placeholderTextColor="#64748B"
                  style={styles.textInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                
                <Pressable
                  onPress={handlePasteFromClipboard}
                  style={styles.pasteButton}
                >
                  <Icon name="content-paste" size={20} color="#FFFFFF" />
                </Pressable>
              </View>

              {/* Platform Detection Indicator */}
              {selectedPlatform && (
                <Animated.View entering={FadeIn} style={styles.detectedPlatform}>
                  <LinearGradient
                    colors={selectedPlatform.color}
                    style={styles.detectedPlatformGradient}
                  >
                    <Icon name={selectedPlatform.icon} size={16} color="#FFFFFF" />
                    <Text style={styles.detectedPlatformText}>
                      {selectedPlatform.name} detected
                    </Text>
                  </LinearGradient>
                </Animated.View>
              )}
            </GlassCard>
          </Animated.View>

          {/* Platform Quick Select */}
          <View style={styles.platformSection}>
            <Text style={styles.sectionTitle}>Or Select a Platform</Text>
            <View style={styles.platformGrid}>
              {SOCIAL_PLATFORMS.map((platform) => (
                <Pressable
                  key={platform.id}
                  onPress={() => handlePlatformSelect(platform)}
                  style={styles.platformButton}
                >
                  <LinearGradient
                    colors={platform.color}
                    style={[
                      styles.platformGradient,
                      selectedPlatform?.id === platform.id && styles.selectedPlatform,
                    ]}
                  >
                    <Icon name={platform.icon} size={28} color="#FFFFFF" />
                    <Text style={styles.platformName}>{platform.name}</Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <GradientButton
              onPress={handleQuickSubmit}
              disabled={!trendUrl.trim() || isSubmitting}
              style={styles.submitButton}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="lightning-bolt" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Quick Submit</Text>
                </>
              )}
            </GradientButton>

            <Pressable
              onPress={handleSmartSubmit}
              disabled={!trendUrl.trim()}
              style={[styles.smartButton, !trendUrl.trim() && styles.disabledButton]}
            >
              <Icon name="brain" size={20} color="#8B5CF6" />
              <Text style={[styles.buttonText, { color: '#8B5CF6' }]}>
                Smart Submit (More XP)
              </Text>
            </Pressable>
          </View>

          {/* Recent Submissions */}
          {recentTrends.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>Your Recent Spots</Text>
              {recentTrends.map((trend) => (
                <View key={trend.id} style={styles.recentItem}>
                  <View style={styles.recentItemContent}>
                    <Icon 
                      name={SOCIAL_PLATFORMS.find(p => p.id === trend.platform)?.icon || 'web'} 
                      size={20} 
                      color="#8B5CF6" 
                    />
                    <View style={styles.recentItemText}>
                      <Text style={styles.recentTitle} numberOfLines={1}>
                        {trend.title || 'Untitled Trend'}
                      </Text>
                      <Text style={styles.recentTime}>
                        {new Date(trend.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    trend.status === 'quality_approved' && styles.approvedBadge,
                    trend.status === 'rejected' && styles.rejectedBadge,
                  ]}>
                    <Text style={styles.statusText}>
                      {trend.status === 'quality_approved' ? 'Approved' : 
                       trend.status === 'rejected' ? 'Rejected' : 'Pending'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Tips */}
          <View style={styles.tipsCard}>
            <Icon name="lightbulb-outline" size={20} color="#FFD700" />
            <Text style={styles.tipsText}>
              <Text style={styles.tipsBold}>Pro Tip:</Text> Use Smart Submit for 
              detailed analysis and earn up to 100 XP per trend!
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Smart Submission Modal */}
      <Modal
        visible={showSmartSubmission}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowSmartSubmission(false)}
      >
        <SmartTrendSubmission
          visible={showSmartSubmission}
          onClose={() => setShowSmartSubmission(false)}
          initialUrl={trendUrl}
          onSubmit={async (data) => {
            setShowSmartSubmission(false);
            setTrendUrl('');
            setSelectedPlatform(null);
            loadRecentTrends();
          }}
        />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  inputCard: {
    padding: 20,
    marginBottom: 24,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    height: 48,
    color: '#FFFFFF',
    fontSize: 16,
  },
  pasteButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectedPlatform: {
    marginTop: 12,
  },
  detectedPlatformGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  detectedPlatformText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  platformSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 16,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  platformButton: {
    width: '30%',
    marginBottom: 12,
  },
  platformGradient: {
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  selectedPlatform: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  platformName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  actionButtons: {
    marginBottom: 32,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    marginBottom: 12,
  },
  smartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  recentSection: {
    marginBottom: 24,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  recentItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentItemText: {
    marginLeft: 12,
    flex: 1,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  recentTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  approvedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  rejectedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FBBF24',
  },
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  tipsText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#E5E7EB',
    lineHeight: 20,
  },
  tipsBold: {
    fontWeight: '600',
    color: '#FFD700',
  },
});

export default SpotTrendScreen;