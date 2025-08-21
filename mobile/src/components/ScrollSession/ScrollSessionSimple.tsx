import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
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

interface ScrollSessionProps {
  onTrendCountChange?: (count: number) => void;
  onSessionStateChange?: (active: boolean) => void;
}

export interface ScrollSessionRef {
  incrementTrendCount: () => void;
}

export const ScrollSession = forwardRef<ScrollSessionRef, ScrollSessionProps>(({ 
  onTrendCountChange,
  onSessionStateChange 
}, ref) => {
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

  const calculateEarnings = useCallback((minutes: number, trends: number) => {
    const baseEarnings = minutes * EARNINGS_PER_MINUTE;
    const trendBonus = trends * TREND_BONUS;
    return baseEarnings + trendBonus;
  }, []);

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
    } catch (error) {
      console.error('Error saving session:', error);
    }

    setElapsedTime('00:00');
    setSessionData({
      startTime: new Date(),
      duration: 0,
      trendsLogged: 0,
      earnings: 0,
    });
  }, [sessionData, user, onSessionStateChange]);

  const incrementTrendCount = useCallback(() => {
    setSessionData(prev => ({ ...prev, trendsLogged: prev.trendsLogged + 1 }));
  }, []);

  useImperativeHandle(ref, () => ({
    incrementTrendCount,
  }), [incrementTrendCount]);

  useEffect(() => {
    onTrendCountChange?.(sessionData.trendsLogged);
  }, [sessionData.trendsLogged, onTrendCountChange]);

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
            <Icon name="play-circle" size={24} color="#FFFFFF" />
            <Text style={styles.startButtonText}>Start Scroll Session</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <View style={styles.sessionCard}>
        <View style={styles.header}>
          <Animated.View style={[styles.liveIndicator, pulseStyle]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </Animated.View>
          
          <Pressable onPress={stopSession} style={styles.stopButton}>
            <Icon name="stop-circle" size={24} color="#ff3b30" />
          </Pressable>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Icon name="clock-outline" size={20} color="#0080ff" />
            <Text style={styles.statValue}>{elapsedTime}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Icon name="trending-up" size={20} color="#00d4ff" />
            <Text style={styles.statValue}>{sessionData.trendsLogged.toString()}</Text>
            <Text style={styles.statLabel}>Trends</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Icon name="cash" size={20} color="#4cd964" />
            <Text style={styles.statValue}>{`$${(sessionData.earnings || 0).toFixed(2)}`}</Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
        </View>

        <LinearGradient
          colors={['rgba(0, 128, 255, 0.1)', 'rgba(0, 212, 255, 0.1)']}
          style={styles.earningsBreakdown}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.breakdownText}>
            Base: ${(Math.floor(sessionData.duration / 60000) * EARNINGS_PER_MINUTE).toFixed(2)} + 
            Trends: ${(sessionData.trendsLogged * TREND_BONUS).toFixed(2)}
          </Text>
        </LinearGradient>
      </View>
    </Animated.View>
  );
});

ScrollSession.displayName = 'ScrollSession';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 10,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sessionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    backgroundColor: '#ff3b30',
  },
  liveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ff3b30',
  },
  stopButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginVertical: 2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'center',
  },
  earningsBreakdown: {
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  breakdownText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});