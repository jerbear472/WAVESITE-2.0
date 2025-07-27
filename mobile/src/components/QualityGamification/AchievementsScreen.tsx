import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import * as Progress from 'react-native-progress';
import TrendCaptureService from '../../services/TrendCaptureService';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_emoji: string;
  requirement_type: string;
  requirement_value: number;
  reward_amount: number;
  progress: number;
  earned: boolean;
  earned_at?: string;
}

const AchievementsScreen = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'earned' | 'available'>('all');

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const data = await TrendCaptureService.getAchievements();
      setAchievements(data);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredAchievements = () => {
    switch (filter) {
      case 'earned':
        return achievements.filter(a => a.earned);
      case 'available':
        return achievements.filter(a => !a.earned);
      default:
        return achievements;
    }
  };

  const getProgressPercentage = (achievement: Achievement) => {
    return Math.min(achievement.progress / achievement.requirement_value, 1);
  };

  const getRequirementLabel = (type: string) => {
    switch (type) {
      case 'viral_count':
        return 'Viral Trends';
      case 'accuracy_rate':
        return 'Accuracy Rate';
      case 'streak_days':
        return 'Day Streak';
      case 'first_spotter_count':
        return 'First Spots';
      case 'category_specialist':
        return 'Category Trends';
      default:
        return 'Progress';
    }
  };

  const renderFilterTabs = () => {
    const tabs = [
      { key: 'all', label: 'All', count: achievements.length },
      { key: 'earned', label: 'Earned', count: achievements.filter(a => a.earned).length },
      { key: 'available', label: 'Available', count: achievements.filter(a => !a.earned).length },
    ];

    return (
      <View style={styles.filterTabs}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.filterTab,
              filter === tab.key && styles.filterTabActive,
            ]}
            onPress={() => setFilter(tab.key as any)}
          >
            <Text style={[
              styles.filterTabText,
              filter === tab.key && styles.filterTabTextActive,
            ]}>
              {tab.label}
            </Text>
            <View style={[
              styles.filterTabBadge,
              filter === tab.key && styles.filterTabBadgeActive,
            ]}>
              <Text style={[
                styles.filterTabBadgeText,
                filter === tab.key && styles.filterTabBadgeTextActive,
              ]}>
                {tab.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderAchievementCard = (achievement: Achievement) => {
    const progress = getProgressPercentage(achievement);
    const isClose = progress >= 0.8 && !achievement.earned;

    return (
      <View
        key={achievement.id}
        style={[
          styles.achievementCard,
          achievement.earned && styles.achievementCardEarned,
          isClose && styles.achievementCardClose,
        ]}
      >
        <View style={styles.achievementHeader}>
          <View style={[
            styles.iconContainer,
            achievement.earned && styles.iconContainerEarned,
          ]}>
            <Text style={styles.iconEmoji}>{achievement.icon_emoji}</Text>
          </View>
          <View style={styles.achievementInfo}>
            <Text style={[
              styles.achievementName,
              achievement.earned && styles.achievementNameEarned,
            ]}>
              {achievement.name}
            </Text>
            <Text style={styles.achievementDescription}>
              {achievement.description}
            </Text>
          </View>
          <View style={styles.rewardContainer}>
            <Text style={[
              styles.rewardAmount,
              achievement.earned && styles.rewardAmountEarned,
            ]}>
              ${achievement.reward_amount}
            </Text>
            {achievement.earned && (
              <Icon name="check-circle" size={20} color="#48bb78" />
            )}
          </View>
        </View>

        {!achievement.earned && (
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>
                {achievement.progress} / {achievement.requirement_value} {getRequirementLabel(achievement.requirement_type)}
              </Text>
              <Text style={styles.progressPercentage}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
            <Progress.Bar
              progress={progress}
              width={null}
              height={8}
              color={isClose ? '#f6ad55' : '#667eea'}
              unfilledColor="#e2e8f0"
              borderWidth={0}
              borderRadius={4}
            />
            {isClose && (
              <Text style={styles.closeText}>Almost there! Keep going!</Text>
            )}
          </View>
        )}

        {achievement.earned && achievement.earned_at && (
          <Text style={styles.earnedDate}>
            Earned on {new Date(achievement.earned_at).toLocaleDateString()}
          </Text>
        )}
      </View>
    );
  };

  const renderSummaryCards = () => {
    const totalEarned = achievements.filter(a => a.earned).reduce((sum, a) => sum + a.reward_amount, 0);
    const totalPossible = achievements.reduce((sum, a) => sum + a.reward_amount, 0);
    const earnedCount = achievements.filter(a => a.earned).length;

    return (
      <View style={styles.summaryCards}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.summaryCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Icon name="emoji-events" size={24} color="#fff" />
          <Text style={styles.summaryValue}>{earnedCount}/{achievements.length}</Text>
          <Text style={styles.summaryLabel}>Achievements</Text>
        </LinearGradient>

        <LinearGradient
          colors={['#48bb78', '#38b2ac']}
          style={styles.summaryCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Icon name="attach-money" size={24} color="#fff" />
          <Text style={styles.summaryValue}>${totalEarned}</Text>
          <Text style={styles.summaryLabel}>Earned</Text>
        </LinearGradient>

        <LinearGradient
          colors={['#ed8936', '#f56565']}
          style={styles.summaryCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Icon name="trending-up" size={24} color="#fff" />
          <Text style={styles.summaryValue}>${totalPossible - totalEarned}</Text>
          <Text style={styles.summaryLabel}>Available</Text>
        </LinearGradient>
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
      {renderSummaryCards()}
      {renderFilterTabs()}
      
      <View style={styles.achievementsList}>
        {getFilteredAchievements().map(renderAchievementCard)}
      </View>

      {getFilteredAchievements().length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {filter === 'earned' ? 'No achievements earned yet' : 'All achievements unlocked!'}
          </Text>
        </View>
      )}

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
  summaryCards: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  filterTabActive: {
    backgroundColor: '#667eea',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginRight: 6,
  },
  filterTabTextActive: {
    color: '#fff',
  },
  filterTabBadge: {
    backgroundColor: '#cbd5e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterTabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterTabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a5568',
  },
  filterTabBadgeTextActive: {
    color: '#fff',
  },
  achievementsList: {
    paddingHorizontal: 16,
  },
  achievementCard: {
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
  achievementCardEarned: {
    backgroundColor: '#f0fff4',
    borderWidth: 1,
    borderColor: '#48bb78',
  },
  achievementCardClose: {
    borderWidth: 1,
    borderColor: '#f6ad55',
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerEarned: {
    backgroundColor: '#48bb78',
  },
  iconEmoji: {
    fontSize: 28,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  achievementNameEarned: {
    color: '#22543d',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#718096',
  },
  rewardContainer: {
    alignItems: 'center',
  },
  rewardAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 4,
  },
  rewardAmountEarned: {
    color: '#48bb78',
  },
  progressSection: {
    marginTop: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#4a5568',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  closeText: {
    fontSize: 12,
    color: '#f6ad55',
    marginTop: 8,
    fontWeight: '600',
  },
  earnedDate: {
    fontSize: 12,
    color: '#48bb78',
    marginTop: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#718096',
  },
  bottomPadding: {
    height: 32,
  },
});