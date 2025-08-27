import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Trend submissions hook with caching
export function useTrendSubmissions(userId: string | undefined) {
  return useQuery({
    queryKey: ['trendSubmissions', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('spotter_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// User profile hook with caching
export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Earnings hook with caching
export function useEarnings(userId: string | undefined) {
  return useQuery({
    queryKey: ['earnings', userId],
    queryFn: async () => {
      if (!userId) return { total: 0, recent: [] };
      
      const { data: totalData } = await supabase
        .from('earnings')
        .select('amount')
        .eq('user_id', userId);
      
      const { data: recentData } = await supabase
        .from('earnings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      const total = totalData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      
      return {
        total,
        recent: recentData || []
      };
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Leaderboard hook with caching
export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_xp')
        .select(`
          user_id,
          total_xp,
          current_level,
          user_profiles!inner(
            username,
            avatar_url
          )
        `)
        .order('total_xp', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Validation trends hook with caching
export function useValidationTrends() {
  return useQuery({
    queryKey: ['validationTrends'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('status', 'submitted')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 1000, // 30 seconds - fresher for validation
  });
}

// Mutation for submitting trends with optimistic updates
export function useSubmitTrend() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (trendData: any) => {
      const response = await fetch('/api/submit-trend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trendData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit trend');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['trendSubmissions'] });
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
    onError: (error) => {
      console.error('Failed to submit trend:', error);
    },
  });
}

// Mutation for validating trends with optimistic updates
export function useValidateTrend() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ trendId, vote, userId }: { trendId: string; vote: string; userId: string }) => {
      const { data, error } = await supabase
        .from('trend_validations')
        .insert({
          trend_id: trendId,
          user_id: userId,
          validation_type: vote,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async ({ trendId, vote }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['validationTrends'] });
      
      // Snapshot previous value
      const previousTrends = queryClient.getQueryData(['validationTrends']);
      
      // Optimistically update
      queryClient.setQueryData(['validationTrends'], (old: any[]) => {
        return old?.filter(trend => trend.id !== trendId) || [];
      });
      
      return { previousTrends };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTrends) {
        queryClient.setQueryData(['validationTrends'], context.previousTrends);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['validationTrends'] });
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });
}

// Prefetch functions for navigation
export function prefetchDashboard(queryClient: any, userId: string) {
  queryClient.prefetchQuery({
    queryKey: ['trendSubmissions', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('spotter_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
  });
  
  queryClient.prefetchQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return data;
    },
  });
}

export function prefetchValidation(queryClient: any) {
  queryClient.prefetchQuery({
    queryKey: ['validationTrends'],
    queryFn: async () => {
      const { data } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('status', 'submitted')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });
}

export function prefetchLeaderboard(queryClient: any) {
  queryClient.prefetchQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_xp')
        .select(`
          user_id,
          total_xp,
          current_level,
          user_profiles!inner(
            username,
            avatar_url
          )
        `)
        .order('total_xp', { ascending: false })
        .limit(100);
      return data || [];
    },
  });
}