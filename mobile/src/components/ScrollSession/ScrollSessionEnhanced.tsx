import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated as RNAnimated,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  FadeIn,
  FadeOut,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../hooks/useAuth';
import { GlassCard } from '../ui/GlassCard';
import { AnimatedText } from '../ui/AnimatedText';
import { enhancedTheme } from '../../styles/theme.enhanced';
import { supabase } from '../../config/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SessionData {
  startTime: Date;
  endTime?: Date;
  duration: number;
  trendsLogged: number;
  earnings: number;
}

const EARNINGS_PER_MINUTE = 0.10;
const TREND_BONUS = 0.25;

export const ScrollSessionEnhanced: React.FC<{ 
  onTrendCountChange?: (count: number) => void;
  onSessionStateChange?: (active: boolean) => void;
}> = ({ 
  onTrendCountChange,
  onSessionStateChange 
}) => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [sessionData, setSessionData] = useState<SessionData>({
    startTime: new Date(),
    duration: 0,
    trendsLogged: 0,
    earnings: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnimation = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  // Pulse animation for live indicator
  useEffect(() => {
    if (isActive) {
      pulseAnimation.value = withRepeat(
        withSequence(
          withSpring(1.2, { damping: 10 }),
          withSpring(1, { damping: 10 })
        ),
        -1,
        true
      );
    }
  }, [isActive]);

  // Update timer
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const start = sessionData.startTime.getTime();
        const duration = now - start;
        
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        
        const newEarnings = (minutes * EARNINGS_PER_MINUTE) + (sessionData.trendsLogged * TREND_BONUS);
        
        setSessionData(prev => ({
          ...prev,
          duration,
          earnings: newEarnings,
        }));
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, sessionData.startTime, sessionData.trendsLogged]);

  const startSession = useCallback(() => {
    setIsActive(true);
    onSessionStateChange?.(true);
    setSessionData({
      startTime: new Date(),
      duration: 0,
      trendsLogged: 0,
      earnings: 0,
    });
    
    // Animate button press
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );
  }, [onSessionStateChange, buttonScale]);

  const stopSession = useCallback(async () => {
    setIsActive(false);
    onSessionStateChange?.(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Save session to database
    const endTime = new Date();
    const finalData = {
      ...sessionData,
      endTime,
      user_id: user?.id,
    };

    try {
      const durationMinutes = Math.floor(finalData.duration / 60000);
      const { error } = await supabase
        .from('scroll_sessions')
        .insert({
          user_id: user?.id,
          start_time: finalData.startTime,
          end_time: endTime,
          duration_minutes: durationMinutes,
          trends_logged: finalData.trendsLogged,
          earnings: finalData.earnings,
          status: 'completed'
        });

      if (error) throw error;
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
  }, [sessionData, user, onSessionStateChange]);

  // Increment trend count
  useEffect(() => {
    if (onTrendCountChange) {
      onTrendCountChange(sessionData.trendsLogged);
    }
  }, [sessionData.trendsLogged, onTrendCountChange]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

  const buttonPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  if (!isActive) {
    return (
      <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.container}>
        <Pressable onPress={startSession}>
          <Animated.View style={buttonPressStyle}>
            <LinearGradient
              colors={enhancedTheme.gradients.primary}
              style={styles.startButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.startButtonContent}>
                <Icon name="timer" size={28} color="#FFFFFF" />
                <Text style={styles.startButtonText}>Start Scroll Session</Text>
                <Icon name="chevron-right" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.startButtonSubtext}>Earn $0.02/min + $0.25/trend</Text>
            </LinearGradient>
          </Animated.View>
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
            <Text style={styles.liveText}>LIVE SESSION</Text>
          </Animated.View>
          
          <Pressable onPress={stopSession} style={styles.stopButton}>
            <LinearGradient
              colors={[enhancedTheme.colors.error, '#ff5555']}
              style={styles.stopButtonGradient}
            >
              <Icon name="stop" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <LinearGradient
              colors={[enhancedTheme.colors.primary + '20', enhancedTheme.colors.primaryLight + '10']}
              style={styles.statCardBg}
            >
              <Icon name="clock-outline" size={24} color={enhancedTheme.colors.primary} />
              <AnimatedText style={styles.statValue}>{elapsedTime}</AnimatedText>
              <Text style={styles.statLabel}>Duration</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient
              colors={[enhancedTheme.colors.accent + '20', enhancedTheme.colors.accentLight + '10']}
              style={styles.statCardBg}
            >
              <Icon name="trending-up" size={24} color={enhancedTheme.colors.accent} />
              <AnimatedText style={styles.statValue}>{sessionData.trendsLogged.toString()}</AnimatedText>
              <Text style={styles.statLabel}>Trends</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient
              colors={[enhancedTheme.colors.success + '20', '#00ff00' + '10']}
              style={styles.statCardBg}
            >
              <Icon name="cash-multiple" size={24} color={enhancedTheme.colors.success} />
              <AnimatedText style={styles.statValue}>${(sessionData.earnings || 0).toFixed(2)}</AnimatedText>
              <Text style={styles.statLabel}>Earned</Text>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.earningsBreakdown}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Time Earnings:</Text>
            <Text style={styles.breakdownValue}>
              ${(Math.floor(sessionData.duration / 60000) * EARNINGS_PER_MINUTE).toFixed(2)}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Trend Bonuses:</Text>
            <Text style={styles.breakdownValue}>
              ${(sessionData.trendsLogged * TREND_BONUS).toFixed(2)}
            </Text>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  startButton: {
    borderRadius: 20,
    padding: 20,
    shadowColor: enhancedTheme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  startButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  startButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 8,
  },
  sessionCard: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
    shadowColor: enhancedTheme.colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  liveText: {
    fontSize: 14,
    fontWeight: '700',
    color: enhancedTheme.colors.error,
    letterSpacing: 1,
  },
  stopButton: {
    borderRadius: 20,
  },
  stopButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
  },
  statCardBg: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: enhancedTheme.colors.textSecondary,
    fontWeight: '500',
  },
  earningsBreakdown: {
    backgroundColor: enhancedTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 14,
    color: enhancedTheme.colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: enhancedTheme.colors.text,
  },
});

export default ScrollSessionEnhanced;