import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { designSystem } from '../styles/designSystem';
import { useSignals, useTopSignals, useDashboardMetrics } from '../hooks';
import {
  Header,
  SignalCard,
  MetricCard,
  FilterBar,
} from '../components';
import type { RootStackParamList } from '../navigation';
import type { Signal, Platform, SignalCategory, ConfidenceLevel, SignalFilters } from '../types';

const { colors, spacing } = designSystem;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SignalsScreen() {
  const navigation = useNavigation<NavigationProp>();

  // Filter state
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<SignalCategory[]>([]);
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel[]>([]);

  // Build filters
  const filters: SignalFilters = useMemo(() => ({
    platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
    categories: selectedCategories.length > 0 ? selectedCategories : undefined,
    confidence_levels: selectedConfidence.length > 0 ? selectedConfidence : undefined,
  }), [selectedPlatforms, selectedCategories, selectedConfidence]);

  // Data hooks
  const {
    data: signalsData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useSignals(filters);

  const { data: dashboardMetrics } = useDashboardMetrics();
  const { data: topSignals } = useTopSignals(5);

  // Flatten paginated data
  const signals = useMemo(() => {
    return signalsData?.pages.flatMap(page => page.data) || [];
  }, [signalsData]);

  // Handlers
  const handleSignalPress = useCallback((signal: Signal) => {
    navigation.navigate('SignalDetail', { signalId: signal.id });
  }, [navigation]);

  const handlePlatformToggle = useCallback((platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  }, []);

  const handleCategoryToggle = useCallback((category: SignalCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  const handleConfidenceToggle = useCallback((confidence: ConfidenceLevel) => {
    setSelectedConfidence(prev =>
      prev.includes(confidence)
        ? prev.filter(c => c !== confidence)
        : [...prev, confidence]
    );
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedPlatforms([]);
    setSelectedCategories([]);
    setSelectedConfidence([]);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Render functions
  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Metrics row */}
      <View style={styles.metricsRow}>
        <MetricCard
          title="Active Signals"
          value={dashboardMetrics?.active_signals_count || 0}
          icon="pulse"
          iconColor={colors.primary}
          compact
        />
        <MetricCard
          title="Detected Today"
          value={dashboardMetrics?.signals_detected_today || 0}
          icon="plus-circle"
          iconColor={colors.success}
          compact
        />
        <MetricCard
          title="7d Accuracy"
          value={`${dashboardMetrics?.average_accuracy_7d || 0}%`}
          icon="target"
          iconColor={colors.warning}
          compact
        />
      </View>

      {/* Section title */}
      <Text style={styles.sectionTitle}>Signal Feed</Text>
    </View>
  );

  const renderSignal = ({ item }: { item: Signal }) => (
    <SignalCard
      signal={item}
      onPress={() => handleSignalPress(item)}
    />
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No signals found</Text>
        <Text style={styles.emptySubtext}>
          Try adjusting your filters or check back later
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Signals"
        showLogo
        rightIcon="magnify"
        rightAction={() => {}}
      />

      <FilterBar
        selectedPlatforms={selectedPlatforms}
        selectedCategories={selectedCategories}
        selectedConfidence={selectedConfidence}
        onPlatformToggle={handlePlatformToggle}
        onCategoryToggle={handleCategoryToggle}
        onConfidenceToggle={handleConfidenceToggle}
        onClearAll={handleClearFilters}
      />

      <FlatList
        data={signals}
        keyExtractor={(item) => item.id}
        renderItem={renderSignal}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
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

      {isLoading && signals.length === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
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
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
