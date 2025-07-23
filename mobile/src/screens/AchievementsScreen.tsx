import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInDown,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { enhancedTheme } from '../styles/theme.enhanced';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedText } from '../components/ui/AnimatedText';
import PointsService from '../services/PointsService';
import { Achievement } from '../types/points';

export const AchievementsScreen: React.FC = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    loadAchievements();
  }, [user?.id]);

  const loadAchievements = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const userAchievements = await PointsService.getUserAchievements(user.id);
      setAchievements(userAchievements);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAchievementPress = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
  };

  const AchievementCard = ({ achievement, index }: { achievement: Achievement; index: number }) => {
    const scale = useSharedValue(1);
    const isUnlocked = achievement.unlocked;

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePress = () => {
      scale.value = withSpring(0.95, {}, () => {
        scale.value = withSpring(1);
      });
      handleAchievementPress(achievement);
    };

    return (
      <Animated.View
        entering={SlideInDown.delay(index * 50).springify()}
        style={animatedStyle}
      >
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            pressed && styles.cardPressed,
          ]}
        >
          <GlassCard style={[
            styles.achievementCard,
            !isUnlocked && styles.lockedCard,
          ]}>
            <View style={styles.achievementContent}>
              <View style={[
                styles.iconContainer,
                !isUnlocked && styles.lockedIconContainer,
              ]}>
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                {!isUnlocked && (
                  <View style={styles.lockOverlay}>
                    <Icon name="lock" size={20} color={enhancedTheme.colors.textTertiary} />
                  </View>
                )}
              </View>
              
              <View style={styles.achievementInfo}>
                <Text style={[
                  styles.achievementName,
                  !isUnlocked && styles.lockedText,
                ]}>
                  {achievement.name}
                </Text>
                <Text style={[
                  styles.achievementDescription,
                  !isUnlocked && styles.lockedText,
                ]}>
                  {achievement.description}
                </Text>
                
                <View style={styles.achievementFooter}>
                  <View style={styles.pointsBadge}>
                    <Icon 
                      name="star" 
                      size={14} 
                      color={isUnlocked ? enhancedTheme.colors.warning : enhancedTheme.colors.textTertiary} 
                    />
                    <Text style={[
                      styles.pointsText,
                      !isUnlocked && styles.lockedText,
                    ]}>
                      {achievement.points} points
                    </Text>
                  </View>
                  
                  {isUnlocked && achievement.unlockedAt && (
                    <Text style={styles.unlockedDate}>
                      {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {isUnlocked && (
              <LinearGradient
                colors={[enhancedTheme.colors.success + '20', 'transparent']}
                style={styles.unlockedGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            )}
          </GlassCard>
        </Pressable>
      </Animated.View>
    );
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalPoints = achievements
    .filter(a => a.unlocked)
    .reduce((sum, a) => sum + a.points, 0);

  if (isLoading) {
    return (
      <LinearGradient
        colors={[enhancedTheme.colors.background, enhancedTheme.colors.backgroundSecondary]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={enhancedTheme.colors.primary} />
            <Text style={styles.loadingText}>Loading achievements...</Text>
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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <AnimatedText
              type="slide"
              style={styles.title}
              gradient
            >
              Achievements
            </AnimatedText>
            
            <Animated.View
              entering={FadeIn.delay(200).springify()}
              style={styles.statsContainer}
            >
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{unlockedCount}/{achievements.length}</Text>
                <Text style={styles.statLabel}>Unlocked</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{totalPoints}</Text>
                <Text style={styles.statLabel}>Points Earned</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {Math.round((unlockedCount / achievements.length) * 100)}%
                </Text>
                <Text style={styles.statLabel}>Complete</Text>
              </View>
            </Animated.View>
          </View>

          <View style={styles.achievementsList}>
            {achievements.map((achievement, index) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                index={index}
              />
            ))}
          </View>
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
    paddingBottom: 40,
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: enhancedTheme.colors.glass,
    padding: 16,
    borderRadius: enhancedTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: enhancedTheme.colors.glassBorder,
  },
  statValue: {
    ...enhancedTheme.typography.headlineSmall,
    color: enhancedTheme.colors.accent,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textSecondary,
  },
  achievementsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  achievementCard: {
    padding: 20,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  lockedCard: {
    opacity: 0.7,
  },
  achievementContent: {
    flexDirection: 'row',
    gap: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    backgroundColor: enhancedTheme.colors.surface,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lockedIconContainer: {
    backgroundColor: enhancedTheme.colors.surface + '50',
  },
  achievementIcon: {
    fontSize: 32,
  },
  lockOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    ...enhancedTheme.typography.titleMedium,
    color: enhancedTheme.colors.text,
    marginBottom: 4,
  },
  achievementDescription: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textSecondary,
    marginBottom: 12,
  },
  lockedText: {
    opacity: 0.6,
  },
  achievementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.warning,
    fontWeight: '600',
  },
  unlockedDate: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textTertiary,
  },
  unlockedGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
});