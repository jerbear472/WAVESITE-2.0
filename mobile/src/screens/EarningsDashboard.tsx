import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInDown,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../hooks/useAuth';
import { enhancedTheme } from '../styles/theme.enhanced';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedText } from '../components/ui/AnimatedText';
import { supabase } from '../config/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EarningsData {
  totalEarnings: number;
  weeklyEarnings: number;
  sessionsCompleted: number;
  avgPerSession: number;
  trendsVerified: number;
  bonusesEarned: number;
}

interface SessionData {
  id: string;
  date: string;
  duration: number;
  baseEarning: number;
  bonuses: number;
  total: number;
  trendsLogged: number;
}

type TimeFrame = 'week' | 'month' | 'all';

export const EarningsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('week');
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarnings: 0,
    weeklyEarnings: 0,
    sessionsCompleted: 0,
    avgPerSession: 0,
    trendsVerified: 0,
    bonusesEarned: 0,
  });
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [chartData, setChartData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  // Fetch earnings data
  const fetchEarnings = useCallback(async () => {
    try {
      // Get date range
      const now = new Date();
      let startDate = new Date();
      
      switch (timeFrame) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(now.getDate() - 30);
          break;
        case 'all':
          startDate = new Date('2020-01-01');
          break;
      }

      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('scroll_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .gte('start_time', startDate.toISOString())
        .order('start_time', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch verifications
      const { data: verificationsData, error: verError } = await supabase
        .from('trend_verifications')
        .select('*')
        .eq('user_id', user?.id)
        .gte('timestamp', startDate.toISOString());

      if (verError) throw verError;

      // Calculate earnings
      const totalEarnings = sessionsData?.reduce((sum, session) => sum + (session.earnings || 0), 0) || 0;
      const verificationEarnings = (verificationsData?.length || 0) * 0.05;
      const combinedEarnings = totalEarnings + verificationEarnings;

      // Calculate weekly earnings
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      const weeklySessionsEarnings = sessionsData
        ?.filter(s => new Date(s.start_time) >= weekAgo)
        .reduce((sum, session) => sum + (session.earnings || 0), 0) || 0;

      // Calculate bonuses
      const bonusesEarned = sessionsData?.reduce((sum, session) => {
        const baseEarning = (session.duration_ms / 60000) * 0.10;
        return sum + (session.earnings - baseEarning);
      }, 0) || 0;

      setEarnings({
        totalEarnings: combinedEarnings,
        weeklyEarnings: weeklySessionsEarnings,
        sessionsCompleted: sessionsData?.length || 0,
        avgPerSession: sessionsData?.length ? combinedEarnings / sessionsData.length : 0,
        trendsVerified: verificationsData?.length || 0,
        bonusesEarned: bonusesEarned + verificationEarnings,
      });

      // Process sessions for table
      const processedSessions = sessionsData?.map(session => {
        const duration = session.duration_ms / 60000; // minutes
        const baseEarning = duration * 0.10;
        const bonuses = session.earnings - baseEarning;

        return {
          id: session.id,
          date: new Date(session.start_time).toLocaleDateString(),
          duration,
          baseEarning,
          bonuses,
          total: session.earnings,
          trendsLogged: session.trends_logged || 0,
        };
      }) || [];

      setSessions(processedSessions);

      // Prepare chart data for last 7 days
      const chartDays = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const dayEarnings = sessionsData
          ?.filter(s => {
            const sessionDate = new Date(s.start_time);
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate.getTime() === date.getTime();
          })
          .reduce((sum, session) => sum + session.earnings, 0) || 0;
        
        chartDays.push(dayEarnings);
      }
      setChartData(chartDays);

    } catch (error) {
      console.error('Error fetching earnings:', error);
    }
  }, [user, timeFrame]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEarnings();
    setRefreshing(false);
  }, [fetchEarnings]);

  const StatCard = ({ icon, label, value, color, prefix = '' }: any) => (
    <Animated.View entering={SlideInDown.springify()}>
      <GlassCard style={styles.statCard}>
        <LinearGradient
          colors={[color + '20', color + '10']}
          style={styles.statIconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Icon name={icon} size={24} color={color} />
        </LinearGradient>
        <Text style={styles.statLabel}>{label}</Text>
        <AnimatedText style={styles.statValue}>
          {prefix}{typeof value === 'number' ? value.toFixed(2) : value}
        </AnimatedText>
      </GlassCard>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Earnings Dashboard</Text>
          <LinearGradient
            colors={['#00d4ff', '#00ffff']}
            style={styles.totalEarnings}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.totalLabel}>Total Earnings</Text>
            <AnimatedText style={styles.totalValue}>
              ${earnings.totalEarnings.toFixed(2)}
            </AnimatedText>
          </LinearGradient>
        </View>

        {/* Time Frame Selector */}
        <View style={styles.timeFrameContainer}>
          {(['week', 'month', 'all'] as TimeFrame[]).map((frame) => (
            <Pressable
              key={frame}
              onPress={() => setTimeFrame(frame)}
              style={[
                styles.timeFrameButton,
                timeFrame === frame && styles.timeFrameButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.timeFrameText,
                  timeFrame === frame && styles.timeFrameTextActive,
                ]}
              >
                {frame === 'all' ? 'All Time' : frame === 'week' ? 'This Week' : 'This Month'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="calendar-check"
            label="Sessions"
            value={earnings.sessionsCompleted}
            color={enhancedTheme.colors.primary}
          />
          <StatCard
            icon="currency-usd"
            label="Avg/Session"
            value={earnings.avgPerSession}
            color={enhancedTheme.colors.accent}
            prefix="$"
          />
          <StatCard
            icon="check-circle"
            label="Verified"
            value={earnings.trendsVerified}
            color={enhancedTheme.colors.success}
          />
          <StatCard
            icon="gift"
            label="Bonuses"
            value={earnings.bonusesEarned}
            color={enhancedTheme.colors.warning}
            prefix="$"
          />
        </View>

        {/* Earnings Chart */}
        <Animated.View entering={FadeIn.delay(300)}>
          <GlassCard style={styles.chartCard}>
            <Text style={styles.chartTitle}>7-Day Earnings</Text>
            <LineChart
              data={{
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                  data: chartData,
                }],
              }}
              width={SCREEN_WIDTH - 60}
              height={200}
              chartConfig={{
                backgroundColor: enhancedTheme.colors.surface,
                backgroundGradientFrom: enhancedTheme.colors.surface,
                backgroundGradientTo: enhancedTheme.colors.surface,
                decimalPlaces: 2,
                color: (opacity = 1) => enhancedTheme.colors.primary,
                labelColor: (opacity = 1) => enhancedTheme.colors.textSecondary,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: enhancedTheme.colors.primary,
                },
              }}
              bezier
              style={styles.chart}
            />
          </GlassCard>
        </Animated.View>

        {/* Session History */}
        <Animated.View entering={FadeIn.delay(400)}>
          <GlassCard style={styles.historyCard}>
            <Text style={styles.historyTitle}>Session History</Text>
            
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.dateColumn]}>Date</Text>
              <Text style={[styles.tableHeaderText, styles.durationColumn]}>Duration</Text>
              <Text style={[styles.tableHeaderText, styles.earningsColumn]}>Earnings</Text>
              <Text style={[styles.tableHeaderText, styles.bonusColumn]}>Bonus</Text>
            </View>

            {/* Table Rows */}
            {sessions.map((session, index) => (
              <Animated.View
                key={session.id}
                entering={SlideInDown.delay(index * 50)}
                style={styles.tableRow}
              >
                <Text style={[styles.tableText, styles.dateColumn]}>
                  {session.date}
                </Text>
                <Text style={[styles.tableText, styles.durationColumn]}>
                  {Math.floor(session.duration)}m
                </Text>
                <Text style={[styles.tableText, styles.earningsColumn]}>
                  ${session.total.toFixed(2)}
                </Text>
                <Text style={[styles.tableText, styles.bonusColumn, { color: enhancedTheme.colors.success }]}>
                  +${session.bonuses.toFixed(2)}
                </Text>
              </Animated.View>
            ))}
          </GlassCard>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: enhancedTheme.colors.background,
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
    marginBottom: 16,
  },
  totalEarnings: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  totalValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  timeFrameContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  timeFrameButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: enhancedTheme.colors.surface,
    alignItems: 'center',
  },
  timeFrameButtonActive: {
    backgroundColor: enhancedTheme.colors.primary,
  },
  timeFrameText: {
    fontSize: 14,
    fontWeight: '600',
    color: enhancedTheme.colors.textSecondary,
  },
  timeFrameTextActive: {
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: enhancedTheme.colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
  },
  chartCard: {
    marginHorizontal: 20,
    padding: 20,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: enhancedTheme.colors.text,
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  historyCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: enhancedTheme.colors.text,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: enhancedTheme.colors.border,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: enhancedTheme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: enhancedTheme.colors.border + '20',
  },
  tableText: {
    fontSize: 14,
    color: enhancedTheme.colors.text,
  },
  dateColumn: {
    flex: 2,
  },
  durationColumn: {
    flex: 1,
    textAlign: 'center',
  },
  earningsColumn: {
    flex: 1,
    textAlign: 'right',
  },
  bonusColumn: {
    flex: 1,
    textAlign: 'right',
  },
});