import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { supabase } from '../config/supabase';
import supabaseService from '../services/supabaseService';
import { personaService, UserPersona } from '../services/personaService';
import { UserProfile } from '../types/database';
import { Session, User as AuthUser } from '@supabase/supabase-js';

type User = AuthUser & UserProfile;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  persona: UserPersona | null;
  loading: boolean;
  needsCulturalAnalystOnboarding: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, birthday?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updatePersona: (updates: Partial<UserPersona>) => Promise<void>;
  completeCulturalAnalystOnboarding: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [persona, setPersona] = useState<UserPersona | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsCulturalAnalystOnboarding, setNeedsCulturalAnalystOnboarding] = useState(false);

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
      setSession(session);
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
      const profile = await supabaseService.getUserProfile(userId);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser && profile) {
        setUser({ ...authUser, ...profile } as User);
      } else if (authUser) {
        // Profile might not exist yet, set basic user
        setUser(authUser as any);
      }
      
      // Load persona data
      const personaData = await personaService.loadPersona(userId);
      if (personaData) {
        setPersona(personaData);
      }

      // Check if user needs Cultural Analyst onboarding
      const culturalAnalystOnboardingCompleted = await AsyncStorage.getItem('cultural_analyst_onboarding_completed');
      setNeedsCulturalAnalystOnboarding(!culturalAnalystOnboardingCompleted);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabaseService.signIn(email, password);
      
      if (error) {
        throw error;
      }
      
      if (data?.user) {
        await loadUserProfile(data.user.id);
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      Alert.alert(
        'Sign In Failed',
        error.message || 'Please check your credentials and try again.'
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, username: string, birthday?: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabaseService.signUp(email, password, username, birthday);
      
      if (error) {
        throw error;
      }
      
      if (data?.user) {
        await loadUserProfile(data.user.id);
        Alert.alert(
          'Welcome to WaveSight!',
          'Your account has been created successfully.'
        );
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      Alert.alert(
        'Sign Up Failed',
        error.message || 'Please try again with different credentials.'
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabaseService.signOut();
      
      if (error) {
        throw error;
      }
      
      setUser(null);
      setSession(null);
      setPersona(null);
      setNeedsCulturalAnalystOnboarding(false);
      personaService.clearLocalPersona();
      await AsyncStorage.clear();
    } catch (error: any) {
      console.error('Sign out error:', error);
      Alert.alert('Sign Out Failed', error.message || 'Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (user?.id) {
      await loadUserProfile(user.id);
    }
  };
  
  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!user?.id) return;
      
      const { data, error } = await supabaseService.updateUserProfile(user.id, updates);
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setUser({ ...user, ...data });
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      Alert.alert('Update Failed', error.message || 'Could not update profile.');
      throw error;
    }
  };

  const updatePersona = async (updates: Partial<UserPersona>) => {
    try {
      if (!user?.id) return;
      
      await personaService.updatePersona(user.id, updates);
      
      // Reload persona to get the updated data
      const updatedPersona = await personaService.loadPersona(user.id);
      if (updatedPersona) {
        setPersona(updatedPersona);
      }
    } catch (error: any) {
      console.error('Update persona error:', error);
      Alert.alert('Update Failed', error.message || 'Could not update persona.');
      throw error;
    }
  };

  const completeCulturalAnalystOnboarding = () => {
    setNeedsCulturalAnalystOnboarding(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      persona,
      loading, 
      needsCulturalAnalystOnboarding,
      signIn, 
      signUp, 
      signOut, 
      refreshUser, 
      updateProfile,
      updatePersona,
      completeCulturalAnalystOnboarding
    }}>
      {children}
    </AuthContext.Provider>
  );
};