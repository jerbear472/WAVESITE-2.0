import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../hooks/useAuth';
import { SafeScreen } from '../components/SafeScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { theme } from '../styles/theme';
import { enhancedTheme } from '../styles/theme.enhanced';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { AnimatedText } from '../components/ui/AnimatedText';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Logo } from '../components/Logo';
import PointsService from '../services/PointsService';
import { LEVEL_THRESHOLDS } from '../types/points';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut } = useAuth();
  
  const userPoints = user?.points || 0;
  const userLevel = PointsService.getUserLevel(userPoints);
  const progressToNext = PointsService.getPointsToNextLevel(userPoints);
  
  // Add emoji mapping for levels
  const levelEmojis: Record<string, string> = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    diamond: '💎',
    platinum: '👑'
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', onPress: signOut, style: 'destructive' },
      ]
    );
  };

  const stats = [
    { label: 'Trends Spotted', value: user?.trends_spotted || 0, emoji: '🎯', color: enhancedTheme.colors.primary },
    { label: 'Validated', value: user?.validated_trends || 0, emoji: '✅', color: enhancedTheme.colors.success },
    { label: 'Accuracy', value: `${((user?.accuracy_score || 0) * 100).toFixed(0)}%`, emoji: '📊', color: enhancedTheme.colors.accent },
  ];

  const avatarScale = useSharedValue(1);
  const cardScale = useSharedValue(1);

  const animatedAvatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  const handleAvatarPress = () => {
    avatarScale.value = withSequence(
      withSpring(0.9, { damping: 15 }),
      withSpring(1.1, { damping: 10 }),
      withSpring(1, { damping: 15 })
    );
  };

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
              Profile
            </AnimatedText>
          </View>

          <Animated.View
            entering={FadeIn.delay(200).springify()}
            style={styles.profileCard}
          >
            <Pressable onPress={handleAvatarPress}>
              <Animated.View style={[styles.avatar, animatedAvatarStyle]}>
                <LinearGradient
                  colors={enhancedTheme.colors.primaryGradient}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarEmoji}>👤</Text>
                </LinearGradient>
              </Animated.View>
            </Pressable>
            <AnimatedText type="fade" delay={300} style={styles.username}>
              @{user?.username || user?.email?.split('@')[0] || 'user'}
            </AnimatedText>
            <AnimatedText type="fade" delay={400} style={styles.email}>
              {user?.email || ''}
            </AnimatedText>
            
            {/* Level Badge */}
            <Animated.View 
              entering={SlideInDown.delay(500).springify()}
              style={styles.levelBadge}
            >
              <LinearGradient
                colors={[userLevel.color + '40', userLevel.color + '20']}
                style={styles.levelBadgeGradient}
              >
                <Text style={styles.levelEmoji}>{levelEmojis[userLevel.level] || '🏆'}</Text>
                <Text style={[styles.levelText, { color: userLevel.color }]}>
                  {userLevel.level.toUpperCase()}
                </Text>
              </LinearGradient>
            </Animated.View>
            
            {/* Points Display */}
            <Animated.View 
              entering={FadeIn.delay(600).springify()}
              style={styles.pointsContainer}
            >
              <Text style={styles.pointsValue}>{userPoints.toLocaleString()}</Text>
              <Text style={styles.pointsLabel}>Points</Text>
            </Animated.View>
            
            {/* Progress Bar */}
            {userLevel.level !== 'platinum' && (
              <Animated.View 
                entering={FadeIn.delay(700).springify()}
                style={styles.progressContainer}
              >
                <View style={styles.progressBar}>
                  <LinearGradient
                    colors={enhancedTheme.colors.primaryGradient}
                    style={[styles.progressFill, { width: `${progressToNext.percentage}%` }]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {progressToNext.points} points to {LEVEL_THRESHOLDS.find(l => l.minPoints > userPoints)?.level || 'next level'}
                </Text>
              </Animated.View>
            )}
          </Animated.View>

          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <Animated.View
                key={index}
                entering={SlideInDown.delay(600 + index * 100).springify()}
              >
                <GlassCard style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: stat.color + '20' }]}>
                    <Text style={styles.statEmoji}>{stat.emoji}</Text>
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </GlassCard>
              </Animated.View>
            ))}
          </View>

          <Animated.View 
            entering={FadeIn.delay(900).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Earnings</Text>
            <GlassCard style={styles.earningsCard}>
              <LinearGradient
                colors={[enhancedTheme.colors.successGradient[0] + '10', enhancedTheme.colors.successGradient[1] + '10']}
                style={styles.earningsGradient}
              >
                <View style={styles.earningsRow}>
                  <View style={styles.earningsItem}>
                    <Text style={styles.earningsEmoji}>💰</Text>
                    <Text style={styles.earningsLabel}>Available Balance</Text>
                  </View>
                  <Text style={styles.earningsValue}>
                    ${(user?.total_earnings || 0) - (user?.pending_earnings || 0)}
                  </Text>
                </View>
                <View style={styles.earningsDivider} />
                <View style={styles.earningsRow}>
                  <View style={styles.earningsItem}>
                    <Text style={styles.earningsEmoji}>⏰</Text>
                    <Text style={styles.earningsLabel}>Pending</Text>
                  </View>
                  <Text style={styles.earningsPending}>
                    ${user?.pending_earnings || 0}
                  </Text>
                </View>
              </LinearGradient>
            </GlassCard>
            <GradientButton
              title="Withdraw Funds"
              onPress={() => Alert.alert('Withdraw', 'Withdrawal feature coming soon!')}
              variant="success"
              size="large"
              icon={<Text style={styles.buttonEmoji}>💸</Text>}
              style={styles.withdrawButton}
            />
          </Animated.View>

          <View style={styles.menuSection}>
            {[
              { icon: 'folder-multiple', label: 'My Trends', color: enhancedTheme.colors.accent, emoji: '📁', onPress: () => navigation.navigate('MyTrends') },
              { icon: 'trophy', label: 'Achievements', color: enhancedTheme.colors.warning, emoji: '🏆', onPress: () => navigation.navigate('Achievements') },
              { icon: 'target', label: 'Build Your Persona', color: enhancedTheme.colors.accent, emoji: '🎯', onPress: () => navigation.navigate('PersonaBuilder') },
              { icon: 'bell', label: 'Notifications', color: enhancedTheme.colors.primary, emoji: '🔔' },
              { icon: 'cog', label: 'Settings', color: enhancedTheme.colors.textSecondary, emoji: '⚙️' },
              { icon: 'help-circle', label: 'Help & Support', color: enhancedTheme.colors.primary, emoji: '❓' },
              { icon: 'shield-lock', label: 'Terms & Privacy', color: enhancedTheme.colors.textTertiary, emoji: '🔒' },
            ].map((item, index) => (
              <Animated.View
                key={item.label}
                entering={SlideInDown.delay(1000 + index * 50).springify()}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && styles.menuItemPressed
                  ]}
                  onPress={item.onPress || (() => Alert.alert(item.label, 'Coming soon!'))}
                >
                  <GlassCard style={styles.menuItemCard}>
                    <View style={styles.menuItemContent}>
                      <View style={[styles.menuIconContainer, { backgroundColor: item.color + '20' }]}>
                        {item.emoji ? (
                          <Text style={styles.menuEmoji}>{item.emoji}</Text>
                        ) : (
                          <Icon name={item.icon} size={20} color={item.color} />
                        )}
                      </View>
                      <Text style={styles.menuItemText}>{item.label}</Text>
                    </View>
                    <Icon name="chevron-right" size={24} color={enhancedTheme.colors.textTertiary} />
                  </GlassCard>
                </Pressable>
              </Animated.View>
            ))}
          </View>

          <Animated.View
            entering={FadeIn.delay(1300).springify()}
            style={styles.signOutContainer}
          >
            <GradientButton
              title="Sign Out"
              onPress={handleSignOut}
              variant="secondary"
              size="large"
              icon={<Icon name="logout" size={20} color="#FFFFFF" />}
              style={styles.signOutButton}
            />
          </Animated.View>

          <AnimatedText
            type="fade"
            delay={1400}
            style={styles.version}
          >
            WAVESITE v2.0.0
          </AnimatedText>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  profileCard: {
    alignItems: 'center',
    marginVertical: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    ...enhancedTheme.shadows.lg,
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  username: {
    ...enhancedTheme.typography.headlineMedium,
    color: enhancedTheme.colors.text,
    marginBottom: 8,
  },
  email: {
    ...enhancedTheme.typography.bodyLarge,
    color: enhancedTheme.colors.textSecondary,
    marginBottom: 16,
  },
  roleBadge: {
    borderRadius: enhancedTheme.borderRadius.full,
    overflow: 'hidden',
  },
  roleBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  roleText: {
    ...enhancedTheme.typography.bodyMedium,
    color: enhancedTheme.colors.accent,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  levelBadge: {
    borderRadius: enhancedTheme.borderRadius.full,
    overflow: 'hidden',
    marginBottom: 16,
  },
  levelBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    gap: 8,
  },
  levelText: {
    ...enhancedTheme.typography.titleMedium,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  pointsContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pointsValue: {
    ...enhancedTheme.typography.headlineLarge,
    color: enhancedTheme.colors.accent,
    fontWeight: '900',
  },
  pointsLabel: {
    ...enhancedTheme.typography.bodyMedium,
    color: enhancedTheme.colors.textSecondary,
  },
  progressContainer: {
    width: '80%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: enhancedTheme.colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    alignItems: 'center',
    padding: 20,
    flex: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statEmoji: {
    fontSize: 24,
  },
  statValue: {
    ...enhancedTheme.typography.titleMedium,
    color: enhancedTheme.colors.accent,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    ...enhancedTheme.typography.headlineSmall,
    color: enhancedTheme.colors.text,
    marginBottom: 16,
  },
  earningsCard: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  earningsGradient: {
    padding: 20,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  earningsLabel: {
    ...enhancedTheme.typography.bodyMedium,
    color: enhancedTheme.colors.textSecondary,
  },
  earningsValue: {
    ...enhancedTheme.typography.headlineSmall,
    color: enhancedTheme.colors.success,
    fontWeight: 'bold',
  },
  earningsPending: {
    ...enhancedTheme.typography.headlineSmall,
    color: enhancedTheme.colors.warning,
    fontWeight: 'bold',
  },
  earningsDivider: {
    height: 1,
    backgroundColor: enhancedTheme.colors.glassBorder,
    marginVertical: 16,
  },
  withdrawButton: {
    width: '100%',
  },
  menuSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 12,
  },
  menuItem: {
    marginBottom: 8,
  },
  menuItemPressed: {
    transform: [{ scale: 0.98 }],
  },
  menuItemCard: {
    padding: 16,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuEmoji: {
    fontSize: 20,
  },
  menuItemText: {
    ...enhancedTheme.typography.bodyLarge,
    color: enhancedTheme.colors.text,
    flex: 1,
  },
  signOutContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  signOutButton: {
    width: '100%',
  },
  version: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textTertiary,
    textAlign: 'center',
    marginTop: 16,
  },
});