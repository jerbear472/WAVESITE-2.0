import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { signalService } from '../services';
import type { Signal, SignalFilters, SignalSortOptions } from '../types';

// Query keys
export const signalKeys = {
  all: ['signals'] as const,
  lists: () => [...signalKeys.all, 'list'] as const,
  list: (filters?: SignalFilters, sort?: SignalSortOptions) =>
    [...signalKeys.lists(), { filters, sort }] as const,
  details: () => [...signalKeys.all, 'detail'] as const,
  detail: (id: string) => [...signalKeys.details(), id] as const,
  top: (limit: number) => [...signalKeys.all, 'top', limit] as const,
  today: () => [...signalKeys.all, 'today'] as const,
  upcoming: (maxDays: number) => [...signalKeys.all, 'upcoming', maxDays] as const,
  highConfidence: () => [...signalKeys.all, 'high-confidence'] as const,
  search: (query: string) => [...signalKeys.all, 'search', query] as const,
};

/**
 * Fetch paginated signals with filters
 */
export function useSignals(
  filters?: SignalFilters,
  sort?: SignalSortOptions,
  enabled: boolean = true
) {
  return useInfiniteQuery({
    queryKey: signalKeys.list(filters, sort),
    queryFn: ({ pageParam = 1 }) =>
      signalService.getSignals(filters, sort, pageParam, 20),
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.page + 1 : undefined,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single signal by ID
 */
export function useSignal(signalId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: signalKeys.detail(signalId),
    queryFn: () => signalService.getSignal(signalId),
    enabled: enabled && !!signalId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch top signals by momentum
 */
export function useTopSignals(limit: number = 10) {
  return useQuery({
    queryKey: signalKeys.top(limit),
    queryFn: () => signalService.getTopSignals(limit),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch signals detected today
 */
export function useTodaySignals() {
  return useQuery({
    queryKey: signalKeys.today(),
    queryFn: () => signalService.getTodaySignals(),
    staleTime: 1 * 60 * 1000, // 1 minute - more frequent for today
  });
}

/**
 * Fetch signals forecasted to go mainstream soon
 */
export function useUpcomingMainstream(maxDays: number = 14) {
  return useQuery({
    queryKey: signalKeys.upcoming(maxDays),
    queryFn: () => signalService.getUpcomingMainstream(maxDays),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch high confidence signals
 */
export function useHighConfidenceSignals() {
  return useQuery({
    queryKey: signalKeys.highConfidence(),
    queryFn: () => signalService.getHighConfidenceSignals(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Search signals by query
 */
export function useSignalSearch(query: string) {
  return useQuery({
    queryKey: signalKeys.search(query),
    queryFn: () => signalService.searchSignals(query),
    enabled: query.length >= 2,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Prefetch signal details
 */
export function usePrefetchSignal() {
  const queryClient = useQueryClient();

  return (signalId: string) => {
    queryClient.prefetchQuery({
      queryKey: signalKeys.detail(signalId),
      queryFn: () => signalService.getSignal(signalId),
    });
  };
}
