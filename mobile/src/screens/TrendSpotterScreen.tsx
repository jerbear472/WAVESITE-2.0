import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import TrendCaptureService from '../services/TrendCaptureService';
import FloatingTrendLogger from '../components/TrendLogger/FloatingTrendLogger';

interface PerformanceStats {
  trend_earnings: number;
  pending_payouts: number;
  viral_trends_spotted: number;
  quality_submissions: number;
  streak_days: number;
  streak_multiplier: number;
  trend_accuracy_rate: number;
  next_milestone?: {
    name: string;
    requirement: string;
    reward: string;
  };
}

const TrendSpotterScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTrendLogger, setShowTrendLogger] = useState(false);

  useEffect(() => {
    loadPerformanceStats();
  }, []);

  const loadPerformanceStats = async () => {
    try {
      const performanceStats = await TrendCaptureService.getPerformanceStats();
      setStats(performanceStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSpotting = () => {
    Alert.alert(
      'Start Trend Spotting',
      'Ready to spot the next viral trend? Open your favorite social media app and use the share button to capture trends directly to WaveSight!',
      [
        {
          text: 'Learn More',
          onPress: () => navigation.navigate('Tutorial'),
        },
        {
          text: "Let's Go!",
          onPress: () => setShowTrendLogger(true),
          style: 'default',
        },
      ]
    );
  };

  const renderStreakBadge = () => {
    if (!stats || stats.streak_days === 0) return null;

    return (
      <View style={styles.streakBadge}>
        <Text style={styles.streakEmoji}>🔥</Text>
        <Text style={styles.streakText}>{stats.streak_days} day streak!</Text>
        <Text style={styles.multiplierText}>{stats.streak_multiplier}x multiplier</Text>
      </View>
    );
  };

  const renderEarningsCard = () => {
    if (!stats) return null;

    return (
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.earningsCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.earningsHeader}>
          <Text style={styles.earningsLabel}>Total Earnings</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Earnings')}>
            <Icon name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.earningsAmount}>${stats.trend_earnings.toFixed(2)}</Text>
        <View style={styles.earningsSubInfo}>
          <View style={styles.earningsSubItem}>
            <Text style={styles.earningsSubLabel}>Pending</Text>
            <Text style={styles.earningsSubValue}>${stats.pending_payouts.toFixed(2)}</Text>
          </View>
          <View style={styles.earningsSubItem}>
            <Text style={styles.earningsSubLabel}>Accuracy</Text>
            <Text style={styles.earningsSubValue}>{(stats.trend_accuracy_rate * 100).toFixed(0)}%</Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  const renderStatsGrid = () => {
    if (!stats) return null;

    const statItems = [
      {
        icon: '🎯',
        label: 'Viral Trends',
        value: stats.viral_trends_spotted,
        color: '#f56565',
      },
      {
        icon: '✨',
        label: 'Quality Submissions',
        value: stats.quality_submissions,
        color: '#48bb78',
      },
      {
        icon: '🏆',
        label: 'Accuracy Rate',
        value: `${(stats.trend_accuracy_rate * 100).toFixed(0)}%`,
        color: '#4299e1',
      },
      {
        icon: '🔥',
        label: 'Current Streak',
        value: `${stats.streak_days} days`,
        color: '#ed8936',
      },
    ];

    return (
      <View style={styles.statsGrid}>
        {statItems.map((item, index) => (
          <View key={index} style={styles.statCard}>
            <Text style={styles.statIcon}>{item.icon}</Text>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderNextMilestone = () => {
    if (!stats?.next_milestone) return null;

    return (
      <View style={styles.milestoneCard}>
        <View style={styles.milestoneHeader}>
          <Text style={styles.milestoneTitle}>Next Milestone</Text>
          <Text style={styles.milestoneReward}>{stats.next_milestone.reward}</Text>
        </View>
        <Text style={styles.milestoneName}>{stats.next_milestone.name}</Text>
        <Text style={styles.milestoneRequirement}>{stats.next_milestone.requirement}</Text>
      </View>
    );
  };

  const renderPaymentTiers = () => {
    return (
      <View style={styles.tiersContainer}>
        <Text style={styles.sectionTitle}>How You Earn</Text>
        <View style={styles.tierCard}>
          <View style={styles.tierIcon}>
            <Text style={styles.tierEmoji}>🚀</Text>
          </View>
          <View style={styles.tierContent}>
            <Text style={styles.tierTitle}>Viral Trend (7 days)</Text>
            <Text style={styles.tierAmount}>$1-5 per trend</Text>
            <Text style={styles.tierDescription}>Spot trends that go viral within a week</Text>
          </View>
        </View>
        <View style={styles.tierCard}>
          <View style={styles.tierIcon}>
            <Text style={styles.tierEmoji}>✅</Text>
          </View>
          <View style={styles.tierContent}>
            <Text style={styles.tierTitle}>Validated Trend</Text>
            <Text style={styles.tierAmount}>$0.50 per trend</Text>
            <Text style={styles.tierDescription}>Community validates your trend</Text>
          </View>
        </View>
        <View style={styles.tierCard}>
          <View style={styles.tierIcon}>
            <Text style={styles.tierEmoji}>⭐</Text>
          </View>
          <View style={styles.tierContent}>
            <Text style={styles.tierTitle}>Quality Submission</Text>
            <Text style={styles.tierAmount}>$0.25 per trend</Text>
            <Text style={styles.tierDescription}>Complete data & proper categorization</Text>
          </View>
        </View>
        <View style={styles.tierCard}>
          <View style={styles.tierIcon}>
            <Text style={styles.tierEmoji}>⚡</Text>
          </View>
          <View style={styles.tierContent}>
            <Text style={styles.tierTitle}>First Spotter Bonus</Text>
            <Text style={styles.tierAmount}>2x multiplier</Text>
            <Text style={styles.tierDescription}>Be the first to spot a trend</Text>
          </View>
        </View>
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
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderStreakBadge()}
        {renderEarningsCard()}
        {renderStatsGrid()}
        {renderNextMilestone()}
        {renderPaymentTiers()}
        
        <TouchableOpacity style={styles.startButton} onPress={handleStartSpotting}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.startButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Icon name="search" size={24} color="#fff" />
            <Text style={styles.startButtonText}>Start Trend Spotting</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Pro Tips</Text>
          <View style={styles.tipCard}>
            <Icon name="lightbulb-outline" size={20} color="#667eea" />
            <Text style={styles.tipText}>
              Focus on emerging creators and sounds on TikTok - they often predict the next viral trend
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Icon name="trending-up" size={20} color="#667eea" />
            <Text style={styles.tipText}>
              Check the "For You" page early morning for fresh content before it goes mainstream
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Icon name="group" size={20} color="#667eea" />
            <Text style={styles.tipText}>
              Quality over quantity - one well-documented trend earns more than many poor submissions
            </Text>
          </View>
        </View>
      </ScrollView>

      {showTrendLogger && (
        <FloatingTrendLogger
          onClose={() => setShowTrendLogger(false)}
          onTrendLogged={() => {
            setShowTrendLogger(false);
            loadPerformanceStats();
            Alert.alert('Success!', 'Trend captured successfully. Keep spotting to earn more!');
          }}
        />
      )}
    </View>
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
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  streakEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginRight: 8,
  },
  multiplierText: {
    fontSize: 14,
    color: '#856404',
  },
  earningsCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  earningsLabel: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  earningsSubInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  earningsSubItem: {
    alignItems: 'center',
  },
  earningsSubLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.7,
  },
  earningsSubValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  statCard: {
    width: '50%',
    padding: 8,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginTop: 4,
  },
  milestoneCard: {
    backgroundColor: '#e6fffa',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#38b2ac',
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  milestoneTitle: {
    fontSize: 14,
    color: '#234e52',
    fontWeight: '600',
  },
  milestoneReward: {
    fontSize: 14,
    color: '#38b2ac',
    fontWeight: 'bold',
  },
  milestoneName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#234e52',
    marginBottom: 4,
  },
  milestoneRequirement: {
    fontSize: 14,
    color: '#2c7a7b',
  },
  tiersContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 16,
  },
  tierCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tierIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tierEmoji: {
    fontSize: 24,
  },
  tierContent: {
    flex: 1,
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  tierAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 4,
  },
  tierDescription: {
    fontSize: 14,
    color: '#718096',
  },
  startButton: {
    margin: 16,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  tipsSection: {
    padding: 16,
    marginBottom: 32,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 12,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#f7fafc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#4a5568',
    marginLeft: 12,
    lineHeight: 20,
  },
});