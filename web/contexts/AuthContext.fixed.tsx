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
  // Business user fields
  is_business?: boolean;
  business_id?: string;
  business_name?: string;
  business_role?: 'admin' | 'analyst' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    username: string;
    demographics?: any;
    interests?: any;
  }) => Promise<{ needsEmailConfirmation: boolean }>;
  logout: () => Promise<{ success: boolean; error?: any }>;
  refreshUser: () => Promise<void>;
  switchViewMode: (mode: 'user' | 'professional') => Promise<void>;
  updateUserEarnings: (amount: number) => void;
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
      
      if (event === 'SIGNED_IN' && session) {
        // Fetch user profile when signed in
        const { data: profile } = await supabase
          .from('profiles')  // Changed from user_profiles
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profile) {
          // Map profile to user format expected by app
          setUser({
            ...profile,
            role: 'participant',
            total_earnings: 0,
            pending_earnings: 0,
            trends_spotted: 0,
            accuracy_score: 0,
            validation_score: 0,
            view_mode: 'user'
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

  const checkUser = async () => {
    try {
      // Check Supabase auth session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Get user profile from database
        const { data: profile } = await supabase
          .from('profiles')  // Changed from user_profiles
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          // Map profile to user format
          setUser({
            ...profile,
            role: 'participant',
            total_earnings: 0,
            pending_earnings: 0,
            trends_spotted: 0,
            accuracy_score: 0,
            validation_score: 0,
            view_mode: 'user'
          });
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
        } else if (authError.message.includes('Email not confirmed')) {
          throw new Error('Please confirm your email address before logging in.');
        } else if (authError.message.includes('Too many requests')) {
          throw new Error('Too many login attempts. Please wait a few minutes and try again.');
        }
        
        throw authError;
      }

      console.log('Login successful, user:', authData.user?.id);

      // Get user profile from database
      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')  // Changed from user_profiles
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
        }

        if (profile) {
          console.log('User profile found:', profile);
          // Map profile to user format
          setUser({
            ...profile,
            role: 'participant',
            total_earnings: 0,
            pending_earnings: 0,
            trends_spotted: 0,
            accuracy_score: 0,
            validation_score: 0,
            view_mode: 'user'
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    username: string;
    demographics?: any;
    interests?: any;
  }) => {
    try {
      // Use Supabase auth directly
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            username: userData.username,
          }
        }
      });

      if (authError) throw authError;

      // Check if email confirmation is required
      const needsEmailConfirmation = !!(authData.user && !authData.session);

      // Create user profile in database (if not created by trigger)
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')  // Changed from user_profiles
          .insert({
            id: authData.user.id,
            email: userData.email,
            username: userData.username,
            subscription_tier: 'starter'
          })
          .select()
          .single();

        if (profileError && !profileError.message.includes('duplicate')) {
          console.error('Profile creation error:', profileError);
        }
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

  const updateUserEarnings = (amount: number) => {
    if (!user) return;
    
    setUser({
      ...user,
      total_earnings: user.total_earnings + amount,
      trends_spotted: user.trends_spotted + 1
    });
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