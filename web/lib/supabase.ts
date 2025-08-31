import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Types for Supabase tables
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'participant' | 'validator' | 'manager' | 'admin';
  demographics?: any;
  interests?: any;
  created_at: string;
  is_active: boolean;
  total_earnings: number;
  pending_earnings: number;
  trends_spotted: number;
  accuracy_score: number;
  validation_score: number;
}

export interface TrendSubmission {
  id: string;
  spotter_id: string;
  category: string;
  description: string;
  screenshot_url?: string;
  evidence?: any;
  virality_prediction: number;
  predicted_peak_date?: string;
  status: 'submitted' | 'approved' | 'rejected';
  quality_score: number;
  validation_count: number;
  bounty_amount: number;
  bounty_paid: boolean;
  created_at: string;
  validated_at?: string;
  mainstream_at?: string;
}

// Helper functions for auth
export const signUp = async (email: string, password: string, username: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  })
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  return { data, error }
}