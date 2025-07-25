import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  FadeIn,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { enhancedTheme } from '../styles/theme.enhanced';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedText } from '../components/ui/AnimatedText';
import ValidationService, { ValidationQueueItem } from '../services/ValidationService';
import PointsService from '../services/PointsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ValidationScreenEnhanced: React.FC = () => {
  const { user } = useAuth();
  const [currentTrend, setCurrentTrend] = useState<ValidationQueueItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ accuracy: 95, streak: 0, totalVotes: 0 });
  const [pointsEarned, setPointsEarned] = useState(0);

  const cardScale = useSharedValue(1);
  const cardRotateX = useSharedValue(0);
  const successScale = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    loadNextTrend();
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    if (!user) return;
    try {
      const userStats = await ValidationService.getUserStats(user.id);
      setStats({
        accuracy: userStats.accuracy || 95,
        streak: userStats.currentStreak || 0,
        totalVotes: userStats.totalValidations || 0,
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadNextTrend = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const trend = await ValidationService.getNextTrendToValidate(user.id);
      
      if (trend) {
        setCurrentTrend(trend);
        // Animate card entrance
        cardScale.value = 0;
        cardScale.value = withSpring(1, { damping: 15 });
      } else {
        setCurrentTrend(null);
      }
    } catch (error) {
      console.error('Error loading trend:', error);
      Alert.alert('Error', 'Failed to load trends');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (vote: 'yes' | 'no' | 'skip') => {
    if (!currentTrend || !user) return;

    // Animate button press
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );

    if (vote === 'skip') {
      // Animate card exit
      cardScale.value = withSpring(0, { damping: 15 });
      setTimeout(() => loadNextTrend(), 300);
      return;
    }

    try {
      await ValidationService.submitValidation(currentTrend.id, user.id, vote === 'yes');
      
      // Award points
      const points = 5;
      await PointsService.awardPoints(user.id, points, 'validation');
      
      // Show points animation
      setPointsEarned(points);
      successScale.value = withSequence(
        withSpring(1, { damping: 10 }),
        withSpring(0, { damping: 10, restDisplacementThreshold: 0.01 })
      );

      // Update stats
      setStats(prev => ({
        ...prev,
        totalVotes: prev.totalVotes + 1,
        streak: vote === 'yes' ? prev.streak + 1 : 0,
      }));

      // Load next trend
      cardScale.value = withSpring(0, { damping: 15 });
      setTimeout(() => loadNextTrend(), 300);
    } catch (error) {
      console.error('Error submitting validation:', error);
      Alert.alert('Error', 'Failed to submit validation');
    }
  };

  const handleOpenOriginal = () => {
    if (currentTrend?.url) {
      Linking.openURL(currentTrend.url);
    }
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale.value },
      { rotateX: `${cardRotateX.value}deg` },
    ],
  }));

  const successAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successScale.value,
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
          <Text style={styles.title}>Validate Trends</Text>
          <Text style={styles.subtitle}>Help identify the next big trends</Text>
          
          <View style={styles.statsRow}>
            <GlassCard style={styles.statCard}>
              <Icon name="target" size={24} color={enhancedTheme.colors.primary} />
              <Text style={styles.statValue}>{stats.accuracy}%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </GlassCard>
            
            <GlassCard style={styles.statCard}>
              <Icon name="fire" size={24} color={enhancedTheme.colors.warning} />
              <Text style={styles.statValue}>{stats.streak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </GlassCard>
            
            <GlassCard style={styles.statCard}>
              <Icon name="check-all" size={24} color={enhancedTheme.colors.success} />
              <Text style={styles.statValue}>{stats.totalVotes}</Text>
              <Text style={styles.statLabel}>Validated</Text>
            </GlassCard>
          </View>
        </View>

        <View style={styles.content}>
          {currentTrend ? (
            <Animated.View style={[styles.cardContainer, cardAnimatedStyle]}>
              <GlassCard style={styles.trendCard}>
                <View style={styles.trendHeader}>
                  <LinearGradient
                    colors={
                      currentTrend.platform === 'tiktok' ? ['#000', '#FF0050'] :
                      currentTrend.platform === 'instagram' ? ['#E4405F', '#FFA500'] :
                      ['#FF0000', '#282828']
                    }
                    style={styles.platformBadge}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon 
                      name={
                        currentTrend.platform === 'tiktok' ? 'music-note' :
                        currentTrend.platform === 'instagram' ? 'instagram' : 'youtube'
                      } 
                      size={16} 
                      color="#FFFFFF" 
                    />
                    <Text style={styles.platformName}>
                      {currentTrend.platform?.toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <Text style={styles.submittedBy}>
                    @{currentTrend.submitted_by}
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
                  <View style={styles.hashtagsContainer}>
                    {currentTrend.hashtags.split(' ').map((tag, index) => (
                      <View key={index} style={styles.hashtagBadge}>
                        <Text style={styles.hashtagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <Pressable
                  onPress={handleOpenOriginal}
                  style={styles.viewOriginalButton}
                >
                  <Icon name="open-in-new" size={18} color={enhancedTheme.colors.primary} />
                  <Text style={styles.viewOriginalText}>View Original Post</Text>
                </Pressable>

                <View style={styles.validationStats}>
                  <Icon name="account-group" size={16} color={enhancedTheme.colors.textSecondary} />
                  <Text style={styles.validationText}>
                    {currentTrend.validation_count} validations • 
                    {' '}{((currentTrend.positive_votes / Math.max(currentTrend.validation_count, 1)) * 100).toFixed(0)}% think it's trending
                  </Text>
                </View>
              </GlassCard>

              <View style={styles.actionButtons}>
                <Pressable
                  onPress={() => handleVote('no')}
                  style={({ pressed }) => [
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <LinearGradient
                    colors={['#ff4444', '#cc0000']}
                    style={styles.rejectButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon name="thumb-down-outline" size={28} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Not Trending</Text>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  onPress={() => handleVote('skip')}
                  style={styles.skipButton}
                >
                  <Icon name="skip-next" size={24} color={enhancedTheme.colors.textSecondary} />
                  <Text style={styles.skipButtonText}>Skip</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleVote('yes')}
                  style={({ pressed }) => [
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <LinearGradient
                    colors={['#44ff44', '#00cc00']}
                    style={styles.approveButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon name="thumb-up-outline" size={28} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>It's Trending!</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </Animated.View>
          ) : (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={enhancedTheme.gradients.primary}
                style={styles.emptyIcon}
              >
                <Icon name="check-all" size={48} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.emptyText}>All caught up!</Text>
              <Text style={styles.emptySubtext}>You've validated all available trends</Text>
              <Text style={styles.emptyStats}>Come back later for more</Text>
            </View>
          )}

          {pointsEarned > 0 && (
            <Animated.View style={[styles.pointsPopup, successAnimatedStyle]}>
              <LinearGradient
                colors={enhancedTheme.gradients.success}
                style={styles.pointsGradient}
              >
                <Icon name="star" size={20} color="#FFFFFF" />
                <Text style={styles.pointsText}>+{pointsEarned} points</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: enhancedTheme.colors.textSecondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: enhancedTheme.colors.textSecondary,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: enhancedTheme.colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  trendCard: {
    padding: 24,
    marginBottom: 20,
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  platformName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submittedBy: {
    fontSize: 14,
    color: enhancedTheme.colors.textSecondary,
  },
  trendTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
    marginBottom: 12,
  },
  trendDescription: {
    fontSize: 16,
    color: enhancedTheme.colors.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  hashtagBadge: {
    backgroundColor: enhancedTheme.colors.surface,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  hashtagText: {
    fontSize: 14,
    color: enhancedTheme.colors.primary,
  },
  viewOriginalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: enhancedTheme.colors.surface,
    borderRadius: 12,
    marginBottom: 16,
  },
  viewOriginalText: {
    fontSize: 14,
    fontWeight: '600',
    color: enhancedTheme.colors.primary,
  },
  validationStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  validationText: {
    fontSize: 14,
    color: enhancedTheme.colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 20,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: enhancedTheme.colors.surface,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 12,
    color: enhancedTheme.colors.textSecondary,
    marginTop: 4,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#44ff44',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
  },
  emptySubtext: {
    fontSize: 16,
    color: enhancedTheme.colors.textSecondary,
    textAlign: 'center',
  },
  emptyStats: {
    fontSize: 14,
    color: enhancedTheme.colors.textTertiary,
    marginTop: 8,
  },
  pointsPopup: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
  },
  pointsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ValidationScreenEnhanced;