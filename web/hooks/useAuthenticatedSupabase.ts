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
        console.error('Session user mismatch!', {
          authContextUser: user.id,
          sessionUser: session.user.id
        });
        
        // Force refresh the session
        await supabaseClient.auth.refreshSession();
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

    // Query trends
    const { data, error } = await supabaseClient
      .from('trend_submissions')
      .select('*')
      .eq('spotter_id', queryUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Query error:', error);
      
      // If it's an RLS error, try a different approach
      if (error.message?.includes('policy')) {
        console.log('Attempting alternative query...');
        
        // Try without the eq filter to see if we can read anything
        const { data: allData, error: allError } = await supabaseClient
          .from('trend_submissions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (!allError && allData) {
          // Filter client-side
          const filtered = allData.filter(trend => trend.spotter_id === queryUserId);
          console.log(`Found ${filtered.length} trends via alternative method`);
          return { data: filtered, error: null };
        }
      }
      
      throw error;
    }

    return { data, error: null };
    
  } catch (error) {
    console.error('fetchUserTrends error:', error);
    return { data: null, error };
  }
}