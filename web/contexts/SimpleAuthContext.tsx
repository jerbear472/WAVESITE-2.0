'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  view_mode?: 'user' | 'professional';
  subscription_tier?: 'starter' | 'professional' | 'enterprise' | 'hedge_fund';
  spotter_tier?: 'elite' | 'verified' | 'lxp' | 'restricted';
  permissions?: {
    can_manage_users?: boolean;
    can_switch_views?: boolean;
    can_access_all_data?: boolean;
    can_manage_permissions?: boolean;
    [key: string]: boolean | undefined;
  };
  total_xp: number;
  pending_xp: number;
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
  error: string | null;
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
  updateUserXP: (amount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchUserData = async (userId: string) => {
    try {
      // Get basic profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Get XP data
      const { data: xpData } = await supabase
        .from('user_xp')
        .select('total_xp, current_level')
        .eq('user_id', userId)
        .single();

      // Get user stats
      const { data: stats } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const userData: User = {
        id: userId,
        email: profile?.email || '',
        username: profile?.username || profile?.email?.split('@')[0] || 'user',
        role: profile?.role || 'user',
        view_mode: profile?.view_mode || 'user',
        subscription_tier: profile?.subscription_tier,
        spotter_tier: profile?.spotter_tier,
        permissions: profile?.permissions || {},
        total_xp: xpData?.total_xp || 0,
        pending_xp: 0,
        trends_spotted: stats?.trends_spotted || 0,
        accuracy_score: stats?.accuracy_score || 0,
        validation_score: stats?.validation_score || 0,
        performance_tier: stats?.performance_tier,
        current_streak: stats?.current_streak || 0,
        session_streak: stats?.session_streak || 0,
        is_business: profile?.is_business,
        business_id: profile?.business_id,
        business_name: profile?.business_name,
        business_role: profile?.business_role,
        is_admin: profile?.is_admin || false,
        account_type: profile?.account_type || 'user',
      };

      setUser(userData);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching user data:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        }
      } catch (err: any) {
        console.error('Error initializing auth:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchUserData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    
    if (error) {
      setError(error.message);
      throw error;
    }
    
    if (data.user) {
      await fetchUserData(data.user.id);
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
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
        options: {
          data: {
            username: userData.username.trim(),
            birthday: userData.birthday,
            ...userData.demographics,
            ...userData.interests,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        console.error('Supabase signup error:', error);
        setError(error.message);
        throw error;
      }
      
      // Check if user was created successfully
      if (data?.user) {
        console.log('User created successfully:', data.user.id);
        
        // Try to check if profile was created
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, username')
          .eq('id', data.user.id)
          .single();
        
        if (profileError) {
          console.error('Profile creation may have failed:', profileError);
          // Don't throw here - user was created, profile issue can be fixed
        } else {
          console.log('Profile created successfully:', profile);
        }
      }
      
      return { needsEmailConfirmation: true };
    } catch (err: any) {
      console.error('Registration error in auth context:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      router.push('/');
      return { success: true };
    } catch (err: any) {
      console.error('Logout error:', err);
      return { success: false, error: err };
    }
  };

  const refreshUser = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  const switchViewMode = async (mode: 'user' | 'professional') => {
    if (!user) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ view_mode: mode })
      .eq('id', user.id);
    
    if (!error) {
      setUser({ ...user, view_mode: mode });
    }
  };

  const updateUserXP = async (amount: number) => {
    if (!user) return;
    
    setUser({ ...user, total_xp: user.total_xp + amount });
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login,
      register,
      logout,
      refreshUser,
      switchViewMode,
      updateUserXP,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};