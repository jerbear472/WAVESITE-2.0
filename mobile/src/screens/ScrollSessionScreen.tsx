import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ScrollSessionEnhancedForwardRef as ScrollSession, ScrollSessionRef } from '../components/ScrollSession/ScrollSessionEnhancedForwardRef';
import { FloatingTrendLogger } from '../components/TrendLogger/FloatingTrendLogger';
import { StreaksAndChallenges } from '../components/StreaksAndChallenges/StreaksAndChallenges';
import { enhancedTheme } from '../styles/theme.enhanced';
import { useAuth } from '../hooks/useAuth';
import { GlassCard } from '../components/ui/GlassCard';

export const ScrollSessionScreen: React.FC = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollSessionRef = useRef<ScrollSessionRef>(null);

  const handleSessionStateChange = useCallback((active: boolean) => {
    setIsSessionActive(active);
  }, []);

  const handleTrendLogged = useCallback(() => {
    // Increment trend count in session
    scrollSessionRef.current?.incrementTrendCount();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Refresh data here
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={['#0080ff', '#00d4ff']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Icon name="timer" size={32} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Scroll & Earn</Text>
          <Text style={styles.headerSubtitle}>Track your browsing sessions</Text>
        </LinearGradient>

        {/* Scroll Session Component */}
        <ScrollSession
          ref={scrollSessionRef}
          onSessionStateChange={handleSessionStateChange}
        />

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Today's Stats</Text>
          <View style={styles.quickStats}>
            <GlassCard style={styles.statCard}>
              <Icon name="fire" size={24} color={enhancedTheme.colors.warning} />
              <Text style={styles.statValue}>7</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Icon name="trending-up" size={24} color={enhancedTheme.colors.success} />
              <Text style={styles.statValue}>42</Text>
              <Text style={styles.statLabel}>Trends Logged</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Icon name="cash" size={24} color={enhancedTheme.colors.primary} />
              <Text style={styles.statValue}>$12.50</Text>
              <Text style={styles.statLabel}>Earned Today</Text>
            </GlassCard>
          </View>
        </View>

        {/* Streaks & Challenges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Challenges & Streaks</Text>
          <StreaksAndChallenges />
        </View>

        {/* Tips */}
        <GlassCard style={styles.tipsCard}>
          <Icon name="lightbulb" size={24} color={enhancedTheme.colors.warning} />
          <Text style={styles.tipsTitle}>How to Maximize Earnings</Text>
          <View style={styles.tipsList}>
            <Text style={styles.tip}>• Start a session before browsing social media</Text>
            <Text style={styles.tip}>• Log trends as you spot them with the + button</Text>
            <Text style={styles.tip}>• Complete daily challenges for bonus rewards</Text>
            <Text style={styles.tip}>• Verify other users' trends for extra income</Text>
          </View>
        </GlassCard>
      </ScrollView>

      {/* Floating Trend Logger */}
      <FloatingTrendLogger
        isSessionActive={isSessionActive}
        onTrendLogged={handleTrendLogged}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: enhancedTheme.colors.background,
  },
  header: {
    padding: 24,
    paddingTop: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF80',
    marginTop: 4,
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: enhancedTheme.colors.text,
    marginBottom: 16,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    alignItems: 'center',
    padding: 12,
    flex: 1,
    minWidth: 90,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 11,
    color: enhancedTheme.colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tipsCard: {
    margin: 20,
    padding: 20,
    marginBottom: 100, // Space for floating button
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: enhancedTheme.colors.text,
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  tipsList: {
    gap: 8,
  },
  tip: {
    fontSize: 14,
    color: enhancedTheme.colors.textSecondary,
    lineHeight: 20,
  },
});