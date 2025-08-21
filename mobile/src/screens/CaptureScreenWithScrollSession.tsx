import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
  Animated,
  Vibration,
  SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import { storage } from '../../App';
import { theme } from '../styles/theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface ScrollSession {
  startTime: Date;
  endTime?: Date;
  duration: number;
  platform: string;
  trendsFound: number;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  todayCompleted: boolean;
  lastSessionDate: string | null;
}

const SOCIAL_APPS = [
  { 
    name: 'TikTok', 
    icon: '🎵', 
    url: 'tiktok://',
    webUrl: 'https://www.tiktok.com',
    color: '#000000',
    gradient: ['#FF0050', '#00F2EA']
  },
  { 
    name: 'Instagram', 
    icon: '📸', 
    url: 'instagram://',
    webUrl: 'https://www.instagram.com',
    color: '#E4405F',
    gradient: ['#F77737', '#E1306C', '#C13584']
  },
  { 
    name: 'X', 
    icon: '𝕏', 
    url: 'twitter://',
    webUrl: 'https://x.com',
    color: '#000000',
    gradient: ['#1DA1F2', '#0088CC']
  },
  { 
    name: 'YouTube', 
    icon: '▶️', 
    url: 'youtube://',
    webUrl: 'https://www.youtube.com',
    color: '#FF0000',
    gradient: ['#FF0000', '#CC0000']
  },
  { 
    name: 'Reddit', 
    icon: '🤖', 
    url: 'reddit://',
    webUrl: 'https://www.reddit.com',
    color: '#FF4500',
    gradient: ['#FF4500', '#FF8717']
  },
  { 
    name: 'Threads', 
    icon: '🧵', 
    url: 'barcelona://',
    webUrl: 'https://www.threads.net',
    color: '#000000',
    gradient: ['#000000', '#333333']
  },
];

