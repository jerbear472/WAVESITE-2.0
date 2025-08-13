import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  ActivityIndicator,
  Clipboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../hooks/useAuth';
import supabaseService from '../services/supabaseService';
// Theme import removed - using inline colors

// Platform data matching web app exactly
const PLATFORMS = [
  { 
    id: 'tiktok', 
    label: 'TikTok', 
    icon: '🎵', 
    colors: ['#000000', '#000000'],
    url: 'https://www.tiktok.com/foryou' 
  },
  { 
    id: 'instagram', 
    label: 'Instagram', 
    icon: '📸', 
    colors: ['#833AB4', '#E1306C'],
    url: 'https://www.instagram.com' 
  },
  { 
    id: 'twitter', 
    label: 'X', 
    icon: '𝕏', 
    colors: ['#000000', '#000000'],
    url: 'https://twitter.com/home' 
  },
  { 
    id: 'reddit', 
    label: 'Reddit', 
    icon: '🔥', 
    colors: ['#FF4500', '#FF4500'],
    url: 'https://www.reddit.com/r/popular' 
  },
  { 
    id: 'youtube', 
    label: 'YouTube', 
    icon: '📺', 
    colors: ['#FF0000', '#FF0000'],
    url: 'https://www.youtube.com/feed/trending' 
  }
];

