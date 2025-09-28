'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase, signInWithEmail } from '@/lib/supabase';
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
  sessionReady: boolean;
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
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session recovery helper
const SESSION_CHECK_INTERVAL = 30000; // Check every 30 seconds
const SESSION_RECOVERY_KEY = 'wavesight_session_recovery';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();

  const fetchUserData = useCallback(async (userId: string, retryCount = 0): Promise<void> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000 * Math.pow(2, retryCount); // Exponential backoff

    try {
      console.log(`[Auth] Fetching user data for ${userId}, attempt ${retryCount + 1}`);
      
      // Get basic profile with retry logic
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        if (retryCount < MAX_RETRIES) {
          console.log(`[Auth] Profile fetch failed, retrying in ${RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return fetchUserData(userId, retryCount + 1);
        }
        throw profileError;
      }

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
      setSessionReady(true);
      
      // Store session recovery data
      localStorage.setItem(SESSION_RECOVERY_KEY, JSON.stringify({
        userId,
        timestamp: Date.now()
      }));
      
      console.log('[Auth] User data fetched successfully');
    } catch (err: any) {
      console.error('[Auth] Error fetching user data:', err);
      setError(err.message);
      setSessionReady(true); // Mark as ready even with error
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      console.log('[Auth] Checking session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[Auth] Session check error:', sessionError);
        
        // Try to recover from stored session
        const recoveryData = localStorage.getItem(SESSION_RECOVERY_KEY);
        if (recoveryData) {
          const { userId, timestamp } = JSON.parse(recoveryData);
          const AGE_LIMIT = 7 * 24 * 60 * 60 * 1000; // 7 days
          
          if (Date.now() - timestamp < AGE_LIMIT) {
            console.log('[Auth] Attempting session recovery...');
            await fetchUserData(userId);
          } else {
            localStorage.removeItem(SESSION_RECOVERY_KEY);
          }
        }
        return;
      }
      
      if (session?.user) {
        console.log('[Auth] Valid session found');
        if (!user || user.id !== session.user.id) {
          await fetchUserData(session.user.id);
        }
      } else {
        console.log('[Auth] No active session');
        setUser(null);
        setSessionReady(true);
      }
    } catch (err: any) {
      console.error('[Auth] Session check failed:', err);
      setSessionReady(true);
    }
  }, [user, fetchUserData]);

  // Initialize auth and set up session monitoring
  useEffect(() => {
    let sessionCheckInterval: NodeJS.Timeout;
    
    const initAuth = async () => {
      try {
        console.log('[Auth] Initializing authentication...');
        setLoading(true);
        
        // Check for existing session
        await checkSession();
        
        // Set up periodic session checks
        sessionCheckInterval = setInterval(checkSession, SESSION_CHECK_INTERVAL);
        
      } catch (err: any) {
        console.error('[Auth] Error initializing auth:', err);
        setError(err.message);
        setSessionReady(true);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Auth state change:', event);
      
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          if (session?.user) {
            await fetchUserData(session.user.id);
          }
          break;
          
        case 'SIGNED_OUT':
          setUser(null);
          setSessionReady(true);
          localStorage.removeItem(SESSION_RECOVERY_KEY);
          break;
          
        case 'PASSWORD_RECOVERY':
          // Handle password recovery
          break;
      }
    });

    // Handle page visibility changes to refresh session
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[Auth] Page became visible, checking session...');
        checkSession();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Handle online/offline status
    const handleOnline = () => {
      console.log('[Auth] Connection restored, checking session...');
      checkSession();
    };
    
    window.addEventListener('online', handleOnline);

    return () => {
      subscription.unsubscribe();
      if (sessionCheckInterval) clearInterval(sessionCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    setLoading(true);

    try {
      console.log('[Auth] Attempting login...');

      const { data, error } = await signInWithEmail(email, password);

      if (error) {
        console.error('[Auth] Login error:', error);
        setError(error.message);
        throw error;
      }

      if (data?.user) {
        console.log('[Auth] Login successful, fetching user data...');
        await fetchUserData(data.user.id);

        // Ensure navigation happens after user data is loaded
        setTimeout(() => {
          router.push('/predictions');
        }, 100);
      } else {
        throw new Error('Login failed - no user data returned');
      }
    } catch (err: any) {
      console.error('[Auth] Login failed:', err);
      setError(err.message || 'Login failed. Please try again.');
      throw err;
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
    setError(null);
    setLoading(true);
    
    try {
      console.log('[Auth] Starting registration...');
      
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
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        console.error('[Auth] Signup error:', error);
        setError(error.message);
        throw error;
      }
      
      // Check if user was created successfully
      if (data?.user) {
        console.log('[Auth] User created successfully:', data.user.id);
        
        // Wait a bit for the database trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to check if profile was created
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, username')
          .eq('id', data.user.id)
          .single();
        
        if (profileError) {
          console.error('[Auth] Profile check failed:', profileError);
          // Don't throw - profile might be created async
        } else {
          console.log('[Auth] Profile verified:', profile);
        }
      }
      
      return { needsEmailConfirmation: true };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('[Auth] Logging out...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[Auth] Logout error:', error);
        throw error;
      }
      
      setUser(null);
      setSessionReady(true);
      localStorage.removeItem(SESSION_RECOVERY_KEY);
      router.push('/');
      
      return { success: true };
    } catch (err: any) {
      console.error('[Auth] Logout failed:', err);
      // Force local logout even if server fails
      setUser(null);
      localStorage.removeItem(SESSION_RECOVERY_KEY);
      router.push('/');
      return { success: true, error: err };
    }
  };

  const refreshUser = async () => {
    if (user) {
      console.log('[Auth] Refreshing user data...');
      await fetchUserData(user.id);
    } else {
      console.log('[Auth] No user to refresh, checking session...');
      await checkSession();
    }
  };

  const switchViewMode = async (mode: 'user' | 'professional') => {
    if (!user) return;
    
    console.log(`[Auth] Switching view mode to ${mode}`);
    const { error } = await supabase
      .from('profiles')
      .update({ view_mode: mode })
      .eq('id', user.id);
    
    if (!error) {
      setUser({ ...user, view_mode: mode });
    } else {
      console.error('[Auth] Failed to switch view mode:', error);
    }
  };

  const updateUserXP = async (amount: number) => {
    if (!user) return;
    
    console.log(`[Auth] Updating user XP by ${amount}`);
    setUser({ ...user, total_xp: user.total_xp + amount });
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      sessionReady,
      login,
      register,
      logout,
      refreshUser,
      switchViewMode,
      updateUserXP,
      checkSession,
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