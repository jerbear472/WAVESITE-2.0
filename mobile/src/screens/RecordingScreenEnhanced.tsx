import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
  Linking,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolate,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import ScreenRecordingService from '../services/ScreenRecordingService';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../config/supabase';
import { CapturedPost } from '../config/supabase';
import { SafeScreen } from '../components/SafeScreen';
import { theme } from '../styles/theme';

const { width, height } = Dimensions.get('window');

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const RecordingScreenEnhanced: React.FC = () => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'tiktok' | 'instagram'>('tiktok');
  const [capturedPosts, setCapturedPosts] = useState<CapturedPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Animation values
  const recordButtonScale = useSharedValue(1);
  const recordButtonRotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const floatingY = useSharedValue(0);
  const modalScale = useSharedValue(0);

  useEffect(() => {
    // Floating animation for background elements
    floatingY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(10, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Pulse animation when recording
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1);
    }
  }, [isRecording]);

  useEffect(() => {
    if (showPlatformModal) {
      modalScale.value = withSpring(1, { damping: 15 });
    } else {
      modalScale.value = withTiming(0);
    }
  }, [showPlatformModal]);

  useEffect(() => {
    if (currentSessionId && isRecording) {
      const interval = setInterval(async () => {
        const { data } = await supabase
          .from('captured_posts')
          .select('*')
          .eq('recording_session_id', currentSessionId)
          .order('captured_at', { ascending: false });
        
        if (data) {
          setCapturedPosts(data);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [currentSessionId, isRecording]);

  const handleStartRecording = useCallback(async () => {
    try {
      if (!user) {
        Alert.alert('Error', 'Please login first');
        return;
      }

      recordButtonScale.value = withSequence(
        withTiming(0.9, { duration: 100 }),
        withSpring(1)
      );

      setShowPlatformModal(true);
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  }, [user]);

  const startRecordingForPlatform = useCallback(async (platform: 'tiktok' | 'instagram') => {
    setShowPlatformModal(false);
    setSelectedPlatform(platform);
    setIsLoading(true);

    try {
      const sessionId = `session_${Date.now()}`;
      setCurrentSessionId(sessionId);
      setIsRecording(true);
      setCapturedPosts([]);
      
      await ScreenRecordingService.prepareRecording({
        platform,
        sessionId,
        userId: user!.id,
      });
      
      Alert.alert(
        '🎬 Start Screen Recording',
        `To record ${platform === 'tiktok' ? 'TikTok' : 'Instagram'}:\n\n1. Swipe to Control Center\n2. Long press Screen Recording\n3. Select WaveSight\n4. Tap "Start Recording"\n\nWe'll open ${platform === 'tiktok' ? 'TikTok' : 'Instagram'} automatically!`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setIsRecording(false);
              setCurrentSessionId(null);
            }
          },
          {
            text: 'Let\'s Go! 🚀',
            onPress: () => {
              setTimeout(() => {
                const appUrl = platform === 'tiktok' ? 'tiktok://' : 'instagram://';
                
                Linking.openURL(appUrl).catch(() => {
                  const webUrl = platform === 'tiktok'
                    ? 'https://www.tiktok.com/'
                    : 'https://www.instagram.com/';
                  
                  Linking.openURL(webUrl).catch(() => {
                    Alert.alert(
                      'App Not Found',
                      `Please install ${platform === 'tiktok' ? 'TikTok' : 'Instagram'} or open it manually`
                    );
                  });
                });
              }, 1000);
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start recording');
      setCurrentSessionId(null);
      setIsRecording(false);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleStopRecording = useCallback(async () => {
    if (!isRecording || !currentSessionId) return;

    recordButtonScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1)
    );

    setIsLoading(true);
    try {
      await supabase
        .from('recording_sessions')
        .update({
          ended_at: new Date().toISOString(),
          status: 'completed',
          posts_captured: capturedPosts.length
        })
        .eq('id', currentSessionId);

      Alert.alert(
        '🎉 Recording Complete!',
        `Amazing! You captured ${capturedPosts.length} trending posts from ${selectedPlatform}.\n\nDon't forget to stop screen recording in Control Center and save your video!`,
        [{ text: 'Awesome! 🎊' }]
      );

      setIsRecording(false);
      setCurrentSessionId(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete recording');
    } finally {
      setIsLoading(false);
    }
  }, [isRecording, currentSessionId, selectedPlatform, capturedPosts.length]);

  const renderCapturedPost = ({ item, index }: { item: CapturedPost; index: number }) => (
    <Animated.View
      entering={SlideInDown.delay(index * 100).springify()}
      style={styles.postCard}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
        style={styles.postGradient}
      >
        <Text style={styles.postHandle}>{item.creator_handle}</Text>
        <Text style={styles.postCaption} numberOfLines={2}>{item.caption}</Text>
        <View style={styles.postMetrics}>
          <View style={styles.metricItem}>
            <Text style={styles.metricEmoji}>❤️</Text>
            <Text style={styles.metricText}>{formatNumber(item.likes_count)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricEmoji}>💬</Text>
            <Text style={styles.metricText}>{formatNumber(item.comments_count)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricEmoji}>↗️</Text>
            <Text style={styles.metricText}>{formatNumber(item.shares_count)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricEmoji}>⏱</Text>
            <Text style={styles.metricText}>{item.dwell_time}s</Text>
          </View>
        </View>
        {item.song_info && (
          <View style={styles.songInfo}>
            <Text style={styles.songIcon}>🎵</Text>
            <Text style={styles.songText}>{item.song_info}</Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const recordButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: recordButtonScale.value },
      { rotate: `${recordButtonRotation.value}deg` },
    ],
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: interpolate(pulseScale.value, [1, 1.2], [0.6, 0]),
  }));

  const floatingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatingY.value }],
  }));

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
    opacity: modalScale.value,
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F2027', '#203A43', '#2C5364']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Floating Background Elements */}
      <Animated.View style={[styles.floatingCircle1, floatingAnimatedStyle]} />
      <Animated.View style={[styles.floatingCircle2, floatingAnimatedStyle]} />
      
      <SafeScreen>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isRecording ? 'Recording' : 'Screen Recorder'}
            </Text>
            <Text style={styles.subtitle}>
              {isRecording 
                ? `Capturing ${selectedPlatform} trends... (${capturedPosts.length} posts)` 
                : 'Discover viral content in real-time'}
            </Text>
          </View>

          {!isRecording ? (
            <View style={styles.mainContent}>
              {/* Record Button */}
              <View style={styles.recordButtonContainer}>
                {isRecording && (
                  <Animated.View style={[styles.pulse, pulseAnimatedStyle]} />
                )}
                <AnimatedTouchableOpacity
                  style={[styles.recordButton, recordButtonAnimatedStyle]}
                  onPress={handleStartRecording}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#FF6B6B', '#FF8E53']}
                    style={styles.recordButtonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="large" color="#FFFFFF" />
                    ) : (
                      <View style={styles.recordIcon} />
                    )}
                  </LinearGradient>
                </AnimatedTouchableOpacity>
                <Text style={styles.recordButtonLabel}>Tap to Start</Text>
              </View>

              {/* Instructions */}
              <Animated.View 
                entering={FadeIn.delay(300).duration(600)}
                style={styles.instructions}
              >
                <Text style={styles.instructionTitle}>How it works</Text>
                {[
                  'Choose TikTok or Instagram',
                  'Enable screen recording',
                  'Browse trending content',
                  'AI captures post data automatically'
                ].map((instruction, index) => (
                  <Animated.View
                    key={index}
                    entering={SlideInDown.delay(400 + index * 100).springify()}
                    style={styles.instructionItem}
                  >
                    <Text style={styles.instructionNumber}>{index + 1}</Text>
                    <Text style={styles.instructionText}>{instruction}</Text>
                  </Animated.View>
                ))}
              </Animated.View>
            </View>
          ) : (
            <View style={styles.recordingContent}>
              {/* Stop Button */}
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStopRecording}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#E74C3C', '#C0392B']}
                  style={styles.stopButtonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  ) : (
                    <View style={styles.stopIcon} />
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <Text style={styles.stopButtonLabel}>Stop Recording</Text>

              {/* Captured Posts */}
              <View style={styles.capturedSection}>
                <Text style={styles.capturedTitle}>Live Capture Feed</Text>
                <FlatList
                  data={capturedPosts}
                  renderItem={renderCapturedPost}
                  keyExtractor={(item) => item.id || ''}
                  contentContainerStyle={styles.postsList}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>
                      Waiting for posts... Browse {selectedPlatform} to capture trends!
                    </Text>
                  }
                />
              </View>
            </View>
          )}
        </View>

        {/* Platform Selection Modal */}
        <Modal
          visible={showPlatformModal}
          transparent
          animationType="none"
        >
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.modalContent, modalAnimatedStyle]}>
              <Text style={styles.modalTitle}>Choose Platform</Text>
              
              <TouchableOpacity
                style={styles.platformButton}
                onPress={() => startRecordingForPlatform('tiktok')}
              >
                <LinearGradient
                  colors={['#000000', '#FF0050']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.platformButtonGradient}
                >
                  <Text style={styles.platformIcon}>📱</Text>
                  <Text style={styles.platformButtonText}>TikTok</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.platformButton}
                onPress={() => startRecordingForPlatform('instagram')}
              >
                <LinearGradient
                  colors={['#833AB4', '#FD1D1D', '#FCB045']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.platformButtonGradient}
                >
                  <Text style={styles.platformIcon}>📷</Text>
                  <Text style={styles.platformButtonText}>Instagram</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPlatformModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      </SafeScreen>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,107,107,0.1)',
    top: -50,
    right: -50,
  },
  floatingCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(78,205,196,0.1)',
    bottom: 100,
    left: -30,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  recordButtonContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  pulse: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FF6B6B',
  },
  recordButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  recordButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
  },
  recordButtonLabel: {
    marginTop: 20,
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  instructions: {
    paddingHorizontal: 40,
  },
  instructionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  instructionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 16,
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  recordingContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  stopButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 10,
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  stopButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  stopButtonLabel: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 30,
  },
  capturedSection: {
    flex: 1,
    width: '100%',
  },
  capturedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  postsList: {
    paddingBottom: 20,
  },
  postCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  postGradient: {
    padding: 20,
  },
  postHandle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4ECDC4',
    marginBottom: 8,
  },
  postCaption: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
    lineHeight: 20,
  },
  postMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  metricText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  songIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  songText: {
    fontSize: 12,
    color: '#FF6B6B',
    flex: 1,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 50,
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A2E',
    borderRadius: 24,
    padding: 32,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 32,
  },
  platformButton: {
    width: '100%',
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  platformButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  platformIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  platformButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  cancelButtonText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
});