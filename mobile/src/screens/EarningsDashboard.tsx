import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Dimensions,
  Modal,
  TouchableOpacity,
  TextInput,
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
  
  // Cashout states
  const [showCashoutModal, setShowCashoutModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'venmo' | 'paypal' | null>(null);
  const [venmoUsername, setVenmoUsername] = useState('@username');
  const [paypalEmail, setPaypalEmail] = useState('email@example.com');
  const [pendingAmount, setPendingAmount] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);

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

      // Fetch sessions (for streak tracking only - no earnings)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('scroll_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .gte('start_time', startDate.toISOString())
        .order('start_time', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch trend submissions
      const { data: trendsData, error: trendsError } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('spotter_id', user?.id)
        .gte('created_at', startDate.toISOString());

      if (trendsError) throw trendsError;

      // Fetch verifications
      const { data: verificationsData, error: verError } = await supabase
        .from('trend_validations')
        .select('*')
        .eq('validator_id', user?.id)
        .gte('created_at', startDate.toISOString());

      if (verError) throw verError;

      // Calculate pending earnings (from submitted/validating trends)
      const pendingTrends = trendsData?.filter(t => 
        t.status === 'submitted' || t.status === 'validating'
      ) || [];
      const pendingEarnings = pendingTrends.reduce((sum, trend) => {
        return sum + (trend.base_amount || 0.25); // Default 25 cents per submission
      }, 0);
      setPendingAmount(pendingEarnings);

      // Calculate available earnings (from approved trends)  
      const approvedTrends = trendsData?.filter(t => 
        t.status === 'approved' || t.status === 'viral'
      ) || [];
      const approvedEarnings = approvedTrends.reduce((sum, trend) => {
        return sum + (trend.base_amount || 1.00);
      }, 0);

      // Calculate verification earnings
      const verificationEarnings = (verificationsData?.length || 0) * 0.01; // $0.01 per validation
      
      // Set available balance (approved + verifications)
      const totalAvailable = approvedEarnings + verificationEarnings;
      setAvailableBalance(totalAvailable);

      // Calculate weekly earnings
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      const weeklyApprovedEarnings = approvedTrends
        .filter(t => new Date(t.created_at) >= weekAgo)
        .reduce((sum, trend) => sum + (trend.base_amount || 1.00), 0);
      const weeklyVerificationEarnings = verificationsData
        ?.filter(v => new Date(v.created_at) >= weekAgo).length * 0.01 || 0;
      const weeklyEarnings = weeklyApprovedEarnings + weeklyVerificationEarnings;

      // Calculate bonuses from quality trends
      const bonusesEarned = verificationEarnings; // Simplified - validations are the main bonus

      setEarnings({
        totalEarnings: totalAvailable + pendingEarnings,
        weeklyEarnings: weeklyEarnings,
        sessionsCompleted: sessionsData?.length || 0, // Still track sessions for streaks
        avgPerSession: approvedTrends.length ? approvedEarnings / approvedTrends.length : 0,
        trendsVerified: verificationsData?.length || 0,
        bonusesEarned: bonusesEarned,
      });

      // Process sessions for table (no earnings, just tracking)
      const processedSessions = sessionsData?.map(session => {
        const duration = session.duration_ms / 60000; // minutes
        
        return {
          id: session.id,
          date: new Date(session.start_time).toLocaleDateString(),
          duration,
          baseEarning: 0, // No earnings from sessions
          bonuses: 0, // No bonuses from sessions
          total: 0, // No earnings from sessions
          trendsLogged: session.trends_logged || 0,
        };
      }) || [];

      setSessions(processedSessions);

      // Prepare chart data for last 7 days (from trends and validations)
      const chartDays = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const dayTrendEarnings = trendsData
          ?.filter(t => {
            const trendDate = new Date(t.created_at);
            trendDate.setHours(0, 0, 0, 0);
            return trendDate.getTime() === date.getTime();
          }).length * 1.00 || 0;
        
        const dayValidationEarnings = verificationsData
          ?.filter(v => {
            const validationDate = new Date(v.created_at);
            validationDate.setHours(0, 0, 0, 0);
            return validationDate.getTime() === date.getTime();
          }).length * 0.01 || 0;
        
        chartDays.push(dayTrendEarnings + dayValidationEarnings);
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
            <View style={styles.balanceContainer}>
              <View>
                <Text style={styles.totalLabel}>Available Balance</Text>
                <AnimatedText style={styles.totalValue}>
                  ${availableBalance.toFixed(2)}
                </AnimatedText>
              </View>
              <View style={styles.pendingContainer}>
                <Text style={styles.pendingLabel}>Pending</Text>
                <Text style={styles.pendingValue}>${pendingAmount.toFixed(2)}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.cashoutButton}
              onPress={() => setShowPaymentModal(true)}
            >
              <Text style={styles.cashoutButtonText}>Cash Out</Text>
            </TouchableOpacity>
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
            label="Streak Sessions"
            value={earnings.sessionsCompleted}
            color={enhancedTheme.colors.primary}
          />
          <StatCard
            icon="currency-usd"
            label="Avg/Trend"
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
            <Text style={styles.historyTitle}>Session History (Streak Tracking Only)</Text>
            
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
                  -
                </Text>
                <Text style={[styles.tableText, styles.bonusColumn, { color: enhancedTheme.colors.textSecondary }]}>
                  Streak only
                </Text>
              </Animated.View>
            ))}
          </GlassCard>
        </Animated.View>
      </ScrollView>
      
      {/* Payment Method Selection Modal */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Where should we send your money?</Text>
            
            <TouchableOpacity
              style={styles.paymentOption}
              onPress={() => {
                setSelectedPaymentMethod('venmo');
                setShowPaymentModal(false);
                setShowConfirmModal(true);
              }}
            >
              <Icon name="wallet" size={24} color={enhancedTheme.colors.primary} />
              <View style={styles.paymentOptionText}>
                <Text style={styles.paymentMethodName}>Venmo</Text>
                <Text style={styles.paymentMethodDetail}>{venmoUsername}</Text>
              </View>
              <Icon name="chevron-right" size={24} color={enhancedTheme.colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.paymentOption}
              onPress={() => {
                setSelectedPaymentMethod('paypal');
                setShowPaymentModal(false);
                setShowConfirmModal(true);
              }}
            >
              <Icon name="cash" size={24} color={enhancedTheme.colors.primary} />
              <View style={styles.paymentOptionText}>
                <Text style={styles.paymentMethodName}>PayPal</Text>
                <Text style={styles.paymentMethodDetail}>{paypalEmail}</Text>
              </View>
              <Icon name="chevron-right" size={24} color={enhancedTheme.colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowPaymentModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon name="help-circle" size={48} color={enhancedTheme.colors.primary} style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Confirm Cash Out</Text>
            <Text style={styles.confirmText}>
              Send ${availableBalance.toFixed(2)} to {selectedPaymentMethod === 'venmo' ? venmoUsername : paypalEmail}?
            </Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmActionButton]}
                onPress={() => {
                  setShowConfirmModal(false);
                  setShowSuccessModal(true);
                  // Here you would trigger the actual cashout API call
                }}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelActionButton]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[enhancedTheme.colors.success + '20', enhancedTheme.colors.success + '10']}
              style={styles.successIconContainer}
            >
              <Icon name="check-circle" size={48} color={enhancedTheme.colors.success} />
            </LinearGradient>
            <Text style={styles.modalTitle}>Success!</Text>
            <Text style={styles.successMessage}>
              You'll receive payment within 48 hours
            </Text>
            <Text style={styles.successDetail}>
              ${availableBalance.toFixed(2)} sent to {selectedPaymentMethod === 'venmo' ? venmoUsername : paypalEmail}
            </Text>
            
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                setShowSuccessModal(false);
                // Reset balance after successful cashout
                setEarnings(prev => ({ ...prev, totalEarnings: pendingAmount }));
              }}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  balanceContainer: {
    width: '100%',
  },
  pendingContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  pendingLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  pendingValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
  cashoutButton: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    alignSelf: 'center',
  },
  cashoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: enhancedTheme.colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: enhancedTheme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: enhancedTheme.colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: enhancedTheme.colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  paymentOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: enhancedTheme.colors.text,
  },
  paymentMethodDetail: {
    fontSize: 14,
    color: enhancedTheme.colors.textSecondary,
    marginTop: 2,
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: enhancedTheme.colors.textSecondary,
  },
  confirmText: {
    fontSize: 16,
    color: enhancedTheme.colors.text,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmActionButton: {
    backgroundColor: enhancedTheme.colors.primary,
  },
  cancelActionButton: {
    backgroundColor: enhancedTheme.colors.surface,
    borderWidth: 1,
    borderColor: enhancedTheme.colors.border,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 18,
    color: enhancedTheme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  successDetail: {
    fontSize: 14,
    color: enhancedTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  doneButton: {
    backgroundColor: enhancedTheme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    alignSelf: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});