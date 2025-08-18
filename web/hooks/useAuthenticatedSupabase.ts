import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

// Custom hook that ensures Supabase client always uses the correct user session
export function useAuthenticatedSupabase() {
  const { user } = useAuth();
  const [supabaseClient] = useState(() => supabase);
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    async function syncAuth() {
      if (!user) {
        setIsReady(false);
        return;
      }

      // Verify the session is valid
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (error || !session) {
        console.error('Session sync error:', error);
        setIsReady(false);
        return;
      }

      // Verify user IDs match
      if (session.user.id !== user.id) {
        console.warn('Session user mismatch detected, refreshing...', {
          authContextUser: user.id,
          sessionUser: session.user.id
        });
        
        // Force refresh the session
        const { data: refreshed, error: refreshError } = await supabaseClient.auth.refreshSession();
        if (refreshError) {
          console.error('Failed to refresh session:', refreshError);
          setIsReady(false);
          return;
        }
      }

      setIsReady(true);
    }

    syncAuth();
  }, [user, supabaseClient]);

  return { supabase: supabaseClient, isReady, userId: user?.id };
}

// Helper function to safely query user's trends
export async function fetchUserTrends(userId: string) {
  const supabaseClient = supabase;
  
  try {
    // First verify we have a valid session
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('No valid session');
    }

    // Ensure we're querying with the session user's ID
    const queryUserId = session.user.id;
    
    if (queryUserId !== userId) {
      console.warn('User ID mismatch, using session user ID');
    }

    // Query trends - first try simple query since we now have vote count columns
    const { data, error } = await supabaseClient
      .from('trend_submissions')
      .select('*')
      .eq('spotter_id', queryUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Query error:', error);
      
      // If we can't query trends, try with a join to get vote counts
      const { data: joinData, error: joinError } = await supabaseClient
        .from('trend_submissions')
        .select(`
          *,
          trend_validations!left (
            vote
          )
        `)
        .eq('spotter_id', queryUserId)
        .order('created_at', { ascending: false });
      
      if (!joinError && joinData) {
        // Process the joined data to calculate vote counts
        const processedData = joinData.map(trend => {
          const validations = trend.trend_validations || [];
          const approve_count = validations.filter((v: any) => v.vote === 'verify' || v.vote === 'approve').length;
          const reject_count = validations.filter((v: any) => v.vote === 'reject').length;
          
          // Determine validation status based on counts
          let validation_status = 'pending';
          if (approve_count >= 3) {
            validation_status = 'approved';
          } else if (reject_count >= 3) {
            validation_status = 'rejected';
          }
          
          return {
            ...trend,
            approve_count,
            reject_count,
            validation_status,
            trend_validations: undefined // Remove raw data
          };
        });
        return { data: processedData, error: null };
      }
      
      throw error;
    }

    // If columns exist, they'll be in the data. If not, ensure defaults
    const processedData = data?.map(trend => ({
      ...trend,
      approve_count: trend.approve_count || 0,
      reject_count: trend.reject_count || 0,
      validation_status: trend.validation_status || 'pending'
    }));

    return { data: processedData, error: null };
    
  } catch (error) {
    console.error('fetchUserTrends error:', error);
    return { data: null, error };
  }
}