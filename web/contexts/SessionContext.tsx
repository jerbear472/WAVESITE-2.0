'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

interface SessionState {
  isActive: boolean;
  isPaused: boolean;
  startTime: Date | null;
  pausedDuration: number; // accumulated pause time in seconds
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
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;
  logTrendSubmission: () => void;
  isSessionActive: () => boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const STREAK_WINDOW_MINUTES = 5; // 5 minutes between submissions to maintain session streak
const STORAGE_KEY = 'wavesight_session_state';

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const [session, setSession] = useState<SessionState>({
    isActive: false,
    isPaused: false,
    startTime: null,
    pausedDuration: 0,
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
        
        // IMPORTANT: If session was paused (isActive = false), keep it paused
        // Don't auto-restart on page reload
        if (!parsed.isActive) {
          parsed.startTime = null; // Clear start time if paused
        }
        
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
    // Always save session state, even when paused
    // This preserves the paused state on reload
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  // Session timer - updates duration
  useEffect(() => {
    if (session.isActive && !session.isPaused && session.startTime) {
      sessionTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - session.startTime!.getTime()) / 1000) - session.pausedDuration;
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
  }, [session.isActive, session.isPaused, session.startTime, session.pausedDuration]);

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
    // Session streak multipliers - must match SUSTAINABLE_EARNINGS
    if (streakCount >= 5) return 2.5;  // 5+ submissions = 2.5x
    if (streakCount === 4) return 2.0; // 4th submission = 2.0x
    if (streakCount === 3) return 1.5; // 3rd submission = 1.5x
    if (streakCount === 2) return 1.2; // 2nd submission = 1.2x
    return 1.0; // First submission = 1.0x
  };

  const startSession = () => {
    const newSession: SessionState = {
      isActive: true,
      isPaused: false,
      startTime: new Date(),
      pausedDuration: 0,
      duration: 0,
      trendsLogged: 0,
      currentStreak: session.currentStreak, // Preserve existing streak
      streakMultiplier: session.streakMultiplier,
      lastSubmissionTime: session.lastSubmissionTime,
      streakTimeRemaining: session.streakTimeRemaining
    };
    setSession(newSession);
  };

  const pauseSession = () => {
    if (session.isActive && !session.isPaused) {
      setSession(prev => ({
        ...prev,
        isPaused: true
      }));
    }
  };

  const resumeSession = () => {
    if (session.isActive && session.isPaused) {
      // Calculate how long we were paused and add to pausedDuration
      setSession(prev => ({
        ...prev,
        isPaused: false
      }));
    }
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

    // Clear any existing timers
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = undefined;
    }

    // End session but preserve streak if still valid
    const newSession = {
      isActive: false,
      isPaused: false,
      startTime: null,
      pausedDuration: 0,
      duration: 0,
      trendsLogged: 0,
      // Keep streak data intact
      currentStreak: session.currentStreak,
      streakMultiplier: session.streakMultiplier,
      lastSubmissionTime: session.lastSubmissionTime,
      streakTimeRemaining: session.streakTimeRemaining
    };
    
    setSession(newSession);
    
    // Clear localStorage to ensure clean state
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
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
        pauseSession,
        resumeSession,
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