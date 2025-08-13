'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

interface SessionState {
  isActive: boolean;
  startTime: Date | null;
  duration: number; // in seconds
  trendsLogged: number;
  currentStreak: number;
  streakMultiplier: number;
  lastSubmissionTime: Date | null;
  streakTimeRemaining: number; // in seconds
}

interface SessionContextType {
  session: SessionState;
  startSession: () => void;
  endSession: () => void;
  logTrendSubmission: () => void;
  isSessionActive: () => boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const STREAK_WINDOW_MINUTES = 30; // 30 minutes between submissions to maintain streak
const STORAGE_KEY = 'wavesight_session_state';

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const [session, setSession] = useState<SessionState>({
    isActive: false,
    startTime: null,
    duration: 0,
    trendsLogged: 0,
    currentStreak: 0,
    streakMultiplier: 1.0,
    lastSubmissionTime: null,
    streakTimeRemaining: 0
  });

  const sessionTimerRef = useRef<NodeJS.Timeout>();
  const streakTimerRef = useRef<NodeJS.Timeout>();

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem(STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        // Restore dates
        if (parsed.startTime) parsed.startTime = new Date(parsed.startTime);
        if (parsed.lastSubmissionTime) parsed.lastSubmissionTime = new Date(parsed.lastSubmissionTime);
        
        // Check if streak is still valid
        if (parsed.lastSubmissionTime) {
          const timeSinceLastSubmission = Date.now() - new Date(parsed.lastSubmissionTime).getTime();
          if (timeSinceLastSubmission > STREAK_WINDOW_MINUTES * 60 * 1000) {
            // Streak expired
            parsed.currentStreak = 0;
            parsed.streakMultiplier = 1.0;
            parsed.lastSubmissionTime = null;
            parsed.streakTimeRemaining = 0;
          }
        }
        
        setSession(parsed);
      } catch (error) {
        console.error('Error loading session:', error);
      }
    }
  }, []);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (session.isActive || session.currentStreak > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }, [session]);

  // Session timer - updates duration
  useEffect(() => {
    if (session.isActive && session.startTime) {
      sessionTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - session.startTime!.getTime()) / 1000);
        setSession(prev => ({ ...prev, duration: elapsed }));
      }, 1000);
    } else {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    }
    
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [session.isActive, session.startTime]);

  // Streak timer - tracks time remaining
  useEffect(() => {
    if (session.currentStreak > 0 && session.lastSubmissionTime) {
      const updateStreakTimer = () => {
        const elapsed = Date.now() - session.lastSubmissionTime!.getTime();
        const remaining = Math.max(0, STREAK_WINDOW_MINUTES * 60 * 1000 - elapsed);
        
        if (remaining === 0) {
          // Streak expired
          setSession(prev => ({
            ...prev,
            currentStreak: 0,
            streakMultiplier: 1.0,
            lastSubmissionTime: null,
            streakTimeRemaining: 0
          }));
          if (streakTimerRef.current) {
            clearInterval(streakTimerRef.current);
          }
        } else {
          setSession(prev => ({
            ...prev,
            streakTimeRemaining: Math.ceil(remaining / 1000)
          }));
        }
      };
      
      updateStreakTimer();
      streakTimerRef.current = setInterval(updateStreakTimer, 1000);
      
      return () => {
        if (streakTimerRef.current) {
          clearInterval(streakTimerRef.current);
        }
      };
    }
  }, [session.currentStreak, session.lastSubmissionTime]);

  const getStreakMultiplier = (streakCount: number): number => {
    // Visual multipliers for gamification
    if (streakCount >= 15) return 3.0;
    if (streakCount >= 5) return 2.0;
    if (streakCount >= 2) return 1.2;
    return 1.0;
  };

  const startSession = () => {
    const newSession: SessionState = {
      isActive: true,
      startTime: new Date(),
      duration: 0,
      trendsLogged: 0,
      currentStreak: session.currentStreak, // Preserve existing streak
      streakMultiplier: session.streakMultiplier,
      lastSubmissionTime: session.lastSubmissionTime,
      streakTimeRemaining: session.streakTimeRemaining
    };
    setSession(newSession);
  };

  const endSession = async () => {
    // Save session to database if user is logged in
    if (user && session.startTime) {
      try {
        await supabase
          .from('scroll_sessions')
          .insert({
            user_id: user.id,
            started_at: session.startTime.toISOString(),
            ended_at: new Date().toISOString(),
            duration_seconds: session.duration,
            trends_logged: session.trendsLogged,
            metadata: {
              streak_reached: session.currentStreak,
              max_multiplier: session.streakMultiplier
            }
          });
      } catch (error) {
        console.error('Error saving session:', error);
      }
    }

    // End session but preserve streak if still valid
    setSession(prev => ({
      ...prev,
      isActive: false,
      startTime: null,
      duration: 0,
      trendsLogged: 0
      // Keep streak data intact
    }));
  };

  const logTrendSubmission = () => {
    const newStreak = session.currentStreak + 1;
    const newMultiplier = getStreakMultiplier(newStreak);
    
    setSession(prev => ({
      ...prev,
      trendsLogged: prev.trendsLogged + 1,
      currentStreak: newStreak,
      streakMultiplier: newMultiplier,
      lastSubmissionTime: new Date(),
      streakTimeRemaining: STREAK_WINDOW_MINUTES * 60 // Reset timer
    }));
  };

  const isSessionActive = () => session.isActive;

  return (
    <SessionContext.Provider 
      value={{
        session,
        startSession,
        endSession,
        logTrendSubmission,
        isSessionActive
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}