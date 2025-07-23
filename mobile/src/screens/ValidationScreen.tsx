import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { enhancedTheme } from '../styles/theme.enhanced';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { AnimatedText } from '../components/ui/AnimatedText';
import ValidationService, { ValidationQueueItem } from '../services/ValidationService';
import PointsService from '../services/PointsService';

export const ValidationScreen: React.FC = () => {
  const { user } = useAuth();
  const [currentTrend, setCurrentTrend] = useState<ValidationQueueItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ totalVotes: 0, accuracy: 0, streak: 0 });
  const [pointsEarned, setPointsEarned] = useState(0);
  
  const cardScale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);
  const successScale = useSharedValue(0);

  useEffect(() => {
    loadNextTrend();
    loadStats();
  }, []);

  const loadStats = async () => {
    if (user?.id) {
      const userStats = await ValidationService.getValidationStats(user.id);
      setStats(userStats);
    }
  };

  const loadNextTrend = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const nextTrend = await ValidationService.getNextValidationItem(user.id);
      if (nextTrend) {
        setCurrentTrend(nextTrend);
        cardScale.value = withSpring(1);
        cardOpacity.value = withSpring(1);
      } else {
        setCurrentTrend(null);
      }
    } catch (error) {
      console.error('Error loading trend:', error);
      Alert.alert('Error', 'Failed to load validation item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (vote: 'yes' | 'no' | 'skip') => {
    if (!currentTrend || !user?.id) return;
    
    // Animate card out
    cardScale.value = withSpring(0.9);
    cardOpacity.value = withSpring(0);
    
    try {
      const result = await ValidationService.submitVote(
        currentTrend.trend_id,
        user.id,
        vote
      );
      
      if (result.points) {
        setPointsEarned(prev => prev + result.points);
        // Show success animation
        successScale.value = withSequence(
          withSpring(1.2),
          withSpring(1)
        );
      }
      
      if (result.consensus) {
        Alert.alert(
          '🎉 Consensus Reached!',
          'This trend has been validated by the community.',
          [{ text: 'Great!' }]
        );
      }
      
      // Load next trend
      setTimeout(() => {
        loadNextTrend();
      }, 300);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit vote');
      // Reset card
      cardScale.value = withSpring(1);
      cardOpacity.value = withSpring(1);
    }
  };

  const handleOpenOriginal = () => {
    if (currentTrend?.url) {
      Linking.openURL(currentTrend.url);
    }
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const successAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  if (isLoading && !currentTrend) {
    return (
      <LinearGradient
        colors={[enhancedTheme.colors.background, enhancedTheme.colors.backgroundSecondary]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={enhancedTheme.colors.primary} />
            <Text style={styles.loadingText}>Loading trends...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[enhancedTheme.colors.background, enhancedTheme.colors.backgroundSecondary]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <AnimatedText
            type="slide"
            style={styles.title}
            gradient
          >
            Validate Trends
          </AnimatedText>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>🎯</Text>
              <Text style={styles.statValue}>{stats.accuracy.toFixed(0)}%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statValue}>{stats.streak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>✅</Text>
              <Text style={styles.statValue}>{stats.totalVotes}</Text>
              <Text style={styles.statLabel}>Votes</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {currentTrend ? (
            <Animated.View style={[styles.cardContainer, cardAnimatedStyle]}>
              <GlassCard style={styles.trendCard}>
                <View style={styles.trendHeader}>
                  <View style={styles.platformBadge}>
                    <LinearGradient
                      colors={
                        currentTrend.platform === 'tiktok' ? ['#FF0050', '#FF005080'] :
                        currentTrend.platform === 'instagram' ? ['#E4405F', '#E4405F80'] :
                        ['#FF0000', '#FF000080']
                      }
                      style={styles.platformGradient}
                    >
                      <Icon 
                        name={
                          currentTrend.platform === 'tiktok' ? 'music-note' :
                          currentTrend.platform === 'instagram' ? 'instagram' : 'youtube'
                        } 
                        size={20} 
                        color="#FFFFFF" 
                      />
                    </LinearGradient>
                    <Text style={styles.platformText}>
                      {currentTrend.platform?.charAt(0).toUpperCase() + currentTrend.platform?.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.submittedBy}>
                    by @{currentTrend.submitted_by}
                  </Text>
                </View>

                <Text style={styles.trendTitle}>
                  {currentTrend.title || 'Untitled Trend'}
                </Text>

                {currentTrend.description && (
                  <Text style={styles.trendDescription}>
                    {currentTrend.description}
                  </Text>
                )}

                {currentTrend.hashtags && (
                  <Text style={styles.hashtags}>
                    {currentTrend.hashtags}
                  </Text>
                )}

                <Pressable
                  onPress={handleOpenOriginal}
                  style={styles.viewOriginalButton}
                >
                  <Icon name="open-in-new" size={16} color={enhancedTheme.colors.accent} />
                  <Text style={styles.viewOriginalText}>View Original</Text>
                </Pressable>

                <View style={styles.validationInfo}>
                  <Text style={styles.validationText}>
                    {currentTrend.validation_count} validations • 
                    {' '}{((currentTrend.positive_votes / Math.max(currentTrend.validation_count, 1)) * 100).toFixed(0)}% positive
                  </Text>
                </View>
              </GlassCard>

              <View style={styles.voteButtons}>
                <Pressable
                  onPress={() => handleVote('no')}
                  style={({ pressed }) => [
                    styles.voteButton,
                    styles.noButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <LinearGradient
                    colors={['#FF4444', '#CC0000']}
                    style={styles.voteButtonGradient}
                  >
                    <Icon name="thumb-down" size={32} color="#FFFFFF" />
                    <Text style={styles.voteButtonText}>Not Trending</Text>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  onPress={() => handleVote('skip')}
                  style={({ pressed }) => [
                    styles.voteButton,
                    styles.skipButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <View style={styles.skipButtonContent}>
                    <Icon name="skip-next" size={24} color={enhancedTheme.colors.textSecondary} />
                    <Text style={styles.skipButtonText}>Skip</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => handleVote('yes')}
                  style={({ pressed }) => [
                    styles.voteButton,
                    styles.yesButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <LinearGradient
                    colors={['#44FF44', '#00CC00']}
                    style={styles.voteButtonGradient}
                  >
                    <Icon name="thumb-up" size={32} color="#FFFFFF" />
                    <Text style={styles.voteButtonText}>It's Trending!</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </Animated.View>
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="check-all" size={64} color={enhancedTheme.colors.textTertiary} />
              <Text style={styles.emptyText}>All caught up!</Text>
              <Text style={styles.emptySubtext}>No more trends to validate right now</Text>
            </View>
          )}

          {pointsEarned > 0 && (
            <Animated.View style={[styles.pointsEarned, successAnimatedStyle]}>
              <LinearGradient
                colors={enhancedTheme.colors.successGradient}
                style={styles.pointsEarnedGradient}
              >
                <Text style={styles.pointsEarnedText}>+{pointsEarned} points earned!</Text>
              </LinearGradient>
            </Animated.View>
          )}
        </View>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    ...enhancedTheme.typography.titleMedium,
    color: enhancedTheme.colors.text,
    fontWeight: 'bold',
  },
  statLabel: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...enhancedTheme.typography.bodyLarge,
    color: enhancedTheme.colors.textSecondary,
    marginTop: 16,
  },
  cardContainer: {
    marginBottom: 20,
  },
  trendCard: {
    padding: 24,
    marginBottom: 24,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  platformGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformText: {
    ...enhancedTheme.typography.bodyMedium,
    color: enhancedTheme.colors.text,
    fontWeight: '600',
  },
  submittedBy: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textSecondary,
  },
  trendTitle: {
    ...enhancedTheme.typography.headlineSmall,
    color: enhancedTheme.colors.text,
    marginBottom: 12,
  },
  trendDescription: {
    ...enhancedTheme.typography.bodyMedium,
    color: enhancedTheme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  hashtags: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.accent,
    marginBottom: 16,
  },
  viewOriginalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  viewOriginalText: {
    ...enhancedTheme.typography.bodyMedium,
    color: enhancedTheme.colors.accent,
  },
  validationInfo: {
    borderTopWidth: 1,
    borderTopColor: enhancedTheme.colors.glassBorder,
    paddingTop: 12,
  },
  validationText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textTertiary,
    textAlign: 'center',
  },
  voteButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  voteButton: {
    flex: 1,
    borderRadius: enhancedTheme.borderRadius.xl,
    overflow: 'hidden',
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
  },
  voteButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noButton: {
    flex: 1.2,
  },
  skipButton: {
    flex: 0.8,
  },
  yesButton: {
    flex: 1.2,
  },
  skipButtonContent: {
    backgroundColor: enhancedTheme.colors.surface,
    borderWidth: 1,
    borderColor: enhancedTheme.colors.glassBorder,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: enhancedTheme.borderRadius.xl,
  },
  voteButtonText: {
    ...enhancedTheme.typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 4,
  },
  skipButtonText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textSecondary,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    ...enhancedTheme.typography.headlineSmall,
    color: enhancedTheme.colors.textTertiary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    ...enhancedTheme.typography.bodyMedium,
    color: enhancedTheme.colors.textTertiary,
  },
  pointsEarned: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
  },
  pointsEarnedGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: enhancedTheme.borderRadius.full,
  },
  pointsEarnedText: {
    ...enhancedTheme.typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});