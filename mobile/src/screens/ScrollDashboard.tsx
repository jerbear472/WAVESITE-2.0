import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ScrollSession, ScrollSessionRef } from '../components/ScrollSession/ScrollSessionForwardRef';
import { FloatingTrendLogger } from '../components/TrendLogger/FloatingTrendLogger';
import { SwipeableVerificationFeed } from '../components/TrendVerification/SwipeableVerificationFeed';
import { StreaksAndChallenges } from '../components/StreaksAndChallenges/StreaksAndChallenges';
import { EarningsDashboard } from './EarningsDashboard';
import { TrendRadar } from './TrendRadar';
import { enhancedTheme } from '../styles/theme.enhanced';
import { useAuth } from '../hooks/useAuth';

const Tab = createBottomTabNavigator();

// Main Dashboard Screen with Session Timer
const MainDashboard: React.FC = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const scrollSessionRef = useRef<ScrollSessionRef>(null);

  const handleSessionStateChange = useCallback((active: boolean) => {
    setIsSessionActive(active);
  }, []);

  const handleTrendLogged = useCallback(() => {
    // Increment trend count in session
    scrollSessionRef.current?.incrementTrendCount();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={['#0080ff', '#00d4ff']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.headerTitle}>WaveSite</Text>
          <Text style={styles.headerSubtitle}>Ride the wave of trends</Text>
        </LinearGradient>

        {/* Scroll Session Component */}
        <ScrollSession
          ref={scrollSessionRef}
          onSessionStateChange={handleSessionStateChange}
        />

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statCard}>
            <Icon name="fire" size={24} color={enhancedTheme.colors.warning} />
            <Text style={styles.statValue}>7</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="trending-up" size={24} color={enhancedTheme.colors.success} />
            <Text style={styles.statValue}>42</Text>
            <Text style={styles.statLabel}>Trends Today</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="cash" size={24} color={enhancedTheme.colors.primary} />
            <Text style={styles.statValue}>$12.50</Text>
            <Text style={styles.statLabel}>Today's Earnings</Text>
          </View>
        </View>

        {/* Streaks & Challenges Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Challenges</Text>
            <Pressable>
              <Text style={styles.seeAll}>See All</Text>
            </Pressable>
          </View>
          <StreaksAndChallenges />
        </View>
      </ScrollView>

      {/* Floating Trend Logger */}
      <FloatingTrendLogger
        isSessionActive={isSessionActive}
        onTrendLogged={handleTrendLogged}
      />
    </SafeAreaView>
  );
};

// Tab Navigator Setup
export const ScrollDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: enhancedTheme.colors.surface,
          borderTopWidth: 0,
          elevation: 20,
          shadowOpacity: 0.1,
          shadowRadius: 20,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: enhancedTheme.colors.primary,
        tabBarInactiveTintColor: enhancedTheme.colors.textSecondary,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={MainDashboard}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Verify"
        component={SwipeableVerificationFeed}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="check-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Radar"
        component={TrendRadar}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="radar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsDashboard}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="cash-multiple" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: enhancedTheme.colors.background,
  },
  header: {
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF80',
    marginTop: 4,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: enhancedTheme.colors.surface,
    padding: 16,
    borderRadius: 16,
    flex: 1,
    marginHorizontal: 6,
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
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: enhancedTheme.colors.text,
  },
  seeAll: {
    fontSize: 14,
    color: enhancedTheme.colors.primary,
    fontWeight: '500',
  },
});