// WORKING AUTH - Direct and simple
import { createClient } from '@supabase/supabase-js';

// Create client inline when needed
export function getSupabase() {
  return createClient(
    'https://aicahushpcslwjwrlqbo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpY2FodXNocGNzbHdqd3JscWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4ODc1NTQsImV4cCI6MjA3MDQ2MzU1NH0.rLPnouZXA1ejWG0tuurIb5sgo5CCHe15M4knaANrR2w'
  );
}

export async function loginUser(email: string, password: string) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }

    if (data?.user) {
      console.log('Login successful:', data.user.email);
      return { success: true, user: data.user };
    }

    return { success: false, error: 'No user data returned' };
  } catch (err: any) {
    console.error('Login exception:', err);
    return { success: false, error: err.message };
  }
}

export async function logoutUser() {
  try {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getCurrentUser() {
  try {
    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    return user;
  } catch (err) {
    return null;
  }
}