export const ScrollScreen: React.FC = () => {
  const { user } = useAuth();
  const [trendUrl, setTrendUrl] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [streakMultiplier, setStreakMultiplier] = useState(1.0);
  const [streakTimeRemaining, setStreakTimeRemaining] = useState(0);
  
  // Stats
  const [todaysEarnings, setTodaysEarnings] = useState(0);
  const [todaysPendingEarnings, setTodaysPendingEarnings] = useState(0);
  const [trendsLoggedToday, setTrendsLoggedToday] = useState(0);
  const [loading, setLoading] = useState(false);

  // Timer for session
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive) {
      interval = setInterval(() => {
        setSessionDuration(prev => prev + 1);
        if (streakTimeRemaining > 0) {
          setStreakTimeRemaining(prev => prev - 1);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, streakTimeRemaining]);

  // Load stats on mount
  useEffect(() => {
    if (user) {
      loadTodaysStats();
    }
  }, [user]);

  const loadTodaysStats = async () => {
    if (!user) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    try {
      // Get user's profile data
      const profile = await supabaseService.getUserProfile(user.id);
      if (profile) {
        setTodaysPendingEarnings(profile.pending_earnings || 0);
        // You can add more stats loading here
      }
      
      // Get today's trends count
      const trends = await supabaseService.getUserTrends(user.id);
      const todaysTrends = trends.filter(t => {
        const trendDate = new Date(t.created_at);
        return trendDate >= today;
      });
      setTrendsLoggedToday(todaysTrends.length);
      
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const getStreakMultiplier = (streakCount: number): number => {
    if (streakCount >= 15) return 3.0;
    if (streakCount >= 5) return 2.0;
    if (streakCount >= 2) return 1.2;
    return 1.0;
  };

  const handlePlatformClick = (platform: typeof PLATFORMS[0]) => {
    // Open platform URL in browser or app
    Linking.openURL(platform.url).catch(err => {
      Alert.alert('Error', 'Could not open ' + platform.label);
    });
  };

  const handleStartSession = () => {
    setIsSessionActive(true);
    setSessionDuration(0);
    setCurrentStreak(0);
    setStreakMultiplier(1.0);
  };

  const handleEndSession = () => {
    setIsSessionActive(false);
    // You can save session data here if needed
  };

  const handleUrlSubmit = () => {
    if (!trendUrl) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }
    
    // Navigate to submission form or handle submission
    Alert.alert('Submit Trend', 'This would open the submission form with URL: ' + trendUrl);
    setTrendUrl('');
  };

  const handlePasteUrl = async () => {
    const clipboardContent = await Clipboard.getString();
    if (clipboardContent && isValidUrl(clipboardContent)) {
      setTrendUrl(clipboardContent);
    }
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Trend Scanner</Text>
            <Text style={styles.headerSubtitle}>Spot trends, earn rewards</Text>
          </View>
        </View>

        {/* Submit Trend Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={['#833AB4', '#E1306C']}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="link-variant" size={24} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.cardTitleSection}>
              <Text style={styles.cardTitle}>Submit a Trend</Text>
              <Text style={styles.cardSubtitle}>Paste a URL to start the 3-step submission</Text>
            </View>
          </View>

          <View style={styles.urlInputContainer}>
            <TextInput
              style={styles.urlInput}
              value={trendUrl}
              onChangeText={setTrendUrl}
              placeholder="Paste trend URL here..."
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {trendUrl.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => setTrendUrl('')}
              >
                <Icon name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.pasteButton]}
              onPress={handlePasteUrl}
            >
              <Icon name="content-paste" size={18} color="#666" />
              <Text style={styles.pasteButtonText}>Paste</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.submitButton, !trendUrl && styles.submitButtonDisabled]}
              onPress={handleUrlSubmit}
              disabled={!trendUrl}
            >
              <Icon name="send" size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Start Submission</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.autoCapture}>
            <Icon name="sparkles" size={14} color="#666" />
            <Text style={styles.autoCaptureText}>Auto-captures creator info & metrics</Text>
          </View>
        </View>

        {/* Session Control */}
        <View style={styles.card}>
          <View style={styles.sessionHeader}>
            <View>
              <Text style={styles.sessionTitle}>Scroll Session</Text>
              <Text style={styles.sessionSubtitle}>
                {isSessionActive ? 'Track your submission streak' : 'Optional: Track progress & streaks'}
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.sessionButton, isSessionActive && styles.sessionButtonActive]}
              onPress={isSessionActive ? handleEndSession : handleStartSession}
            >
              <Icon 
                name={isSessionActive ? "pause" : "play"} 
                size={16} 
                color="#FFFFFF" 
              />
              <Text style={styles.sessionButtonText}>
                {isSessionActive ? 'End' : 'Start'}
              </Text>
            </TouchableOpacity>
          </View>

          {isSessionActive ? (
            <View style={styles.sessionStats}>
              <View style={styles.sessionStat}>
                <Icon name="clock-outline" size={16} color="#666" />
                <Text style={styles.sessionStatLabel}>Duration</Text>
                <Text style={styles.sessionStatValue}>{formatTime(sessionDuration)}</Text>
              </View>
              
              <View style={[styles.sessionStat, styles.sessionStatHighlight]}>
                <Icon name="fire" size={16} color="#FF6B6B" />
                <Text style={styles.sessionStatLabel}>Streak</Text>
                <Text style={styles.sessionStatValue}>
                  {currentStreak} {currentStreak > 0 && `(${streakMultiplier}x)`}
                </Text>
              </View>
              
              {currentStreak > 0 && (
                <View style={styles.sessionStat}>
                  <Icon name="timer-sand" size={16} color="#FFA500" />
                  <Text style={styles.sessionStatLabel}>Time Left</Text>
                  <Text style={styles.sessionStatValue}>{formatTime(streakTimeRemaining)}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.sessionBenefits}>
              <View style={styles.benefitHeader}>
                <LinearGradient
                  colors={['#833AB4', '#E1306C']}
                  style={styles.benefitIcon}
                >
                  <Icon name="lightning-bolt" size={20} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.benefitTitle}>Session Benefits</Text>
              </View>
              <View style={styles.benefitsList}>
                <Text style={styles.benefitItem}>• Track your submission streak</Text>
                <Text style={styles.benefitItem}>• 30-minute windows between trends</Text>
                <Text style={styles.benefitItem}>• Gamification multipliers shown (visual only)</Text>
              </View>
            </View>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="cash" size={20} color="#4CAF50" />
            <Text style={styles.statCardValue}>{formatCurrency(todaysEarnings)}</Text>
            <Text style={styles.statCardLabel}>Confirmed</Text>
            <Text style={styles.statCardSublabel}>Today</Text>
          </View>
          
          <View style={styles.statCard}>
            <Icon name="clock-outline" size={20} color="#FFC107" />
            <Text style={styles.statCardValue}>{formatCurrency(todaysPendingEarnings)}</Text>
            <Text style={styles.statCardLabel}>Pending</Text>
            <Text style={styles.statCardSublabel}>Verification</Text>
          </View>
          
          <View style={styles.statCard}>
            <Icon name="fire" size={20} color="#9C27B0" />
            <Text style={styles.statCardValue}>{streakMultiplier}x</Text>
            <Text style={styles.statCardLabel}>Multiplier</Text>
            <Text style={styles.statCardSublabel}>Active</Text>
          </View>
          
          <View style={styles.statCard}>
            <Icon name="trending-up" size={20} color="#2196F3" />
            <Text style={styles.statCardValue}>{trendsLoggedToday}</Text>
            <Text style={styles.statCardLabel}>Trends</Text>
            <Text style={styles.statCardSublabel}>Today</Text>
          </View>
        </View>

        {/* Platform Quick Access */}
        <View style={styles.platformSection}>
          <View style={styles.platformHeader}>
            <Icon name="earth" size={16} color="#666" />
            <Text style={styles.platformTitle}>Quick Platform Access</Text>
          </View>
          
          <View style={styles.platformGrid}>
            {PLATFORMS.map(platform => (
              <TouchableOpacity
                key={platform.id}
                style={styles.platformButton}
                onPress={() => handlePlatformClick(platform)}
              >
                <LinearGradient
                  colors={platform.colors}
                  style={styles.platformGradient}
                >
                  <Text style={styles.platformIcon}>{platform.icon}</Text>
                  <Text style={styles.platformLabel}>{platform.label}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Earnings Summary */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsRow}>
            <View style={styles.earningsItem}>
              <Icon name="check-circle" size={14} color="#4CAF50" />
              <Text style={styles.earningsLabel}>Earned today:</Text>
              <Text style={styles.earningsValue}>{formatCurrency(todaysEarnings)}</Text>
            </View>
            <View style={styles.earningsItem}>
              <Icon name="clock-outline" size={14} color="#FFC107" />
              <Text style={styles.earningsLabel}>Pending:</Text>
              <Text style={styles.earningsValue}>{formatCurrency(todaysPendingEarnings)}</Text>
            </View>
          </View>
          
          <View style={styles.earningsDetails}>
            <Text style={styles.earningsDetail}>Base: $0.02 per trend</Text>
            <Text style={styles.earningsDetail}>Finance bonus: +$0.01</Text>
            {streakMultiplier > 1.0 && (
              <Text style={styles.earningsDetail}>Streak: {streakMultiplier}x multiplier</Text>
            )}
            <Text style={styles.earningsValidation}>Paid after 2 validations ✓</Text>
          </View>
        </View>

        {/* Finance Bonus Section */}
        <LinearGradient
          colors={['#E8F5E9', '#E1F5FE']}
          style={styles.financeCard}
        >
          <View style={styles.financeHeader}>
            <LinearGradient
              colors={['#4CAF50', '#4CAF50']}
              style={styles.financeIcon}
            >
              <Icon name="cash-multiple" size={20} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.financeContent}>
              <Text style={styles.financeTitle}>Finance Trends = Extra Cash</Text>
              <Text style={styles.financeSubtitle}>Track meme stocks & crypto for bonus payments</Text>
            </View>
            <View style={styles.financeBadge}>
              <Text style={styles.financeBadgeText}>+$0.01 bonus</Text>
            </View>
          </View>
          
          <View style={styles.financeCommunities}>
            {['r/wallstreetbets', 'r/stocks', 'r/cryptocurrency', 'r/superstonk', 'StockTwits'].map(community => (
              <View key={community} style={styles.communityChip}>
                <Text style={styles.communityChipText}>{community}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleSection: {
    marginLeft: 12,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  urlInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#1A1A1A',
  },
  clearButton: {
    padding: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 6,
  },
  pasteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#9C27B0',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  autoCapture: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  autoCaptureText: {
    fontSize: 12,
    color: '#666',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  sessionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  sessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    gap: 6,
  },
  sessionButtonActive: {
    backgroundColor: '#F44336',
  },
  sessionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sessionStat: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  sessionStatHighlight: {
    backgroundColor: '#FFF3E0',
  },
  sessionStatLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  sessionStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 4,
  },
  sessionBenefits: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  benefitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 12,
  },
  benefitsList: {
    gap: 6,
  },
  benefitItem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 8,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#1A1A1A',
    marginTop: 4,
  },
  statCardSublabel: {
    fontSize: 11,
    color: '#999',
  },
  platformSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  platformTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  platformGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  platformButton: {
    flex: 1,
  },
  platformGradient: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  platformIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  platformLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  earningsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(224, 224, 224, 0.5)',
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  earningsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  earningsLabel: {
    fontSize: 13,
    color: '#666',
  },
  earningsValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  earningsDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsDetail: {
    fontSize: 11,
    color: '#666',
    marginRight: 12,
  },
  earningsValidation: {
    fontSize: 11,
    color: '#666',
  },
  financeCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  financeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  financeIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  financeContent: {
    flex: 1,
    marginLeft: 12,
  },
  financeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  financeSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  financeBadge: {
    backgroundColor: '#C8E6C9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  financeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },
  financeCommunities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  communityChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  communityChipText: {
    fontSize: 12,
    color: '#424242',
  },
});

export default ScrollScreen;