export type UserRole = 'participant' | 'validator' | 'manager' | 'admin';
export type TrendCategory = 
  | 'tech'
  | 'fashion'
  | 'food'
  | 'health'
  | 'entertainment'
  | 'sports'
  | 'travel'
  | 'business';
export type TrendStatus = 'submitted' | 'validating' | 'approved' | 'rejected' | 'viral';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  demographics?: any;
  interests?: any;
  created_at: string;
  is_active: boolean;
  total_earnings: number;
  pending_earnings: number;
  trends_spotted: number;
  accuracy_score: number;
  validation_score: number;
  avatar_url?: string;
  birthday?: string;
  persona_completed?: boolean;
  onboarding_completed?: boolean;
  streak_days?: number;
  wave_score?: number;
}

export interface TrendSubmission {
  id: string;
  spotter_id: string;
  category: TrendCategory;
  title?: string;
  description: string;
  screenshot_url?: string;
  evidence?: any;
  virality_prediction?: number;
  predicted_peak_date?: string;
  wave_score?: number;
  status: TrendStatus;
  approved_by_id?: string;
  quality_score: number;
  validation_count: number;
  bounty_amount: number;
  bounty_paid: boolean;
  created_at: string;
  validated_at?: string;
  mainstream_at?: string;
  social_url?: string;
  spotter?: UserProfile;
  validations?: TrendValidation[];
}

export interface TrendValidation {
  id: string;
  trend_id: string;
  validator_id: string;
  confirmed: boolean;
  evidence_url?: string;
  notes?: string;
  reward_amount: number;
  created_at: string;
  validator?: UserProfile;
  trend?: TrendSubmission;
}

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_type?: string;
  status?: string;
  stripe_payment_id?: string;
  created_at: string;
  processed_at?: string;
}

export interface Recording {
  id: string;
  user_id: string;
  file_url: string;
  duration?: number;
  platform?: string;
  processed: boolean;
  privacy_filtered: boolean;
  created_at: string;
  session_metadata?: any;
}

export interface PersonaData {
  age_group?: string;
  interests?: string[];
  shopping_habits?: string[];
  media_consumption?: string[];
  lifestyle?: string[];
  values?: string[];
  personality_traits?: string[];
}

export interface DashboardStats {
  trends_spotted: number;
  trends_this_week: number;
  total_validations: number;
  earnings_available: number;
  earnings_total: number;
  wave_score: number;
  rank: string;
  streak_days: number;
  accuracy_rate: number;
  validation_rate: number;
  recent_activity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'trend_spotted' | 'validation_approved' | 'earnings_received' | 'achievement_unlocked';
  title: string;
  subtitle: string;
  value?: string | number;
  timestamp: string;
  icon?: string;
  color?: string;
}