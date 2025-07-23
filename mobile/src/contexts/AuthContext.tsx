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
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
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
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      // Ensure username is set, use email prefix as fallback
      if (profile && !profile.username) {
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser?.user?.email) {
          profile.username = authUser.user.email.split('@')[0];
        }
      }
      
      setUser(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Try to get basic info from auth if profile load fails
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

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
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

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};