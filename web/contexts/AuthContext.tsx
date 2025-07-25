'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { clearAllAuthState } from '@/lib/auth-utils';

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  view_mode?: 'user' | 'professional';
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
  subscription_tier?: 'free' | 'starter' | 'pro' | 'enterprise';
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
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profile) {
          setUser(profile);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out, clearing state');
        setUser(null);
        // Clear any cached data
        localStorage.removeItem('access_token');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed');
      } else if (event === 'USER_UPDATED') {
        // Re-fetch user profile on user update
        if (session) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (profile) {
            setUser(profile);
          }
        }
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
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setUser(profile);
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
        throw authError;
      }

      console.log('Login successful, user:', authData.user?.id);

      // Get user profile from database
      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
        }

        if (profile) {
          console.log('User profile found:', profile);
          setUser(profile);
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
        // First check if profile already exists (created by trigger)
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', authData.user.id)
          .single();

        if (!existingProfile) {
          // Profile doesn't exist, create it manually
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: authData.user.id,
              email: userData.email,
              username: userData.username,
              role: 'participant',
              total_earnings: 0,
              pending_earnings: 0,
              trends_spotted: 0,
              accuracy_score: 0,
              validation_score: 0
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't throw here, user is still created
          }
        }
      }

      // If session exists (email confirmation disabled), auto-login
      if (authData.session) {
        await checkUser();
      }
      
      // Return whether email confirmation is needed
      return { needsEmailConfirmation };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear user state immediately
      setUser(null);
      
      // Use the utility to clear all auth state
      await clearAllAuthState();
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Try to force clear even on error
      try {
        setUser(null);
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error('Force clear error:', e);
      }
      return { success: false, error };
    }
  };

  const refreshUser = async () => {
    await checkUser();
  };

  const switchViewMode = async (mode: 'user' | 'professional') => {
    if (!user) return;
    
    try {
      // Update view mode in database
      const { error } = await supabase
        .from('user_profiles')
        .update({ view_mode: mode })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Update local state
      setUser({ ...user, view_mode: mode });
    } catch (error) {
      console.error('Error switching view mode:', error);
      throw error;
    }
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