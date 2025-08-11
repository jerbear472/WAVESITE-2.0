import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://aicahushpcslwjwrlqbo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w';

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