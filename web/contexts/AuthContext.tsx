'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { clearAllAuthState } from '@/lib/auth-utils';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  view_mode?: 'user' | 'professional';
  subscription_tier?: 'starter' | 'professional' | 'enterprise' | 'hedge_fund';
  spotter_tier?: 'elite' | 'verified' | 'learning' | 'restricted';
  permissions?: {
    can_manage_users?: boolean;
    can_switch_views?: boolean;
    can_access_all_data?: boolean;
    can_manage_permissions?: boolean;
    [key: string]: boolean | undefined;
  };
  total_earnings: number;
  pending_earnings: number;
  trends_spotted: number;
  accuracy_score: number;
  validation_score: number;
  performance_tier?: string;
  current_streak?: number;
  session_streak?: number;
  // Business user fields
  is_business?: boolean;
  business_id?: string;
  business_name?: string;
  business_role?: 'admin' | 'analyst' | 'viewer';
  // Admin fields
  is_admin?: boolean;
  account_type?: 'user' | 'enterprise';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    username: string;
    birthday?: string;
    demographics?: any;
    interests?: any;
  }) => Promise<{ needsEmailConfirmation: boolean }>;
  logout: () => Promise<{ success: boolean; error?: any }>;
  refreshUser: () => Promise<void>;
  switchViewMode: (mode: 'user' | 'professional') => Promise<void>;
  updateUserEarnings: (amount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      // Skip auto-login if user just registered and needs email confirmation
      if (event === 'SIGNED_IN' && session) {
        // Check if this is a new registration that needs confirmation
        const isNewRegistration = session.user?.email_confirmed_at === null;
        if (isNewRegistration) {
          console.log('New registration detected, skipping auto-login until email confirmed');
          // Sign out to prevent auto-login before email confirmation
          await supabase.auth.signOut();
          return;
        }
        
        // Fetch user profile when signed in (profiles is a VIEW)
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, username, is_admin, subscription_tier, spotter_tier, created_at, updated_at')
          .eq('id', session.user.id)
          .single();
          
        if (profile) {
          // Fetch user stats including earnings - handle missing RPC
          let userStats: any = {};
          try {
            const { data: stats } = await supabase
              .rpc('get_user_dashboard_stats', { p_user_id: session.user.id });
            userStats = stats?.[0] || {};
          } catch (rpcError) {
            console.warn('Dashboard stats RPC not available:', rpcError);
            userStats = {};
          }
          
          // Also fetch pending earnings directly from earnings_ledger
          const { data: pendingData } = await supabase
            .from('earnings_ledger')
            .select('amount')
            .eq('user_id', session.user.id)
            .in('status', ['pending', 'awaiting_validation'])
            .not('amount', 'is', null);
          
          const actualPendingEarnings = pendingData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
          
          // Check if user is admin from database field
          const isAdmin = profile.is_admin === true;
          
          // Get account type
          const { data: accountSettings } = await supabase
            .from('user_account_settings')
            .select('account_type')
            .eq('user_id', session.user.id)
            .single();

          // Get ALL earnings and performance data from user_profiles TABLE
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('performance_tier, current_streak, session_streak, pending_earnings, approved_earnings, total_earned, trends_spotted')
            .eq('id', session.user.id)  // Primary key is 'id' not 'user_id'
            .single();

          // Map profile to user format expected by app
          setUser({
            ...profile,
            role: 'participant',
            // Use userProfile (from table) as primary source
            total_earnings: userProfile?.total_earned || userStats.total_earnings || 0,
            pending_earnings: userProfile?.pending_earnings || actualPendingEarnings || userStats.pending_earnings || 0,
            trends_spotted: userProfile?.trends_spotted || userStats.trends_spotted || 0,
            accuracy_score: userStats.accuracy_score || 0,
            validation_score: userStats.validation_score || 0,
            view_mode: 'user',
            subscription_tier: isAdmin ? 'enterprise' : (profile.subscription_tier || 'starter'),
            spotter_tier: profile.spotter_tier || 'learning',
            performance_tier: userProfile?.performance_tier || 'learning',
            current_streak: userProfile?.current_streak || 0,
            session_streak: userProfile?.session_streak || 0,
            is_admin: isAdmin,
            account_type: isAdmin ? 'enterprise' : (accountSettings?.account_type || 'user'),
            permissions: isAdmin ? {
              can_manage_users: true,
              can_switch_views: true,
              can_access_all_data: true,
              can_manage_permissions: true
            } : {}
          });
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out, clearing state');
        setUser(null);
        localStorage.removeItem('access_token');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Subscribe to earnings_ledger changes for real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const earningsSubscription = supabase
      .channel('earnings-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'earnings_ledger',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Earnings update received:', payload);
          // Refresh user data when earnings change
          refreshUser();
        }
      )
      .subscribe();

    return () => {
      earningsSubscription.unsubscribe();
    };
  }, [user?.id]);

  const checkUser = async () => {
    try {
      console.log('Checking user session...');
      // Check Supabase auth session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setLoading(false);
        return;
      }
      
      console.log('Session found:', !!session);
      
      if (session?.user) {
        console.log('User ID from session:', session.user.id);
        // Get user profile from database (profiles is a VIEW, no earnings there)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, username, is_admin, subscription_tier, spotter_tier, created_at, updated_at')
          .eq('id', session.user.id)
          .single();
          
        // Get ALL earnings and performance data from user_profiles (the actual table)
        console.log('🔍 [AUTH] Fetching user_profiles for user:', session.user.id);
        const { data: userProfile, error: userProfileError } = await supabase
          .from('user_profiles')
          .select('performance_tier, current_streak, session_streak, pending_earnings, approved_earnings, total_earned, trends_spotted')
          .eq('id', session.user.id)  // Primary key is 'id' not 'user_id'
          .single();
        
        console.log('📊 [AUTH] user_profiles data:', userProfile);
        if (userProfileError) {
          console.error('❌ [AUTH] user_profiles error:', userProfileError);
        }

        if (profileError) {
          console.error('Profile fetch error:', profileError);
        }
        
        if (profile) {
          console.log('Profile found:', profile.username);
          // Fetch user stats including earnings - handle missing RPC
          let userStats: any = {};
          try {
            const { data: stats } = await supabase
              .rpc('get_user_dashboard_stats', { p_user_id: session.user.id });
            userStats = stats?.[0] || {};
          } catch (rpcError) {
            console.warn('Dashboard stats RPC not available:', rpcError);
            userStats = {};
          }
          
          // Also fetch pending earnings directly from earnings_ledger
          const { data: pendingData } = await supabase
            .from('earnings_ledger')
            .select('amount')
            .eq('user_id', session.user.id)
            .in('status', ['pending', 'awaiting_validation'])
            .not('amount', 'is', null);
          
          const actualPendingEarnings = pendingData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
          
          // Check if user is admin from database field
          const isAdmin = profile.is_admin === true;
          
          // Get account type
          const { data: accountSettings } = await supabase
            .from('user_account_settings')
            .select('account_type')
            .eq('user_id', session.user.id)
            .single();

          // Also get performance tier and earnings from user_profiles
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('performance_tier, current_streak, session_streak, pending_earnings, approved_earnings, total_earned, trends_spotted')
            .eq('id', session.user.id)  // Primary key is 'id' not 'user_id'
            .single();
            
          console.log('💰 [AUTH] Building user data with earnings:', {
            from_userProfile: userProfile?.pending_earnings,
            from_ledger: actualPendingEarnings,
            from_stats: userStats.pending_earnings
          });
          
          // Map profile to user format (combine profiles VIEW with user_profiles TABLE)
          const userData = {
            ...profile,
            role: 'participant',
            // Use userProfile data (from table) as primary source for earnings
            total_earnings: userProfile?.total_earned || userStats.total_earnings || 0,
            pending_earnings: userProfile?.pending_earnings || actualPendingEarnings || userStats.pending_earnings || 0,
            trends_spotted: userProfile?.trends_spotted || userStats.trends_spotted || 0,
            accuracy_score: userStats.accuracy_score || 0,
            validation_score: userStats.validation_score || 0,
            performance_tier: userProfile?.performance_tier || 'learning',
            current_streak: userProfile?.current_streak || 0,
            session_streak: userProfile?.session_streak || 0,
            view_mode: 'user' as const,
            subscription_tier: isAdmin ? 'enterprise' as const : (profile.subscription_tier || 'starter') as any,
            spotter_tier: profile.spotter_tier || 'learning',
            is_admin: isAdmin,
            account_type: isAdmin ? 'enterprise' as const : (accountSettings?.account_type || 'user') as any,
            permissions: isAdmin ? {
              can_manage_users: true,
              can_switch_views: true,
              can_access_all_data: true,
              can_manage_permissions: true
            } : {}
          };
          
          console.log('Setting user data:', userData.username);
          setUser(userData);
        } else {
          console.log('No profile found for user');
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email);
      
      // Use Supabase auth directly
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        
        // Provide more specific error messages
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        } else if (authError.message.includes('Email not confirmed') || authError.message.includes('email_not_confirmed')) {
          throw new Error('Please confirm your email address before logging in. Check your inbox for the confirmation link.');
        } else if (authError.message.includes('Too many requests')) {
          throw new Error('Too many login attempts. Please wait a few minutes and try again.');
        }
        
        throw authError;
      }
      
      // Additional check: if we get a user but no session, email might not be confirmed
      if (authData.user && !authData.session) {
        throw new Error('Please confirm your email address before logging in. Check your inbox for the confirmation link.');
      }

      console.log('Login successful, user:', authData.user?.id);

      // Get user profile from database
      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, username, is_admin, total_earnings, pending_earnings, subscription_tier, spotter_tier, created_at, updated_at')
          .eq('id', authData.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
        }

        if (profile) {
          console.log('User profile found:', profile);
          
          // Check if user is admin from database field
          const isAdmin = profile.is_admin === true;
          
          // Get account type
          const { data: accountSettings } = await supabase
            .from('user_account_settings')
            .select('account_type')
            .eq('user_id', authData.user.id)
            .single();

          // Map profile to user format
          setUser({
            ...profile,
            role: 'participant',
            total_earnings: profile.total_earnings || 0,
            pending_earnings: profile.pending_earnings || 0,
            trends_spotted: 0,
            accuracy_score: 0,
            validation_score: 0,
            view_mode: 'user',
            subscription_tier: isAdmin ? 'enterprise' : (profile.subscription_tier || 'starter'),
            spotter_tier: profile.spotter_tier || 'learning',
            is_admin: isAdmin,
            account_type: isAdmin ? 'enterprise' : (accountSettings?.account_type || 'user'),
            permissions: isAdmin ? {
              can_manage_users: true,
              can_switch_views: true,
              can_access_all_data: true,
              can_manage_permissions: true
            } : {}
          });
        }
      }
      
      // Return success - the caller will handle redirect
      return;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    username: string;
    birthday?: string;
    demographics?: any;
    interests?: any;
  }) => {
    try {
      console.log('Starting registration for:', userData.email);
      
      // Use Supabase auth directly
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            username: userData.username,
            birthday: userData.birthday,
          }
        }
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        throw authError;
      }
      
      console.log('Auth signup successful:', authData);

      // Check if email confirmation is required
      const needsEmailConfirmation: boolean = !!(authData.user && !authData.session) || 
                                               !!(authData.user && !authData.user.email_confirmed_at);

      // If a session was created but email not confirmed, sign out to show confirmation message
      if (authData.session && !authData.user?.email_confirmed_at) {
        await supabase.auth.signOut();
      }

      // Create user profile in database (if not created by trigger)
      if (authData.user) {
        // Wait a moment for trigger to execute
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // First check if profile already exists
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (!existingProfile) {
          // Use the helper function to complete registration
          const { data: registrationResult, error: registrationError } = await supabase
            .rpc('complete_user_registration', {
              p_user_id: authData.user.id,
              p_email: userData.email,
              p_username: userData.username,
              p_birthday: userData.birthday || null
            });
          
          if (registrationError) {
            console.error('Registration helper error:', registrationError);
            
            // Last resort: try direct insert into user_profiles
            const { error: directError } = await supabase
              .from('user_profiles')
              .insert({
                id: authData.user.id,
                email: userData.email,
                username: userData.username,
                birthday: userData.birthday || null,
                age_verified: !!userData.birthday
              });
              
            if (directError) {
              console.error('Direct profile insert error:', directError);
              // Still don't throw - user is created in auth
            }
          } else {
            console.log('Registration completed:', registrationResult);
          }
        }

        // Note: user_settings table doesn't exist in our schema
        // Account settings are created by the trigger or helper function
      }

      // If session exists (email confirmation disabled), auto-login
      if (authData.session) {
        await checkUser();
      }
      
      return { needsEmailConfirmation };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      await clearAllAuthState();
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error };
    }
  };

  const refreshUser = async () => {
    await checkUser();
  };

  const switchViewMode = async (mode: 'user' | 'professional') => {
    if (!user) return;
    
    try {
      setUser({ ...user, view_mode: mode });
    } catch (error) {
      console.error('Error switching view mode:', error);
      throw error;
    }
  };

  const updateUserEarnings = async (amount: number) => {
    if (!user) return;
    
    // Update local state immediately for UI feedback
    const newPendingEarnings = (user.pending_earnings || 0) + amount;
    const newTrendsSpotted = (user.trends_spotted || 0) + 1;
    
    setUser({
      ...user,
      pending_earnings: newPendingEarnings,
      trends_spotted: newTrendsSpotted
    });

    // Refresh full user data to get accurate earnings from earnings_ledger
    // Use a slightly longer delay to ensure database has updated
    setTimeout(() => {
      refreshUser();
    }, 1000);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        switchViewMode,
        updateUserEarnings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}