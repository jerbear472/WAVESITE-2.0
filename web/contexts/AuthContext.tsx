'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

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
  is_business?: boolean;
  business_id?: string;
  business_name?: string;
  business_role?: 'admin' | 'analyst' | 'viewer';
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
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  // Fetch user profile data
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      console.log('[AUTH] Fetching profile for user:', userId);
      
      // Get user profile from profiles view
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (profileError) {
        console.error('[AUTH] Profile fetch error:', profileError);
        return null;
      }

      // Get earnings data from user_profiles table
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Get pending earnings from earnings_ledger
      const { data: pendingData } = await supabase
        .from('earnings_ledger')
        .select('amount')
        .eq('user_id', userId)
        .in('status', ['pending', 'awaiting_validation']);
      
      const pendingEarnings = pendingData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

      // Combine all data
      const userData: User = {
        id: profile.id,
        email: profile.email,
        username: profile.username || profile.email.split('@')[0],
        role: 'participant',
        total_earnings: userProfile?.total_earned || 0,
        pending_earnings: userProfile?.pending_earnings || pendingEarnings || 0,
        trends_spotted: userProfile?.trends_spotted || 0,
        accuracy_score: 0,
        validation_score: 0,
        performance_tier: userProfile?.performance_tier || 'learning',
        current_streak: userProfile?.current_streak || 0,
        session_streak: userProfile?.session_streak || 0,
        view_mode: 'user',
        subscription_tier: profile.subscription_tier || 'starter',
        spotter_tier: profile.spotter_tier || 'learning',
        is_admin: profile.is_admin === true,
        account_type: profile.is_admin ? 'enterprise' : 'user',
        permissions: profile.is_admin ? {
          can_manage_users: true,
          can_switch_views: true,
          can_access_all_data: true,
          can_manage_permissions: true
        } : {}
      };

      console.log('[AUTH] User data compiled:', userData.username);
      return userData;
    } catch (error) {
      console.error('[AUTH] Error fetching user profile:', error);
      return null;
    }
  }, []);

  // Initialize auth state
  const initializeAuth = useCallback(async () => {
    try {
      console.log('[AUTH] Initializing auth state...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[AUTH] Session error:', error);
        setLoading(false);
        setIsInitialized(true);
        return;
      }

      if (session?.user) {
        const userData = await fetchUserProfile(session.user.id);
        if (userData) {
          setUser(userData);
        }
      }
      
      setLoading(false);
      setIsInitialized(true);
    } catch (error) {
      console.error('[AUTH] Initialization error:', error);
      setLoading(false);
      setIsInitialized(true);
    }
  }, [fetchUserProfile]);

  // Initialize on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH] Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session) {
        // Skip if this is a new registration needing email confirmation
        if (session.user?.email_confirmed_at === null) {
          console.log('[AUTH] New registration, awaiting email confirmation');
          await supabase.auth.signOut();
          return;
        }
        
        const userData = await fetchUserProfile(session.user.id);
        if (userData) {
          setUser(userData);
          // No need to refresh - React will re-render automatically
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.clear();
        // Navigate to login without refresh
        router.push('/login');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[AUTH] Token refreshed');
        // Refresh user data when token is refreshed
        if (session?.user) {
          const userData = await fetchUserProfile(session.user.id);
          if (userData) {
            setUser(userData);
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, router]);

  const login = async (email: string, password: string) => {
    try {
      console.log('[AUTH] Attempting login for:', email);
      setLoading(true);
      
      // Clear any existing session first
      await supabase.auth.signOut();
      
      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        console.error('[AUTH] Login error:', authError);
        
        // Provide specific error messages
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        } else if (authError.message.includes('Email not confirmed')) {
          throw new Error('Please confirm your email address before logging in. Check your inbox for the confirmation link.');
        } else if (authError.message.includes('Too many requests')) {
          throw new Error('Too many login attempts. Please wait a few minutes and try again.');
        } else if (authError.message.includes('User not found')) {
          throw new Error('No account found with this email. Please check your email or sign up.');
        }
        
        throw new Error(authError.message || 'Login failed. Please try again.');
      }

      if (!authData.session) {
        throw new Error('Login failed - no session created');
      }

      // Fetch user profile
      const userData = await fetchUserProfile(authData.user.id);
      if (!userData) {
        throw new Error('Failed to load user profile');
      }

      setUser(userData);
      console.log('[AUTH] Login successful');
      
      // Navigate to dashboard
      router.push('/dashboard');
      
    } catch (error) {
      console.error('[AUTH] Login error:', error);
      throw error;
    } finally {
      setLoading(false);
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
      console.log('[AUTH] Registering new user:', userData.email);
      
      // Sign up with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
        options: {
          data: {
            username: userData.username,
            birthday: userData.birthday,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (authError) {
        console.error('[AUTH] Registration error:', authError);
        throw authError;
      }

      // Check if email confirmation is required
      const needsEmailConfirmation = authData.user?.identities?.length === 0;
      
      return { needsEmailConfirmation };
    } catch (error) {
      console.error('[AUTH] Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('[AUTH] Logging out...');
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[AUTH] Logout error:', error);
        return { success: false, error };
      }
      
      // Clear all state
      setUser(null);
      localStorage.clear();
      sessionStorage.clear();
      
      // Navigate to login
      router.push('/login');
      
      return { success: true };
    } catch (error) {
      console.error('[AUTH] Logout error:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!user?.id) return;
    
    try {
      const userData = await fetchUserProfile(user.id);
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('[AUTH] Error refreshing user:', error);
    }
  };

  const switchViewMode = async (mode: 'user' | 'professional') => {
    if (user) {
      setUser({ ...user, view_mode: mode });
    }
  };

  const updateUserEarnings = async (amount: number) => {
    if (user) {
      setUser({
        ...user,
        pending_earnings: user.pending_earnings + amount
      });
      // Refresh from database
      await refreshUser();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      switchViewMode,
      updateUserEarnings,
    }}>
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