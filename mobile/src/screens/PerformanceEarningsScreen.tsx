import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BarChart } from 'react-native-chart-kit';
import LinearGradient from 'react-native-linear-gradient';
import { format } from 'date-fns';
import TrendCaptureService from '../services/TrendCaptureService';

const screenWidth = Dimensions.get('window').width;

interface EarningsBreakdown {
  total_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
  viral_trend_earnings: number;
  validated_trend_earnings: number;
  quality_submission_earnings: number;
  first_spotter_bonuses: number;
  streak_bonuses: number;
  achievement_bonuses: number;
  challenge_rewards: number;
  recent_payments: Payment[];
  next_payout_date: string;
  next_payout_amount: number;
}

interface Payment {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
  status: string;
}

const PerformanceEarningsScreen = () => {
  const navigation = useNavigation();
  const [earnings, setEarnings] = useState<EarningsBreakdown | null>(null);
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'all'>('week');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEarnings();
  }, [timePeriod]);

  const loadEarnings = async () => {
    try {
      setIsLoading(true);
      const data = await TrendCaptureService.getEarningsBreakdown(timePeriod);
      setEarnings(data);
    } catch (error) {
      console.error('Failed to load earnings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderHeaderCards = () => {
    if (!earnings) return null;

    return (
      <View style={styles.headerCards}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.totalCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.cardLabel}>Total Earnings</Text>
          <Text style={styles.totalAmount}>${earnings.total_earnings.toFixed(2)}</Text>
          <View style={styles.cardSubInfo}>
            <View>
              <Text style={styles.subLabel}>Paid</Text>
              <Text style={styles.subAmount}>${earnings.paid_earnings.toFixed(2)}</Text>
            </View>
            <View>
              <Text style={styles.subLabel}>Pending</Text>
              <Text style={styles.subAmount}>${earnings.pending_earnings.toFixed(2)}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.payoutCard}>
          <Text style={styles.payoutLabel}>Next Payout</Text>
          <Text style={styles.payoutDate}>
            {format(new Date(earnings.next_payout_date), 'MMM d')}
          </Text>
          <Text style={styles.payoutAmount}>${earnings.next_payout_amount.toFixed(2)}</Text>
        </View>
      </View>
    );
  };

  const renderTimePeriodSelector = () => {
    const periods = [
      { key: 'week', label: 'This Week' },
      { key: 'month', label: 'This Month' },
      { key: 'all', label: 'All Time' },
    ];

    return (
      <View style={styles.periodSelector}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.key}
            style={[
              styles.periodButton,
              timePeriod === period.key && styles.periodButtonActive,
            ]}
            onPress={() => setTimePeriod(period.key as any)}
          >
            <Text
              style={[
                styles.periodButtonText,
                timePeriod === period.key && styles.periodButtonTextActive,
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderEarningsChart = () => {
    if (!earnings) return null;

    const data = {
      labels: ['Viral', 'Valid', 'Quality', 'Bonus'],
      datasets: [
        {
          data: [
            earnings.viral_trend_earnings,
            earnings.validated_trend_earnings,
            earnings.quality_submission_earnings,
            earnings.first_spotter_bonuses + earnings.streak_bonuses + earnings.achievement_bonuses,
          ],
        },
      ],
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
        <BarChart
          data={data}
          width={screenWidth - 32}
          height={200}
          yAxisLabel="$"
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#667eea',
            },
          }}
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
        />
      </View>
    );
  };

  const renderEarningsSources = () => {
    if (!earnings) return null;

    const sources = [
      {
        icon: '🚀',
        title: 'Viral Trends',
        amount: earnings.viral_trend_earnings,
        description: 'Trends that went viral',
        color: '#f56565',
      },
      {
        icon: '✅',
        title: 'Validated Trends',
        amount: earnings.validated_trend_earnings,
        description: 'Community validated',
        color: '#48bb78',
      },
      {
        icon: '⭐',
        title: 'Quality Submissions',
        amount: earnings.quality_submission_earnings,
        description: 'Well-documented trends',
        color: '#4299e1',
      },
      {
        icon: '⚡',
        title: 'First Spotter Bonuses',
        amount: earnings.first_spotter_bonuses,
        description: '2x multiplier rewards',
        color: '#ed8936',
      },
      {
        icon: '🔥',
        title: 'Streak Bonuses',
        amount: earnings.streak_bonuses,
        description: 'Daily streak rewards',
        color: '#9f7aea',
      },
      {
        icon: '🏆',
        title: 'Achievements',
        amount: earnings.achievement_bonuses,
        description: 'Milestone rewards',
        color: '#38b2ac',
      },
    ];

    return (
      <View style={styles.sourcesContainer}>
        <Text style={styles.sectionTitle}>Earnings by Type</Text>
        {sources.map((source, index) => (
          <View key={index} style={styles.sourceCard}>
            <View style={[styles.sourceIcon, { backgroundColor: `${source.color}20` }]}>
              <Text style={styles.sourceEmoji}>{source.icon}</Text>
            </View>
            <View style={styles.sourceContent}>
              <Text style={styles.sourceTitle}>{source.title}</Text>
              <Text style={styles.sourceDescription}>{source.description}</Text>
            </View>
            <Text style={[styles.sourceAmount, { color: source.color }]}>
              ${source.amount.toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderRecentPayments = () => {
    if (!earnings || earnings.recent_payments.length === 0) return null;

    return (
      <View style={styles.recentContainer}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {earnings.recent_payments.map((payment) => (
          <TouchableOpacity key={payment.id} style={styles.paymentCard}>
            <View style={styles.paymentIcon}>
              {payment.type === 'trend_reward' && <Text>💰</Text>}
              {payment.type === 'streak_bonus' && <Text>🔥</Text>}
              {payment.type === 'achievement_bonus' && <Text>🏆</Text>}
              {payment.type === 'challenge_reward' && <Text>🎯</Text>}
            </View>
            <View style={styles.paymentContent}>
              <Text style={styles.paymentDescription}>{payment.description}</Text>
              <Text style={styles.paymentDate}>
                {format(new Date(payment.date), 'MMM d, h:mm a')}
              </Text>
            </View>
            <View style={styles.paymentAmountContainer}>
              <Text style={[
                styles.paymentAmount,
                payment.status === 'paid' && styles.paymentAmountPaid
              ]}>
                +${payment.amount.toFixed(2)}
              </Text>
              <Text style={styles.paymentStatus}>{payment.status}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderHeaderCards()}
      {renderTimePeriodSelector()}
      {renderEarningsChart()}
      {renderEarningsSources()}
      {renderRecentPayments()}
      
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCards: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  totalCard: {
    flex: 2,
    padding: 20,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  cardSubInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.7,
  },
  subAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
  },
  payoutCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  payoutLabel: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 8,
  },
  payoutDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  payoutAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#48bb78',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#667eea',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  chartContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 16,
  },
  sourcesContainer: {
    padding: 16,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  sourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sourceEmoji: {
    fontSize: 24,
  },
  sourceContent: {
    flex: 1,
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 2,
  },
  sourceDescription: {
    fontSize: 14,
    color: '#718096',
  },
  sourceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  recentContainer: {
    padding: 16,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentContent: {
    flex: 1,
  },
  paymentDescription: {
    fontSize: 16,
    color: '#2d3748',
    marginBottom: 2,
  },
  paymentDate: {
    fontSize: 14,
    color: '#718096',
  },
  paymentAmountContainer: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#48bb78',
    marginBottom: 2,
  },
  paymentAmountPaid: {
    color: '#38b2ac',
  },
  paymentStatus: {
    fontSize: 12,
    color: '#718096',
    textTransform: 'capitalize',
  },
  bottomPadding: {
    height: 32,
  },
});