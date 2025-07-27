// Quick fix for trend submission authentication issue
// This script ensures the user profile exists before submitting trends

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://achuavagkhjenaypawij.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function ensureUserProfile(userId, email) {
  try {
    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (checkError && checkError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          username: email.split('@')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return false;
      }

      console.log('Profile created:', newProfile);
      return true;
    }

    console.log('Profile already exists:', existingProfile);
    return true;
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    return false;
  }
}

// Export for use in the app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ensureUserProfile };
}

// Add this function to the window object for browser use
if (typeof window !== 'undefined') {
  window.ensureUserProfile = ensureUserProfile;
}