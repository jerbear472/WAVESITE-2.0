import { supabase } from '../config/supabase';
import type { User, UserPreferences } from '../types';

class AuthService {
  /**
   * Sign up a new user
   */
  async signUp(
    email: string,
    password: string,
    organizationName?: string
  ): Promise<{ user: User | null; error: string | null }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          organization_name: organizationName,
        },
      },
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (data.user) {
      // Fetch the full profile
      const profile = await this.getProfile(data.user.id);
      return { user: profile, error: null };
    }

    return { user: null, error: 'Signup failed' };
  }

  /**
   * Sign in an existing user
   */
  async signIn(
    email: string,
    password: string
  ): Promise<{ user: User | null; error: string | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (data.user) {
      const profile = await this.getProfile(data.user.id);
      return { user: profile, error: null };
    }

    return { user: null, error: 'Sign in failed' };
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('signOut error:', error);
      throw error;
    }
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return this.getProfile(user.id);
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('getProfile error:', error);
      return null;
    }

    return data;
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<Pick<User, 'organization_name'>>): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('updateProfile error:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // Return defaults if no preferences exist
      if (error.code === 'PGRST116') {
        return {
          user_id: user.id,
          default_platforms: ['tiktok', 'instagram', 'youtube', 'twitter'],
          default_categories: [],
          notification_settings: {
            push_enabled: true,
            email_enabled: false,
            digest_frequency: 'none',
          },
          display_settings: {
            compact_view: false,
            show_forecasts: true,
            default_time_period: '30d',
          },
        };
      }
      console.error('getPreferences error:', error);
      return null;
    }

    return data;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        ...updates,
      })
      .select()
      .single();

    if (error) {
      console.error('updatePreferences error:', error);
      throw error;
    }

    return data;
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'wavesight://reset-password',
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(
    callback: (event: string, user: User | null) => void
  ): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        let user: User | null = null;
        if (session?.user) {
          user = await this.getProfile(session.user.id);
        }
        callback(event, user);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Check if user has API access
   */
  async hasApiAccess(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.api_access || false;
  }

  /**
   * Get user tier
   */
  async getUserTier(): Promise<'starter' | 'professional' | 'enterprise' | null> {
    const user = await this.getCurrentUser();
    return user?.tier || null;
  }
}

export default new AuthService();
