import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface UserStats {
  trends_submitted: number;
  trends_approved: number;
  trends_rejected: number;
  trends_pending: number;
  validations_completed: number;
  accuracy_score: number;
  validation_score: number;
  approval_rate: number;
  total_earned: number;
  pending_earnings: number;
  approved_earnings: number;
}

export function useUserStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetchUserStats();
  }, [user?.id]);

  const fetchUserStats = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      console.log('[STATS] Fetching stats for user:', user.id);

      // Method 1: Try to call the RPC function
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_user_stats', { p_user_id: user.id })
        .single() as { data: UserStats | null, error: any };

      if (!rpcError && rpcData) {
        console.log('[STATS] Got stats from RPC:', rpcData);
        // Ensure the RPC data matches our UserStats interface
        const stats: UserStats = {
          trends_submitted: rpcData.trends_submitted || 0,
          trends_approved: rpcData.trends_approved || 0,
          trends_rejected: rpcData.trends_rejected || 0,
          trends_pending: rpcData.trends_pending || 0,
          validations_completed: rpcData.validations_completed || 0,
          accuracy_score: rpcData.accuracy_score || 0,
          validation_score: rpcData.validation_score || 0,
          approval_rate: rpcData.approval_rate || 0,
          total_earned: rpcData.total_earned || 0,
          pending_earnings: rpcData.pending_earnings || 0,
          approved_earnings: rpcData.approved_earnings || 0
        };
        setStats(stats);
        return;
      }

      // Method 2: If RPC fails, fetch directly from tables
      console.log('[STATS] RPC failed, fetching directly from tables');
      
      // Get trend submission stats
      const { data: trendsData, error: trendsError } = await supabase
        .from('trend_submissions')
        .select('status')
        .eq('spotter_id', user.id);

      const trends_submitted = trendsData?.length || 0;
      const trends_approved = trendsData?.filter(t => t.status === 'approved').length || 0;
      const trends_rejected = trendsData?.filter(t => t.status === 'rejected').length || 0;
      const trends_pending = trendsData?.filter(t => ['pending', 'under_review'].includes(t.status)).length || 0;

      // Get validation stats
      const { data: validationsData } = await supabase
        .from('trend_validations')
        .select('vote, trend_id')
        .eq('validator_id', user.id);

      const validations_completed = validationsData?.length || 0;

      // Calculate validation accuracy
      let accuracy_score = 0;
      if (validationsData && validationsData.length > 0) {
        // Get the final status of trends this user validated
        const trendIds = [...new Set(validationsData.map(v => v.trend_id))];
        
        const { data: trendStatuses } = await supabase
          .from('trend_submissions')
          .select('id, status')
          .in('id', trendIds)
          .in('status', ['approved', 'rejected']);

        if (trendStatuses) {
          const statusMap = Object.fromEntries(trendStatuses.map(t => [t.id, t.status]));
          const correctValidations = validationsData.filter(v => {
            const trendStatus = statusMap[v.trend_id];
            return (v.vote === 'approve' && trendStatus === 'approved') ||
                   (v.vote === 'reject' && trendStatus === 'rejected');
          }).length;
          
          accuracy_score = trendStatuses.length > 0 
            ? Math.round((correctValidations / trendStatuses.length) * 100)
            : 0;
        }
      }

      // Get earnings data
      const { data: earningsData } = await supabase
        .from('earnings_ledger')
        .select('amount, status')
        .eq('user_id', user.id);

      const total_earned = earningsData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const pending_earnings = earningsData?.filter(e => e.status === 'pending')
        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const approved_earnings = earningsData?.filter(e => e.status === 'approved')
        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      // Calculate approval rate: approved / (approved + rejected)
      const decided_trends = trends_approved + trends_rejected;
      const approval_rate = decided_trends > 0 
        ? Math.round((trends_approved / decided_trends) * 100)
        : 0;

      const calculatedStats: UserStats = {
        trends_submitted,
        trends_approved,
        trends_rejected,
        trends_pending,
        validations_completed,
        accuracy_score,
        validation_score: validations_completed, // Simple count for now
        approval_rate,
        total_earned,
        pending_earnings,
        approved_earnings
      };

      console.log('[STATS] Calculated stats:', calculatedStats);
      setStats(calculatedStats);

    } catch (error) {
      console.error('[STATS] Error fetching user stats:', error);
      setError('Failed to load user statistics');
      
      // Set default values
      setStats({
        trends_submitted: 0,
        trends_approved: 0,
        trends_rejected: 0,
        trends_pending: 0,
        validations_completed: 0,
        accuracy_score: 0,
        validation_score: 0,
        approval_rate: 0,
        total_earned: 0,
        pending_earnings: 0,
        approved_earnings: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    await fetchUserStats();
  };

  return {
    stats,
    loading,
    error,
    refreshStats
  };
}