import { supabase } from '../config/supabase';
import {
  UserProfile,
  TrendSubmission,
  TrendValidation,
  Payment,
  DashboardStats,
  ActivityItem,
  TrendCategory,
  PersonaData,
} from '../types/database';
import { Alert } from 'react-native';

class SupabaseService {
  // Authentication
  async signUp(email: string, password: string, username: string, birthday?: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            birthday,
          },
        },
      });

      if (error) throw error;

      // Create or update profile with additional data
      if (data.user) {
        // First try to create the profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username,
            birthday,
            onboarding_completed: false,
            persona_completed: false,
            created_at: new Date().toISOString(),
          });
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('SignUp error:', error);
      return { data: null, error };
    }
  }

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('SignIn error:', error);
      return { data: null, error };
    }
  }

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error('SignOut error:', error);
      return { error };
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      if (user) {
        const profile = await this.getUserProfile(user.id);
        return { user: { ...user, ...profile }, error: null };
      }
      
      return { user: null, error: null };
    } catch (error: any) {
      console.error('GetCurrentUser error:', error);
      return { user: null, error };
    }
  }

  // User Profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows

      if (error) throw error;
      
      // If no profile exists, create one
      if (!data) {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            onboarding_completed: false,
            persona_completed: false,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating profile:', createError);
          return null;
        }
        
        return newProfile;
      }
      
      return data;
    } catch (error) {
      console.error('GetUserProfile error:', error);
      return null;
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>) {
    try {
      // First check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      let data, error;
      
      if (existingProfile) {
        // Update existing profile
        ({ data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)
          .select()
          .single());
      } else {
        // Create new profile with updates
        ({ data, error } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            ...updates,
            created_at: new Date().toISOString(),
          })
          .select()
          .single());
      }

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('UpdateUserProfile error:', error);
      return { data: null, error };
    }
  }

  async savePersona(userId: string, personaData: PersonaData) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          demographics: personaData,
          interests: personaData.interests,
          persona_completed: true,
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('SavePersona error:', error);
      return { data: null, error };
    }
  }

  // Dashboard Stats
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    try {
      // Get user profile
      const profile = await this.getUserProfile(userId);
      
      if (!profile) {
        throw new Error('User profile not found');
      }

      // Get trends this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: weeklyTrends } = await supabase
        .from('trend_submissions')
        .select('id')
        .eq('spotter_id', userId)
        .gte('created_at', weekAgo.toISOString());

      // Get recent activity
      const activity = await this.getRecentActivity(userId);

      // Calculate rank based on wave score
      const rank = this.calculateRank(profile.wave_score || 0);

      return {
        trends_spotted: profile.trends_spotted || 0,
        trends_this_week: weeklyTrends?.length || 0,
        total_validations: profile.validation_score || 0,
        earnings_available: profile.pending_earnings || 0,
        earnings_total: profile.total_earnings || 0,
        wave_score: profile.wave_score || 0,
        rank,
        streak_days: profile.streak_days || 0,
        accuracy_rate: profile.accuracy_score || 0,
        validation_rate: profile.validation_score || 0,
        recent_activity: activity,
      };
    } catch (error) {
      console.error('GetDashboardStats error:', error);
      return {
        trends_spotted: 0,
        trends_this_week: 0,
        total_validations: 0,
        earnings_available: 0,
        earnings_total: 0,
        wave_score: 0,
        rank: 'Newcomer',
        streak_days: 0,
        accuracy_rate: 0,
        validation_rate: 0,
        recent_activity: [],
      };
    }
  }

  private calculateRank(waveScore: number): string {
    if (waveScore >= 1000) return 'Trend Master';
    if (waveScore >= 750) return 'Wave Rider';
    if (waveScore >= 500) return 'Trend Hunter';
    if (waveScore >= 250) return 'Rising Star';
    if (waveScore >= 100) return 'Scout';
    return 'Newcomer';
  }

  async getRecentActivity(userId: string, limit = 5): Promise<ActivityItem[]> {
    try {
      const activities: ActivityItem[] = [];

      // Get recent trend submissions
      const { data: trends } = await supabase
        .from('trend_submissions')
        .select('id, title, description, created_at, status')
        .eq('spotter_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (trends) {
        trends.forEach(trend => {
          activities.push({
            id: trend.id,
            type: 'trend_spotted',
            title: 'New trend spotted!',
            subtitle: trend.title || trend.description.substring(0, 50),
            value: '+10',
            timestamp: trend.created_at,
            icon: 'trending-up',
            color: '#0080ff',
          });
        });
      }

      // Get recent validations
      const { data: validations } = await supabase
        .from('trend_validations')
        .select(`
          id,
          created_at,
          confirmed,
          reward_amount,
          trend:trend_submissions(title, description)
        `)
        .eq('validator_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (validations) {
        validations.forEach(validation => {
          if (validation.confirmed) {
            activities.push({
              id: validation.id,
              type: 'validation_approved',
              title: 'Validation approved',
              subtitle: (validation as any).trend?.title || 'Trend validated',
              value: `+${validation.reward_amount}`,
              timestamp: validation.created_at,
              icon: 'check-circle',
              color: '#00d4ff',
            });
          }
        });
      }

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('GetRecentActivity error:', error);
      return [];
    }
  }

  // Trend Submission
  async submitTrend(
    userId: string,
    trendData: {
      title: string;
      description: string;
      category: TrendCategory;
      imageUri?: string;
      socialUrl?: string;
    }
  ) {
    try {
      let screenshot_url = null;

      // Upload image if provided
      if (trendData.imageUri) {
        screenshot_url = await this.uploadImage(trendData.imageUri, userId);
      }

      const { data, error } = await supabase
        .from('trend_submissions')
        .insert({
          spotter_id: userId,
          category: trendData.category,
          description: trendData.description,
          screenshot_url,
          social_url: trendData.socialUrl,
          status: 'submitted',
          wave_score: 10, // Initial score for submission
        })
        .select()
        .single();

      if (error) throw error;

      // Update user stats
      await this.incrementUserStats(userId, 'trends_spotted', 1);
      await this.incrementUserStats(userId, 'wave_score', 10);

      return { data, error: null };
    } catch (error: any) {
      console.error('SubmitTrend error:', error);
      return { data: null, error };
    }
  }

  async uploadImage(imageUri: string, userId: string): Promise<string | null> {
    try {
      const fileName = `${userId}_${Date.now()}.jpg`;
      const filePath = `trend_images/${fileName}`;

      // Read the image file
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('trend_images')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('trend_images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('UploadImage error:', error);
      return null;
    }
  }

  // Get trends for validation
  async getTrendsForValidation(userId: string, limit = 10): Promise<TrendSubmission[]> {
    try {
      // Get trends not submitted by the user and not yet validated by them
      const { data, error } = await supabase
        .from('trend_submissions')
        .select(`
          *,
          spotter:profiles!spotter_id(username, avatar_url),
          validations:trend_validations(validator_id)
        `)
        .neq('spotter_id', userId)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Filter out trends already validated by this user
      const filteredTrends = data?.filter(trend => {
        const validatedByUser = trend.validations?.some(
          (v: any) => v.validator_id === userId
        );
        return !validatedByUser;
      }) || [];

      return filteredTrends;
    } catch (error) {
      console.error('GetTrendsForValidation error:', error);
      return [];
    }
  }

  // Submit validation
  async submitValidation(
    userId: string,
    trendId: string,
    confirmed: boolean,
    notes?: string
  ) {
    try {
      const rewardAmount = 0.02; // $0.02 per validation (sustainable model)

      const { data, error } = await supabase
        .from('trend_validations')
        .insert({
          trend_id: trendId,
          validator_id: userId,
          confirmed,
          notes,
          reward_amount: rewardAmount,
        })
        .select()
        .single();

      if (error) throw error;

      // Update user earnings and stats
      await this.incrementUserStats(userId, 'pending_earnings', rewardAmount);
      await this.incrementUserStats(userId, 'wave_score', 1); // Small wave score increase per validation

      // Update trend validation count
      await supabase.rpc('increment', {
        table_name: 'trend_submissions',
        row_id: trendId,
        column_name: 'validation_count',
        increment_value: 1,
      });

      return { data, error: null };
    } catch (error: any) {
      console.error('SubmitValidation error:', error);
      return { data: null, error };
    }
  }

  // Helper function to increment user stats
  private async incrementUserStats(
    userId: string,
    field: keyof UserProfile,
    amount: number
  ) {
    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select(field as string)
        .eq('id', userId)
        .single();

      if (currentProfile) {
        const currentValue = (currentProfile[field as string] as number) || 0;
        await supabase
          .from('profiles')
          .update({ [field]: currentValue + amount })
          .eq('id', userId);
      }
    } catch (error) {
      console.error('IncrementUserStats error:', error);
    }
  }

  // Get user's trends
  async getUserTrends(userId: string): Promise<TrendSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('trend_submissions')
        .select(`
          *,
          validations:trend_validations(
            confirmed,
            created_at,
            validator:profiles!validator_id(username, avatar_url)
          )
        `)
        .eq('spotter_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('GetUserTrends error:', error);
      return [];
    }
  }

  // Get timeline trends
  async getTimelineTrends(limit = 20): Promise<TrendSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('trend_submissions')
        .select(`
          *,
          spotter:profiles!spotter_id(username, avatar_url),
          validations:trend_validations(confirmed)
        `)
        .in('status', ['approved', 'viral'])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('GetTimelineTrends error:', error);
      return [];
    }
  }

  // Real-time subscriptions
  subscribeToTrends(callback: (payload: any) => void) {
    return supabase
      .channel('public:trend_submissions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trend_submissions' },
        callback
      )
      .subscribe();
  }

  subscribeToUserStats(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`public:profiles:id=eq.${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  }

  // Earnings
  async getEarningsHistory(userId: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('GetEarningsHistory error:', error);
      return [];
    }
  }

  async requestPayout(userId: string, amount: number, paymentMethod: string) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          amount,
          payment_type: paymentMethod,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Update user's pending earnings
      await this.incrementUserStats(userId, 'pending_earnings', -amount);

      return { data, error: null };
    } catch (error: any) {
      console.error('RequestPayout error:', error);
      return { data: null, error };
    }
  }
}

export default new SupabaseService();