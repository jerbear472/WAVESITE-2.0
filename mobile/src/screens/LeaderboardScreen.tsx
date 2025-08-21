import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Card } from '../components/ui/Card';
import { theme } from '../styles/theme';
import { formatXP, getLevelFromXP } from '../config/xpConfig';
import { supabase } from '../config/supabase';
import { useAuth } from '../hooks/useAuth';

interface LeaderboardEntry {
  id: string;
  username: string;
  total_xp: number;
  level: number;
  wave_score: number;
  trends_spotted: number;
  daily_streak: number;
  rank: number;
}

type LeaderboardType = 'xp' | 'trends' | 'streak' | 'wave_score';

export const LeaderboardScreen: React.FC = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [activeTab, setActiveTab] = useState<LeaderboardType>('xp');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tabs = [
    { key: 'xp' as LeaderboardType, label: 'Total XP', icon: '⭐' },
    { key: 'trends' as LeaderboardType, label: 'Trends', icon: '🔍' },
    { key: 'streak' as LeaderboardType, label: 'Streak', icon: '🔥' },
    { key: 'wave_score' as LeaderboardType, label: 'Wave Score', icon: '🌊' },
  ];

  useEffect(() => {
    loadLeaderboard();
  }, [activeTab]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      
      // Get top users
      const orderColumn = getOrderColumn(activeTab);
      const { data: topUsers, error } = await supabase
        .from('profiles')
        .select('id, username, total_xp, level, wave_score, trends_spotted, daily_streak')
        .order(orderColumn, { ascending: false })
        .limit(50);

      if (error) throw error;

      // Add rank to each user
      const rankedUsers = (topUsers || []).map((user, index) => ({
        ...user,
        rank: index + 1,
      }));

      setLeaderboard(rankedUsers);

      // Find current user's rank
      if (user?.id) {
        const userEntry = rankedUsers.find(u => u.id === user.id);
        if (userEntry) {
          setUserRank(userEntry);
        } else {
          // If user not in top 50, get their specific rank
          const { data: userRankData } = await supabase
            .rpc('get_user_rank', {
              user_id: user.id,
              order_column: orderColumn
            });
          
          if (userRankData) {
            setUserRank({
              id: user.id,
              username: user.username || 'Unknown',
              total_xp: userRankData.total_xp || 0,
              level: userRankData.level || 1,
              wave_score: userRankData.wave_score || 0,
              trends_spotted: userRankData.trends_spotted || 0,
              daily_streak: userRankData.daily_streak || 0,
              rank: userRankData.rank || 0,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getOrderColumn = (type: LeaderboardType): string => {
    switch (type) {
      case 'xp': return 'total_xp';
      case 'trends': return 'trends_spotted';
      case 'streak': return 'daily_streak';
      case 'wave_score': return 'wave_score';
      default: return 'total_xp';
    }
  };

  const getDisplayValue = (user: LeaderboardEntry, type: LeaderboardType): string => {
    switch (type) {
      case 'xp': return formatXP(user.total_xp);
      case 'trends': return user.trends_spotted.toString();
      case 'streak': return `${user.daily_streak} days`;
      case 'wave_score': return user.wave_score.toString();
      default: return '0';
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };

  const renderPodium = () => {
    if (leaderboard.length < 3) return null;

    const top3 = leaderboard.slice(0, 3);
    const [second, first, third] = [top3[1], top3[0], top3[2]];

    return (
      <View style={styles.podiumContainer}>
        {/* Second Place */}
        <View style={styles.podiumPosition}>
          <Card style={[styles.podiumCard, styles.secondPlace]} variant="elevated">
            <Text style={styles.podiumRank}>2</Text>
            <Text style={styles.podiumName}>{second.username}</Text>
            <Text style={styles.podiumValue}>
              {getDisplayValue(second, activeTab)}
            </Text>
          </Card>
        </View>

        {/* First Place */}
        <View style={styles.podiumPosition}>
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={styles.crownContainer}
          >
            <Text style={styles.crown}>👑</Text>
          </LinearGradient>
          <Card style={[styles.podiumCard, styles.firstPlace]} variant="elevated">
            <Text style={styles.podiumRank}>1</Text>
            <Text style={styles.podiumName}>{first.username}</Text>
            <Text style={styles.podiumValue}>
              {getDisplayValue(first, activeTab)}
            </Text>
          </Card>
        </View>

        {/* Third Place */}
        <View style={styles.podiumPosition}>
          <Card style={[styles.podiumCard, styles.thirdPlace]} variant="elevated">
            <Text style={styles.podiumRank}>3</Text>
            <Text style={styles.podiumName}>{third.username}</Text>
            <Text style={styles.podiumValue}>
              {getDisplayValue(third, activeTab)}
            </Text>
          </Card>
        </View>
      </View>
    );
  };

  const renderLeaderboardItem = (user: LeaderboardEntry, index: number) => {
    const isCurrentUser = user.id === user?.id;
    
    return (
      <Card 
        key={user.id} 
        style={[
          styles.leaderboardItem,
          isCurrentUser && styles.currentUserItem
        ]} 
        variant="outlined"
      >
        <View style={styles.rankContainer}>
          <Text style={styles.rankNumber}>#{user.rank}</Text>
        </View>
        
        <View style={styles.userInfo}>
          <Text style={[styles.username, isCurrentUser && styles.currentUsername]}>
            {user.username}
          </Text>
          <Text style={styles.userLevel}>
            {getLevelFromXP(user.total_xp).icon} Level {user.level} - {getLevelFromXP(user.total_xp).title}
          </Text>
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreValue, isCurrentUser && styles.currentScore]}>
            {getDisplayValue(user, activeTab)}
          </Text>
          <Text style={styles.scoreLabel}>
            {tabs.find(t => t.key === activeTab)?.label}
          </Text>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>Top trend spotters</Text>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[
              styles.tabLabel,
              activeTab === tab.key && styles.activeTabLabel
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Podium */}
        {renderPodium()}

        {/* Your Rank Card */}
        {userRank && userRank.rank > 3 && (
          <Card style={styles.yourRankCard} variant="elevated">
            <View style={styles.yourRankHeader}>
              <Text style={styles.yourRankTitle}>Your Rank</Text>
            </View>
            {renderLeaderboardItem(userRank, -1)}
          </Card>
        )}

        {/* Leaderboard List */}
        <View style={styles.leaderboardList}>
          <Text style={styles.sectionTitle}>Rankings</Text>
          {leaderboard.slice(3).map((user, index) => 
            renderLeaderboardItem(user, index + 3)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textLight,
  },
  tabsContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  tabsContent: {
    gap: theme.spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundCard,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textLight,
  },
  activeTabLabel: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  podiumPosition: {
    flex: 1,
    alignItems: 'center',
  },
  crownContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -20,
    zIndex: 1,
  },
  crown: {
    fontSize: 24,
  },
  podiumCard: {
    width: '100%',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  firstPlace: {
    backgroundColor: '#FFD70020',
    borderColor: '#FFD700',
    borderWidth: 2,
    minHeight: 120,
  },
  secondPlace: {
    backgroundColor: '#C0C0C020',
    borderColor: '#C0C0C0',
    borderWidth: 1,
    minHeight: 100,
  },
  thirdPlace: {
    backgroundColor: '#CD7F3220',
    borderColor: '#CD7F32',
    borderWidth: 1,
    minHeight: 90,
  },
  podiumRank: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  podiumName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  podiumValue: {
    fontSize: 12,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  yourRankCard: {
    marginBottom: theme.spacing.lg,
  },
  yourRankHeader: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  yourRankTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  leaderboardList: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  currentUserItem: {
    backgroundColor: theme.colors.wave[50],
    borderColor: theme.colors.primary,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textLight,
  },
  userInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  currentUsername: {
    color: theme.colors.primary,
  },
  userLevel: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  currentScore: {
    color: theme.colors.primary,
  },
  scoreLabel: {
    fontSize: 10,
    color: theme.colors.textLight,
  },
});