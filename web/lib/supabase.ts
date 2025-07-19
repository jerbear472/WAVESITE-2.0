import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
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
  status: 'submitted' | 'validating' | 'approved' | 'rejected' | 'viral';
  quality_score: number;
  validation_count: number;
  bounty_amount: number;
  bounty_paid: boolean;
  created_at: string;
  validated_at?: string;
  mainstream_at?: string;
}