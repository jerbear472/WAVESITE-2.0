import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { createClientComponentClient } from '@supabase/auth-helpers-react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface Bounty {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  price_per_spot: number;
  total_spots: number;
  filled_spots: number;
  urgency_level: 'lightning' | 'rapid' | 'standard';
  expires_at: string;
  match_score?: number;
  match_reasons?: string[];
  target_platforms?: string[];
  target_expertise?: string[];
}

interface ActiveHunt {
  bounty_id: string;
  submissions_count: number;
  approved_count: number;
  earned_total: number;
}

export function BountyBoardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [activeHunts, setActiveHunts] = useState<ActiveHunt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'matched' | 'active'>('all');

  const fetchBounties = useCallback(async () => {
    try {
      // Fetch all active bounties
      const { data: bountiesData, error: bountiesError } = await supabase
        .from('bounties')
        .select('*')
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true });

      if (bountiesError) throw bountiesError;

      // Fetch user's matches if they exist
      if (user) {
        const { data: matchesData } = await supabase
          .from('bounty_matches')
          .select('bounty_id, match_score, match_reasons')
          .eq('spotter_id', user.id);

        // Merge match data with bounties
        const bountiesWithMatches = (bountiesData || []).map(bounty => {
          const match = matchesData?.find(m => m.bounty_id === bounty.id);
          return {
            ...bounty,
            match_score: match?.match_score,
            match_reasons: match?.match_reasons,
          };
        });

        setBounties(bountiesWithMatches);
      } else {
        setBounties(bountiesData || []);
      }

      // Fetch active hunts
      if (user) {
        const { data: huntsData } = await supabase
          .from('active_hunts')
          .select('*')
          .eq('spotter_id', user.id);

        setActiveHunts(huntsData || []);
      }
    } catch (error) {
      console.error('Error fetching bounties:', error);
      Alert.alert('Error', 'Failed to load bounties');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBounties();

    // Set up real-time subscription
    const channel = supabase
      .channel('bounties-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bounties' },
        fetchBounties
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBounties]);

  const startHunt = async (bountyId: string) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to start hunting bounties');
      return;
    }

    try {
      // Create or update active hunt
      const { error } = await supabase
        .from('active_hunts')
        .upsert({
          bounty_id: bountyId,
          spotter_id: user.id,
          started_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
        });

      if (error) throw error;

      // Navigate to hunting mode
      navigation.navigate('BountyHunt', { bountyId });
    } catch (error) {
      console.error('Error starting hunt:', error);
      Alert.alert('Error', 'Failed to start hunt');
    }
  };

  const getUrgencyIcon = (level: string) => {
    switch (level) {
      case 'lightning':
        return '⚡';
      case 'rapid':
        return '🔥';
      case 'standard':
        return '⏰';
      default:
        return '📍';
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      return formatDistanceToNow(expires, { addSuffix: true });
    }
    
    return `${hours}h ${minutes}m left`;
  };

  const renderBounty = ({ item }: { item: Bounty }) => {
    const isActive = activeHunts.some(h => h.bounty_id === item.id);
    const activeHunt = activeHunts.find(h => h.bounty_id === item.id);
    const progress = (item.filled_spots / item.total_spots) * 100;
    const timeLeft = getTimeRemaining(item.expires_at);
    const isExpiringSoon = new Date(item.expires_at).getTime() - Date.now() < 10 * 60 * 1000; // 10 minutes

    return (
      <TouchableOpacity
        style={styles.bountyCard}
        onPress={() => startHunt(item.id)}
        activeOpacity={0.7}
      >
        {isExpiringSoon && (
          <View style={styles.expiringSoonBadge}>
            <Text style={styles.expiringSoonText}>ENDING SOON!</Text>
          </View>
        )}

        {item.match_score && item.match_score > 0.7 && (
          <View style={styles.perfectMatchBadge}>
            <Text style={styles.perfectMatchText}>🎯 PERFECT FOR YOU</Text>
          </View>
        )}

        <View style={styles.bountyHeader}>
          <Text style={styles.urgencyIcon}>{getUrgencyIcon(item.urgency_level)}</Text>
          <Text style={styles.bountyTitle} numberOfLines={2}>{item.title}</Text>
        </View>

        <View style={styles.bountyPrice}>
          <Text style={styles.priceText}>${item.price_per_spot.toFixed(2)} per spot</Text>
          <Text style={styles.spotsText}>
            {item.filled_spots}/{item.total_spots} filled
          </Text>
        </View>

        {item.match_reasons && item.match_reasons.length > 0 && (
          <View style={styles.matchReasons}>
            {item.match_reasons.map((reason, index) => (
              <View key={index} style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>✓ {reason}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <View style={styles.bountyFooter}>
          <Text style={styles.timeText}>{timeLeft}</Text>
          {isActive ? (
            <View style={styles.activeHuntBadge}>
              <Text style={styles.activeHuntText}>
                HUNTING • {activeHunt?.approved_count || 0} approved
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => startHunt(item.id)}
            >
              <Text style={styles.startButtonText}>START HUNTING</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const filteredBounties = bounties.filter(bounty => {
    if (activeTab === 'matched') {
      return bounty.match_score && bounty.match_score > 0.5;
    }
    if (activeTab === 'active') {
      return activeHunts.some(h => h.bounty_id === bounty.id);
    }
    return true;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D4FF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎯 BOUNTY BOARD</Text>
        <TouchableOpacity
          onPress={fetchBounties}
          style={styles.refreshButton}
        >
          <Icon name="refresh-cw" size={20} color="#00D4FF" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All ({bounties.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'matched' && styles.activeTab]}
          onPress={() => setActiveTab('matched')}
        >
          <Text style={[styles.tabText, activeTab === 'matched' && styles.activeTabText]}>
            For You ({bounties.filter(b => b.match_score && b.match_score > 0.5).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active ({activeHunts.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredBounties}
        renderItem={renderBounty}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchBounties();
            }}
            tintColor="#00D4FF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'active' 
                ? 'No active hunts'
                : activeTab === 'matched'
                ? 'No matched bounties'
                : 'No bounties available'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  refreshButton: {
    padding: 8,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    marginRight: 20,
    paddingVertical: 5,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#00D4FF',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  activeTabText: {
    color: '#00D4FF',
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
  },
  bountyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  expiringSoonBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#FF3333',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 1,
  },
  expiringSoonText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  perfectMatchBadge: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginBottom: 10,
  },
  perfectMatchText: {
    color: '#00D4FF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bountyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  urgencyIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  bountyTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  bountyPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4AE54A',
  },
  spotsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  matchReasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  matchBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    marginRight: 5,
    marginBottom: 5,
  },
  matchBadgeText: {
    color: '#4CAF50',
    fontSize: 11,
  },
  progressContainer: {
    marginVertical: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00D4FF',
  },
  bountyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  startButton: {
    backgroundColor: '#00D4FF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  startButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeHuntBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  activeHuntText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 16,
  },
});