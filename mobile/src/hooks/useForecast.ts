import { useQuery } from '@tanstack/react-query';
import { forecastService } from '../services';
import type { TimePeriod } from '../types';

// Query keys
export const forecastKeys = {
  all: ['forecast'] as const,
  accuracy: (period: TimePeriod) => [...forecastKeys.all, 'accuracy', period] as const,
  accuracyByCategory: (period: TimePeriod) => [...forecastKeys.all, 'accuracy-category', period] as const,
  accuracyByPlatform: (period: TimePeriod) => [...forecastKeys.all, 'accuracy-platform', period] as const,
  accuracyHistory: (start: string, end: string) => [...forecastKeys.all, 'accuracy-history', start, end] as const,
  signalHistory: (id: string) => [...forecastKeys.all, 'signal-history', id] as const,
  dashboardMetrics: () => [...forecastKeys.all, 'dashboard'] as const,
  dataDepth: () => [...forecastKeys.all, 'data-depth'] as const,
  hitRate: (period: TimePeriod) => [...forecastKeys.all, 'hit-rate', period] as const,
  maeError: (period: TimePeriod) => [...forecastKeys.all, 'mae', period] as const,
};

/**
 * Get overall forecast accuracy
 */
export function useAccuracy(period: TimePeriod = '30d') {
  return useQuery({
    queryKey: forecastKeys.accuracy(period),
    queryFn: () => forecastService.getAccuracy(period),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Get accuracy breakdown by category
 */
export function useAccuracyByCategory(period: TimePeriod = '30d') {
  return useQuery({
    queryKey: forecastKeys.accuracyByCategory(period),
    queryFn: () => forecastService.getAccuracyByCategory(period),
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Get accuracy breakdown by platform
 */
export function useAccuracyByPlatform(period: TimePeriod = '30d') {
  return useQuery({
    queryKey: forecastKeys.accuracyByPlatform(period),
    queryFn: () => forecastService.getAccuracyByPlatform(period),
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Get accuracy over time for charting
 */
export function useAccuracyHistory(startDate: string, endDate: string, granularity: 'day' | 'week' | 'month' = 'week') {
  return useQuery({
    queryKey: forecastKeys.accuracyHistory(startDate, endDate),
    queryFn: () => forecastService.getAccuracyHistory(startDate, endDate, granularity),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Get signal historical data
 */
export function useSignalHistory(signalId: string) {
  return useQuery({
    queryKey: forecastKeys.signalHistory(signalId),
    queryFn: () => forecastService.getSignalHistory(signalId),
    enabled: !!signalId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Get dashboard metrics
 */
export function useDashboardMetrics() {
  return useQuery({
    queryKey: forecastKeys.dashboardMetrics(),
    queryFn: () => forecastService.getDashboardMetrics(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get data depth (months of historical data)
 */
export function useDataDepth() {
  return useQuery({
    queryKey: forecastKeys.dataDepth(),
    queryFn: () => forecastService.getDataDepth(),
    staleTime: 60 * 60 * 1000, // 1 hour - doesn't change often
  });
}

/**
 * Get hit rate
 */
export function useHitRate(period: TimePeriod = '30d', tolerance: number = 7) {
  return useQuery({
    queryKey: forecastKeys.hitRate(period),
    queryFn: () => forecastService.getHitRate(period, tolerance),
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Get mean absolute error
 */
export function useMeanAbsoluteError(period: TimePeriod = '30d') {
  return useQuery({
    queryKey: forecastKeys.maeError(period),
    queryFn: () => forecastService.getMeanAbsoluteError(period),
    staleTime: 15 * 60 * 1000,
  });
}
