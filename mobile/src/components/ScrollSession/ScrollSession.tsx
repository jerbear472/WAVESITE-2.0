import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated as RNAnimated,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../hooks/useAuth';
import { GlassCard } from '../ui/GlassCard';
import { AnimatedText } from '../ui/AnimatedText';
import { enhancedTheme } from '../../styles/theme.enhanced';
import { supabase } from '../../config/supabase';

interface SessionData {
  startTime: Date;
  endTime?: Date;
  duration: number;
  trendsLogged: number;
  earnings: number;
}

const EARNINGS_PER_MINUTE = 0.10;
const TREND_BONUS = 0.25;

export const ScrollSession: React.FC<{ 
  onTrendCountChange?: (count: number) => void;
  onSessionStateChange?: (active: boolean) => void;
}> = ({ 
  onTrendCountChange,
  onSessionStateChange 
}) => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData>({
    startTime: new Date(),
    duration: 0,
    trendsLogged: 0,
    earnings: 0,
  });
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const intervalRef = useRef<NodeJS.Timeout>();
  const pulseAnimation = useSharedValue(1);

  // Calculate earnings
  const calculateEarnings = useCallback((minutes: number, trends: number) => {
    const baseEarnings = minutes * EARNINGS_PER_MINUTE;
    const trendBonus = trends * TREND_BONUS;
    return baseEarnings + trendBonus;
  }, []);

  // Update timer
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - sessionData.startTime.getTime();
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        
        setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        
        const newEarnings = calculateEarnings(minutes, sessionData.trendsLogged);
        setSessionData(prev => ({ ...prev, duration: diff, earnings: newEarnings }));
      }, 1000);

      // Pulse animation
      const pulse = setInterval(() => {
        pulseAnimation.value = withSpring(1.1, { damping: 15 }, () => {
          pulseAnimation.value = withSpring(1, { damping: 15 });
        });
      }, 2000);

      return () => {
        clearInterval(intervalRef.current);
        clearInterval(pulse);
      };
    }
  }, [isActive, sessionData.startTime, sessionData.trendsLogged, calculateEarnings, pulseAnimation]);

  // Start session
  const startSession = useCallback(() => {
    setIsActive(true);
    setSessionData({
      startTime: new Date(),
      duration: 0,
      trendsLogged: 0,
      earnings: 0,
    });
    onSessionStateChange?.(true);
  }, [onSessionStateChange]);

  // Stop session and save to database
  const stopSession = useCallback(async () => {
    setIsActive(false);
    onSessionStateChange?.(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const endTime = new Date();
    const finalData = {
      ...sessionData,
      endTime,
      user_id: user?.id,
    };

    try {
      const { error } = await supabase
        .from('scroll_sessions')
        .insert({
          user_id: user?.id,
          start_time: finalData.startTime,
          end_time: endTime,
          duration_ms: finalData.duration,
          trends_logged: finalData.trendsLogged,
          earnings: finalData.earnings,
        });

      if (error) throw error;

      // Update user stats
      await supabase.rpc('update_user_earnings', {
        user_id: user?.id,
        amount: finalData.earnings,
      });

    } catch (error) {
      console.error('Error saving session:', error);
    }

    // Reset
    setElapsedTime('00:00');
    setSessionData({
      startTime: new Date(),
      duration: 0,
      trendsLogged: 0,
      earnings: 0,
    });
  }, [sessionData, user]);

  // Increment trend count (called from parent)
  useEffect(() => {
    if (onTrendCountChange) {
      onTrendCountChange(sessionData.trendsLogged);
    }
  }, [sessionData.trendsLogged, onTrendCountChange]);

  const incrementTrendCount = useCallback(() => {
    setSessionData(prev => ({ ...prev, trendsLogged: prev.trendsLogged + 1 }));
  }, []);

  // Note: To expose methods to parent, use ScrollSessionForwardRef component instead

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

  if (!isActive) {
    return (
      <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.container}>
        <Pressable onPress={startSession}>
          <LinearGradient
            colors={['#0080ff', '#00d4ff']}
            style={styles.startButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon name="play-circle" size={32} color="#FFFFFF" />
            <Text style={styles.startButtonText}>Start Scroll Session</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <GlassCard style={styles.sessionCard}>
        <View style={styles.header}>
          <Animated.View style={[styles.liveIndicator, pulseStyle]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </Animated.View>
          
          <Pressable onPress={stopSession} style={styles.stopButton}>
            <Icon name="stop-circle" size={24} color={enhancedTheme.colors.error} />
          </Pressable>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Icon name="clock-outline" size={20} color={enhancedTheme.colors.primary} />
            <AnimatedText style={styles.statValue}>{elapsedTime}</AnimatedText>
            <Text style={styles.statLabel}>Duration</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Icon name="trending-up" size={20} color={enhancedTheme.colors.accent} />
            <AnimatedText style={styles.statValue}>{sessionData.trendsLogged.toString()}</AnimatedText>
            <Text style={styles.statLabel}>Trends</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Icon name="cash" size={20} color={enhancedTheme.colors.success} />
            <AnimatedText style={styles.statValue}>{`$${sessionData.earnings.toFixed(2)}`}</AnimatedText>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
        </View>

        <LinearGradient
          colors={[enhancedTheme.colors.primary + '20', enhancedTheme.colors.accent + '20']}
          style={styles.earningsBreakdown}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.breakdownText}>
            Base: ${(Math.floor(sessionData.duration / 60000) * EARNINGS_PER_MINUTE).toFixed(2)} + 
            Trends: ${(sessionData.trendsLogged * TREND_BONUS).toFixed(2)}
          </Text>
        </LinearGradient>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 30,
    gap: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sessionCard: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: enhancedTheme.colors.error,
  },
  liveText: {
    fontSize: 14,
    fontWeight: '700',
    color: enhancedTheme.colors.error,
  },
  stopButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: enhancedTheme.colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: enhancedTheme.colors.border,
    alignSelf: 'center',
  },
  earningsBreakdown: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  breakdownText: {
    fontSize: 12,
    color: enhancedTheme.colors.textSecondary,
  },
});