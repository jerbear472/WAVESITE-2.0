'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase, authHelpers, retryQuery, checkSupabaseConnection } from '@/lib/optimizedSupabase';
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

// Cache key for storing auth state
const AUTH_CACHE_KEY = 'wavesight_auth_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function OptimizedAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const router = useRouter();
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load cached auth state
  const loadCachedAuth = useCallback(() => {
    try {
      const cached = localStorage.getItem(AUTH_CACHE_KEY);
      if (cached) {
        const { user: cachedUser, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        if (age < CACHE_DURATION) {
          console.log('[AUTH] Using cached user data');
          setUser(cachedUser);
          return true;
        }
      }
    } catch (e) {
      console.error('[AUTH] Failed to load cache:', e);
    }
    return false;
  }, []);

  // Save auth state to cache
  const saveAuthCache = useCallback((userData: User | null) => {
    try {
      if (userData) {
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
          user: userData,
          timestamp: Date.now()
        }));
      } else {
        localStorage.removeItem(AUTH_CACHE_KEY);
      }
    } catch (e) {
      console.error('[AUTH] Failed to save cache:', e);
    }
  }, []);

  // Optimized profile fetch with timeout
  const fetchUserProfile = useCallback(async (userId: string): Promise<User | null> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      console.log('[AUTH] Fetching profile for user:', userId);
      
      // Parallel fetch for better performance
      const [profileResult, xpResult, pendingResult] = await Promise.allSettled([
        // Get user profile
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        
        // Get XP data
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        
        // Get pending XP
        supabase
          .from('xp_ledger')
          .select('amount')
          .eq('user_id', userId)
          .in('status', ['pending', 'awaiting_validation'])
      ]);
      
      clearTimeout(timeout);
      
      const profile = profileResult.status === 'fulfilled' ? profileResult.value.data : null;
      const userProfile = xpResult.status === 'fulfilled' ? xpResult.value.data : null;
      const pendingData = pendingResult.status === 'fulfilled' ? pendingResult.value.data : [];
      
      if (!profile) {
        console.warn('[AUTH] No profile found, creating default user');
        // Return a basic user object
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          return {
            id: authUser.id,
            email: authUser.email!,
            username: authUser.email!.split('@')[0],
            role: 'participant',
            total_xp: 0,
            pending_xp: 0,
            trends_spotted: 0,
            accuracy_score: 0,
            validation_score: 0,
            performance_tier: 'lxp',
            current_streak: 0,
            session_streak: 0,
            view_mode: 'user',
            subscription_tier: 'starter',
            spotter_tier: 'lxp',
            is_admin: false,
            account_type: 'user',
            permissions: {}
          };
        }
        return null;
      }
      
      const pendingXP = pendingData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      
      // Combine all data
      const userData: User = {
        id: profile.id,
        email: profile.email,
        username: profile.username || profile.email.split('@')[0],
        role: profile.role || 'participant',
        view_mode: profile.view_mode || 'user',
        subscription_tier: profile.subscription_tier || 'starter',
        spotter_tier: userProfile?.spotter_tier || 'lxp',
        permissions: profile.permissions || {},
        total_xp: userProfile?.total_earned || 0,
        pending_xp: pendingXP,
        trends_spotted: userProfile?.trends_spotted || 0,
        accuracy_score: userProfile?.accuracy_score || 0,
        validation_score: userProfile?.validation_score || 0,
        performance_tier: userProfile?.performance_tier || 'lxp',
        current_streak: userProfile?.current_streak || 0,
        session_streak: userProfile?.session_streak || 0,
        is_business: profile.is_business || false,
        business_id: profile.business_id,
        business_name: profile.business_name,
        business_role: profile.business_role,
        is_admin: profile.role === 'admin',
        account_type: profile.account_type || 'user'
      };
      
      return userData;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[AUTH] Profile fetch timeout');
        throw new Error('Authentication timeout. Please try again.');
      }
      console.error('[AUTH] Profile fetch error:', error);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  // Fast initialization with cache
  const initializeAuth = useCallback(async () => {
    // Prevent multiple simultaneous initializations
    if (initPromiseRef.current) {
      return initPromiseRef.current;
    }
    
    const init = async () => {
      try {
        console.log('[AUTH] Initializing...');
        setIsInitializing(true);
        
        // Try cache first for instant load
        const hasCachedAuth = loadCachedAuth();
        
        // Check connection health
        const isConnected = await checkSupabaseConnection();
        if (!isConnected) {
          console.warn('[AUTH] Supabase connection check failed, using cache if available');
          if (!hasCachedAuth) {
            setError('Connection issue. Please check your internet connection.');
          }
        }
        
        // Check actual session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AUTH] Session check error:', error);
          setError('Failed to check authentication status');
          return;
        }
        
        if (session?.user) {
          console.log('[AUTH] Session found, fetching profile...');
          
          // If we have cache, use it while fetching fresh data
          if (!hasCachedAuth) {
            setLoading(true);
          }
          
          try {
            const userData = await fetchUserProfile(session.user.id);
            if (userData) {
              setUser(userData);
              saveAuthCache(userData);
              setError(null);
            }
          } catch (error: any) {
            console.error('[AUTH] Failed to fetch profile:', error);
            setError(error.message || 'Failed to load user profile');
            
            // Use cached data if available as fallback
            if (!hasCachedAuth) {
              setUser(null);
            }
          }
        } else {
          console.log('[AUTH] No session found');
          setUser(null);
          saveAuthCache(null);
        }
      } catch (error: any) {
        console.error('[AUTH] Initialization error:', error);
        setError(error.message || 'Authentication initialization failed');
      } finally {
        setLoading(false);
        setIsInitializing(false);
        initPromiseRef.current = null;
      }
    };
    
    initPromiseRef.current = init();
    return initPromiseRef.current;
  }, [loadCachedAuth, fetchUserProfile, saveAuthCache]);

  // Initialize on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // Optimized auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH] Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session) {
        // Skip if email not confirmed
        if (session.user?.email_confirmed_at === null) {
          console.log('[AUTH] Awaiting email confirmation');
          await supabase.auth.signOut();
          return;
        }
        
        setLoading(true);
        try {
          const userData = await fetchUserProfile(session.user.id);
          if (userData) {
            setUser(userData);
            saveAuthCache(userData);
            setError(null);
          }
        } catch (error: any) {
          setError(error.message || 'Failed to load profile after sign in');
        } finally {
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        saveAuthCache(null);
        localStorage.clear();
        router.push('/login');
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Silently refresh user data
        fetchUserProfile(session.user.id).then((userData) => {
          if (userData) {
            setUser(userData);
            saveAuthCache(userData);
          }
        }).catch(console.error);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, saveAuthCache, router]);

  const login = async (email: string, password: string) => {
    try {
      console.log('[AUTH] Starting login...');
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        // Sign in with optimized auth helper
        const data = await authHelpers.signIn(email, password);
        
        clearTimeout(timeout);
        
        if (!data.session) {
          throw new Error('No session created');
        }
        
        console.log('[AUTH] Login successful, fetching profile...');
        
        // Fetch user profile with timeout
        const userData = await fetchUserProfile(data.user.id);
        
        if (userData) {
          setUser(userData);
          saveAuthCache(userData);
          setError(null);
          console.log('[AUTH] Login complete');
        } else {
          throw new Error('Failed to load user profile');
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw new Error('Login timeout. Please check your connection and try again.');
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error: any) {
      console.error('[AUTH] Login error:', error);
      setError(error.message || 'An error occurred during login');
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
      setLoading(true);
      setError(null);
      
      // Sign up with optimized auth helper
      const data = await authHelpers.signUp(
        userData.email,
        userData.password,
        {
          username: userData.username,
          birthday: userData.birthday,
          demographics: userData.demographics,
          interests: userData.interests
        }
      );
      
      // Check if email confirmation is needed
      const needsEmailConfirmation = data.user?.identities?.length === 0;
      
      return { needsEmailConfirmation };
    } catch (error: any) {
      console.error('[AUTH] Registration error:', error);
      setError(error.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      await authHelpers.signOut();
      
      setUser(null);
      saveAuthCache(null);
      localStorage.clear();
      
      return { success: true };
    } catch (error: any) {
      console.error('[AUTH] Logout error:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    
    try {
      const userData = await fetchUserProfile(user.id);
      if (userData) {
        setUser(userData);
        saveAuthCache(userData);
      }
    } catch (error: any) {
      console.error('[AUTH] Refresh user error:', error);
      setError(error.message || 'Failed to refresh user data');
    }
  };

  const switchViewMode = async (mode: 'user' | 'professional') => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ view_mode: mode })
        .eq('id', user.id);
      
      if (error) throw error;
      
      const updatedUser = { ...user, view_mode: mode };
      setUser(updatedUser);
      saveAuthCache(updatedUser);
    } catch (error: any) {
      console.error('[AUTH] Switch view mode error:', error);
      throw error;
    }
  };

  const updateUserXP = async (amount: number) => {
    if (!user) return;
    
    const updatedUser = {
      ...user,
      total_xp: user.total_xp + amount
    };
    
    setUser(updatedUser);
    saveAuthCache(updatedUser);
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('xp-earned', { detail: { amount } }));
  };

  return (
    <AuthContext.Provider 
      value={{
        user,
        loading: loading || isInitializing,
        error,
        login,
        register,
        logout,
        refreshUser,
        switchViewMode,
        updateUserXP
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};