export default function CaptureScreenWithScrollSession() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [currentSession, setCurrentSession] = useState<ScrollSession | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    todayCompleted: false,
    lastSessionDate: null,
  });
  const [sessionTime, setSessionTime] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadStreakData();
    // Ensure session is not active on mount
    setIsSessionActive(false);
    setCurrentSession(null);
    setSelectedPlatform(null);
    setSessionTime(0);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isSessionActive) {
      // Start pulse animation for active session
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [isSessionActive]);

  const loadStreakData = () => {
    try {
      const streakStr = storage.getString('streak_data');
      if (streakStr) {
        const data = JSON.parse(streakStr);
        const today = new Date().toDateString();
        const lastSession = data.lastSessionDate ? new Date(data.lastSessionDate).toDateString() : null;
        
        setStreakData({
          ...data,
          todayCompleted: lastSession === today,
        });
      }
    } catch (error) {
      console.error('Error loading streak data:', error);
    }
  };

  const updateStreakData = () => {
    const today = new Date();
    const todayStr = today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    let newStreak = streakData.currentStreak;
    let newLongest = streakData.longestStreak;
    const lastSessionStr = streakData.lastSessionDate ? new Date(streakData.lastSessionDate).toDateString() : null;

    if (lastSessionStr === todayStr) {
      // Already completed today, no change
    } else if (lastSessionStr === yesterdayStr) {
      // Continuing streak
      newStreak += 1;
    } else {
      // Streak broken, start new
      newStreak = 1;
    }

    if (newStreak > newLongest) {
      newLongest = newStreak;
    }

    const newData = {
      currentStreak: newStreak,
      longestStreak: newLongest,
      todayCompleted: true,
      lastSessionDate: today.toISOString(),
    };

    setStreakData(newData);
    storage.set('streak_data', JSON.stringify(newData));
  };

  const startScrollSession = (platform: string) => {
    if (isSessionActive) return;
    
    // Ensure this is an intentional user action
    if (!platform) {
      console.warn('startScrollSession called without platform');
      return;
    }

    Vibration.vibrate(100);
    setSelectedPlatform(platform);
    setIsSessionActive(true);
    setSessionTime(0);

    const session: ScrollSession = {
      startTime: new Date(),
      duration: 0,
      platform,
      trendsFound: 0,
    };

    setCurrentSession(session);

    // Start timer
    timerRef.current = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);

    // Open the app
    openSocialApp(platform);
  };

  const endScrollSession = () => {
    if (!isSessionActive || !currentSession) return;

    Vibration.vibrate([100, 50, 100]);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - currentSession.startTime.getTime()) / 1000);

    const finalSession = {
      ...currentSession,
      endTime,
      duration,
    };

    // Save session
    try {
      const sessionsStr = storage.getString('scroll_sessions') || '[]';
      const sessions = JSON.parse(sessionsStr);
      sessions.push(finalSession);
      storage.set('scroll_sessions', JSON.stringify(sessions));

      // Update streak
      if (duration >= 60) { // At least 1 minute to count
        updateStreakData();
      }
    } catch (error) {
      console.error('Error saving session:', error);
    }

    // Only show summary if session had meaningful duration
    if (duration > 0) {
      // Show summary
      Alert.alert(
        '📊 Session Complete!',
        `Duration: ${formatTime(duration)}\nPlatform: ${currentSession.platform}\n\nGreat job hunting for trends! 🔥`,
        [
          {
            text: 'Submit Trends',
            onPress: () => navigation.navigate('SubmitTrend'),
          },
          { text: 'Done', style: 'cancel' },
        ]
      );
    }

    setIsSessionActive(false);
    setCurrentSession(null);
    setSelectedPlatform(null);
    setSessionTime(0);
  };

  const openSocialApp = async (platform: string) => {
    const app = SOCIAL_APPS.find(a => a.name === platform);
    if (!app) return;

    try {
      const canOpen = await Linking.canOpenURL(app.url);
      if (canOpen) {
        await Linking.openURL(app.url);
      } else {
        await Linking.openURL(app.webUrl);
      }
    } catch (error) {
      console.error('Error opening app:', error);
      await Linking.openURL(app.webUrl);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStreakEmoji = () => {
    const streak = streakData.currentStreak;
    if (streak === 0) return '💤';
    if (streak < 3) return '✨';
    if (streak < 7) return '🔥';
    if (streak < 14) return '💥';
    if (streak < 30) return '🚀';
    return '👑';
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.wave[50], theme.colors.background]}
        style={styles.gradient}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Trend Hunter</Text>
          <Text style={styles.subtitle}>Start a scroll session to find trends</Text>
        </View>

        {/* Streak Card */}
        <Card style={styles.streakCard} variant="elevated">
          <LinearGradient
            colors={streakData.currentStreak > 0 ? ['#FF6B6B', '#FF8E53'] : ['#667EEA', '#764BA2']}
            style={styles.streakGradient}
          >
            <View style={styles.streakContent}>
              <Text style={styles.streakEmoji}>{getStreakEmoji()}</Text>
              <View style={styles.streakInfo}>
                <Text style={styles.streakNumber}>{streakData.currentStreak}</Text>
                <Text style={styles.streakLabel}>Day Streak</Text>
              </View>
              <View style={styles.streakStats}>
                <Text style={styles.streakStatText}>Best: {streakData.longestStreak} days</Text>
                <Text style={styles.streakStatText}>
                  {streakData.todayCompleted ? '✅ Today Complete' : '⭕ Not Yet Today'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Card>

        {/* Active Session Display */}
        {isSessionActive && (
          <Animated.View 
            style={[
              styles.activeSessionCard,
              {
                transform: [{ scale: pulseAnim }],
                opacity: Animated.add(0.9, Animated.multiply(glowAnim, 0.1)),
              }
            ]}
          >
            <LinearGradient
              colors={['#00C9FF', '#92FE9D']}
              style={styles.sessionGradient}
            >
              <Text style={styles.sessionTitle}>🔴 LIVE SESSION</Text>
              <Text style={styles.sessionTimer}>{formatTime(sessionTime)}</Text>
              <Text style={styles.sessionPlatform}>{selectedPlatform}</Text>
              <TouchableOpacity
                style={styles.endSessionButton}
                onPress={endScrollSession}
              >
                <Text style={styles.endSessionText}>End Session & Submit Trends</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Social Media Apps Grid */}
        {!isSessionActive && (
          <>
            <Text style={styles.sectionTitle}>Start Hunting on:</Text>
            <View style={styles.appsGrid}>
              {SOCIAL_APPS.map((app) => (
                <TouchableOpacity
                  key={app.name}
                  style={styles.appCard}
                  onPress={() => startScrollSession(app.name)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={app.gradient}
                    style={styles.appGradient}
                  >
                    <Text style={styles.appIcon}>{app.icon}</Text>
                    <Text style={styles.appName}>{app.name}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Button
            title="📝 Submit Trend Manually"
            onPress={() => navigation.navigate('SubmitTrend')}
            variant="secondary"
            style={styles.actionButton}
          />
          <Button
            title="📊 View My Stats"
            onPress={() => navigation.navigate('Profile')}
            variant="secondary"
            style={styles.actionButton}
          />
        </View>

        {/* Tips Card */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Pro Tips</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Start a session before scrolling to track your time</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Maintain daily streaks for bonus rewards</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Focus on emerging trends with low views but high engagement</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl * 2,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
  },
  streakCard: {
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  streakGradient: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakEmoji: {
    fontSize: 40,
  },
  streakInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  streakLabel: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  streakStats: {
    alignItems: 'flex-end',
  },
  streakStatText: {
    fontSize: theme.typography.caption.fontSize,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  activeSessionCard: {
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sessionGradient: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  sessionTitle: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: theme.spacing.sm,
  },
  sessionTimer: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    marginBottom: theme.spacing.xs,
  },
  sessionPlatform: {
    fontSize: theme.typography.body.fontSize,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: theme.spacing.lg,
  },
  endSessionButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.round,
    borderWidth: 2,
    borderColor: '#fff',
  },
  endSessionText: {
    color: '#fff',
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  appsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  appCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  appName: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
    color: '#fff',
  },
  quickActions: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  actionButton: {
    marginBottom: theme.spacing.sm,
  },
  tipsCard: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.wave[50],
  },
  tipsTitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  tipBullet: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textLight,
    lineHeight: 20,
  },
});