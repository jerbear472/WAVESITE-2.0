import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { designSystem } from '../styles/designSystem';
import { useSignals, useDataDepth } from '../hooks';
import { Header, SignalCard } from '../components';
import type { RootStackParamList } from '../navigation';
import type { Signal, SignalFilters, SignalSortOptions } from '../types';

const { colors, spacing, borderRadius, typography } = designSystem;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type SortOption = 'detected_at' | 'momentum_score' | 'forecast_mainstream_days';

const sortOptions: { key: SortOption; label: string; icon: string }[] = [
  { key: 'detected_at', label: 'Detection Date', icon: 'calendar' },
  { key: 'momentum_score', label: 'Momentum', icon: 'pulse' },
  { key: 'forecast_mainstream_days', label: 'Forecast', icon: 'clock-outline' },
];

export default function HistoryScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [sortBy, setSortBy] = useState<SortOption>('detected_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: dataDepth } = useDataDepth();

  const filters: SignalFilters = useMemo(() => ({}), []);

  const sort: SignalSortOptions = useMemo(() => ({
    field: sortBy,
    direction: sortDirection,
  }), [sortBy, sortDirection]);

  const {
    data: signalsData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useSignals(filters, sort);

  const signals = useMemo(() => {
    const all = signalsData?.pages.flatMap(page => page.data) || [];
    if (showCompleted) {
      return all.filter(s => s.outcome?.reached_mainstream);
    }
    return all;
  }, [signalsData, showCompleted]);

  const handleSignalPress = useCallback((signal: Signal) => {
    navigation.navigate('SignalDetail', { signalId: signal.id });
  }, [navigation]);

  const handleSortChange = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortDirection('desc');
    }
  };

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Data Depth Banner */}
      <View style={styles.dataBanner}>
        <Icon name="database-clock" size={24} color={colors.primary} />
        <View style={styles.dataBannerContent}>
          <Text style={styles.dataBannerTitle}>Historical Data Moat</Text>
          <Text style={styles.dataBannerText}>
            {dataDepth || 0} months of signal acceleration data
          </Text>
        </View>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <View style={styles.sortOptions}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortButton,
                sortBy === option.key && styles.sortButtonActive,
              ]}
              onPress={() => handleSortChange(option.key)}
            >
              <Icon
                name={option.icon}
                size={16}
                color={sortBy === option.key ? colors.primary : colors.text.tertiary}
              />
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === option.key && styles.sortButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
              {sortBy === option.key && (
                <Icon
                  name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
                  size={14}
                  color={colors.primary}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Filter Toggle */}
      <TouchableOpacity
        style={styles.filterToggle}
        onPress={() => setShowCompleted(!showCompleted)}
      >
        <Icon
          name={showCompleted ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={20}
          color={showCompleted ? colors.primary : colors.text.tertiary}
        />
        <Text style={styles.filterToggleText}>
          Show only completed (reached mainstream)
        </Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>
        {showCompleted ? 'Completed Signals' : 'All Historical Signals'}
      </Text>
    </View>
  );

  const renderSignal = ({ item }: { item: Signal }) => (
    <SignalCard
      signal={item}
      onPress={() => handleSignalPress(item)}
      compact
    />
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Icon name="history" size={48} color={colors.text.tertiary} />
        <Text style={styles.emptyText}>No historical signals</Text>
        <Text style={styles.emptySubtext}>
          Signals will appear here as they are detected
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="History"
        subtitle="Time-series signal data"
        rightIcon="export"
        rightAction={() => {}}
      />

      <FlatList
        data={signals}
        keyExtractor={(item) => item.id}
        renderItem={renderSignal}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerContent: {
    marginBottom: spacing.md,
  },
  dataBanner: {
    flexDirection: 'row',
    backgroundColor: `${colors.primary}15`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  dataBannerContent: {
    flex: 1,
  },
  dataBannerTitle: {
    ...typography.bodyMedium,
    color: colors.primary,
    marginBottom: spacing.xxs,
  },
  dataBannerText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  sortContainer: {
    marginBottom: spacing.md,
  },
  sortLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  sortButtonActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  sortButtonText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  sortButtonTextActive: {
    color: colors.primary,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  filterToggleText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
