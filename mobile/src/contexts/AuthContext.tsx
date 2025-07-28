import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  total_earnings: number;
  pending_earnings: number;
  trends_spotted: number;
  accuracy_score: number;
  validation_score: number;
  points: number;
  level: string;
  validations_count: number;
  validated_trends: number;
  referrals_count: number;
  persona_completed?: boolean;
  venmo_username?: string;
  onboarding_completed?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, birthday?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    
    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      // First try user_profiles table (original schema)
      let { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // If user_profiles doesn't exist or no profile found, try users table
      if (error) {
        console.log('user_profiles not found, trying users table');
        const { data: userProfile, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (!userError && userProfile) {
          // Map users table to expected profile format
          profile = {
            ...userProfile,
            role: userProfile.role || 'participant',
            total_earnings: userProfile.total_earnings || 0,
            pending_earnings: userProfile.pending_earnings || 0,
            level: userProfile.level || 'bronze',
            referrals_count: userProfile.referrals_count || 0,
          };
        } else if (userError && userError.code === 'PGRST116') {
          // User doesn't exist in either table, create in users table
          console.log('Creating user profile in users table');
          const { data: authUser } = await supabase.auth.getUser();
          const username = authUser?.user?.email?.split('@')[0] || 'user';
          
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({
              id: userId,
              username,
              email: authUser?.user?.email || '',
              points: 0,
              trends_spotted: 0,
              validations_count: 0,
              validated_trends: 0,
              accuracy_score: 0,
              streak_days: 0,
            })
            .select()
            .single();
          
          if (!createError && newProfile) {
            profile = {
              ...newProfile,
              role: 'participant',
              total_earnings: 0,
              pending_earnings: 0,
              validation_score: 0,
              level: 'bronze',
              referrals_count: 0,
            };
          }
        }
      }
      
      if (profile) {
        // Ensure username is set, use email prefix as fallback
        if (!profile.username) {
          const { data: authUser } = await supabase.auth.getUser();
          if (authUser?.user?.email) {
            profile.username = authUser.user.email.split('@')[0];
          }
        }
        
        setUser(profile);
      } else {
        throw new Error('Failed to load or create user profile');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Set basic user info from auth
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser?.user) {
        setUser({
          id: authUser.user.id,
          email: authUser.user.email || '',
          username: authUser.user.email?.split('@')[0] || 'user',
          role: 'participant',
          total_earnings: 0,
          pending_earnings: 0,
          trends_spotted: 0,
          accuracy_score: 0,
          validation_score: 0,
          points: 0,
          level: 'bronze',
          validations_count: 0,
          validated_trends: 0,
          referrals_count: 0,
        });
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Always show generic error message for security
      throw new Error('Invalid email or password');
    }
    
    if (data.user) {
      await loadUserProfile(data.user.id);
    }
  };

  const signUp = async (email: string, password: string, username: string, birthday?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          username,
          birthday 
        },
      },
    });

    if (error) throw error;
    
    if (data.user) {
      // Profile will be created automatically by database trigger
      await loadUserProfile(data.user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    await AsyncStorage.clear();
  };

  const refreshUser = async () => {
    if (user?.id) {
      await loadUserProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};