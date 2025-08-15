import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Modal,
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
import { useAuth } from '../hooks/useAuth';
import { enhancedTheme } from '../styles/theme.enhanced';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedText } from '../components/ui/AnimatedText';
import { supabase } from '../config/supabase';
import TrendCaptureService, { CapturedTrend } from '../services/TrendCaptureService';

type TrendStatus = 'all' | 'validated' | 'rejected' | 'pending_validation';
type DateRange = 'today' | 'week' | 'month' | 'all_time';

interface DateRangeOption {
  key: DateRange;
  label: string;
  getDays: () => number;
}

const DATE_RANGES: DateRangeOption[] = [
  { key: 'today', label: 'Today', getDays: () => 1 },
  { key: 'week', label: 'This Week', getDays: () => 7 },
  { key: 'month', label: 'This Month', getDays: () => 30 },
  { key: 'all_time', label: 'All Time', getDays: () => 365 * 10 },
];

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const MyTrendsScreen: React.FC = () => {
  const { user } = useAuth();
  const [trends, setTrends] = useState<CapturedTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TrendStatus>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('week');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadTrends();
  }, [user?.id, selectedDateRange]);

  const loadTrends = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const dateRange = DATE_RANGES.find(r => r.key === selectedDateRange);
      const daysAgo = dateRange?.getDays() || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      
      const { data, error } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('spotter_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTrends(data || []);
    } catch (error) {
      console.error('Error loading trends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrends();
    setRefreshing(false);
  };

  const filteredTrends = useMemo(() => {
    if (selectedStatus === 'all') return trends;
    return trends.filter(trend => trend.status === selectedStatus);
  }, [trends, selectedStatus]);

  const trendCounts = useMemo(() => {
    return {
      all: trends.length,
      validated: trends.filter(t => t.status === 'validated').length,
      rejected: trends.filter(t => t.status === 'rejected').length,
      pending_validation: trends.filter(t => t.status === 'pending_validation').length,
    };
  }, [trends]);

  const StatusTab = ({ status, label, emoji }: { status: TrendStatus; label: string; emoji: string }) => {
    const isSelected = selectedStatus === status;
    const count = trendCounts[status];
    
    return (
      <Pressable
        onPress={() => setSelectedStatus(status)}
        style={({ pressed }) => [
          styles.statusTab,
          isSelected && styles.statusTabActive,
          pressed && styles.statusTabPressed,
        ]}
      >
        {isSelected ? (
          <LinearGradient
            colors={enhancedTheme.colors.primaryGradient}
            style={styles.statusTabGradient}
          >
            <Text style={styles.statusEmoji}>{emoji}</Text>
            <Text style={styles.statusLabelActive}>{label}</Text>
            <View style={styles.countBadgeActive}>
              <Text style={styles.countTextActive}>{count}</Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.statusTabContent}>
            <Text style={styles.statusEmoji}>{emoji}</Text>
            <Text style={styles.statusLabel}>{label}</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{count}</Text>
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  const TrendTile = ({ trend, index }: { trend: CapturedTrend; index: number }) => {
    const statusColors = {
      validated: enhancedTheme.colors.success,
      rejected: enhancedTheme.colors.error,
      pending_validation: enhancedTheme.colors.warning,
    };
    
    const statusIcons = {
      validated: 'check-circle',
      rejected: 'close-circle',
      pending_validation: 'clock-outline',
    };
    
    const statusEmojis = {
      validated: '✅',
      rejected: '❌',
      pending_validation: '⏳',
    };
    
    const statusColor = statusColors[trend.status as keyof typeof statusColors] || enhancedTheme.colors.textSecondary;
    const statusIcon = statusIcons[trend.status as keyof typeof statusIcons] || 'help-circle';
    const statusEmoji = statusEmojis[trend.status as keyof typeof statusEmojis] || '❓';
    
    const handlePress = () => {
      TrendCaptureService.openOriginalContent(trend.url);
    };
    
    return (
      <Animated.View
        entering={SlideInDown.delay(index * 50).springify()}
      >
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            pressed && styles.tilePressed,
          ]}
        >
          <GlassCard style={styles.trendTile}>
            <View style={styles.tileHeader}>
              <View style={styles.platformBadge}>
                <LinearGradient
                  colors={
                    trend.platform === 'tiktok' ? ['#FF0050', '#FF005080'] :
                    trend.platform === 'instagram' ? ['#E4405F', '#E4405F80'] :
                    ['#FF0000', '#FF000080']
                  }
                  style={styles.platformGradient}
                >
                  <Icon 
                    name={
                      trend.platform === 'tiktok' ? 'music-note' :
                      trend.platform === 'instagram' ? 'instagram' : 'youtube'
                    } 
                    size={16} 
                    color="#FFFFFF" 
                  />
                </LinearGradient>
                <Text style={styles.platformText}>
                  {trend.platform?.charAt(0).toUpperCase() + trend.platform?.slice(1)}
                </Text>
              </View>
              
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <Text style={styles.statusEmojiBadge}>{statusEmoji}</Text>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {trend.status?.replace('_', ' ')}
                </Text>
              </View>
            </View>
            
            <Text style={styles.trendTitle} numberOfLines={2}>
              {trend.title || 'Untitled Trend'}
            </Text>
            
            {trend.creator_handle && (
              <View style={styles.creatorRow}>
                <Icon name="account" size={14} color={enhancedTheme.colors.textSecondary} />
                <Text style={styles.creatorHandle}>{trend.creator_handle}</Text>
              </View>
            )}
            
            {trend.caption ? (
              <Text style={styles.trendCaption} numberOfLines={2}>
                {trend.caption}
              </Text>
            ) : trend.description && (
              <Text style={styles.trendDescription} numberOfLines={2}>
                {trend.description}
              </Text>
            )}
            
            {(trend.view_count || trend.like_count) && (
              <View style={styles.metricsRow}>
                {trend.view_count > 0 && (
                  <View style={styles.metricItem}>
                    <Icon name="eye" size={14} color={enhancedTheme.colors.textTertiary} />
                    <Text style={styles.metricText}>{formatNumber(trend.view_count)}</Text>
                  </View>
                )}
                {trend.like_count > 0 && (
                  <View style={styles.metricItem}>
                    <Icon name="heart" size={14} color={enhancedTheme.colors.textTertiary} />
                    <Text style={styles.metricText}>{formatNumber(trend.like_count)}</Text>
                  </View>
                )}
                {trend.comment_count > 0 && (
                  <View style={styles.metricItem}>
                    <Icon name="comment" size={14} color={enhancedTheme.colors.textTertiary} />
                    <Text style={styles.metricText}>{formatNumber(trend.comment_count)}</Text>
                  </View>
                )}
                {trend.share_count > 0 && (
                  <View style={styles.metricItem}>
                    <Icon name="share" size={14} color={enhancedTheme.colors.textTertiary} />
                    <Text style={styles.metricText}>{formatNumber(trend.share_count)}</Text>
                  </View>
                )}
              </View>
            )}
            
            {trend.hashtags && (
              <Text style={styles.hashtags} numberOfLines={1}>
                {trend.hashtags}
              </Text>
            )}
            
            <View style={styles.tileFooter}>
              <View style={styles.dateContainer}>
                <Icon name="calendar" size={14} color={enhancedTheme.colors.textTertiary} />
                <Text style={styles.dateText}>
                  {new Date(trend.captured_at).toLocaleDateString()}
                </Text>
              </View>
              
              {trend.validation_count !== undefined && (
                <View style={styles.validationInfo}>
                  <Icon name="vote" size={14} color={enhancedTheme.colors.textTertiary} />
                  <Text style={styles.validationText}>
                    {trend.validation_count} votes
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.viewOriginalButton}>
              <Icon name="open-in-new" size={16} color={enhancedTheme.colors.accent} />
              <Text style={styles.viewOriginalText}>View Original</Text>
            </View>
          </GlassCard>
        </Pressable>
      </Animated.View>
    );
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={[enhancedTheme.colors.background, enhancedTheme.colors.backgroundSecondary]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={enhancedTheme.colors.primary} />
            <Text style={styles.loadingText}>Loading your trends...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[enhancedTheme.colors.background, enhancedTheme.colors.backgroundSecondary]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <AnimatedText
            type="slide"
            style={styles.title}
            gradient
          >
            My Trends
          </AnimatedText>
          
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={styles.dateRangeButton}
          >
            <Icon name="calendar-range" size={20} color={enhancedTheme.colors.primary} />
            <Text style={styles.dateRangeText}>
              {DATE_RANGES.find(r => r.key === selectedDateRange)?.label}
            </Text>
            <Icon name="chevron-down" size={20} color={enhancedTheme.colors.primary} />
          </Pressable>
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusTabs}
          contentContainerStyle={styles.statusTabsContent}
        >
          <StatusTab status="all" label="All" emoji="📊" />
          <StatusTab status="validated" label="Validated" emoji="✅" />
          <StatusTab status="pending_validation" label="Pending" emoji="⏳" />
          <StatusTab status="rejected" label="Rejected" emoji="❌" />
        </ScrollView>
        
        <FlatList
          data={filteredTrends}
          renderItem={({ item, index }) => <TrendTile trend={item} index={index} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.trendsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={enhancedTheme.colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>
                {selectedStatus === 'validated' ? '🎯' :
                 selectedStatus === 'rejected' ? '😔' :
                 selectedStatus === 'pending_validation' ? '⏰' : '📱'}
              </Text>
              <Text style={styles.emptyText}>
                No {selectedStatus === 'all' ? '' : selectedStatus.replace('_', ' ')} trends yet
              </Text>
              <Text style={styles.emptySubtext}>
                Start capturing trends to see them here
              </Text>
            </View>
          }
        />
        
        {/* Date Range Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              {DATE_RANGES.map((range) => (
                <Pressable
                  key={range.key}
                  onPress={() => {
                    setSelectedDateRange(range.key);
                    setShowDatePicker(false);
                  }}
                  style={[
                    styles.dateOption,
                    selectedDateRange === range.key && styles.dateOptionActive,
                  ]}
                >
                  <Text style={[
                    styles.dateOptionText,
                    selectedDateRange === range.key && styles.dateOptionTextActive,
                  ]}>
                    {range.label}
                  </Text>
                  {selectedDateRange === range.key && (
                    <Icon name="check" size={20} color={enhancedTheme.colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...enhancedTheme.typography.bodyLarge,
    color: enhancedTheme.colors.textSecondary,
    marginTop: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: enhancedTheme.colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: enhancedTheme.borderRadius.full,
    borderWidth: 1,
    borderColor: enhancedTheme.colors.glassBorder,
  },
  dateRangeText: {
    ...enhancedTheme.typography.bodyMedium,
    color: enhancedTheme.colors.primary,
    fontWeight: '600',
  },
  statusTabs: {
    maxHeight: 60,
    marginBottom: 16,
  },
  statusTabsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statusTab: {
    borderRadius: enhancedTheme.borderRadius.full,
    overflow: 'hidden',
  },
  statusTabActive: {
    transform: [{ scale: 1.05 }],
  },
  statusTabPressed: {
    transform: [{ scale: 0.98 }],
  },
  statusTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  statusTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: enhancedTheme.colors.surface,
    borderWidth: 1,
    borderColor: enhancedTheme.colors.glassBorder,
    borderRadius: enhancedTheme.borderRadius.full,
  },
  statusEmoji: {
    fontSize: 20,
  },
  statusLabel: {
    ...enhancedTheme.typography.bodyMedium,
    color: enhancedTheme.colors.text,
    fontWeight: '600',
  },
  statusLabelActive: {
    ...enhancedTheme.typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: enhancedTheme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: enhancedTheme.borderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: enhancedTheme.borderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.text,
    fontWeight: 'bold',
  },
  countTextActive: {
    ...enhancedTheme.typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  trendsList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  tilePressed: {
    transform: [{ scale: 0.98 }],
  },
  trendTile: {
    padding: 20,
    marginBottom: 16,
  },
  tileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  platformGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.text,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: enhancedTheme.borderRadius.full,
    gap: 6,
  },
  statusEmojiBadge: {
    fontSize: 14,
  },
  statusText: {
    ...enhancedTheme.typography.bodySmall,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  trendTitle: {
    ...enhancedTheme.typography.titleMedium,
    color: enhancedTheme.colors.text,
    marginBottom: 8,
  },
  trendDescription: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  creatorHandle: {
    ...enhancedTheme.typography.bodyMedium,
    color: enhancedTheme.colors.primary,
    fontWeight: '500',
  },
  trendCaption: {
    ...enhancedTheme.typography.bodyMedium,
    color: enhancedTheme.colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 10,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textSecondary,
    fontWeight: '500',
  },
  hashtags: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.accent,
    marginBottom: 12,
  },
  tileFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: enhancedTheme.colors.glassBorder,
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textTertiary,
  },
  validationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  validationText: {
    ...enhancedTheme.typography.bodySmall,
    color: enhancedTheme.colors.textTertiary,
  },
  viewOriginalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  viewOriginalText: {
    ...enhancedTheme.typography.bodyMedium,
    color: enhancedTheme.colors.accent,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    ...enhancedTheme.typography.headlineSmall,
    color: enhancedTheme.colors.textTertiary,
    marginBottom: 8,
  },
  emptySubtext: {
    ...enhancedTheme.typography.bodyMedium,
    color: enhancedTheme.colors.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: enhancedTheme.colors.background,
    borderTopLeftRadius: enhancedTheme.borderRadius.xl,
    borderTopRightRadius: enhancedTheme.borderRadius.xl,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    ...enhancedTheme.typography.headlineSmall,
    color: enhancedTheme.colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: enhancedTheme.colors.surface,
    marginBottom: 8,
    borderRadius: enhancedTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: enhancedTheme.colors.glassBorder,
  },
  dateOptionActive: {
    borderColor: enhancedTheme.colors.primary,
    backgroundColor: enhancedTheme.colors.primary + '10',
  },
  dateOptionText: {
    ...enhancedTheme.typography.bodyLarge,
    color: enhancedTheme.colors.text,
  },
  dateOptionTextActive: {
    color: enhancedTheme.colors.primary,
    fontWeight: '600',
  },
});