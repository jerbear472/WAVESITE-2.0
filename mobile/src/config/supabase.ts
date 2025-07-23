import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://achuavagkhjenaypawij.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types
export interface CapturedPost {
  id?: string;
  platform: 'tiktok' | 'instagram';
  creator_handle: string;
  caption: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  thumbnail_url?: string;
  song_info?: string;
  dwell_time: number; // in seconds
  captured_at: string;
  user_id: string;
  recording_session_id: string;
  raw_data?: any;
}

export interface RecordingSession {
  id?: string;
  user_id: string;
  platform: 'tiktok' | 'instagram';
  started_at: string;
  ended_at?: string;
  posts_captured: number;
  video_url?: string;
  status: 'recording' | 'processing' | 'completed' | 'failed';
}